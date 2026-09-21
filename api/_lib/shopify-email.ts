import { supabaseAdmin } from './supabase-admin.js'
import {
  isStripeAuthoritative,
  myshopifyDomainFromUnknown,
  type CrmShopifyCustomer,
} from './shopify-lifecycle.js'
import {
  fetchShopifyShopEmail,
  isShopifyAdminConfigured,
  pauseBetweenShopEmailLookups,
  shopifyAdminConfigError,
} from './shopify-admin.js'

export type ShopifyEmailFillReason = 'created' | 'trial' | 'backfill'

export function shouldFillShopifyMerchantEmail(input: {
  customer: Pick<CrmShopifyCustomer, 'email' | 'billing_channel' | 'client_status'>
  created?: boolean
  lifecycle?: string | null
  reason?: ShopifyEmailFillReason
}): boolean {
  if (isStripeAuthoritative(input.customer.billing_channel)) return false
  if (input.customer.billing_channel !== 'shopify' && input.reason !== 'created') return false
  if (input.customer.email?.trim()) return false
  if (input.reason === 'backfill') return true
  if (input.created) return true
  if (input.lifecycle === 'TRIAL') return true
  return input.customer.client_status === 'in_trial'
}

export async function fillShopifyMerchantEmail(input: {
  customerId: string
  domain: string | null | undefined
}): Promise<{ email: string | null; updated: boolean }> {
  const { data: current, error: loadErr } = await supabaseAdmin
    .from('crm_customers')
    .select('id, email, billing_channel')
    .eq('id', input.customerId)
    .maybeSingle()
  if (loadErr) throw new Error(loadErr.message)
  if (!current) throw new Error(`Customer ${input.customerId} not found`)
  if (isStripeAuthoritative(current.billing_channel)) return { email: null, updated: false }
  if (current.email?.trim()) return { email: current.email, updated: false }

  const email = await fetchShopifyShopEmail(input.domain)
  if (!email) return { email: null, updated: false }

  const { error } = await supabaseAdmin
    .from('crm_customers')
    .update({ email })
    .eq('id', input.customerId)
  if (error) throw new Error(error.message)
  return { email, updated: true }
}

export interface ShopifyTrialEmailBackfillResult {
  eligible: number
  emailsFound: number
  updated: number
  noEmailReturned: number
  skippedExistingEmail: number
  skippedNoShopIdentity: number
  errors: Array<{ message: string; record?: string }>
}

const TRIAL_COLUMNS =
  'id, email, billing_channel, client_status, shopify_shop_domain, store_url, shopify_shop_id'

/**
 * One-time/manual: Shopify-billed In Trial customers only.
 * Updates email and nothing else.
 */
export async function backfillShopifyTrialEmails(): Promise<ShopifyTrialEmailBackfillResult> {
  if (!isShopifyAdminConfigured()) {
    throw new Error(shopifyAdminConfigError())
  }

  const result: ShopifyTrialEmailBackfillResult = {
    eligible: 0,
    emailsFound: 0,
    updated: 0,
    noEmailReturned: 0,
    skippedExistingEmail: 0,
    skippedNoShopIdentity: 0,
    errors: [],
  }

  const PAGE = 1000
  const rows: Array<{
    id: string
    email: string | null
    billing_channel: string | null
    client_status: string | null
    shopify_shop_domain: string | null
    store_url: string | null
    shopify_shop_id: string | null
  }> = []
  let from = 0
  for (;;) {
    const { data, error } = await supabaseAdmin
      .from('crm_customers')
      .select(TRIAL_COLUMNS)
      .eq('client_status', 'in_trial')
      .eq('billing_channel', 'shopify')
      .range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    rows.push(...((data ?? []) as typeof rows))
    if (!data || data.length < PAGE) break
    from += PAGE
  }

  result.eligible = rows.length

  let requested = false
  for (const row of rows) {
    if (row.email?.trim()) {
      result.skippedExistingEmail++
      continue
    }
    const domain = myshopifyDomainFromUnknown(row.shopify_shop_domain) ?? myshopifyDomainFromUnknown(row.store_url)
    if (!domain) {
      result.skippedNoShopIdentity++
      continue
    }
    if (requested) await pauseBetweenShopEmailLookups()
    requested = true
    try {
      const filled = await fillShopifyMerchantEmail({ customerId: row.id, domain })
      if (!filled.email) {
        result.noEmailReturned++
        continue
      }
      result.emailsFound++
      if (filled.updated) result.updated++
    } catch (e) {
      result.errors.push({
        message: e instanceof Error ? e.message : String(e),
        record: domain,
      })
    }
  }

  return result
}
