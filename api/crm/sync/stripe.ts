import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../../_lib/auth'
import { supabaseAdmin } from '../../_lib/supabase-admin'
import {
  isStripeConfigured,
  getAllStripeCustomers,
  getAllStripeSubscriptions,
  getPaidInvoices,
} from '../../_lib/stripe'
import { determineClientStatus, calculateMrr } from '../../_lib/status-engine'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

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
  let processed = 0, created = 0, updated = 0, skipped = 0, errors = 0
  const errorDetails: Array<{ message: string; record?: string }> = []

  try {
    await supabaseAdmin
      .from('crm_sync_state')
      .update({ status: 'running', last_sync_at: new Date().toISOString() })
      .eq('provider', 'stripe')

    // 1. Sync Stripe Customers & Subscriptions
    const [customers, subscriptions, invoices] = await Promise.all([
      getAllStripeCustomers(),
      getAllStripeSubscriptions(),
      getPaidInvoices(),
    ])

    // Build lookup maps
    const subsByCustomer = new Map<string, typeof subscriptions[0]>()
    for (const sub of subscriptions) {
      const custId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
      // Keep the most recent subscription per customer
      if (!subsByCustomer.has(custId) || new Date(sub.created * 1000) > new Date(subsByCustomer.get(custId)!.created * 1000)) {
        subsByCustomer.set(custId, sub)
      }
    }

    // 2. Upsert paid invoices as revenue transactions (idempotent)
    for (const inv of invoices) {
      if (!inv.id || inv.amount_paid == null || inv.amount_paid <= 0) continue

      const customerId = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id

      // Find CRM customer by Stripe customer ID
      let crmCustomerId: string | null = null
      if (customerId) {
        const { data: crmCust } = await supabaseAdmin
          .from('crm_customers')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .limit(1)
          .single()
        crmCustomerId = crmCust?.id ?? null
      }

      const { error: txError } = await supabaseAdmin
        .from('crm_revenue_transactions')
        .upsert(
          {
            provider: 'stripe' as const,
            provider_transaction_id: inv.id,
            provider_customer_id: customerId ?? null,
            provider_subscription_id:
              typeof inv.subscription === 'string' ? inv.subscription : inv.subscription?.id ?? null,
            crm_customer_id: crmCustomerId,
            amount: inv.amount_paid / 100, // cents to dollars
            currency: (inv.currency ?? 'usd').toUpperCase(),
            transaction_date: new Date(inv.created * 1000).toISOString(),
            status: 'succeeded' as const,
            transaction_type: 'payment' as const,
            description: inv.description ?? `Invoice ${inv.number ?? inv.id}`,
          },
          { onConflict: 'provider,provider_transaction_id' }
        )

      if (txError) {
        errorDetails.push({ message: txError.message, record: inv.id })
        errors++
      }
    }

    // 3. Sync customers into CRM
    for (const cust of customers) {
      processed++
      try {
        const sub = subsByCustomer.get(cust.id)
        const email = cust.email ?? null
        const name = cust.name ?? null

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

        // Check payment history
        const { count: paymentCount } = await supabaseAdmin
          .from('crm_revenue_transactions')
          .select('*', { count: 'exact', head: true })
          .eq('provider', 'stripe')
          .eq('provider_customer_id', cust.id)
          .eq('status', 'succeeded')
          .gt('amount', 0)

        const hasPayment = (paymentCount ?? 0) > 0

        // Calculate total revenue from transactions
        const { data: revData } = await supabaseAdmin
          .from('crm_revenue_transactions')
          .select('amount')
          .eq('provider_customer_id', cust.id)
          .eq('provider', 'stripe')
          .eq('status', 'succeeded')

        const totalStripeRevenue = (revData ?? []).reduce((sum, r) => sum + (r.amount ?? 0), 0)

        const planAmount = sub?.items?.data?.[0]?.price?.unit_amount ?? null

        const clientStatus = determineClientStatus({
          stripeSubscriptionStatus: sub?.status ?? null,
          stripeTrialEnd: sub?.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
          stripeCanceledAt: sub?.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
          hasSuccessfulPayment: hasPayment,
          hasShopifyRevenue: false,
        })

        const calculatedMrr = calculateMrr({
          clientStatus,
          stripePlanAmount: planAmount,
        })

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

          // Update transaction associations
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
          record.signup_date = new Date(cust.created * 1000).toISOString()

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
          message: e instanceof Error ? e.message : 'Unknown error',
          record: cust.email ?? cust.id,
        })
      }
    }

    await supabaseAdmin
      .from('crm_sync_state')
      .update({
        status: 'idle',
        last_successful_at: new Date().toISOString(),
        error_message: null,
      })
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
          records_skipped: skipped,
          errors,
          error_details: errorDetails,
        })
        .eq('id', logId)
    }

    return res.json({ success: true, processed, created, updated, errors })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Stripe sync failed'

    await supabaseAdmin
      .from('crm_sync_state')
      .update({ status: 'idle', error_message: message })
      .eq('provider', 'stripe')

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
