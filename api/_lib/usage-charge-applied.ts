/**
 * Usage Charge Applied is an operational onboarding flag.
 * It flips to true when Partner API reports UsageChargeApplied
 * (an AppUsageRecord was created/applied), not when a sale is collected.
 */

import { supabaseAdmin } from './supabase-admin.js'

export function shopifyUsageChargeId(value: string | null | undefined): string | null {
  const raw = String(value ?? '').trim()
  return raw || null
}

export function isUsageChargeAppliedEvent(input: {
  typename?: string | null
  type?: string | null
  chargeId?: string | null
}): boolean {
  if (input.typename === 'UsageChargeApplied' || input.type === 'USAGE_CHARGE_APPLIED') {
    return !!shopifyUsageChargeId(input.chargeId)
  }
  return false
}

/**
 * Set Usage Charge Applied = Yes. Never writes No.
 * Stripe-billed rows are left unchanged.
 */
export async function markUsageChargeApplied(customerIds: string[]): Promise<number> {
  const ids = [...new Set(customerIds.filter(Boolean))]
  if (ids.length === 0) return 0
  let updated = 0
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50)
    const { data, error } = await supabaseAdmin
      .from('crm_customers')
      .update({ usage_charge_applied: true })
      .in('id', batch)
      .eq('billing_channel', 'shopify')
      .eq('usage_charge_applied', false)
      .select('id')
    if (error) {
      console.error('[Usage Charge Applied] mark failed:', error.message)
      continue
    }
    updated += data?.length ?? 0
  }
  return updated
}
