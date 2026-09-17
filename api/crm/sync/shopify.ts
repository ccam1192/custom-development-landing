import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../../_lib/auth.js'
import { supabaseAdmin, fetchAllRows } from '../../_lib/supabase-admin.js'
import {
  isShopifyConfigured,
  getAppTransactions,
  partnerRateLimitPause,
  type ShopifyTransaction,
} from '../../_lib/shopify.js'

export const config = { maxDuration: 300 }

/** Stay well under Vercel timeout. Browser will call this endpoint again to resume. */
const TIME_BUDGET_MS = 45_000

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const started = Date.now()

  try {
    const user = await requireAuth(req, res)
    if (!user) return

    if (!isShopifyConfigured()) {
      return res.status(503).json({
        error: 'Shopify Partner API not configured. Set SHOPIFY_PARTNER_ORG_ID, SHOPIFY_PARTNER_ACCESS_TOKEN, and SHOPIFY_APP_ID.',
      })
    }

    const { data: syncState } = await supabaseAdmin
      .from('crm_sync_state')
      .select('sync_cursor, last_successful_at')
      .eq('provider', 'shopify')
      .single()

    let cursor: string | null = syncState?.sync_cursor ?? null
    let createdAtMin: string | undefined
    if (!cursor && syncState?.last_successful_at) {
      createdAtMin = syncState.last_successful_at
    }

    const { data: syncLog } = await supabaseAdmin
      .from('crm_sync_logs')
      .insert({
        provider: 'shopify',
        sync_type: cursor ? 'resume' : createdAtMin ? 'incremental' : 'full',
      })
      .select('id')
      .single()

    const logId = syncLog?.id
    let processed = 0
    let created = 0
    let errors = 0
    const errorDetails: Array<{ message: string; record?: string }> = []
    let pages = 0
    let complete = false

    await supabaseAdmin
      .from('crm_sync_state')
      .update({ status: 'running', last_sync_at: new Date().toISOString(), error_message: null })
      .eq('provider', 'shopify')

    const shopCustomers = await fetchAllRows<{
      id: string
      shopify_shop_domain: string | null
      store_url: string | null
    }>('crm_customers', 'id, shopify_shop_domain, store_url')

    const crmByDomain = new Map<string, string>()
    for (const c of shopCustomers) {
      if (c.shopify_shop_domain) crmByDomain.set(c.shopify_shop_domain.toLowerCase(), c.id)
      if (c.store_url) {
        const host = String(c.store_url).replace(/^https?:\/\//, '').split('/')[0].toLowerCase()
        if (host) crmByDomain.set(host, c.id)
      }
    }

    while (Date.now() - started < TIME_BUDGET_MS) {
      if (pages > 0) await partnerRateLimitPause()

      const page = await getAppTransactions(cursor, createdAtMin)
      pages++

      const rows = page.transactions.map((tx) => toTxnRow(tx, crmByDomain))
      processed += rows.length

      for (let i = 0; i < rows.length; i += 200) {
        const batch = rows.slice(i, i + 200)
        const { error: upsertErr } = await supabaseAdmin
          .from('crm_revenue_transactions')
          .upsert(batch, { onConflict: 'provider,provider_transaction_id' })
        if (upsertErr) {
          errors++
          errorDetails.push({ message: `Upsert batch: ${upsertErr.message}` })
        } else {
          created += batch.length
        }
      }

      cursor = page.cursor
      await supabaseAdmin
        .from('crm_sync_state')
        .update({ sync_cursor: cursor, last_sync_at: new Date().toISOString() })
        .eq('provider', 'shopify')

      if (!page.hasNextPage || !page.cursor) {
        complete = true
        break
      }
    }

    if (complete) {
      await recalcShopifyRevenue(errorDetails)
      await supabaseAdmin
        .from('crm_sync_state')
        .update({
          status: 'idle',
          sync_cursor: null,
          last_successful_at: new Date().toISOString(),
          error_message: null,
        })
        .eq('provider', 'shopify')
    } else {
      await supabaseAdmin
        .from('crm_sync_state')
        .update({ status: 'idle', error_message: null })
        .eq('provider', 'shopify')
    }

    if (logId) {
      await supabaseAdmin
        .from('crm_sync_logs')
        .update({
          completed_at: new Date().toISOString(),
          status: errors > 0 ? 'failed' : 'completed',
          records_processed: processed,
          records_created: created,
          errors,
          error_details: errorDetails,
          metadata: { pages, complete, resumedFromCursor: !!syncState?.sync_cursor },
        })
        .eq('id', logId)
    }

    return res.json({
      success: true,
      complete,
      continue: !complete,
      processed,
      created,
      errors,
      pages,
      durationMs: Date.now() - started,
    })
  } catch (e) {
    const message = e instanceof Error ? `${e.message}\n${e.stack}` : String(e)
    console.error('[Shopify Sync] Fatal error:', message)

    try {
      await supabaseAdmin
        .from('crm_sync_state')
        .update({ status: 'idle', error_message: message.substring(0, 500) })
        .eq('provider', 'shopify')
    } catch { /* ignore */ }

    return res.status(500).json({ error: message.substring(0, 1000) })
  }
}

function toTxnRow(tx: ShopifyTransaction, crmByDomain: Map<string, string>) {
  const amount = parseFloat(tx.grossAmount?.amount ?? tx.netAmount?.amount ?? '0')
  let txType = 'payment'
  switch (tx.__typename) {
    case 'AppUsageSale':
      txType = 'app_usage_sale'
      break
    case 'AppSaleAdjustment':
      txType = 'app_sale_adjustment'
      break
    case 'AppSaleCredit':
      txType = 'app_sale_credit'
      break
  }
  const domain = tx.shop?.myshopifyDomain?.toLowerCase() ?? null
  return {
    provider: 'shopify',
    provider_transaction_id: tx.id,
    crm_customer_id: domain ? crmByDomain.get(domain) ?? null : null,
    amount: Math.abs(amount),
    currency: tx.grossAmount?.currencyCode ?? tx.netAmount?.currencyCode ?? 'USD',
    transaction_date: tx.createdAt,
    status: amount >= 0 ? 'succeeded' : 'adjusted',
    transaction_type: txType,
    shopify_charge_id: tx.chargeId ?? null,
    shopify_shop_domain: tx.shop?.myshopifyDomain ?? null,
    shopify_gross_amount: tx.grossAmount ? parseFloat(tx.grossAmount.amount) : null,
    shopify_net_amount: tx.netAmount ? parseFloat(tx.netAmount.amount) : null,
    shopify_fee: tx.shopifyFee ? parseFloat(tx.shopifyFee.amount) : null,
    description: `Shopify ${tx.__typename} for ${tx.shop?.name ?? tx.shop?.myshopifyDomain ?? 'unknown shop'}`,
  }
}

async function recalcShopifyRevenue(errorDetails: Array<{ message: string }>) {
  const PAGE = 1000
  const shopifyByCustomer = new Map<string, number>()
  let from = 0
  for (;;) {
    const { data, error } = await supabaseAdmin
      .from('crm_revenue_transactions')
      .select('crm_customer_id, amount, transaction_type')
      .eq('provider', 'shopify')
      .in('status', ['succeeded', 'adjusted'])
      .not('crm_customer_id', 'is', null)
      .range(from, from + PAGE - 1)
    if (error) {
      errorDetails.push({ message: `Revenue load: ${error.message}` })
      break
    }
    for (const t of data ?? []) {
      if (!t.crm_customer_id) continue
      const delta =
        t.transaction_type === 'app_sale_adjustment' || t.transaction_type === 'app_sale_credit'
          ? -Math.abs(t.amount)
          : t.amount
      shopifyByCustomer.set(t.crm_customer_id, (shopifyByCustomer.get(t.crm_customer_id) ?? 0) + delta)
    }
    if (!data || data.length < PAGE) break
    from += PAGE
  }

  const ids = [...shopifyByCustomer.keys()]
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50)
    const { data: stripeTxns } = await supabaseAdmin
      .from('crm_revenue_transactions')
      .select('crm_customer_id, amount')
      .eq('provider', 'stripe')
      .eq('status', 'succeeded')
      .in('crm_customer_id', batch)

    const stripeByCustomer = new Map<string, number>()
    for (const t of stripeTxns ?? []) {
      if (!t.crm_customer_id) continue
      stripeByCustomer.set(t.crm_customer_id, (stripeByCustomer.get(t.crm_customer_id) ?? 0) + t.amount)
    }

    await Promise.all(
      batch.map((id) =>
        supabaseAdmin
          .from('crm_customers')
          .update({
            calculated_total_revenue:
              (shopifyByCustomer.get(id) ?? 0) + (stripeByCustomer.get(id) ?? 0),
          })
          .eq('id', id)
      )
    )
  }
}
