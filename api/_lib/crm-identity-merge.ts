/**
 * Copy spreadsheet identity/overrides onto the canonical MyShopify record.
 * Does not delete duplicate rows.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { myshopifyDomainFromUnknown } from './shopify-lifecycle.js'
import { shopGidNumeric } from './shopify.js'

type Row = {
  id: string
  email: string | null
  name: string | null
  notes: string | null
  billing_channel: string | null
  store_url: string | null
  shopify_shop_id: string | null
  shopify_shop_domain: string | null
  stripe_customer_id: string | null
  signup_date: string | null
  cancellation_date: string | null
  mrr_override: number | null
  total_revenue_override: number | null
  calculated_mrr: number | null
}

function rank(row: Row): number {
  let score = 0
  if (row.billing_channel === 'stripe') score += 100
  if (shopGidNumeric(row.shopify_shop_id)) score += 50
  if (row.billing_channel === 'shopify') score += 20
  if (row.email) score += 2
  if (row.mrr_override != null || row.total_revenue_override != null) score += 1
  return score
}

function pickCanonical(rows: Row[]): Row {
  return [...rows].sort((a, b) => rank(b) - rank(a))[0]
}

export async function copyCanonicalMyshopifyFields(
  supabase: SupabaseClient,
  opts: { skipCopy?: boolean } = {}
): Promise<{
  groups: number
  copied: number
  billingUpdated: number
}> {
  const PAGE = 1000
  const customers: Row[] = []
  let from = 0
  for (;;) {
    const { data, error } = await supabase
      .from('crm_customers')
      .select(
        'id, email, name, notes, billing_channel, store_url, shopify_shop_id, shopify_shop_domain, stripe_customer_id, signup_date, cancellation_date, mrr_override, total_revenue_override, calculated_mrr'
      )
      .range(from, from + PAGE - 1)
    if (error) throw error
    customers.push(...((data ?? []) as Row[]))
    if (!data || data.length < PAGE) break
    from += PAGE
  }

  const groups = new Map<string, Row[]>()
  for (const row of customers) {
    const domain = myshopifyDomainFromUnknown(row.shopify_shop_domain) ?? myshopifyDomainFromUnknown(row.store_url)
    if (!domain) continue
    const list = groups.get(domain) ?? []
    list.push(row)
    groups.set(domain, list)
  }

  let copied = 0
  if (!opts.skipCopy) {
  for (const [domain, rows] of groups) {
    if (rows.length < 2) continue
    const stripeIds = new Set(rows.map((r) => r.stripe_customer_id).filter(Boolean))
    if (stripeIds.size > 1) {
      console.log(`[CRM Identity] Skipping ambiguous Stripe IDs for ${domain}`)
      continue
    }
    const canonical = pickCanonical(rows)
    const patch: Record<string, unknown> = {}
    for (const other of rows) {
      if (other.id === canonical.id) continue
      if (!canonical.email && other.email) patch.email = other.email
      if (!canonical.name && other.name) patch.name = other.name
      if (!canonical.notes && other.notes) patch.notes = other.notes
      if (!canonical.signup_date && other.signup_date) patch.signup_date = other.signup_date
      if (canonical.mrr_override == null && other.mrr_override != null) patch.mrr_override = other.mrr_override
      if (canonical.total_revenue_override == null && other.total_revenue_override != null) {
        patch.total_revenue_override = other.total_revenue_override
      }
      if (
        (canonical.calculated_mrr == null || Number(canonical.calculated_mrr) === 0) &&
        other.calculated_mrr != null &&
        Number(other.calculated_mrr) > 0
      ) {
        patch.calculated_mrr = other.calculated_mrr
      }
      if (!canonical.cancellation_date && other.cancellation_date) patch.cancellation_date = other.cancellation_date
      // Never copy shopify_shop_id / stripe_customer_id: unique indexes still
      // belong to the source row until an explicit merge/delete.
    }
    if (canonical.billing_channel !== 'stripe') {
      patch.billing_channel = 'shopify'
      patch.store_url = `https://${domain}`
      patch.shopify_shop_domain = domain
    } else if (domain && !canonical.shopify_shop_domain) {
      patch.shopify_shop_domain = domain
    }

    if (Object.keys(patch).length) {
      const { error } = await supabase.from('crm_customers').update(patch).eq('id', canonical.id)
      if (error) console.error('[CRM Identity] canonical update', canonical.id, error.message)
      else copied++
    }

    if (canonical.billing_channel !== 'stripe') {
      for (const other of rows) {
        if (other.id === canonical.id) continue
        await supabase
          .from('crm_revenue_transactions')
          .update({ crm_customer_id: canonical.id })
          .eq('crm_customer_id', other.id)
          .eq('provider', 'shopify')
        await supabase
          .from('crm_shopify_subscription_events')
          .update({ crm_customer_id: canonical.id })
          .eq('crm_customer_id', other.id)
      }
    }
  }
  }

  const billingPatches: Array<{ id: string; patch: Record<string, unknown> }> = []
  for (const row of customers) {
    const domain = myshopifyDomainFromUnknown(row.shopify_shop_domain) ?? myshopifyDomainFromUnknown(row.store_url)
    if (!domain) continue
    const dirty =
      /[;,]/.test(row.store_url ?? '') ||
      /[;,]/.test(row.shopify_shop_domain ?? '') ||
      ((row.store_url ?? '').includes('myshopify.com') && row.store_url !== `https://${domain}`) ||
      ((row.shopify_shop_domain ?? '').includes('myshopify.com') && row.shopify_shop_domain !== domain)
    const stripeOwned = row.billing_channel === 'stripe' || !!row.stripe_customer_id
    if (stripeOwned) {
      if (!dirty) continue
      billingPatches.push({
        id: row.id,
        patch: {
          shopify_shop_domain: domain,
          store_url: `https://${domain}`,
        },
      })
      continue
    }
    if (row.billing_channel === 'shopify' && !dirty) continue
    billingPatches.push({
      id: row.id,
      patch: {
        billing_channel: 'shopify',
        shopify_shop_domain: domain,
        store_url: `https://${domain}`,
      },
    })
  }
  let billingUpdated = 0
  for (let i = 0; i < billingPatches.length; i += 20) {
    const batch = billingPatches.slice(i, i + 20)
    const results = await Promise.all(
      batch.map(({ id, patch }) => supabase.from('crm_customers').update(patch).eq('id', id))
    )
    for (const result of results) {
      if (result.error) console.error('[CRM Identity] billing update', result.error.message)
      else billingUpdated++
    }
  }

  return { groups: [...groups.values()].filter((g) => g.length > 1).length, copied, billingUpdated }
}
