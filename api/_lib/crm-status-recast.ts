/**
 * Reapply resolveClientStatus() to existing CRM rows.
 * Does not call Stripe/Shopify APIs and does not delete customers.
 * Preserves notes, mrr_override, and total_revenue_override.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  resolveClientStatus,
  shopifyFlatRateMrr,
  type ClientStatus,
  type ShopifyLifecycleState,
} from './status-engine.js'

const CUSTOMER_COLUMNS =
  'id, name, email, billing_channel, client_status, user_type, store_url, shopify_shop_id, shopify_shop_domain, shopify_subscription_status, shopify_cancelled_at, shopify_billing_interval, shopify_subscription_amount, stripe_customer_id, stripe_subscription_status, stripe_trial_end, stripe_canceled_at, boardroom_subscription_status, cancellation_date, calculated_total_revenue, calculated_mrr, mrr_override, total_revenue_override'

type CustomerRow = {
  id: string
  name: string | null
  email: string | null
  billing_channel: string | null
  client_status: string | null
  user_type: string | null
  store_url: string | null
  shopify_shop_id: string | null
  shopify_shop_domain: string | null
  shopify_subscription_status: string | null
  shopify_cancelled_at: string | null
  shopify_billing_interval: string | null
  shopify_subscription_amount: number | null
  stripe_customer_id: string | null
  stripe_subscription_status: string | null
  stripe_trial_end: string | null
  stripe_canceled_at: string | null
  boardroom_subscription_status: string | null
  cancellation_date: string | null
  calculated_total_revenue: number | null
  calculated_mrr: number | null
  mrr_override: number | null
  total_revenue_override: number | null
}

type TxnRow = {
  crm_customer_id: string | null
  provider: string
  amount: number
  status: string
  transaction_type: string
  shopify_gross_amount: number | null
  transaction_date: string | null
}

export type RecastSummary = {
  scanned: number
  updated: number
  unchanged: number
  errors: number
  moves: Record<string, number>
  samples: Array<{ id: string; email: string | null; from: string | null; to: string; domain: string | null }>
}

async function fetchAll<T>(
  supabase: SupabaseClient,
  table: string,
  columns: string
): Promise<T[]> {
  const PAGE = 1000
  const all: T[] = []
  let from = 0
  for (;;) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + PAGE - 1)
    if (error) throw error
    all.push(...((data ?? []) as T[]))
    if (!data || data.length < PAGE) break
    from += PAGE
  }
  return all
}

function shopifyLifecycle(value: string | null | undefined): ShopifyLifecycleState {
  switch (value) {
    case 'ACTIVE':
    case 'TRIAL':
    case 'FROZEN':
    case 'CANCELED':
    case 'CANCELLATION_SCHEDULED':
      return value
    default:
      return 'NONE'
  }
}

function shopifyLedgerDelta(t: TxnRow): number {
  const amount = Number(t.amount) || 0
  if (t.transaction_type === 'app_sale_credit') return -Math.abs(amount)
  if (t.transaction_type === 'app_sale_adjustment') {
    const gross = t.shopify_gross_amount == null ? null : Number(t.shopify_gross_amount)
    return gross != null && Number.isFinite(gross) ? gross : t.status === 'adjusted' ? -Math.abs(amount) : amount
  }
  return amount
}

function isoDate(value: string | null | undefined): string | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function isFuture(value: string | null | undefined): boolean {
  if (!value) return false
  const ms = new Date(value).getTime()
  return Number.isFinite(ms) && ms > Date.now()
}

function sameInstant(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a && !b) return true
  if (!a || !b) return false
  const ta = new Date(a).getTime()
  const tb = new Date(b).getTime()
  return !Number.isNaN(ta) && ta === tb
}

function keepLatest(map: Map<string, string>, key: string, occurredAt: string) {
  const existing = map.get(key)
  if (!existing || new Date(occurredAt).getTime() > new Date(existing).getTime()) {
    map.set(key, occurredAt)
  }
}

export async function recastCrmClientStatuses(supabase: SupabaseClient): Promise<RecastSummary> {
  const customers = await fetchAll<CustomerRow>(supabase, 'crm_customers', CUSTOMER_COLUMNS)
  const txns = await fetchAll<TxnRow>(
    supabase,
    'crm_revenue_transactions',
    'crm_customer_id, provider, amount, status, transaction_type, shopify_gross_amount, transaction_date'
  )
  const freezeEvents = await fetchAll<{
    crm_customer_id: string | null
    shopify_shop_id: string | null
    event_type: string
    occurred_at: string
  }>(
    supabase,
    'crm_shopify_subscription_events',
    'crm_customer_id, shopify_shop_id, event_type, occurred_at'
  )

  const stripeByCustomer = new Map<string, number>()
  const shopifyByCustomer = new Map<string, number>()
  const latestUsageByCustomer = new Map<string, { at: number; amount: number }>()
  for (const t of txns) {
    if (!t.crm_customer_id) continue
    if (t.status !== 'succeeded' && t.status !== 'adjusted') continue
    if (t.provider === 'stripe' && t.status === 'succeeded') {
      stripeByCustomer.set(t.crm_customer_id, (stripeByCustomer.get(t.crm_customer_id) ?? 0) + Number(t.amount || 0))
    }
    if (t.provider === 'shopify') {
      shopifyByCustomer.set(
        t.crm_customer_id,
        (shopifyByCustomer.get(t.crm_customer_id) ?? 0) + shopifyLedgerDelta(t)
      )
      if (t.status === 'succeeded' && t.transaction_type === 'app_usage_sale') {
        const amount = Number(t.amount)
        const at = t.transaction_date ? new Date(t.transaction_date).getTime() : 0
        if (Number.isFinite(amount) && amount > 0 && Number.isFinite(at)) {
          const prev = latestUsageByCustomer.get(t.crm_customer_id)
          if (!prev || at >= prev.at) latestUsageByCustomer.set(t.crm_customer_id, { at, amount })
        }
      }
    }
  }

  const freezeByCustomer = new Map<string, string>()
  const freezeByShop = new Map<string, string>()
  const unfrozenByCustomer = new Map<string, string>()
  const unfrozenByShop = new Map<string, string>()
  const canceledByCustomer = new Map<string, string>()
  const canceledByShop = new Map<string, string>()
  const scheduledByCustomer = new Map<string, string>()
  const scheduledByShop = new Map<string, string>()
  for (const e of freezeEvents) {
    if (e.event_type === 'SUBSCRIPTION_FROZEN') {
      if (e.crm_customer_id) keepLatest(freezeByCustomer, e.crm_customer_id, e.occurred_at)
      if (e.shopify_shop_id) keepLatest(freezeByShop, e.shopify_shop_id, e.occurred_at)
    }
    if (e.event_type === 'SUBSCRIPTION_UNFROZEN') {
      if (e.crm_customer_id) keepLatest(unfrozenByCustomer, e.crm_customer_id, e.occurred_at)
      if (e.shopify_shop_id) keepLatest(unfrozenByShop, e.shopify_shop_id, e.occurred_at)
    }
    if (e.event_type === 'SUBSCRIPTION_CANCELED') {
      if (e.crm_customer_id) keepLatest(canceledByCustomer, e.crm_customer_id, e.occurred_at)
      if (e.shopify_shop_id) keepLatest(canceledByShop, e.shopify_shop_id, e.occurred_at)
    }
    if (e.event_type === 'SUBSCRIPTION_CANCELLATION_SCHEDULED') {
      if (e.crm_customer_id) keepLatest(scheduledByCustomer, e.crm_customer_id, e.occurred_at)
      if (e.shopify_shop_id) keepLatest(scheduledByShop, e.shopify_shop_id, e.occurred_at)
    }
  }

  const summary: RecastSummary = {
    scanned: customers.length,
    updated: 0,
    unchanged: 0,
    errors: 0,
    moves: {},
    samples: [],
  }

  const pending: Array<{ id: string; patch: Record<string, unknown> }> = []

  for (const c of customers) {
    const stripeRevenue = stripeByCustomer.get(c.id) ?? 0
    const shopifyRevenue = shopifyByCustomer.get(c.id) ?? 0
    const storedRevenue = Number(c.total_revenue_override ?? c.calculated_total_revenue ?? 0)
    const lifecycle = shopifyLifecycle(c.shopify_subscription_status)

    const stripePaidRevenue = Math.max(stripeRevenue, storedRevenue)
    const confirmedRevenue =
      c.billing_channel === 'stripe'
        ? stripePaidRevenue
        : c.billing_channel === 'shopify'
          ? Math.max(shopifyRevenue, storedRevenue)
          : storedRevenue

    let nextStatus: ClientStatus
    if (c.user_type === 'agency_client') {
      nextStatus = 'agency_client'
    } else if (c.billing_channel === 'stripe') {
      nextStatus = resolveClientStatus({
        userType: c.user_type,
        billingChannel: 'stripe',
        stripeSubscriptionStatus: c.stripe_subscription_status,
        stripeTrialEnd: c.stripe_trial_end,
        stripeCanceledAt: c.stripe_canceled_at,
        boardroomSubscriptionStatus: c.boardroom_subscription_status,
        confirmedRevenue: stripePaidRevenue,
        hasSuccessfulStripePayment: stripePaidRevenue > 0,
      })
      const liveStripe =
        c.stripe_subscription_status === 'active' || c.stripe_subscription_status === 'past_due'
      if (liveStripe && stripePaidRevenue > 0) {
        nextStatus = 'active_customer'
      } else if (
        !liveStripe &&
        nextStatus === 'active_customer' &&
        (c.cancellation_date ||
          c.stripe_canceled_at ||
          c.client_status === 'canceled' ||
          c.stripe_subscription_status === 'canceled' ||
          c.stripe_subscription_status === 'incomplete_expired')
      ) {
        nextStatus = 'canceled'
      } else if (nextStatus === 'prospect' && stripePaidRevenue > 0) {
        nextStatus = c.cancellation_date || c.stripe_canceled_at ? 'canceled' : 'active_customer'
      }
    } else if (c.billing_channel === 'shopify') {
      nextStatus = resolveClientStatus({
        userType: c.user_type,
        billingChannel: 'shopify',
        shopifyLifecycle: lifecycle,
        confirmedRevenue,
      })
    } else if (confirmedRevenue > 0 && c.client_status === 'prospect') {
      nextStatus = c.cancellation_date ? 'canceled' : 'active_customer'
    } else {
      nextStatus = (c.client_status as ClientStatus) || 'prospect'
    }

    const patch: Record<string, unknown> = {}
    if (c.client_status !== nextStatus) {
      patch.client_status = nextStatus
    }

    if (c.billing_channel === 'shopify') {
      let cancellationDate: string | null = c.cancellation_date
      if (nextStatus === 'canceled') {
        const freezeAt =
          freezeByCustomer.get(c.id) ??
          (c.shopify_shop_id ? freezeByShop.get(c.shopify_shop_id) : undefined) ??
          null
        const unfrozenAt =
          unfrozenByCustomer.get(c.id) ??
          (c.shopify_shop_id ? unfrozenByShop.get(c.shopify_shop_id) : undefined) ??
          null
        const freezeIsCurrent =
          lifecycle === 'FROZEN' ||
          (!!freezeAt && (!unfrozenAt || new Date(freezeAt).getTime() > new Date(unfrozenAt).getTime()))
        const canceledAt =
          canceledByCustomer.get(c.id) ??
          (c.shopify_shop_id ? canceledByShop.get(c.shopify_shop_id) : undefined) ??
          c.shopify_cancelled_at ??
          null
        const scheduledAt =
          scheduledByCustomer.get(c.id) ??
          (c.shopify_shop_id ? scheduledByShop.get(c.shopify_shop_id) : undefined) ??
          null
        const existingCancel = isFuture(c.cancellation_date) ? null : c.cancellation_date
        cancellationDate = isoDate(
          freezeIsCurrent
            ? freezeAt ?? canceledAt ?? scheduledAt ?? existingCancel
            : canceledAt ?? scheduledAt ?? existingCancel ?? freezeAt
        )
      } else if (nextStatus === 'active_customer' || nextStatus === 'in_trial') {
        cancellationDate = null
      }
      const currentCancel = isoDate(c.cancellation_date)
      if (!sameInstant(currentCancel, cancellationDate)) {
        patch.cancellation_date = cancellationDate
      }

      if (c.mrr_override == null) {
        const nextMrr = shopifyFlatRateMrr({
          lifecycle,
          billingPeriod: c.shopify_billing_interval,
          flatRateAmount: c.shopify_subscription_amount,
          usageAmount: latestUsageByCustomer.get(c.id)?.amount ?? null,
        })
        const keepExisting =
          nextMrr <= 0 && lifecycle === 'ACTIVE' && Number(c.calculated_mrr ?? 0) > 0
        const calculatedMrr = keepExisting ? Number(c.calculated_mrr) : nextMrr
        if (Number(c.calculated_mrr ?? 0) !== calculatedMrr) {
          patch.calculated_mrr = calculatedMrr
        }
      }
    }

    if (c.billing_channel === 'stripe') {
      const liveStripe =
        c.stripe_subscription_status === 'active' || c.stripe_subscription_status === 'past_due'
      if (
        liveStripe &&
        (nextStatus === 'active_customer' || nextStatus === 'in_trial') &&
        c.cancellation_date
      ) {
        patch.cancellation_date = null
      }
    }

    if (Object.keys(patch).length === 0) {
      summary.unchanged++
      continue
    }

    patch.updated_by = 'crm_status_recast'
    pending.push({ id: c.id, patch })

    if (c.client_status !== nextStatus) {
      const key = `${c.client_status ?? 'null'} → ${nextStatus}`
      summary.moves[key] = (summary.moves[key] ?? 0) + 1
      if (summary.samples.length < 25) {
        summary.samples.push({
          id: c.id,
          email: c.email,
          from: c.client_status,
          to: nextStatus,
          domain: c.shopify_shop_domain ?? c.store_url,
        })
      }
    }
  }

  for (let i = 0; i < pending.length; i += 20) {
    const batch = pending.slice(i, i + 20)
    const results = await Promise.all(
      batch.map(({ id, patch }) => supabase.from('crm_customers').update(patch).eq('id', id))
    )
    for (const result of results) {
      if (result.error) {
        summary.errors++
        console.error('[CRM Recast] update failed:', result.error.message)
      } else {
        summary.updated++
      }
    }
    if (i > 0 && i % 500 === 0) {
      console.log(`[CRM Recast] updated ${Math.min(i + 20, pending.length)} / ${pending.length}`)
    }
  }

  return summary
}

export function formatRecastSummary(summary: RecastSummary): string {
  const moveLines = Object.entries(summary.moves)
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `  ${k}: ${n}`)
  return [
    `Scanned: ${summary.scanned}`,
    `Updated: ${summary.updated}`,
    `Unchanged: ${summary.unchanged}`,
    `Errors: ${summary.errors}`,
    'Status moves:',
    ...(moveLines.length ? moveLines : ['  (none)']),
  ].join('\n')
}
