import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabaseAdmin } from '../_lib/supabase-admin'
import { constructWebhookEvent, isStripeConfigured } from '../_lib/stripe'
import { determineClientStatus, calculateMrr } from '../_lib/status-engine'
import type Stripe from 'stripe'

/**
 * Stripe Webhook Handler
 *
 * Handles:
 *   - customer.subscription.created
 *   - customer.subscription.updated
 *   - customer.subscription.deleted
 *   - invoice.paid / invoice.payment_succeeded
 *   - invoice.payment_failed
 *
 * All handlers are idempotent — safe to replay.
 */

export const config = {
  api: { bodyParser: false },
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  if (!isStripeConfigured()) {
    return res.status(503).json({ error: 'Stripe not configured' })
  }

  const sig = req.headers['stripe-signature']
  if (!sig || typeof sig !== 'string') {
    return res.status(400).json({ error: 'Missing stripe-signature header' })
  }

  let event: Stripe.Event
  try {
    // Read raw body
    const chunks: Buffer[] = []
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
    }
    const rawBody = Buffer.concat(chunks)
    event = constructWebhookEvent(rawBody, sig)
  } catch (e) {
    console.error('Webhook signature verification failed:', e)
    return res.status(400).json({ error: 'Invalid signature' })
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionEvent(event.data.object as Stripe.Subscription)
        break

      case 'invoice.paid':
      case 'invoice.payment_succeeded':
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handleInvoiceFailed(event.data.object as Stripe.Invoice)
        break

      default:
        // Acknowledge but ignore unhandled event types
        break
    }

    return res.json({ received: true })
  } catch (e) {
    console.error(`Webhook handler error for ${event.type}:`, e)
    return res.status(500).json({ error: 'Webhook handler failed' })
  }
}

async function findCrmCustomerByStripeId(stripeCustomerId: string) {
  const { data } = await supabaseAdmin
    .from('crm_customers')
    .select('*')
    .eq('stripe_customer_id', stripeCustomerId)
    .limit(1)
    .single()
  return data
}

async function handleSubscriptionEvent(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
  const customer = await findCrmCustomerByStripeId(customerId)
  if (!customer) return // No CRM record yet; will be created on next sync

  const planAmount = sub.items?.data?.[0]?.price?.unit_amount ?? null

  // Check payment history
  const { count } = await supabaseAdmin
    .from('crm_revenue_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('crm_customer_id', customer.id)
    .eq('status', 'succeeded')
    .gt('amount', 0)

  const hasPayment = (count ?? 0) > 0

  const clientStatus = determineClientStatus({
    userType: customer.user_type,
    stripeSubscriptionStatus: sub.status,
    stripeTrialEnd: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    stripeCanceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
    boardroomSubscriptionStatus: customer.boardroom_subscription_status,
    hasSuccessfulPayment: hasPayment,
    hasShopifyRevenue: false,
  })

  const calculatedMrr = calculateMrr({
    clientStatus,
    userType: customer.user_type,
    stripePlanAmount: planAmount,
  })

  await supabaseAdmin
    .from('crm_customers')
    .update({
      stripe_subscription_id: sub.id,
      stripe_subscription_status: sub.status,
      stripe_trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
      stripe_current_period_end: sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null,
      stripe_plan_amount: planAmount,
      stripe_cancel_at: sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null,
      stripe_canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
      client_status: clientStatus,
      calculated_mrr: calculatedMrr,
      cancellation_date: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : customer.cancellation_date,
      last_synced_at: new Date().toISOString(),
    })
    .eq('id', customer.id)
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  if (!invoice.id || !invoice.amount_paid || invoice.amount_paid <= 0) return

  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id

  let crmCustomerId: string | null = null
  if (customerId) {
    const customer = await findCrmCustomerByStripeId(customerId)
    crmCustomerId = customer?.id ?? null
  }

  // Idempotent upsert
  await supabaseAdmin
    .from('crm_revenue_transactions')
    .upsert(
      {
        provider: 'stripe',
        provider_transaction_id: invoice.id,
        provider_customer_id: customerId ?? null,
        provider_subscription_id:
          typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id ?? null,
        crm_customer_id: crmCustomerId,
        amount: invoice.amount_paid / 100,
        currency: (invoice.currency ?? 'usd').toUpperCase(),
        transaction_date: new Date(invoice.created * 1000).toISOString(),
        status: 'succeeded',
        transaction_type: 'payment',
        description: `Invoice ${invoice.number ?? invoice.id}`,
      },
      { onConflict: 'provider,provider_transaction_id' }
    )

  // Recalculate customer total revenue
  if (crmCustomerId) {
    const { data: txns } = await supabaseAdmin
      .from('crm_revenue_transactions')
      .select('amount')
      .eq('crm_customer_id', crmCustomerId)
      .eq('status', 'succeeded')

    const total = (txns ?? []).reduce((sum, t) => sum + t.amount, 0)

    await supabaseAdmin
      .from('crm_customers')
      .update({ calculated_total_revenue: total })
      .eq('id', crmCustomerId)
  }
}

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  if (!invoice.id) return

  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id

  let crmCustomerId: string | null = null
  if (customerId) {
    const customer = await findCrmCustomerByStripeId(customerId)
    crmCustomerId = customer?.id ?? null
  }

  await supabaseAdmin
    .from('crm_revenue_transactions')
    .upsert(
      {
        provider: 'stripe',
        provider_transaction_id: invoice.id,
        provider_customer_id: customerId ?? null,
        crm_customer_id: crmCustomerId,
        amount: (invoice.amount_due ?? 0) / 100,
        currency: (invoice.currency ?? 'usd').toUpperCase(),
        transaction_date: new Date(invoice.created * 1000).toISOString(),
        status: 'failed',
        transaction_type: 'payment',
        description: `Failed: Invoice ${invoice.number ?? invoice.id}`,
      },
      { onConflict: 'provider,provider_transaction_id' }
    )
}
