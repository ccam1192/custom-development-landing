import {
  collectedStripeChargeAmount,
  isCollectedInvoiceLessCharge,
  isInvoiceBackedCharge,
  stripeCustomerIdFromCharge,
} from '../api/_lib/stripe-charges.ts'
import { calculateMrr } from '../api/_lib/status-engine.ts'
import { nextCalculatedTotalRevenue } from '../api/_lib/revenue.ts'
import type Stripe from 'stripe'

function charge(partial: Partial<Stripe.Charge>): Stripe.Charge {
  return {
    id: 'ch_test',
    object: 'charge',
    paid: true,
    status: 'succeeded',
    amount: 15000,
    amount_refunded: 0,
    currency: 'usd',
    customer: 'cus_test',
    invoice: null,
    created: 1,
    ...partial,
  } as Stripe.Charge
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}

{
  const c = charge({ invoice: 'in_123' })
  assert(isInvoiceBackedCharge(c), 'invoice-backed')
  assert(!isCollectedInvoiceLessCharge(c), 'skip invoice-backed charges')
  console.log('PASS skip invoice-backed charges')
}

{
  const c = charge({ invoice: null, amount: 15000 })
  assert(isCollectedInvoiceLessCharge(c), 'invoice-less collected')
  assert(collectedStripeChargeAmount(c) === 150, 'amount dollars')
  assert(stripeCustomerIdFromCharge(c) === 'cus_test', 'customer id')
  console.log('PASS invoice-less charge')
}

{
  const c = charge({ invoice: null, description: 'Payment for Invoice', amount: 250000 })
  assert(!isCollectedInvoiceLessCharge(c), 'skip invoice payment charges')
  console.log('PASS skip Payment for Invoice charges')
}

{
  const c = charge({ paid: false })
  assert(!isCollectedInvoiceLessCharge(c), 'unpaid skipped')
  console.log('PASS unpaid skipped')
}

{
  const mrr = calculateMrr({
    clientStatus: 'active_customer',
    stripePlanAmount: null,
    latestPaymentAmountCents: 15000,
  })
  assert(mrr === 150, `MRR from latest payment, got ${mrr}`)
  console.log('PASS MRR from latest payment')
}

{
  const next = nextCalculatedTotalRevenue({
    existingCalculated: 0,
    existingOverride: 1400,
    ledgerTotal: 1700,
    newlyCollectedAmount: 150,
  })
  assert(next === 1700, `revenue floor plus live ledger, got ${next}`)
  console.log('PASS revenue uses live ledger above override floor')
}

console.log('All Stripe charge cases passed')
