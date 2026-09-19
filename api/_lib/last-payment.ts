import { supabaseAdmin } from './supabase-admin.js'

export type LastPaymentProvider = 'stripe' | 'shopify'

export interface LastPaymentUpdate {
  customerId: string
  paymentAt: string
  provider: LastPaymentProvider
}

const COLLECTED_SHOPIFY_TYPES = new Set(['payment', 'app_usage_sale', 'app_subscription_sale'])

export function isLaterPayment(existing: string | null | undefined, next: string): boolean {
  const nextMs = new Date(next).getTime()
  if (!Number.isFinite(nextMs)) return false
  if (!existing) return true
  const prevMs = new Date(existing).getTime()
  if (!Number.isFinite(prevMs)) return true
  return nextMs > prevMs
}

export function billingAllowsProvider(
  billingChannel: string | null | undefined,
  provider: LastPaymentProvider
): boolean {
  if (provider === 'stripe') return billingChannel !== 'shopify'
  return billingChannel !== 'stripe'
}

export function isCollectedShopifyPayment(row: {
  status?: string | null
  transaction_type?: string | null
  amount?: number | null
  crm_customer_id?: string | null
}): boolean {
  if (!row.crm_customer_id) return false
  if (row.status !== 'succeeded') return false
  if (!COLLECTED_SHOPIFY_TYPES.has(String(row.transaction_type ?? ''))) return false
  return Number(row.amount) > 0
}

export async function existingProviderTxnIds(
  provider: LastPaymentProvider,
  providerTransactionIds: string[]
): Promise<Set<string>> {
  const ids = providerTransactionIds.filter(Boolean)
  const found = new Set<string>()
  for (let i = 0; i < ids.length; i += 200) {
    const slice = ids.slice(i, i + 200)
    const { data, error } = await supabaseAdmin
      .from('crm_revenue_transactions')
      .select('provider_transaction_id')
      .eq('provider', provider)
      .in('provider_transaction_id', slice)
    if (error) {
      console.error('[Last Payment] existingProviderTxnIds:', error.message)
      for (const id of slice) found.add(id)
      continue
    }
    for (const row of data ?? []) {
      if (row.provider_transaction_id) found.add(row.provider_transaction_id)
    }
  }
  return found
}

/**
 * Advance last_payment only for newly recorded confirmed payments,
 * never backward, and never across Stripe/Shopify billing authority.
 */
export async function advanceLastPayments(updates: LastPaymentUpdate[]): Promise<void> {
  const latest = new Map<string, LastPaymentUpdate>()
  for (const update of updates) {
    if (!update.customerId || !update.paymentAt) continue
    if (!Number.isFinite(new Date(update.paymentAt).getTime())) continue
    const prev = latest.get(update.customerId)
    if (!prev || isLaterPayment(prev.paymentAt, update.paymentAt)) {
      latest.set(update.customerId, update)
    }
  }
  if (latest.size === 0) return

  const ids = [...latest.keys()]
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50)
    const { data, error } = await supabaseAdmin
      .from('crm_customers')
      .select('id, last_payment, billing_channel')
      .in('id', batch)
    if (error) {
      console.error('[Last Payment] load customers:', error.message)
      continue
    }
    await Promise.all(
      (data ?? []).map(async (customer) => {
        const update = latest.get(customer.id)
        if (!update) return
        if (!billingAllowsProvider(customer.billing_channel, update.provider)) return
        if (!isLaterPayment(customer.last_payment, update.paymentAt)) return
        const { error: updErr } = await supabaseAdmin
          .from('crm_customers')
          .update({ last_payment: update.paymentAt })
          .eq('id', customer.id)
        if (updErr) console.error('[Last Payment] update failed:', updErr.message)
      })
    )
  }
}
