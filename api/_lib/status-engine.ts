/**
 * Client Status Determination Engine
 *
 * Centralized server-side logic for determining the CRM client status
 * based on Boardroom, Stripe, and Shopify data.
 *
 * Invariants:
 *   Revenue > 0 → never Prospect
 *   Shopify + Revenue = 0 + active/unfrozen → In Trial (never Active Customer)
 *   Shopify frozen → Canceled
 *   Stripe billing channel → Stripe remains authoritative
 */

export type ClientStatus = 'prospect' | 'in_trial' | 'active_customer' | 'canceled' | 'agency_client'

export type ShopifyLifecycleState =
  | 'ACTIVE'
  | 'TRIAL'
  | 'FROZEN'
  | 'CANCELED'
  | 'CANCELLATION_SCHEDULED'
  | 'NONE'

interface StatusInput {
  userType?: string | null
  stripeSubscriptionStatus?: string | null
  stripeTrialEnd?: string | null
  stripeCanceledAt?: string | null
  boardroomSubscriptionStatus?: string | null
  billingChannel?: string | null
  hasSuccessfulPayment: boolean
  hasShopifyRevenue: boolean
}

export function determineClientStatus(input: StatusInput): ClientStatus {
  if (input.userType === 'agency_client') {
    return 'agency_client'
  }

  const subStatus = input.stripeSubscriptionStatus ?? input.boardroomSubscriptionStatus ?? null
  const isSubActive = subStatus === 'active' || subStatus === 'past_due'
  const isSubTrialing = subStatus === 'trialing' || input.boardroomSubscriptionStatus === 'trial'
  const paid = input.hasSuccessfulPayment || input.hasShopifyRevenue

  if (isSubActive && paid) return 'active_customer'
  if (isSubActive && !paid) return 'in_trial'

  if (isSubTrialing) {
    if (input.stripeTrialEnd) {
      const trialEnd = new Date(input.stripeTrialEnd)
      if (trialEnd > new Date()) return 'in_trial'
    } else {
      return 'in_trial'
    }
  }

  if (paid) {
    const isCanceled = subStatus === 'canceled' || !!input.stripeCanceledAt
    if (isCanceled) return 'canceled'
    return 'active_customer'
  }

  if (subStatus === 'canceled' || !!input.stripeCanceledAt) {
    return 'canceled'
  }

  return 'prospect'
}

export interface ResolveClientStatusInput {
  userType?: string | null
  billingChannel?: string | null
  stripeSubscriptionStatus?: string | null
  stripeTrialEnd?: string | null
  stripeCanceledAt?: string | null
  boardroomSubscriptionStatus?: string | null
  shopifyLifecycle?: ShopifyLifecycleState | null
  confirmedRevenue: number
  hasSuccessfulStripePayment?: boolean
}

/**
 * Single status resolver for Shopify and Stripe CRM rows.
 * Shopify freeze/unfreeze and revenue invariants live here.
 */
export function resolveClientStatus(input: ResolveClientStatusInput): ClientStatus {
  if (input.userType === 'agency_client') return 'agency_client'

  if (input.billingChannel === 'stripe') {
    return determineClientStatus({
      userType: input.userType,
      stripeSubscriptionStatus: input.stripeSubscriptionStatus,
      stripeTrialEnd: input.stripeTrialEnd,
      stripeCanceledAt: input.stripeCanceledAt,
      boardroomSubscriptionStatus: input.boardroomSubscriptionStatus,
      billingChannel: 'stripe',
      hasSuccessfulPayment: input.hasSuccessfulStripePayment ?? input.confirmedRevenue > 0,
      hasShopifyRevenue: false,
    })
  }

  const paid = input.confirmedRevenue > 0
  const lifecycle = input.shopifyLifecycle ?? 'NONE'

  // Frozen Shopify subscriptions are suspended (non-paying / closed store).
  if (lifecycle === 'FROZEN') return 'canceled'

  if (lifecycle === 'ACTIVE' || lifecycle === 'TRIAL') {
    return paid ? 'active_customer' : 'in_trial'
  }

  if (lifecycle === 'CANCELED' || lifecycle === 'CANCELLATION_SCHEDULED') {
    return 'canceled'
  }

  // No current managed-pricing subscription
  if (paid) return 'canceled'
  return 'prospect'
}

export function determineShopifyClientStatus(input: {
  previousCrmStatus?: ClientStatus | null
  userType?: string | null
  lifecycle: ShopifyLifecycleState
  hasConfirmedPayment: boolean
}): ClientStatus {
  return resolveClientStatus({
    userType: input.userType,
    billingChannel: 'shopify',
    shopifyLifecycle: input.lifecycle,
    confirmedRevenue: input.hasConfirmedPayment ? 1 : 0,
  })
}

/**
 * Shopify MRR while the subscription is ACTIVE.
 * Prefers a positive FlatRatePrice (annual / 12, or every-30-days as-is).
 * Boardroom bills via usage charges, so when there is no positive flat rate,
 * the latest succeeded AppUsageSale is current MRR until cancel/freeze/trial.
 */
export function shopifyFlatRateMrr(input: {
  lifecycle: ShopifyLifecycleState
  billingPeriod?: string | null
  flatRateAmount?: number | null
  usageAmount?: number | null
}): number {
  if (
    input.lifecycle === 'CANCELED' ||
    input.lifecycle === 'CANCELLATION_SCHEDULED' ||
    input.lifecycle === 'FROZEN' ||
    input.lifecycle === 'TRIAL' ||
    input.lifecycle === 'NONE'
  ) {
    return 0
  }
  if (input.flatRateAmount && input.flatRateAmount > 0) {
    if (input.billingPeriod === 'ANNUAL') return input.flatRateAmount / 12
    if (input.billingPeriod === 'EVERY_30_DAYS') return input.flatRateAmount
    return 0
  }
  if (input.usageAmount && input.usageAmount > 0) return input.usageAmount
  return 0
}

export function calculateMrr(input: {
  clientStatus: ClientStatus
  userType?: string | null
  stripePlanAmount?: number | null
  billingChannel?: string | null
}): number {
  if (input.clientStatus === 'canceled') return 0
  if (input.clientStatus === 'in_trial') return 0
  if (input.clientStatus === 'prospect') return 0
  if (input.clientStatus === 'agency_client') return 0
  if (input.stripePlanAmount && input.stripePlanAmount > 0) {
    return input.stripePlanAmount / 100
  }
  return 0
}

export interface StatusScenario {
  id: string
  name: string
  input: ResolveClientStatusInput
  expected: ClientStatus
}

export const STATUS_SCENARIOS: StatusScenario[] = [
  {
    id: 'A',
    name: 'Shopify-only trial, revenue = 0',
    input: { billingChannel: 'shopify', shopifyLifecycle: 'TRIAL', confirmedRevenue: 0 },
    expected: 'in_trial',
  },
  {
    id: 'B',
    name: 'Shopify-only paying customer',
    input: { billingChannel: 'shopify', shopifyLifecycle: 'ACTIVE', confirmedRevenue: 125 },
    expected: 'active_customer',
  },
  {
    id: 'C',
    name: 'Shopify frozen unpaid',
    input: { billingChannel: 'shopify', shopifyLifecycle: 'FROZEN', confirmedRevenue: 0 },
    expected: 'canceled',
  },
  {
    id: 'D',
    name: 'Shopify frozen previously paying',
    input: { billingChannel: 'shopify', shopifyLifecycle: 'FROZEN', confirmedRevenue: 200 },
    expected: 'canceled',
  },
  {
    id: 'E',
    name: 'Shopify unfrozen unpaid (active subscription)',
    input: { billingChannel: 'shopify', shopifyLifecycle: 'ACTIVE', confirmedRevenue: 0 },
    expected: 'in_trial',
  },
  {
    id: 'F',
    name: 'Shopify unfrozen paying',
    input: { billingChannel: 'shopify', shopifyLifecycle: 'ACTIVE', confirmedRevenue: 125 },
    expected: 'active_customer',
  },
  {
    id: 'G',
    name: 'Canceled paying customer',
    input: { billingChannel: 'shopify', shopifyLifecycle: 'CANCELED', confirmedRevenue: 50 },
    expected: 'canceled',
  },
  {
    id: 'H',
    name: 'Spreadsheet Prospect but actually paid and inactive',
    input: { billingChannel: 'shopify', shopifyLifecycle: 'CANCELED', confirmedRevenue: 80 },
    expected: 'canceled',
  },
  {
    id: 'I',
    name: 'Stripe customer is not flipped by Shopify lifecycle',
    input: {
      billingChannel: 'stripe',
      shopifyLifecycle: 'FROZEN',
      confirmedRevenue: 300,
      hasSuccessfulStripePayment: true,
      stripeSubscriptionStatus: 'active',
    },
    expected: 'active_customer',
  },
]

export function runStatusScenarios(): Array<{ id: string; name: string; expected: ClientStatus; actual: ClientStatus; pass: boolean }> {
  return STATUS_SCENARIOS.map((s) => {
    const actual = resolveClientStatus(s.input)
    return { id: s.id, name: s.name, expected: s.expected, actual, pass: actual === s.expected }
  })
}
