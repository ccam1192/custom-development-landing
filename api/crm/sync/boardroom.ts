import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../../_lib/auth'
import { supabaseAdmin } from '../../_lib/supabase-admin'
import { getBoardroomUsers, isBoardroomConfigured } from '../../_lib/boardroom'
import { determineClientStatus, calculateMrr } from '../../_lib/status-engine'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const user = await requireAuth(req, res)
  if (!user) return

  if (!isBoardroomConfigured()) {
    return res.status(503).json({
      error: 'Boardroom API not configured. Set BOARDROOM_API_BASE_URL and BOARDROOM_API_KEY.',
    })
  }

  // Create sync log
  const { data: syncLog } = await supabaseAdmin
    .from('crm_sync_logs')
    .insert({ provider: 'boardroom', sync_type: 'full' })
    .select('id')
    .single()

  const logId = syncLog?.id
  let processed = 0, created = 0, updated = 0, skipped = 0, errors = 0
  const errorDetails: Array<{ message: string; record?: string }> = []

  try {
    // Update sync state
    await supabaseAdmin
      .from('crm_sync_state')
      .update({ status: 'running', last_sync_at: new Date().toISOString() })
      .eq('provider', 'boardroom')

    const users = await getBoardroomUsers()

    for (const bu of users) {
      processed++
      try {
        // Check for existing customer by Boardroom user ID
        const { data: existing } = await supabaseAdmin
          .from('crm_customers')
          .select('id, notes, mrr_override, total_revenue_override, client_status')
          .eq('boardroom_user_id', bu.id)
          .limit(1)
          .single()

        // Also check for payment history
        let hasPayment = false
        let hasShopifyRevenue = false

        if (existing) {
          const { count: paymentCount } = await supabaseAdmin
            .from('crm_revenue_transactions')
            .select('*', { count: 'exact', head: true })
            .eq('crm_customer_id', existing.id)
            .eq('status', 'succeeded')
            .gt('amount', 0)

          hasPayment = (paymentCount ?? 0) > 0

          const { count: shopifyCount } = await supabaseAdmin
            .from('crm_revenue_transactions')
            .select('*', { count: 'exact', head: true })
            .eq('crm_customer_id', existing.id)
            .eq('provider', 'shopify')
            .eq('status', 'succeeded')
            .gt('amount', 0)

          hasShopifyRevenue = (shopifyCount ?? 0) > 0
        }

        const clientStatus = determineClientStatus({
          userType: bu.userType,
          stripeSubscriptionStatus: null,
          boardroomSubscriptionStatus: bu.subscriptionStatus,
          billingChannel: bu.billingChannel,
          hasSuccessfulPayment: hasPayment,
          hasShopifyRevenue,
        })

        const calculatedMrr = calculateMrr({
          clientStatus,
          userType: bu.userType,
          billingChannel: bu.billingChannel,
        })

        const record = {
          boardroom_user_id: bu.id,
          name: bu.name,
          email: bu.email,
          store_url: bu.storeUrl ?? null,
          signup_date: bu.signupDate ?? null,
          user_type: bu.userType ?? 'standard',
          billing_channel: bu.billingChannel ?? 'none',
          boardroom_subscription_id: bu.subscriptionId ?? null,
          boardroom_subscription_status: bu.subscriptionStatus ?? null,
          agency_parent_id: bu.agencyParentId ?? null,
          stripe_customer_id: bu.stripeCustomerId ?? null,
          stripe_subscription_id: bu.stripeSubscriptionId ?? null,
          shopify_shop_id: bu.shopifyShopId ?? null,
          shopify_shop_domain: bu.shopifyShopDomain ?? null,
          client_status: clientStatus,
          calculated_mrr: calculatedMrr,
          last_synced_at: new Date().toISOString(),
        }

        if (existing) {
          // Preserve notes, overrides, and manual status
          await supabaseAdmin
            .from('crm_customers')
            .update(record)
            .eq('id', existing.id)
          updated++
        } else {
          await supabaseAdmin.from('crm_customers').insert(record)
          created++
        }
      } catch (e) {
        errors++
        errorDetails.push({
          message: e instanceof Error ? e.message : 'Unknown error',
          record: bu.email ?? bu.id,
        })
      }
    }

    // Update sync state
    await supabaseAdmin
      .from('crm_sync_state')
      .update({
        status: 'idle',
        last_successful_at: new Date().toISOString(),
        error_message: null,
      })
      .eq('provider', 'boardroom')

    // Update sync log
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

    return res.json({
      success: true,
      processed,
      created,
      updated,
      skipped,
      errors,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Sync failed'

    await supabaseAdmin
      .from('crm_sync_state')
      .update({ status: 'idle', error_message: message })
      .eq('provider', 'boardroom')

    if (logId) {
      await supabaseAdmin
        .from('crm_sync_logs')
        .update({
          completed_at: new Date().toISOString(),
          status: 'failed',
          records_processed: processed,
          errors: errors + 1,
          error_details: [...errorDetails, { message }],
        })
        .eq('id', logId)
    }

    return res.status(500).json({ error: message })
  }
}
