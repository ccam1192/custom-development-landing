import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../../_lib/auth.js'
import { supabaseAdmin } from '../../_lib/supabase-admin.js'
import { determineClientStatus, calculateMrr } from '../../_lib/status-engine.js'
import {
  isStripeConfigured,
  getAllStripeCustomers,
  getAllStripeSubscriptions,
  getPaidInvoices,
} from '../../_lib/stripe.js'

export const config = { maxDuration: 120 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const user = await requireAuth(req, res)
    if (!user) return

    if (!isStripeConfigured()) {
      return res.status(503).json({ error: 'Stripe not configured. Set STRIPE_SECRET_KEY.' })
    }

    const { data: syncLog } = await supabaseAdmin
      .from('crm_sync_logs')
      .insert({ provider: 'stripe', sync_type: 'full' })
      .select('id')
      .single()

    const logId = syncLog?.id
    let processed = 0, created = 0, updated = 0, errors = 0
    const errorDetails: Array<{ message: string; record?: string }> = []

    await supabaseAdmin
      .from('crm_sync_state')
      .update({ status: 'running', last_sync_at: new Date().toISOString() })
      .eq('provider', 'stripe')

    // Fetch Stripe data sequentially to avoid memory pressure
    console.log('[Stripe Sync] Fetching customers...')
    const customers = await getAllStripeCustomers()
    console.log(`[Stripe Sync] Got ${customers.length} customers`)

    console.log('[Stripe Sync] Fetching subscriptions...')
    const subscriptions = await getAllStripeSubscriptions()
    console.log(`[Stripe Sync] Got ${subscriptions.length} subscriptions`)

    console.log('[Stripe Sync] Fetching paid invoices...')
    const invoices = await getPaidInvoices()
    console.log(`[Stripe Sync] Got ${invoices.length} invoices`)

    // Build subscription lookup
    const subsByCustomer = new Map<string, (typeof subscriptions)[0]>()
    for (const sub of subscriptions) {
      const custId = typeof sub.customer === 'string' ? sub.customer : (sub.customer as { id: string }).id
      const existing = subsByCustomer.get(custId)
      if (!existing || sub.created > existing.created) {
        subsByCustomer.set(custId, sub)
      }
    }

    // Upsert invoices as revenue transactions
    for (const inv of invoices) {
      try {
        if (!inv.id || !inv.amount_paid || inv.amount_paid <= 0) continue

        const customerId = typeof inv.customer === 'string'
          ? inv.customer
          : (inv.customer as { id: string } | null)?.id ?? null

        let crmCustomerId: string | null = null
        if (customerId) {
          const { data } = await supabaseAdmin
            .from('crm_customers')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .limit(1)
            .single()
          crmCustomerId = data?.id ?? null
        }

        await supabaseAdmin
          .from('crm_revenue_transactions')
          .upsert(
            {
              provider: 'stripe',
              provider_transaction_id: inv.id,
              provider_customer_id: customerId,
              provider_subscription_id:
                typeof inv.subscription === 'string'
                  ? inv.subscription
                  : (inv.subscription as { id: string } | null)?.id ?? null,
              crm_customer_id: crmCustomerId,
              amount: inv.amount_paid / 100,
              currency: (inv.currency ?? 'usd').toUpperCase(),
              transaction_date: new Date((inv as { created: number }).created * 1000).toISOString(),
              status: 'succeeded',
              transaction_type: 'payment',
              description: `Invoice ${(inv as { number?: string }).number ?? inv.id}`,
            },
            { onConflict: 'provider,provider_transaction_id' }
          )
      } catch (e) {
        errors++
        errorDetails.push({ message: `Invoice ${inv.id}: ${e instanceof Error ? e.message : String(e)}` })
      }
    }

    // Sync customers
    for (const cust of customers) {
      processed++
      try {
        const sub = subsByCustomer.get(cust.id)
        const email = (cust as { email?: string | null }).email ?? null
        const name = (cust as { name?: string | null }).name ?? null

        // Find existing CRM customer
        let existing: { id: string } | null = null
        const { data: byStripe } = await supabaseAdmin
          .from('crm_customers')
          .select('id')
          .eq('stripe_customer_id', cust.id)
          .limit(1)
          .single()
        existing = byStripe

        if (!existing && email) {
          const { data: byEmail } = await supabaseAdmin
            .from('crm_customers')
            .select('id')
            .eq('email', email)
            .limit(1)
            .single()
          existing = byEmail
        }

        // Calculate revenue from transactions
        const { data: revData } = await supabaseAdmin
          .from('crm_revenue_transactions')
          .select('amount')
          .eq('provider', 'stripe')
          .eq('provider_customer_id', cust.id)
          .eq('status', 'succeeded')

        const totalStripeRevenue = (revData ?? []).reduce((sum, r) => sum + (r.amount ?? 0), 0)
        const hasPayment = totalStripeRevenue > 0

        const planAmount = sub?.items?.data?.[0]?.price?.unit_amount ?? null

        const clientStatus = determineClientStatus({
          stripeSubscriptionStatus: sub?.status ?? null,
          stripeTrialEnd: sub?.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
          stripeCanceledAt: sub?.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
          hasSuccessfulPayment: hasPayment,
          hasShopifyRevenue: false,
        })

        const calculatedMrr = calculateMrr({ clientStatus, stripePlanAmount: planAmount })

        const record: Record<string, unknown> = {
          stripe_customer_id: cust.id,
          stripe_subscription_id: sub?.id ?? null,
          stripe_subscription_status: sub?.status ?? null,
          stripe_trial_end: sub?.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
          stripe_current_period_end: sub?.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null,
          stripe_plan_amount: planAmount,
          stripe_cancel_at: sub?.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null,
          stripe_canceled_at: sub?.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
          client_status: clientStatus,
          calculated_mrr: calculatedMrr,
          calculated_total_revenue: totalStripeRevenue,
          cancellation_date: sub?.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
          last_synced_at: new Date().toISOString(),
        }

        if (existing) {
          await supabaseAdmin.from('crm_customers').update(record).eq('id', existing.id)
          await supabaseAdmin
            .from('crm_revenue_transactions')
            .update({ crm_customer_id: existing.id })
            .eq('provider', 'stripe')
            .eq('provider_customer_id', cust.id)
            .is('crm_customer_id', null)
          updated++
        } else {
          record.name = name
          record.email = email
          record.billing_channel = 'stripe'
          record.source = 'stripe'
          record.signup_date = new Date((cust as { created: number }).created * 1000).toISOString()

          const { data: newCust } = await supabaseAdmin
            .from('crm_customers')
            .insert(record)
            .select('id')
            .single()

          if (newCust) {
            await supabaseAdmin
              .from('crm_revenue_transactions')
              .update({ crm_customer_id: newCust.id })
              .eq('provider', 'stripe')
              .eq('provider_customer_id', cust.id)
              .is('crm_customer_id', null)
          }
          created++
        }
      } catch (e) {
        errors++
        errorDetails.push({
          message: e instanceof Error ? e.message : String(e),
          record: (cust as { email?: string }).email ?? cust.id,
        })
      }
    }

    await supabaseAdmin
      .from('crm_sync_state')
      .update({ status: 'idle', last_successful_at: new Date().toISOString(), error_message: null })
      .eq('provider', 'stripe')

    if (logId) {
      await supabaseAdmin
        .from('crm_sync_logs')
        .update({
          completed_at: new Date().toISOString(),
          status: errors > 0 ? 'failed' : 'completed',
          records_processed: processed,
          records_created: created,
          records_updated: updated,
          errors,
          error_details: errorDetails,
        })
        .eq('id', logId)
    }

    return res.json({ success: true, processed, created, updated, errors, invoices: invoices.length })
  } catch (e) {
    // Top-level catch — return the full error to the client for debugging
    const message = e instanceof Error ? `${e.message}\n${e.stack}` : String(e)
    console.error('[Stripe Sync] Fatal error:', message)

    try {
      await supabaseAdmin
        .from('crm_sync_state')
        .update({ status: 'idle', error_message: message.substring(0, 500) })
        .eq('provider', 'stripe')
    } catch { /* ignore */ }

    return res.status(500).json({ error: message.substring(0, 1000) })
  }
}
