/**
 * Narrow Boardroom → CRM email enrichment.
 * Writes crm_customers.email only when it is blank and there is exactly one match.
 */

import { supabaseAdmin } from './supabase-admin.js'
import { myshopifyDomainFromUnknown } from './shopify-lifecycle.js'
import {
  boardroomCrmApiConfigError,
  fetchBoardroomUsersForEmailLookup,
  isBoardroomCrmApiConfigured,
  type BoardroomEmailSourceUser,
} from './boardroom-crm-api.js'

export type BoardroomEmailMatch =
  | { status: 'match'; userId: string; email: string }
  | { status: 'ambiguous'; userIds: string[] }
  | { status: 'missing_email'; userId: string }
  | { status: 'no_match' }

type DomainUsers = Map<string, { email: string | null }>

export interface BoardroomEmailSyncResult {
  checked: number
  updated: number
  already_had_email: number
  no_match: number
  ambiguous: number
  missing_boardroom_email: number
  no_myshopify_domain: number
  skipped_stripe: number
  errors: number
  errorDetails: Array<{ message: string; record?: string }>
}

export function crmMyshopifyDomain(
  shopifyShopDomain: string | null | undefined,
  storeUrl: string | null | undefined
): string | null {
  return myshopifyDomainFromUnknown(shopifyShopDomain) ?? myshopifyDomainFromUnknown(storeUrl)
}

export function buildBoardroomEmailLookup(
  users: BoardroomEmailSourceUser[]
): Map<string, DomainUsers> {
  const lookup = new Map<string, DomainUsers>()
  for (const user of users) {
    for (const domain of user.shopifyDomains) {
      let byUser = lookup.get(domain)
      if (!byUser) {
        byUser = new Map()
        lookup.set(domain, byUser)
      }
      const existing = byUser.get(user.id)
      if (!existing?.email && user.email) {
        byUser.set(user.id, { email: user.email })
      } else if (!existing) {
        byUser.set(user.id, { email: user.email })
      }
    }
  }
  return lookup
}

export function lookupBoardroomEmail(
  lookup: Map<string, DomainUsers>,
  domain: string | null | undefined
): BoardroomEmailMatch {
  if (!domain) return { status: 'no_match' }
  const byUser = lookup.get(domain)
  if (!byUser || byUser.size === 0) return { status: 'no_match' }
  const userIds = [...byUser.keys()]
  if (userIds.length > 1) return { status: 'ambiguous', userIds }
  const userId = userIds[0]!
  const email = byUser.get(userId)?.email?.trim() || null
  if (!email) return { status: 'missing_email', userId }
  return { status: 'match', userId, email }
}

function blankEmail(value: string | null | undefined): boolean {
  return !value?.trim()
}

export function isEligibleShopifyEmailCandidate(input: {
  billing_channel: string | null | undefined
  email: string | null | undefined
}): { eligible: boolean; alreadyHadEmail: boolean; skippedStripe: boolean } {
  if (input.billing_channel === 'stripe') {
    return { eligible: false, alreadyHadEmail: false, skippedStripe: true }
  }
  if (input.billing_channel !== 'shopify') {
    return { eligible: false, alreadyHadEmail: false, skippedStripe: false }
  }
  if (!blankEmail(input.email)) {
    return { eligible: false, alreadyHadEmail: true, skippedStripe: false }
  }
  return { eligible: true, alreadyHadEmail: false, skippedStripe: false }
}

const CANDIDATE_COLUMNS = 'id, email, billing_channel, shopify_shop_domain, store_url'

async function fetchShopifyCustomers(): Promise<
  Array<{
    id: string
    email: string | null
    billing_channel: string | null
    shopify_shop_domain: string | null
    store_url: string | null
  }>
> {
  const PAGE = 1000
  const rows: Array<{
    id: string
    email: string | null
    billing_channel: string | null
    shopify_shop_domain: string | null
    store_url: string | null
  }> = []
  let from = 0
  for (;;) {
    const { data, error } = await supabaseAdmin
      .from('crm_customers')
      .select(CANDIDATE_COLUMNS)
      .eq('billing_channel', 'shopify')
      .range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    rows.push(...((data ?? []) as typeof rows))
    if (!data || data.length < PAGE) break
    from += PAGE
  }
  return rows
}

async function updateBlankShopifyEmail(customerId: string, email: string): Promise<boolean> {
  const { data: current, error: loadErr } = await supabaseAdmin
    .from('crm_customers')
    .select('id, email, billing_channel')
    .eq('id', customerId)
    .maybeSingle()
  if (loadErr) throw new Error(loadErr.message)
  if (!current) return false
  if (current.billing_channel !== 'shopify') return false
  if (!blankEmail(current.email)) return false

  const { error } = await supabaseAdmin.from('crm_customers').update({ email }).eq('id', customerId)
  if (error) throw new Error(error.message)
  return true
}

export async function enrichShopifyEmailsFromBoardroom(): Promise<BoardroomEmailSyncResult> {
  if (!isBoardroomCrmApiConfigured()) {
    throw new Error(boardroomCrmApiConfigError())
  }

  const result: BoardroomEmailSyncResult = {
    checked: 0,
    updated: 0,
    already_had_email: 0,
    no_match: 0,
    ambiguous: 0,
    missing_boardroom_email: 0,
    no_myshopify_domain: 0,
    skipped_stripe: 0,
    errors: 0,
    errorDetails: [],
  }

  const [boardroomUsers, customers] = await Promise.all([
    fetchBoardroomUsersForEmailLookup(),
    fetchShopifyCustomers(),
  ])
  const lookup = buildBoardroomEmailLookup(boardroomUsers)

  for (const row of customers) {
    const gate = isEligibleShopifyEmailCandidate(row)
    if (gate.skippedStripe) {
      result.skipped_stripe++
      continue
    }
    if (gate.alreadyHadEmail) {
      result.already_had_email++
      continue
    }
    if (!gate.eligible) continue

    result.checked++
    const domain = crmMyshopifyDomain(row.shopify_shop_domain, row.store_url)
    if (!domain) {
      result.no_myshopify_domain++
      continue
    }

    const match = lookupBoardroomEmail(lookup, domain)
    try {
      if (match.status === 'no_match') {
        result.no_match++
        continue
      }
      if (match.status === 'ambiguous') {
        result.ambiguous++
        continue
      }
      if (match.status === 'missing_email') {
        result.missing_boardroom_email++
        continue
      }
      const updated = await updateBlankShopifyEmail(row.id, match.email)
      if (updated) result.updated++
      else result.already_had_email++
    } catch (e) {
      result.errors++
      result.errorDetails.push({
        message: e instanceof Error ? e.message : String(e),
        record: domain,
      })
    }
  }

  return result
}
