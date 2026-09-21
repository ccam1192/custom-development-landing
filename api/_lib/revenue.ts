/**
 * Total Revenue: live Stripe/Shopify ledger is the source of truth.
 * Spreadsheet total_revenue_override is a historical snapshot floor,
 * not a frozen cap. New collected payments must raise the displayed total.
 */

import { supabaseAdmin } from './supabase-admin.js'

export function displayedRevenue(
  override: number | null | undefined,
  calculated: number | null | undefined
): number {
  return Math.max(Number(override ?? 0), Number(calculated ?? 0))
}

export function nextCalculatedTotalRevenue(input: {
  existingCalculated?: number | null
  existingOverride?: number | null
  ledgerTotal: number
  newlyCollectedAmount?: number
}): number {
  const existingCalc = Number(input.existingCalculated ?? 0)
  const existingOverride = Number(input.existingOverride ?? 0)
  const ledger = Number(input.ledgerTotal ?? 0)
  let next = Math.max(ledger, existingCalc)
  const added = Number(input.newlyCollectedAmount ?? 0)
  if (added > 0) {
    next = Math.max(next, Math.max(existingOverride, existingCalc) + added)
  }
  return Math.round(next * 100) / 100
}

export async function attachOrphanStripeTransactions(stripeCustomerIds: string[]): Promise<number> {
  const ids = [...new Set(stripeCustomerIds.filter(Boolean))]
  if (ids.length === 0) return 0

  let attached = 0
  for (let i = 0; i < ids.length; i += 50) {
    const slice = ids.slice(i, i + 50)
    const { data: customers, error: custErr } = await supabaseAdmin
      .from('crm_customers')
      .select('id, stripe_customer_id, billing_channel')
      .in('stripe_customer_id', slice)
    if (custErr) {
      console.error('[Revenue] load customers for orphan attach:', custErr.message)
      continue
    }

    for (const customer of customers ?? []) {
      if (!customer.stripe_customer_id || customer.billing_channel === 'shopify') continue
      const { data, error } = await supabaseAdmin
        .from('crm_revenue_transactions')
        .update({ crm_customer_id: customer.id })
        .eq('provider', 'stripe')
        .eq('provider_customer_id', customer.stripe_customer_id)
        .is('crm_customer_id', null)
        .select('id')
      if (error) {
        console.error('[Revenue] attach orphans:', error.message)
        continue
      }
      attached += data?.length ?? 0
    }
  }
  return attached
}

export async function stripeLedgerTotal(customerId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('crm_revenue_transactions')
    .select('amount')
    .eq('crm_customer_id', customerId)
    .eq('provider', 'stripe')
    .eq('status', 'succeeded')
  if (error) {
    console.error('[Revenue] stripe ledger:', error.message)
    return 0
  }
  return Math.round((data ?? []).reduce((sum, t) => sum + Number(t.amount || 0), 0) * 100) / 100
}
