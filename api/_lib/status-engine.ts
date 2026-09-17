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

  // Check for cancellation
  const isCanceled =
    input.stripeSubscriptionStatus === 'canceled' ||
    input.boardroomSubscriptionStatus === 'canceled' ||
    !!input.stripeCanceledAt

  if (isCanceled) {
    return 'canceled'
  }

  // Active customer: has actually paid
  if (input.hasSuccessfulPayment || input.hasShopifyRevenue) {
    return 'active_customer'
  }

  // In trial: subscription exists with trialing status
  const isTrial =
    input.stripeSubscriptionStatus === 'trialing' ||
    input.boardroomSubscriptionStatus === 'trialing' ||
    input.boardroomSubscriptionStatus === 'trial'

  if (isTrial) {
    // Check if trial hasn't ended
    if (input.stripeTrialEnd) {
      const trialEnd = new Date(input.stripeTrialEnd)
      if (trialEnd > new Date()) {
        return 'in_trial'
      }
    } else {
      return 'in_trial'
    }
  }

  // Has an active subscription but hasn't paid yet (possible free period)
  if (
    input.stripeSubscriptionStatus === 'active' ||
    input.boardroomSubscriptionStatus === 'active'
  ) {
    // If they have an active sub but zero payments, they could be in trial
    // or just started. If billing channel exists, they're at least in trial
    if (!input.hasSuccessfulPayment && !input.hasShopifyRevenue) {
      return 'in_trial'
    }
    return 'active_customer'
  }

  // Default: prospect
  return 'prospect'
}

/**
 * Calculate MRR for a customer based on their subscription data.
 */
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
