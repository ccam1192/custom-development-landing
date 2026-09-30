import type { ClientStatus, CrmCustomer, UserType } from './types'

function shopifyLifecycle(value: string | null | undefined): string {
  switch (value) {
    case 'ACTIVE':
    case 'TRIAL':
    case 'FROZEN':
    case 'CANCELED':
    case 'CANCELLATION_SCHEDULED':
      return value
    default:
      return 'NONE'
  }
}

export function recastStatusForUserType(customer: CrmCustomer, userType: UserType): ClientStatus {
  if (userType === 'agency_client') return 'agency_client'
  if (customer.client_status !== 'agency_client') return customer.client_status

  const revenue = Math.max(
    Number(customer.total_revenue_override ?? 0),
    Number(customer.calculated_total_revenue ?? 0)
  )
  if (customer.billing_channel === 'stripe') {
    const live =
      customer.stripe_subscription_status === 'active' || customer.stripe_subscription_status === 'past_due'
    if (live && revenue > 0) return 'active_customer'
    if (live) return 'in_trial'
    if (customer.stripe_subscription_status === 'trialing') return 'in_trial'
    if (customer.cancellation_date || customer.stripe_canceled_at || customer.stripe_subscription_status === 'canceled') {
      return 'canceled'
    }
    if (revenue > 0) return 'active_customer'
    return 'prospect'
  }

  if (customer.billing_channel === 'shopify') {
    const lifecycle = shopifyLifecycle(customer.shopify_subscription_status)
    if (lifecycle === 'FROZEN' || lifecycle === 'CANCELED' || lifecycle === 'CANCELLATION_SCHEDULED') return 'canceled'
    if (lifecycle === 'ACTIVE' || lifecycle === 'TRIAL') return revenue > 0 ? 'active_customer' : 'in_trial'
    if (revenue > 0) return 'canceled'
    return 'prospect'
  }

  if (revenue > 0) return customer.cancellation_date ? 'canceled' : 'active_customer'
  return 'prospect'
}
