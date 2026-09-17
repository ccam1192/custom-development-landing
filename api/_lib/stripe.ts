/**
 * Stripe Integration for CRM
 *
 * Handles historical sync and ongoing synchronization of:
 * - Customers
 * - Subscriptions (status, trial, cancellation)
 * - Invoices & successful payments
 * - Revenue calculation from actual payments
 *
 * Required env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
 */

import Stripe from 'stripe'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? ''

function getStripe(): Stripe {
  if (!STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not configured')
  }
  return new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2025-05-28.basil' as Stripe.LatestApiVersion })
}

export function isStripeConfigured(): boolean {
  return !!STRIPE_SECRET_KEY
}

/** Fetch all Stripe customers with pagination */
export async function getAllStripeCustomers(): Promise<Stripe.Customer[]> {
  const stripe = getStripe()
  const customers: Stripe.Customer[] = []
  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore) {
    const params: Stripe.CustomerListParams = { limit: 100 }
    if (startingAfter) params.starting_after = startingAfter

    const page = await stripe.customers.list(params)
    for (const c of page.data) {
      if (!c.deleted) customers.push(c as Stripe.Customer)
    }
    hasMore = page.has_more
    if (page.data.length > 0) {
      startingAfter = page.data[page.data.length - 1].id
    }
  }

  return customers
}

/** Fetch all subscriptions */
export async function getAllStripeSubscriptions(): Promise<Stripe.Subscription[]> {
  const stripe = getStripe()
  const subs: Stripe.Subscription[] = []
  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore) {
    const params: Stripe.SubscriptionListParams = {
      limit: 100,
      status: 'all',
    }
    if (startingAfter) params.starting_after = startingAfter

    const page = await stripe.subscriptions.list(params)
    subs.push(...page.data)
    hasMore = page.has_more
    if (page.data.length > 0) {
      startingAfter = page.data[page.data.length - 1].id
    }
  }

  return subs
}

/** Fetch paid invoices for revenue calculation */
export async function getPaidInvoices(since?: number): Promise<Stripe.Invoice[]> {
  const stripe = getStripe()
  const invoices: Stripe.Invoice[] = []
  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore) {
    const params: Stripe.InvoiceListParams = {
      limit: 100,
      status: 'paid',
    }
    if (startingAfter) params.starting_after = startingAfter
    if (since) params.created = { gte: since }

    const page = await stripe.invoices.list(params)
    invoices.push(...page.data)
    hasMore = page.has_more
    if (page.data.length > 0) {
      startingAfter = page.data[page.data.length - 1].id
    }
  }

  return invoices
}

/** Fetch charges for a specific customer */
export async function getCustomerCharges(customerId: string): Promise<Stripe.Charge[]> {
  const stripe = getStripe()
  const charges: Stripe.Charge[] = []
  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore) {
    const params: Stripe.ChargeListParams = {
      customer: customerId,
      limit: 100,
    }
    if (startingAfter) params.starting_after = startingAfter

    const page = await stripe.charges.list(params)
    charges.push(...page.data)
    hasMore = page.has_more
    if (page.data.length > 0) {
      startingAfter = page.data[page.data.length - 1].id
    }
  }

  return charges
}

/** Construct Stripe webhook event with signature verification */
export function constructWebhookEvent(
  body: string | Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripe()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET not configured')
  }
  return stripe.webhooks.constructEvent(body, signature, webhookSecret)
}

export { getStripe }
