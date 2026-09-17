import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../../_lib/auth'
import { supabaseAdmin } from '../../_lib/supabase-admin'
import { isShopifyConfigured, getAllAppTransactions, type ShopifyTransaction } from '../../_lib/shopify'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const user = await requireAuth(req, res)
  if (!user) return

  if (!isShopifyConfigured()) {
    return res.status(503).json({
      error: 'Shopify Partner API not configured. Set SHOPIFY_PARTNER_ORG_ID, SHOPIFY_PARTNER_ACCESS_TOKEN, and SHOPIFY_APP_ID.',
    })
  }

  const { data: syncLog } = await supabaseAdmin
    .from('crm_sync_logs')
    .insert({ provider: 'shopify', sync_type: req.body?.incremental ? 'incremental' : 'full' })
    .select('id')
    .single()

  const logId = syncLog?.id
  let processed = 0, created = 0, updated = 0, skipped = 0, errors = 0
  const errorDetails: Array<{ message: string; record?: string }> = []

  try {
    await supabaseAdmin
      .from('crm_sync_state')
      .update({ status: 'running', last_sync_at: new Date().toISOString() })
      .eq('provider', 'shopify')

    // Get last sync cursor for incremental sync
    let createdAtMin: string | undefined
    if (req.body?.incremental) {
      const { data: syncState } = await supabaseAdmin
        .from('crm_sync_state')
        .select('last_successful_at')
        .eq('provider', 'shopify')
        .single()
      if (syncState?.last_successful_at) {
        createdAtMin = syncState.last_successful_at
      }
    }

    const transactions = await getAllAppTransactions(createdAtMin)

    for (const tx of transactions) {
      processed++
      try {
        await upsertShopifyTransaction(tx)
      } catch (e) {
        errors++
        errorDetails.push({
          message: e instanceof Error ? e.message : 'Unknown error',
          record: tx.id,
        })
      }
    }

    // Recalculate revenue for all affected shops
    const shopDomains = [...new Set(transactions.map((t) => t.shop?.myshopifyDomain).filter(Boolean))]

    for (const domain of shopDomains) {
      try {
        await recalculateShopifyRevenue(domain)
      } catch (e) {
        errorDetails.push({
          message: `Revenue recalculation failed for ${domain}: ${e instanceof Error ? e.message : 'Unknown'}`,
        })
      }
    }

    // Count created/updated from the upsert results
    created = transactions.length // Approximation since we use upsert
    updated = 0

    await supabaseAdmin
      .from('crm_sync_state')
      .update({
        status: 'idle',
        last_successful_at: new Date().toISOString(),
        error_message: null,
      })
      .eq('provider', 'shopify')

    if (logId) {
      await supabaseAdmin
        .from('crm_sync_logs')
        .update({
          completed_at: new Date().toISOString(),
          status: errors > 0 ? 'failed' : 'completed',
          records_processed: processed,
          records_created: created,
          records_updated: updated,
          records_skipped: skipped,
          errors,
          error_details: errorDetails,
        })
        .eq('id', logId)
    }

    return res.json({ success: true, processed, created, updated, errors })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Shopify sync failed'

    await supabaseAdmin
      .from('crm_sync_state')
      .update({ status: 'idle', error_message: message })
      .eq('provider', 'shopify')

    if (logId) {
      await supabaseAdmin
        .from('crm_sync_logs')
        .update({
          completed_at: new Date().toISOString(),
          status: 'failed',
          errors: errors + 1,
          error_details: [...errorDetails, { message }],
        })
        .eq('id', logId)
    }

    return res.status(500).json({ error: message })
  }
}

/** Idempotently upsert a Shopify Partner API transaction */
async function upsertShopifyTransaction(tx: ShopifyTransaction) {
  // Determine transaction type for our schema
  let txType: string
  let amount: number

  switch (tx.type) {
    case 'APP_USAGE_SALE':
      txType = 'app_usage_sale'
      amount = parseFloat(tx.grossAmount?.amount ?? '0')
      break
    case 'APP_SALE_ADJUSTMENT':
      txType = 'app_sale_adjustment'
      amount = parseFloat(tx.grossAmount?.amount ?? '0')
      break
    case 'APP_SALE_CREDIT':
      txType = 'app_sale_credit'
      amount = parseFloat(tx.grossAmount?.amount ?? '0')
      break
    default:
      txType = 'payment'
      amount = parseFloat(tx.grossAmount?.amount ?? '0')
  }

  // Determine status — adjustments/credits may be negative
  const status = amount >= 0 ? 'succeeded' : 'adjusted'

  // Find CRM customer by Shopify domain
  let crmCustomerId: string | null = null
  if (tx.shop?.myshopifyDomain) {
    const { data: crmCust } = await supabaseAdmin
      .from('crm_customers')
      .select('id')
      .eq('shopify_shop_domain', tx.shop.myshopifyDomain)
      .limit(1)
      .single()
    crmCustomerId = crmCust?.id ?? null
  }

  await supabaseAdmin
    .from('crm_revenue_transactions')
    .upsert(
      {
        provider: 'shopify' as const,
        provider_transaction_id: tx.id,
        crm_customer_id: crmCustomerId,
        amount: Math.abs(amount), // Store absolute, use type for direction
        currency: tx.grossAmount?.currencyCode ?? 'USD',
        transaction_date: tx.createdAt,
        status: status as 'succeeded' | 'adjusted',
        transaction_type: txType as 'app_usage_sale' | 'app_sale_adjustment' | 'app_sale_credit' | 'payment',
        shopify_charge_id: tx.chargeId ?? null,
        shopify_shop_domain: tx.shop?.myshopifyDomain ?? null,
        shopify_gross_amount: tx.grossAmount ? parseFloat(tx.grossAmount.amount) : null,
        shopify_net_amount: tx.netAmount ? parseFloat(tx.netAmount.amount) : null,
        shopify_fee: tx.shopifyFee ? parseFloat(tx.shopifyFee.amount) : null,
        shopify_processing_fee: tx.processingFee ? parseFloat(tx.processingFee.amount) : null,
        shopify_regulatory_fee: tx.regulatoryOperatingFee
          ? parseFloat(tx.regulatoryOperatingFee.amount)
          : null,
        description: `Shopify ${tx.type} for ${tx.shop?.name ?? tx.shop?.myshopifyDomain ?? 'unknown shop'}`,
      },
      { onConflict: 'provider,provider_transaction_id' }
    )
}

/** Recalculate total Shopify revenue for a shop and update CRM customer */
async function recalculateShopifyRevenue(shopDomain: string) {
  // Sum all Shopify transactions for this domain
  const { data: txns } = await supabaseAdmin
    .from('crm_revenue_transactions')
    .select('amount, transaction_type')
    .eq('provider', 'shopify')
    .eq('shopify_shop_domain', shopDomain)
    .in('status', ['succeeded', 'adjusted'])

  let totalRevenue = 0
  for (const tx of txns ?? []) {
    if (
      tx.transaction_type === 'app_sale_adjustment' ||
      tx.transaction_type === 'app_sale_credit'
    ) {
      totalRevenue -= Math.abs(tx.amount) // Deductions
    } else {
      totalRevenue += tx.amount // Revenue
    }
  }

  // Also sum Stripe revenue for this customer
  const { data: customer } = await supabaseAdmin
    .from('crm_customers')
    .select('id, calculated_total_revenue')
    .eq('shopify_shop_domain', shopDomain)
    .limit(1)
    .single()

  if (customer) {
    // Get Stripe revenue for this customer
    const { data: stripeTxns } = await supabaseAdmin
      .from('crm_revenue_transactions')
      .select('amount')
      .eq('crm_customer_id', customer.id)
      .eq('provider', 'stripe')
      .eq('status', 'succeeded')

    const stripeRevenue = (stripeTxns ?? []).reduce((sum, t) => sum + t.amount, 0)

    await supabaseAdmin
      .from('crm_customers')
      .update({ calculated_total_revenue: totalRevenue + stripeRevenue })
      .eq('id', customer.id)
  }
}
