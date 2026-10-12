import type Stripe from 'stripe'

export function stripeChargeInvoiceId(charge: Stripe.Charge): string | null {
  if (typeof charge.invoice === 'string' && charge.invoice) return charge.invoice
  if (charge.invoice && typeof charge.invoice === 'object' && 'id' in charge.invoice) {
    return charge.invoice.id ?? null
  }
  return null
}

export function isInvoiceBackedCharge(charge: Stripe.Charge): boolean {
  return Boolean(stripeChargeInvoiceId(charge))
}

/** Out-of-band invoice collections. Charge.invoice is often null; description is not. */
export function isStripeInvoicePaymentCharge(charge: Stripe.Charge): boolean {
  if (isInvoiceBackedCharge(charge)) return true
  const description = String(charge.description ?? '')
  if (/payment for invoice/i.test(description)) return true
  const invoiceOnPi =
    charge.payment_intent &&
    typeof charge.payment_intent === 'object' &&
    'invoice' in charge.payment_intent
      ? (charge.payment_intent as { invoice?: unknown }).invoice
      : null
  return Boolean(invoiceOnPi)
}

export function collectedStripeChargeAmount(charge: Stripe.Charge): number {
  const net = Number(charge.amount ?? 0) - Number(charge.amount_refunded ?? 0)
  return Math.round(Math.max(0, net) ) / 100
}

export function isCollectedInvoiceLessCharge(charge: Stripe.Charge): boolean {
  if (charge.paid !== true) return false
  if (charge.status !== 'succeeded') return false
  if (isStripeInvoicePaymentCharge(charge)) return false
  return collectedStripeChargeAmount(charge) > 0
}

export function stripeCustomerIdFromCharge(charge: Stripe.Charge): string | null {
  if (typeof charge.customer === 'string' && charge.customer) return charge.customer
  if (charge.customer && typeof charge.customer === 'object' && 'id' in charge.customer) {
    return charge.customer.id ?? null
  }
  return null
}
