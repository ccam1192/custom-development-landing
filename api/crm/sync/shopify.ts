import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../../_lib/auth.js'
import { supabaseAdmin } from '../../_lib/supabase-admin.js'
import { isShopifyConfigured, getAllAppTransactions } from '../../_lib/shopify.js'

export const config = { maxDuration: 300 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
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
    let processed = 0, created = 0, errors = 0
    const errorDetails: Array<{ message: string; record?: string }> = []

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

    console.log('[Shopify Sync] Fetching transactions...')
    const transactions = await getAllAppTransactions(createdAtMin)
    console.log(`[Shopify Sync] Got ${transactions.length} transactions`)

    for (const tx of transactions) {
      processed++
      try {
        // Determine transaction type
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

        const status = amount >= 0 ? 'succeeded' : 'adjusted'

        // Find CRM customer by Shopify domain
        let crmCustomerId: string | null = null
        if (tx.shop?.myshopifyDomain) {
          const { data } = await supabaseAdmin
            .from('crm_customers')
            .select('id')
            .eq('shopify_shop_domain', tx.shop.myshopifyDomain)
            .limit(1)
            .single()
          crmCustomerId = data?.id ?? null
        }

        await supabaseAdmin
          .from('crm_revenue_transactions')
          .upsert(
            {
              provider: 'shopify',
              provider_transaction_id: tx.id,
              crm_customer_id: crmCustomerId,
              amount: Math.abs(amount),
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
        created++
      } catch (e) {
        errors++
        errorDetails.push({
          message: e instanceof Error ? e.message : String(e),
          record: tx.id,
        })
      }
    }

    // Recalculate revenue for affected shops
    const shopDomains = [...new Set(transactions.map((t) => t.shop?.myshopifyDomain).filter(Boolean))]
    for (const domain of shopDomains) {
      try {
        const { data: txns } = await supabaseAdmin
          .from('crm_revenue_transactions')
          .select('amount, transaction_type')
          .eq('provider', 'shopify')
          .eq('shopify_shop_domain', domain)
          .in('status', ['succeeded', 'adjusted'])

        let shopRevenue = 0
        for (const t of txns ?? []) {
          if (t.transaction_type === 'app_sale_adjustment' || t.transaction_type === 'app_sale_credit') {
            shopRevenue -= Math.abs(t.amount)
          } else {
            shopRevenue += t.amount
          }
        }

        const { data: customer } = await supabaseAdmin
          .from('crm_customers')
          .select('id')
          .eq('shopify_shop_domain', domain)
          .limit(1)
          .single()

        if (customer) {
          // Get Stripe revenue for combined total
          const { data: stripeTxns } = await supabaseAdmin
            .from('crm_revenue_transactions')
            .select('amount')
            .eq('crm_customer_id', customer.id)
            .eq('provider', 'stripe')
            .eq('status', 'succeeded')

          const stripeRevenue = (stripeTxns ?? []).reduce((sum, t) => sum + t.amount, 0)

          await supabaseAdmin
            .from('crm_customers')
            .update({ calculated_total_revenue: shopRevenue + stripeRevenue })
            .eq('id', customer.id)
        }
      } catch (e) {
        errorDetails.push({
          message: `Revenue recalc ${domain}: ${e instanceof Error ? e.message : String(e)}`,
        })
      }
    }

    await supabaseAdmin
      .from('crm_sync_state')
      .update({ status: 'idle', last_successful_at: new Date().toISOString(), error_message: null })
      .eq('provider', 'shopify')

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
        })
        .eq('id', logId)
    }

    return res.json({ success: true, processed, created, errors })
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
