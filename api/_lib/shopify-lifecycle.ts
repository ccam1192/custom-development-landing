/**
 * Shopify Partner subscription lifecycle helpers.
 * Server-side only. Does not log or expose Partner API tokens.
 */

import { supabaseAdmin, fetchAllRows } from './supabase-admin.js'
import { shopGidNumeric, type ShopifyActiveSubscription, type ShopifyPartnerEvent } from './shopify.js'
import {
  resolveClientStatus,
  shopifyFlatRateMrr,
  type ShopifyLifecycleState,
} from './status-engine.js'

export const CONFIRMED_SHOPIFY_PAYMENT_TYPES = ['app_usage_sale', 'app_subscription_sale'] as const

export type CrmShopifyCustomer = {
  id: string
  billing_channel: string | null
  client_status: string | null
  user_type: string | null
  shopify_shop_id: string | null
  shopify_shop_domain: string | null
  shopify_subscription_id: string | null
  shopify_subscription_created_at: string | null
  shopify_trial_ends_at: string | null
  shopify_cancelled_at: string | null
  shopify_cancel_effective_on: string | null
  store_url: string | null
  mrr_override: number | null
  cancellation_date: string | null
  name: string | null
  email: string | null
  stripe_customer_id?: string | null
  calculated_total_revenue?: number | null
}

export type ShopifyShopRef = {
  shopId: string
  domain: string | null
  name: string | null
}

export type DerivedShopifyLifecycle = {
  lifecycle: ShopifyLifecycleState
  shopifyStatus: string
  trialEndsAt: string | null
  cancelledAt: string | null
  cancelEffectiveOn: string | null
  cancelAtEndOfCycle: boolean
  subscriptionCreatedAt: string | null
  billingInterval: string | null
  flatRateAmount: number | null
  subscriptionId: string | null
  pendingUpdate: ShopifyActiveSubscription['pendingUpdate']
  freezeOccurredAt: string | null
  unfrozenOccurredAt: string | null
}

const CUSTOMER_COLUMNS =
  'id, billing_channel, client_status, user_type, shopify_shop_id, shopify_shop_domain, shopify_subscription_id, shopify_subscription_created_at, shopify_trial_ends_at, shopify_cancelled_at, shopify_cancel_effective_on, store_url, mrr_override, cancellation_date, name, email, stripe_customer_id, calculated_total_revenue'

export function normalizeShopDomain(value: string | null | undefined): string | null {
  if (!value) return null
  let host = String(value).trim().toLowerCase()
  host = host.replace(/^https?:\/\//, '')
  host = host.split('/')[0] ?? ''
  host = host.split('?')[0] ?? ''
  host = host.split('#')[0] ?? ''
  host = host.replace(/:\d+$/, '')
  host = host.replace(/\.+$/, '').replace(/^\.+/, '')
  return host || null
}

export function myshopifyDomainFromUnknown(value: string | null | undefined): string | null {
  const host = normalizeShopDomain(value)
  if (!host) return null
  return host.endsWith('.myshopify.com') ? host : null
}

export function myshopifyDomainFromMetadata(
  metadata: Record<string, string> | null | undefined
): string | null {
  if (!metadata) return null
  for (const key of ['shopify_domain', 'shop_domain', 'myshopify_domain', 'store_url', 'shop']) {
    const host = myshopifyDomainFromUnknown(metadata[key])
    if (host) return host
  }
  return null
}

export function isStripeAuthoritative(billingChannel: string | null | undefined): boolean {
  return billingChannel === 'stripe'
}

export function isShopifyAuthoritative(billingChannel: string | null | undefined): boolean {
  return billingChannel === 'shopify'
}

export class ShopifyCustomerIndex {
  byShopId = new Map<string, CrmShopifyCustomer>()
  bySubId = new Map<string, CrmShopifyCustomer>()
  byDomain = new Map<string, CrmShopifyCustomer>()
  byId = new Map<string, CrmShopifyCustomer>()
  byEmail = new Map<string, CrmShopifyCustomer[]>()

  add(customer: CrmShopifyCustomer) {
    this.byId.set(customer.id, customer)
    const shopId = shopGidNumeric(customer.shopify_shop_id)
    if (shopId) {
      const existing = this.byShopId.get(shopId)
      if (!existing || preferCanonical(customer, existing)) this.byShopId.set(shopId, customer)
    }
    if (customer.shopify_subscription_id) this.bySubId.set(customer.shopify_subscription_id, customer)
    const domain =
      normalizeShopDomain(customer.shopify_shop_domain) ?? normalizeShopDomain(customer.store_url)
    if (domain) {
      const existing = this.byDomain.get(domain)
      if (!existing || preferCanonical(customer, existing)) this.byDomain.set(domain, customer)
    }
    const email = customer.email?.toLowerCase().trim()
    if (email) {
      const list = this.byEmail.get(email) ?? []
      if (!list.some((c) => c.id === customer.id)) list.push(customer)
      this.byEmail.set(email, list)
    }
  }

  find(
    shopId?: string | null,
    subscriptionId?: string | null,
    domain?: string | null,
    email?: string | null
  ): CrmShopifyCustomer | null {
    const numeric = shopGidNumeric(shopId)
    if (numeric && this.byShopId.has(numeric)) return this.byShopId.get(numeric) ?? null
    const host = normalizeShopDomain(domain)
    if (host && this.byDomain.has(host)) return this.byDomain.get(host) ?? null
    if (subscriptionId && this.bySubId.has(subscriptionId)) return this.bySubId.get(subscriptionId) ?? null

    if (email) {
      const matches = this.byEmail.get(email.toLowerCase().trim()) ?? []
      const conflicts = matches.filter((c) => {
        const other =
          normalizeShopDomain(c.shopify_shop_domain) ?? normalizeShopDomain(c.store_url)
        return !!host && !!other && other !== host
      })
      for (const c of conflicts) {
        const other =
          normalizeShopDomain(c.shopify_shop_domain) ?? normalizeShopDomain(c.store_url)
        console.log(
          `[Shopify Sync] Email match conflict: ${email} shop=${host} existing_store=${other} customer=${c.id} — not merging`
        )
      }
      const compatible = matches.filter((c) => {
        const other =
          normalizeShopDomain(c.shopify_shop_domain) ?? normalizeShopDomain(c.store_url)
        return !other || !host || other === host
      })
      if (compatible.length === 1) {
        console.log(
          `[Shopify Sync] Shopify shop matched existing CRM customer ${compatible[0].id} by email fallback`
        )
        return compatible[0]
      }
      if (compatible.length > 1) {
        console.log(
          `[Shopify Sync] Ambiguous email fallback for ${email}; not merging ${compatible.length} records`
        )
      }
    }
    return null
  }

  emailConflicts(email: string | null | undefined, domain: string | null): CrmShopifyCustomer[] {
    if (!email) return []
    const host = normalizeShopDomain(domain)
    const matches = this.byEmail.get(email.toLowerCase().trim()) ?? []
    return matches.filter((c) => {
      const other =
        normalizeShopDomain(c.shopify_shop_domain) ?? normalizeShopDomain(c.store_url)
      return !!host && !!other && other !== host
    })
  }
}

function preferCanonical(candidate: CrmShopifyCustomer, existing: CrmShopifyCustomer): boolean {
  if (existing.billing_channel === 'stripe' && candidate.billing_channel !== 'stripe') return false
  if (candidate.billing_channel === 'stripe' && existing.billing_channel !== 'stripe') return true
  return false
}

export async function loadShopifyCustomerIndex(): Promise<ShopifyCustomerIndex> {
  const rows = await fetchAllRows<CrmShopifyCustomer>('crm_customers', CUSTOMER_COLUMNS)
  const index = new ShopifyCustomerIndex()
  for (const row of rows) index.add(row)
  return index
}

export async function hasConfirmedShopifyPayment(shopId: string): Promise<boolean> {
  const numeric = shopGidNumeric(shopId)
  if (!numeric) return false

  const { count, error } = await supabaseAdmin
    .from('crm_revenue_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('provider', 'shopify')
    .eq('status', 'succeeded')
    .in('transaction_type', [...CONFIRMED_SHOPIFY_PAYMENT_TYPES])
    .gt('amount', 0)
    .eq('shopify_shop_id', numeric)

  if (error) {
    console.error('[Shopify Sync] hasConfirmedShopifyPayment error:', error.message)
    return false
  }

  if ((count ?? 0) > 0) return true

  const { count: gidCount, error: gidError } = await supabaseAdmin
    .from('crm_revenue_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('provider', 'shopify')
    .eq('status', 'succeeded')
    .in('transaction_type', [...CONFIRMED_SHOPIFY_PAYMENT_TYPES])
    .gt('amount', 0)
    .eq('shopify_shop_id', `gid://partners/Shop/${numeric}`)

  if (gidError) {
    console.error('[Shopify Sync] hasConfirmedShopifyPayment gid error:', gidError.message)
    return false
  }

  return (gidCount ?? 0) > 0
}

export async function loadConfirmedShopifyPaymentShopIds(): Promise<Set<string>> {
  const paid = new Set<string>()
  const PAGE = 1000
  let from = 0
  for (;;) {
    const { data, error } = await supabaseAdmin
      .from('crm_revenue_transactions')
      .select('shopify_shop_id, shopify_shop_domain, crm_customer_id')
      .eq('provider', 'shopify')
      .eq('status', 'succeeded')
      .in('transaction_type', [...CONFIRMED_SHOPIFY_PAYMENT_TYPES])
      .gt('amount', 0)
      .range(from, from + PAGE - 1)

    if (error) {
      console.error('[Shopify Sync] loadConfirmedShopifyPaymentShopIds:', error.message)
      break
    }
    for (const row of data ?? []) {
      const numeric = shopGidNumeric(row.shopify_shop_id)
      if (numeric) paid.add(numeric)
      const domain = normalizeShopDomain(row.shopify_shop_domain)
      if (domain) paid.add(`domain:${domain}`)
      if (row.crm_customer_id) paid.add(`customer:${row.crm_customer_id}`)
    }
    if (!data || data.length < PAGE) break
    from += PAGE
  }
  return paid
}

export function shopHasConfirmedPayment(
  paid: Set<string>,
  shop: { shopId?: string | null; domain?: string | null; customerId?: string | null }
): boolean {
  const numeric = shopGidNumeric(shop.shopId)
  if (numeric && paid.has(numeric)) return true
  const domain = normalizeShopDomain(shop.domain)
  if (domain && paid.has(`domain:${domain}`)) return true
  if (shop.customerId && paid.has(`customer:${shop.customerId}`)) return true
  return false
}

function flatRateAmountFromItems(
  items: ShopifyActiveSubscription['items'] | undefined
): number | null {
  if (!items?.length) return null
  for (const item of items) {
    if (item.price?.__typename === 'FlatRatePrice' && item.price.amount) {
      const amount = parseFloat(item.price.amount)
      if (Number.isFinite(amount) && amount > 0) return amount
    }
  }
  return null
}

export function deriveShopifyLifecycle(input: {
  activeSub: ShopifyActiveSubscription | null
  events: Array<Pick<ShopifyPartnerEvent, 'eventType' | 'state' | 'occurredAt' | 'cancelEffectiveOn' | 'plan'>>
  now?: Date
}): DerivedShopifyLifecycle {
  const now = input.now ?? new Date()
  const events = [...input.events].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
  )

  const subscriptionEvents = events.filter((e) => e.eventType.startsWith('SUBSCRIPTION_'))
  const latest = subscriptionEvents[subscriptionEvents.length - 1] ?? null
  const created = subscriptionEvents.find((e) => e.eventType === 'SUBSCRIPTION_CREATED') ?? subscriptionEvents[0]
  const canceledEvent = [...subscriptionEvents].reverse().find(
    (e) => e.eventType === 'SUBSCRIPTION_CANCELED' || e.state === 'CANCELED'
  )
  const scheduledEvent = [...subscriptionEvents].reverse().find(
    (e) => e.eventType === 'SUBSCRIPTION_CANCELLATION_SCHEDULED' || e.state === 'CANCELLATION_SCHEDULED'
  )

  const lastFrozenIdx = lastIndex(subscriptionEvents, (e) => e.eventType === 'SUBSCRIPTION_FROZEN' || e.state === 'FROZEN')
  const lastUnfrozenIdx = lastIndex(subscriptionEvents, (e) => e.eventType === 'SUBSCRIPTION_UNFROZEN' || e.state === 'UNFROZEN')
  const isFrozen = lastFrozenIdx >= 0 && lastFrozenIdx > lastUnfrozenIdx
  const freezeOccurredAt = lastFrozenIdx >= 0 ? subscriptionEvents[lastFrozenIdx].occurredAt : null
  const unfrozenOccurredAt = lastUnfrozenIdx >= 0 ? subscriptionEvents[lastUnfrozenIdx].occurredAt : null

  const lastDeactivatedIdx = lastIndex(
    events,
    (e) => e.eventType === 'RELATIONSHIP_DEACTIVATED' || e.eventType === 'RELATIONSHIP_UNINSTALLED'
  )
  const lastReactivatedIdx = lastIndex(
    events,
    (e) => e.eventType === 'RELATIONSHIP_REACTIVATED' || e.eventType === 'RELATIONSHIP_INSTALLED'
  )
  const isDeactivated = lastDeactivatedIdx >= 0 && lastDeactivatedIdx > lastReactivatedIdx

  const activeSub = input.activeSub
  const inTrial = !!(
    activeSub &&
    activeSub.trialEndsAt &&
    new Date(activeSub.trialEndsAt) > now &&
    !activeSub.currentBillingCycle
  )

  let lifecycle: ShopifyLifecycleState = 'NONE'
  if (isFrozen) {
    lifecycle = 'FROZEN'
  } else if (activeSub) {
    if (activeSub.cancelAtEndOfCycle) lifecycle = 'CANCELLATION_SCHEDULED'
    else if (inTrial) lifecycle = 'TRIAL'
    else lifecycle = 'ACTIVE'
  } else if (latest?.eventType === 'SUBSCRIPTION_CANCELED' || latest?.state === 'CANCELED') {
    lifecycle = 'CANCELED'
  } else if (
    latest?.eventType === 'SUBSCRIPTION_CANCELLATION_SCHEDULED' ||
    latest?.state === 'CANCELLATION_SCHEDULED'
  ) {
    lifecycle = 'CANCELLATION_SCHEDULED'
  } else if (subscriptionEvents.length > 0 || isDeactivated) {
    lifecycle = 'CANCELED'
  }

  const shopifyStatus = lifecycle

  return {
    lifecycle,
    shopifyStatus,
    trialEndsAt: activeSub?.trialEndsAt ?? null,
    cancelledAt: canceledEvent?.occurredAt ?? (lifecycle === 'CANCELED' ? latest?.occurredAt ?? null : null),
    cancelEffectiveOn:
      scheduledEvent?.cancelEffectiveOn ??
      canceledEvent?.cancelEffectiveOn ??
      latest?.cancelEffectiveOn ??
      (activeSub?.cancelAtEndOfCycle ? activeSub.currentBillingCycle?.endTime ?? null : null),
    cancelAtEndOfCycle: activeSub?.cancelAtEndOfCycle ?? lifecycle === 'CANCELLATION_SCHEDULED',
    subscriptionCreatedAt: created?.occurredAt ?? null,
    billingInterval: activeSub?.billingPeriod ?? latest?.plan?.billingPeriod ?? null,
    flatRateAmount: flatRateAmountFromItems(activeSub?.items),
    subscriptionId: activeSub?.legacySubscriptionId ?? null,
    pendingUpdate: activeSub?.pendingUpdate ?? null,
    freezeOccurredAt,
    unfrozenOccurredAt,
  }
}

function lastIndex<T>(items: T[], pred: (item: T) => boolean): number {
  for (let i = items.length - 1; i >= 0; i--) {
    if (pred(items[i])) return i
  }
  return -1
}

export function toSubscriptionEventRow(
  event: ShopifyPartnerEvent,
  customerId: string | null
) {
  return {
    shopify_event_id: event.id,
    crm_customer_id: customerId,
    shopify_shop_id: shopGidNumeric(event.shop?.id),
    shopify_shop_domain: event.shop?.myshopifyDomain ?? null,
    event_type: event.eventType,
    state: event.state ?? null,
    occurred_at: event.occurredAt,
    cancel_effective_on: event.cancelEffectiveOn ?? null,
    plan_handle: event.plan?.handle ?? null,
    billing_period: event.plan?.billingPeriod ?? null,
    details: {
      typename: event.__typename,
      shopName: event.shop?.name ?? null,
      plan: event.plan ?? null,
    },
  }
}

async function lookupExistingShopifyCustomer(shop: ShopifyShopRef): Promise<CrmShopifyCustomer | null> {
  const numeric = shopGidNumeric(shop.shopId)
  if (numeric) {
    const { data } = await supabaseAdmin
      .from('crm_customers')
      .select(CUSTOMER_COLUMNS)
      .eq('shopify_shop_id', numeric)
      .limit(5)
    const rows = (data ?? []) as CrmShopifyCustomer[]
    if (rows.length) {
      return rows.reduce((best, row) => (preferCanonical(row, best) ? row : best))
    }
  }

  const host = normalizeShopDomain(shop.domain)
  if (!host || !/^[a-z0-9.-]+$/.test(host)) return null

  const { data } = await supabaseAdmin
    .from('crm_customers')
    .select(CUSTOMER_COLUMNS)
    .or(
      `shopify_shop_domain.eq.${host},shopify_shop_domain.eq.https://${host},store_url.eq.https://${host},store_url.eq.${host},store_url.eq.https://${host}/`
    )
    .limit(20)

  const matches = ((data ?? []) as CrmShopifyCustomer[]).filter((row) => {
    const other = normalizeShopDomain(row.shopify_shop_domain) ?? normalizeShopDomain(row.store_url)
    return other === host
  })
  if (!matches.length) return null
  return matches.reduce((best, row) => (preferCanonical(row, best) ? row : best))
}

export async function findOrCreateShopifyCustomer(
  index: ShopifyCustomerIndex,
  shop: ShopifyShopRef,
  subscriptionId: string | null
): Promise<{ customer: CrmShopifyCustomer | null; created: boolean; skippedStripe: boolean; skippedMissing: boolean }> {
  if (!shop.shopId && !shop.domain && !subscriptionId) {
    return {
      customer: null,
      created: false,
      skippedStripe: false,
      skippedMissing: true,
    }
  }

  const existing =
    index.find(shop.shopId, subscriptionId, shop.domain) ?? (await lookupExistingShopifyCustomer(shop))
  if (existing) {
    index.add(existing)
    const matchBy =
      shopGidNumeric(existing.shopify_shop_id) && shopGidNumeric(existing.shopify_shop_id) === shopGidNumeric(shop.shopId)
        ? 'shop id'
        : 'store URL'
    if (isStripeAuthoritative(existing.billing_channel)) {
      console.log(
        `[Shopify Sync] Existing Stripe billing record found (${existing.id}) for ${shop.domain ?? shop.shopId}; matching by ${matchBy}`
      )
    } else {
      console.log(
        `[Shopify Sync] Shopify shop matched existing CRM customer ${existing.id} by ${matchBy}`
      )
    }

    const patch: Record<string, unknown> = {}
    if (shop.shopId && !existing.shopify_shop_id) patch.shopify_shop_id = shop.shopId
    if (shop.domain && !existing.shopify_shop_domain) patch.shopify_shop_domain = shop.domain
    if (subscriptionId && !existing.shopify_subscription_id) patch.shopify_subscription_id = subscriptionId
    if (shop.name && !existing.name) patch.name = shop.name
    if (shop.domain && !existing.store_url) patch.store_url = `https://${shop.domain}`

    if (Object.keys(patch).length > 0) {
      await supabaseAdmin.from('crm_customers').update(patch).eq('id', existing.id)
      const updated = { ...existing, ...patch } as CrmShopifyCustomer
      index.add(updated)
      return {
        customer: updated,
        created: false,
        skippedStripe: isStripeAuthoritative(existing.billing_channel),
        skippedMissing: false,
      }
    }

    return {
      customer: existing,
      created: false,
      skippedStripe: isStripeAuthoritative(existing.billing_channel),
      skippedMissing: false,
    }
  }

  const insert = {
    shopify_shop_id: shop.shopId || null,
    shopify_shop_domain: shop.domain,
    shopify_subscription_id: subscriptionId,
    name: shop.name,
    store_url: shop.domain ? `https://${shop.domain}` : null,
    billing_channel: 'shopify',
    user_type: 'standard',
    source: 'shopify',
    client_status: 'prospect',
    last_synced_at: new Date().toISOString(),
  }

  const { data, error } = await supabaseAdmin
    .from('crm_customers')
    .insert(insert)
    .select(CUSTOMER_COLUMNS)
    .single()

  if (error) {
    const raced = await lookupExistingShopifyCustomer(shop)
    if (raced) {
      index.add(raced)
      return {
        customer: raced,
        created: false,
        skippedStripe: isStripeAuthoritative(raced.billing_channel),
        skippedMissing: false,
      }
    }
    throw new Error(`Create Shopify customer failed: ${error.message}`)
  }

  const customer = data as CrmShopifyCustomer
  index.add(customer)
  return { customer, created: true, skippedStripe: false, skippedMissing: false }
}

export function shopifyCustomerUpdateFromLifecycle(input: {
  customer: CrmShopifyCustomer
  shop: ShopifyShopRef
  derived: DerivedShopifyLifecycle
  hasConfirmedPayment: boolean
}): { record: Record<string, unknown>; nextStatus: string | null; stripePreserved: boolean } {
  const metadata: Record<string, unknown> = {
    shopify_shop_id: input.shop.shopId || input.customer.shopify_shop_id,
    shopify_shop_domain: input.shop.domain ?? input.customer.shopify_shop_domain,
    shopify_subscription_id: input.derived.subscriptionId ?? input.customer.shopify_subscription_id,
    shopify_subscription_status: input.derived.shopifyStatus,
    shopify_subscription_created_at:
      input.derived.subscriptionCreatedAt ?? input.customer.shopify_subscription_created_at,
    shopify_trial_ends_at: input.derived.trialEndsAt ?? input.customer.shopify_trial_ends_at,
    shopify_cancelled_at: input.derived.cancelledAt ?? input.customer.shopify_cancelled_at,
    shopify_cancel_effective_on:
      input.derived.cancelEffectiveOn ?? input.customer.shopify_cancel_effective_on,
    shopify_billing_interval: input.derived.billingInterval,
    shopify_subscription_amount: input.derived.flatRateAmount,
    shopify_cancel_at_end_of_cycle: input.derived.cancelAtEndOfCycle,
    shopify_pending_update: input.derived.pendingUpdate,
    shopify_last_status_sync_at: new Date().toISOString(),
    last_synced_at: new Date().toISOString(),
    ...(input.shop.name && !input.customer.name ? { name: input.shop.name } : {}),
    ...(input.shop.domain && !input.customer.store_url ? { store_url: `https://${input.shop.domain}` } : {}),
  }

  if (isStripeAuthoritative(input.customer.billing_channel)) {
    console.log(`[Shopify Sync] Preserving Stripe billing authority for ${input.customer.id}`)
    return { record: metadata, nextStatus: null, stripePreserved: true }
  }

  const confirmedRevenue = input.hasConfirmedPayment ? 1 : 0
  const nextStatus = resolveClientStatus({
    userType: input.customer.user_type,
    billingChannel: 'shopify',
    shopifyLifecycle: input.derived.lifecycle,
    confirmedRevenue,
  })

  if (input.derived.lifecycle === 'FROZEN') {
    console.log(
      `[Shopify Sync] Shopify subscription frozen shop=${input.shop.shopId || input.shop.domain} historical_paid=${input.hasConfirmedPayment}`
    )
    console.log('[Shopify Sync] Setting client_status=Canceled')
  } else if (input.derived.unfrozenOccurredAt && input.derived.lifecycle !== 'FROZEN') {
    console.log(
      `[Shopify Sync] Shopify subscription unfrozen shop=${input.shop.shopId || input.shop.domain} Historical revenue=${input.hasConfirmedPayment ? '>0' : '$0'}`
    )
    console.log(`[Shopify Sync] Setting client_status=${nextStatus}`)
  }

  const calculatedMrr = shopifyFlatRateMrr({
    lifecycle: input.derived.lifecycle,
    billingPeriod: input.derived.billingInterval,
    flatRateAmount: input.derived.flatRateAmount,
  })

  const cancellationDate =
    nextStatus === 'canceled'
      ? input.derived.lifecycle === 'FROZEN'
        ? input.derived.freezeOccurredAt ?? input.derived.cancelledAt ?? input.customer.cancellation_date
        : input.derived.cancelEffectiveOn ??
          input.derived.cancelledAt ??
          input.derived.freezeOccurredAt ??
          input.customer.cancellation_date
      : nextStatus === 'active_customer' || nextStatus === 'in_trial'
        ? null
        : input.customer.cancellation_date

  return {
    nextStatus,
    stripePreserved: false,
    record: {
      ...metadata,
      billing_channel: 'shopify',
      client_status: nextStatus,
      calculated_mrr: calculatedMrr,
      cancellation_date: cancellationDate,
    },
  }
}

export async function loadEventsForShop(shopId: string): Promise<ShopifyPartnerEvent[]> {
  const numeric = shopGidNumeric(shopId)
  if (!numeric) return []
  const { data, error } = await supabaseAdmin
    .from('crm_shopify_subscription_events')
    .select('shopify_event_id, event_type, state, occurred_at, cancel_effective_on, plan_handle, billing_period, shopify_shop_id, shopify_shop_domain')
    .eq('shopify_shop_id', numeric)
    .order('occurred_at', { ascending: true })
    .limit(500)

  if (error) {
    console.error('[Shopify Sync] loadEventsForShop:', error.message)
    return []
  }

  return (data ?? []).map((row) => ({
    id: row.shopify_event_id,
    __typename: 'SubscriptionStatus',
    occurredAt: row.occurred_at,
    eventType: row.event_type,
    shop: row.shopify_shop_id
      ? { id: row.shopify_shop_id, myshopifyDomain: row.shopify_shop_domain ?? '', name: '' }
      : null,
    state: row.state,
    cancelEffectiveOn: row.cancel_effective_on,
    plan: { handle: row.plan_handle, billingPeriod: row.billing_period, trialDays: null },
  }))
}

export async function loadShopsToProcess(index: ShopifyCustomerIndex): Promise<ShopifyShopRef[]> {
  const shops = new Map<string, ShopifyShopRef>()

  for (const customer of index.byId.values()) {
    const shopId = shopGidNumeric(customer.shopify_shop_id)
    const domain = normalizeShopDomain(customer.shopify_shop_domain) ?? normalizeShopDomain(customer.store_url)
    if (!shopId && !domain) continue
    const key = shopId ?? `domain:${domain}`
    if (!shops.has(key)) {
      shops.set(key, { shopId: shopId ?? '', domain, name: customer.name })
    }
  }

  const PAGE = 1000
  let from = 0
  for (;;) {
    const { data, error } = await supabaseAdmin
      .from('crm_shopify_subscription_events')
      .select('shopify_shop_id, shopify_shop_domain, event_type')
      .range(from, from + PAGE - 1)
    if (error) {
      console.error('[Shopify Sync] loadShopsToProcess events:', error.message)
      break
    }
    for (const row of data ?? []) {
      if (!String(row.event_type ?? '').startsWith('SUBSCRIPTION_')) continue
      const shopId = shopGidNumeric(row.shopify_shop_id)
      const domain = normalizeShopDomain(row.shopify_shop_domain)
      if (!shopId && !domain) continue
      const key = shopId ?? `domain:${domain}`
      if (!shops.has(key)) shops.set(key, { shopId: shopId ?? '', domain, name: null })
    }
    if (!data || data.length < PAGE) break
    from += PAGE
  }

  from = 0
  for (;;) {
    const { data, error } = await supabaseAdmin
      .from('crm_revenue_transactions')
      .select('shopify_shop_id, shopify_shop_domain')
      .eq('provider', 'shopify')
      .range(from, from + PAGE - 1)
    if (error) {
      console.error('[Shopify Sync] loadShopsToProcess txns:', error.message)
      break
    }
    for (const row of data ?? []) {
      const shopId = shopGidNumeric(row.shopify_shop_id)
      const domain = normalizeShopDomain(row.shopify_shop_domain)
      if (!shopId && !domain) continue
      const key = shopId ?? `domain:${domain}`
      if (!shops.has(key)) shops.set(key, { shopId: shopId ?? '', domain, name: null })
    }
    if (!data || data.length < PAGE) break
    from += PAGE
  }

  return [...shops.values()].filter((s) => s.shopId || s.domain)
}
