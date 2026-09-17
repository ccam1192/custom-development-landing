/**
 * Client Status Determination Engine
 *
 * Centralized server-side logic for determining the CRM client status
 * based on Boardroom, Stripe, and Shopify data.
 *
 * Status hierarchy:
 *   Agency Client  — always takes precedence if user_type is agency_client
 *   Active Customer — at least one successful payment
 *   In Trial        — active trial, no payments yet
 *   Canceled        — subscription canceled
 *   Prospect        — signed up but no payment info / no trial
 */

type ClientStatus = 'prospect' | 'in_trial' | 'active_customer' | 'canceled' | 'agency_client'

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
  // Agency clients always get their own status
  if (input.userType === 'agency_client') {
    return 'agency_client'
  }

  const subStatus = input.stripeSubscriptionStatus ?? input.boardroomSubscriptionStatus ?? null
  const isSubActive = subStatus === 'active' || subStatus === 'past_due'
  const isSubTrialing = subStatus === 'trialing' || input.boardroomSubscriptionStatus === 'trial'

  // Active subscription + paid → Active Customer
  if (isSubActive && (input.hasSuccessfulPayment || input.hasShopifyRevenue)) {
    return 'active_customer'
  }

  // Active subscription but no payment yet → In Trial (free period / grace)
  if (isSubActive && !input.hasSuccessfulPayment && !input.hasShopifyRevenue) {
    return 'in_trial'
  }

  // Trialing subscription
  if (isSubTrialing) {
    if (input.stripeTrialEnd) {
      const trialEnd = new Date(input.stripeTrialEnd)
      if (trialEnd > new Date()) return 'in_trial'
    } else {
      return 'in_trial'
    }
  }

  // Has paid but subscription is canceled or missing → was a paying customer, now canceled
  if (input.hasSuccessfulPayment || input.hasShopifyRevenue) {
    const isCanceled =
      subStatus === 'canceled' ||
      !!input.stripeCanceledAt
    if (isCanceled) return 'canceled'
    // Paid but no current subscription (e.g. one-off invoices) → active
    return 'active_customer'
  }

  // Subscription is explicitly canceled, never paid → canceled
  if (subStatus === 'canceled' || !!input.stripeCanceledAt) {
    return 'canceled'
  }

  // Default: prospect
  return 'prospect'
}

/**
 * Calculate MRR for a customer based on their subscription data.
 */
export type ShopifyLifecycleState =
  | 'ACTIVE'
  | 'TRIAL'
  | 'FROZEN'
  | 'CANCELED'
  | 'CANCELLATION_SCHEDULED'
  | 'NONE'

export function determineShopifyClientStatus(input: {
  previousCrmStatus?: ClientStatus | null
  userType?: string | null
  lifecycle: ShopifyLifecycleState
  hasConfirmedPayment: boolean
}): ClientStatus {
  if (input.userType === 'agency_client') return 'agency_client'

  if (input.lifecycle === 'FROZEN') {
    if (input.previousCrmStatus === 'active_customer' || input.hasConfirmedPayment) {
      return 'active_customer'
    }
    if (input.previousCrmStatus === 'in_trial') return 'in_trial'
    return 'in_trial'
  }

  if (input.lifecycle === 'CANCELED' || input.lifecycle === 'CANCELLATION_SCHEDULED') {
    return 'canceled'
  }

  if (input.lifecycle === 'ACTIVE' || input.lifecycle === 'TRIAL') {
    return input.hasConfirmedPayment ? 'active_customer' : 'in_trial'
  }

  // No current managed-pricing subscription
  if (input.hasConfirmedPayment) return 'canceled'
  return 'prospect'
}

export function shopifyFlatRateMrr(input: {
  lifecycle: ShopifyLifecycleState
  billingPeriod?: string | null
  flatRateAmount?: number | null
}): number {
  if (input.lifecycle === 'CANCELED' || input.lifecycle === 'CANCELLATION_SCHEDULED') return 0
  if (input.lifecycle === 'TRIAL' || input.lifecycle === 'NONE') return 0
  if (!input.flatRateAmount || input.flatRateAmount <= 0) return 0
  if (input.billingPeriod === 'ANNUAL') return input.flatRateAmount / 12
  if (input.billingPeriod === 'EVERY_30_DAYS') return input.flatRateAmount
  return 0
}

export function calculateMrr(input: {
  clientStatus: ClientStatus
  userType?: string | null
  stripePlanAmount?: number | null
  billingChannel?: string | null
}): number {
  // Canceled = $0 MRR
  if (input.clientStatus === 'canceled') return 0

  // In trial = $0 MRR
  if (input.clientStatus === 'in_trial') return 0

  // Prospect = $0 MRR
  if (input.clientStatus === 'prospect') return 0

  // Agency client = $0 unless explicitly overridden elsewhere
  if (input.clientStatus === 'agency_client') return 0

  // Use actual plan amount from Stripe if available
  if (input.stripePlanAmount && input.stripePlanAmount > 0) {
    return input.stripePlanAmount / 100 // Stripe amounts are in cents
  }

  return 0
}
