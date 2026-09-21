import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabaseAdmin } from '../_lib/supabase-admin.js'
import { constructWebhookEvent, isStripeConfigured, getStripe } from '../_lib/stripe.js'
import { determineClientStatus, calculateMrr } from '../_lib/status-engine.js'
import { myshopifyDomainFromMetadata } from '../_lib/shopify-lifecycle.js'
import { advanceLastPayments, existingProviderTxnIds } from '../_lib/last-payment.js'
import {
  attachOrphanStripeTransactions,
  nextCalculatedTotalRevenue,
  stripeLedgerTotal,
} from '../_lib/revenue.js'
import {
  appendPaymentFailedCancelNote,
  isStripePaymentFailedCancellation,
} from '../_lib/stripe-payment-failed-note.js'
import type Stripe from 'stripe'

/**
 * Stripe Webhook Handler
 *
 * Creates or updates CRM customers from live Stripe events.
 * Idempotent — safe to replay.
 */

export const config = {
  api: { bodyParser: false },
}

type CrmRow = {
  id: string
  user_type: string | null
  boardroom_subscription_status: string | null
  cancellation_date: string | null
  email: string | null
  name: string | null
  billing_channel: string | null
  store_url: string | null
  signup_date: string | null
  notes: string | null
  total_revenue_override: number | null
  calculated_total_revenue: number | null
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
      case 'customer.created':
      case 'customer.updated': {
        const obj = event.data.object as Stripe.Customer | Stripe.DeletedCustomer
        if (!('deleted' in obj && obj.deleted)) {
          await findOrCreateCrmCustomer(obj as Stripe.Customer)
        }
        break
      }

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
        break
    }

    return res.json({ received: true })
  } catch (e) {
    console.error(`Webhook handler error for ${event.type}:`, e)
    return res.status(500).json({ error: 'Webhook handler failed' })
  }
}

const CRM_WEBHOOK_COLUMNS =
  'id, user_type, boardroom_subscription_status, cancellation_date, email, name, billing_channel, store_url, signup_date, notes, total_revenue_override, calculated_total_revenue'

async function findCrmByStripeId(stripeCustomerId: string): Promise<CrmRow | null> {
  const { data } = await supabaseAdmin
    .from('crm_customers')
    .select(CRM_WEBHOOK_COLUMNS)
    .eq('stripe_customer_id', stripeCustomerId)
    .limit(1)
    .maybeSingle()
  return data
}

async function findCrmByEmail(email: string): Promise<CrmRow | null> {
  const { data } = await supabaseAdmin
    .from('crm_customers')
    .select(CRM_WEBHOOK_COLUMNS)
    .ilike('email', email.trim())
    .limit(1)
    .maybeSingle()
  return data
}

async function retrieveStripeCustomer(stripeCustomerId: string): Promise<Stripe.Customer | null> {
  try {
    const cust = await getStripe().customers.retrieve(stripeCustomerId)
    if (cust.deleted) return null
    return cust as Stripe.Customer
  } catch {
    return null
  }
}

function stripeCustCreatedIso(value: string | Stripe.Customer): string | null {
  if (typeof value === 'string' || !value.created) return null
  return new Date(value.created * 1000).toISOString()
}

/**
 * Match an existing CRM row or insert a new one from Stripe customer data.
 */
async function findOrCreateCrmCustomer(
  stripeCustomerIdOrObj: string | Stripe.Customer
): Promise<CrmRow | null> {
  const stripeId =
    typeof stripeCustomerIdOrObj === 'string' ? stripeCustomerIdOrObj : stripeCustomerIdOrObj.id

  const existing = await findCrmByStripeId(stripeId)
  if (existing) {
    const signupIso = !existing.signup_date ? stripeCustCreatedIso(stripeCustomerIdOrObj) : null
    if (signupIso) {
      await supabaseAdmin
        .from('crm_customers')
        .update({ signup_date: signupIso })
        .eq('id', existing.id)
        .is('signup_date', null)
      return { ...existing, signup_date: signupIso }
    }
    return existing
  }

  const stripeCust =
    typeof stripeCustomerIdOrObj === 'string'
      ? await retrieveStripeCustomer(stripeCustomerIdOrObj)
      : stripeCustomerIdOrObj

  if (!stripeCust) return null

  const email = stripeCust.email?.trim() || null
  const name = stripeCust.name?.trim() || null
  const storeDomain = myshopifyDomainFromMetadata(stripeCust.metadata)

  if (email) {
    const byEmail = await findCrmByEmail(email)
    if (byEmail) {
      const isShopify = byEmail.billing_channel === 'shopify'
      await supabaseAdmin
        .from('crm_customers')
        .update({
          stripe_customer_id: stripeId,
          last_synced_at: new Date().toISOString(),
          ...(isShopify ? {} : { billing_channel: 'stripe' }),
          ...(name && !byEmail.name ? { name } : {}),
          ...(storeDomain && !byEmail.store_url ? { store_url: `https://${storeDomain}` } : {}),
          ...(!byEmail.signup_date && stripeCust.created
            ? { signup_date: new Date(stripeCust.created * 1000).toISOString() }
            : {}),
        })
        .eq('id', byEmail.id)
      return { ...byEmail, name: byEmail.name ?? name, stripe_customer_id: stripeId } as CrmRow
    }
  }

  if (!email && !name) return null

  const { data: created, error } = await supabaseAdmin
    .from('crm_customers')
    .insert({
      stripe_customer_id: stripeId,
      email,
      name,
      store_url: storeDomain ? `https://${storeDomain}` : null,
      billing_channel: 'stripe',
      source: 'stripe',
      client_status: 'prospect',
      signup_date: stripeCust.created ? new Date(stripeCust.created * 1000).toISOString() : null,
      last_synced_at: new Date().toISOString(),
    })
    .select(CRM_WEBHOOK_COLUMNS)
    .single()

  if (error) {
    console.error('[Stripe webhook] create customer failed:', error.message)
    return null
  }
  return created
}

async function handleSubscriptionEvent(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
  const customer = await findOrCreateCrmCustomer(customerId)
  if (!customer) return

  const planAmount = sub.items?.data?.[0]?.price?.unit_amount ?? null

  const { count } = await supabaseAdmin
    .from('crm_revenue_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('crm_customer_id', customer.id)
    .eq('provider', 'stripe')
    .eq('status', 'succeeded')
    .gt('amount', 0)

  const hasPayment =
    (count ?? 0) > 0 ||
    Number(customer.total_revenue_override ?? customer.calculated_total_revenue ?? 0) > 0

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

  const shopifyOwned = customer.billing_channel === 'shopify'
  await supabaseAdmin
    .from('crm_customers')
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      stripe_subscription_status: sub.status,
      stripe_trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
      stripe_current_period_end: sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null,
      stripe_plan_amount: planAmount,
      stripe_cancel_at: sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null,
      stripe_canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
      last_synced_at: new Date().toISOString(),
      ...(shopifyOwned
        ? {}
        : {
            billing_channel: 'stripe',
            client_status: clientStatus,
            calculated_mrr: calculatedMrr,
            cancellation_date: sub.canceled_at
              ? new Date(sub.canceled_at * 1000).toISOString()
              : customer.cancellation_date,
          }),
    })
    .eq('id', customer.id)

  await maybeAppendPaymentFailedCancelNote(customer.id, sub)
}

async function maybeAppendPaymentFailedCancelNote(customerId: string, sub: Stripe.Subscription) {
  if (!isStripePaymentFailedCancellation(sub)) return

  const { data: row } = await supabaseAdmin
    .from('crm_customers')
    .select('notes')
    .eq('id', customerId)
    .maybeSingle()

  const next = appendPaymentFailedCancelNote(row?.notes, sub.id, sub.canceled_at)
  if (!next) return

  await supabaseAdmin.from('crm_customers').update({ notes: next }).eq('id', customerId)
}

function stripeInvoicePaidAt(invoice: Stripe.Invoice): string {
  const paidAt = invoice.status_transitions?.paid_at ?? invoice.created
  return new Date(paidAt * 1000).toISOString()
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  if (!invoice.id || !invoice.amount_paid || invoice.amount_paid <= 0) return

  const customerId =
    typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? null

  const customer = customerId ? await findOrCreateCrmCustomer(customerId) : null
  const crmCustomerId = customer?.id ?? null
  const alreadyRecorded = (await existingProviderTxnIds('stripe', [invoice.id])).has(invoice.id)

  const { error: txnErr } = await supabaseAdmin.from('crm_revenue_transactions').upsert(
    {
      provider: 'stripe',
      provider_transaction_id: invoice.id,
      provider_customer_id: customerId,
      provider_subscription_id:
        typeof invoice.subscription === 'string'
          ? invoice.subscription
          : (invoice.subscription as { id: string } | null)?.id ?? null,
      crm_customer_id: crmCustomerId,
      amount: invoice.amount_paid / 100,
      currency: (invoice.currency ?? 'usd').toUpperCase(),
      transaction_date: new Date((invoice as { created: number }).created * 1000).toISOString(),
      status: 'succeeded',
      transaction_type: 'payment',
      description: `Invoice ${(invoice as { number?: string }).number ?? invoice.id}`,
    },
    { onConflict: 'provider,provider_transaction_id' }
  )

  if (!txnErr && crmCustomerId && !alreadyRecorded) {
    await advanceLastPayments([
      { customerId: crmCustomerId, paymentAt: stripeInvoicePaidAt(invoice), provider: 'stripe' },
    ])
  }

  if (crmCustomerId) {
    if (customerId) await attachOrphanStripeTransactions([customerId])
    const ledgerTotal = await stripeLedgerTotal(crmCustomerId)
    const calculatedTotalRevenue = nextCalculatedTotalRevenue({
      existingCalculated: customer?.calculated_total_revenue,
      existingOverride: customer?.total_revenue_override,
      ledgerTotal,
      newlyCollectedAmount: !alreadyRecorded ? invoice.amount_paid / 100 : 0,
    })
    const clientStatus = determineClientStatus({
      userType: customer?.user_type,
      hasSuccessfulPayment: calculatedTotalRevenue > 0,
      hasShopifyRevenue: false,
    })

    await supabaseAdmin
      .from('crm_customers')
      .update({
        calculated_total_revenue: calculatedTotalRevenue,
        last_synced_at: new Date().toISOString(),
        ...(customer?.billing_channel === 'shopify'
          ? {}
          : {
              client_status: clientStatus,
              billing_channel: 'stripe',
            }),
      })
      .eq('id', crmCustomerId)
  }
}

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  if (!invoice.id) return

  const customerId =
    typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? null

  const customer = customerId ? await findOrCreateCrmCustomer(customerId) : null

  await supabaseAdmin.from('crm_revenue_transactions').upsert(
    {
      provider: 'stripe',
      provider_transaction_id: invoice.id,
      provider_customer_id: customerId,
      crm_customer_id: customer?.id ?? null,
      amount: ((invoice as { amount_due?: number }).amount_due ?? 0) / 100,
      currency: (invoice.currency ?? 'usd').toUpperCase(),
      transaction_date: new Date((invoice as { created: number }).created * 1000).toISOString(),
      status: 'failed',
      transaction_type: 'payment',
      description: `Failed: Invoice ${(invoice as { number?: string }).number ?? invoice.id}`,
    },
    { onConflict: 'provider,provider_transaction_id' }
  )
}
