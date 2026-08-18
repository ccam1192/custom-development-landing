/**
 * Site-wide configuration.
 *
 * Stripe: replace STRIPE_CHECKOUT_URL in this file only.
 * Every "Get Started — $500" purchase CTA reads from this constant.
 */
export const STRIPE_CHECKOUT_URL = 'https://buy.stripe.com/14AcN48gV5fAapK5p83gk05'

export const BOOK_A_CALL_URL = 'https://meetings-na2.hubspot.com/charles-camisasca'

export const PATHS = {
  home: '/',
  customDevelopment: '/custom-development',
  requirementsGathering: '/requirements-gathering',
  bookACall: '/book-a-call',
} as const

export function isCustomDevelopmentPath(pathname: string) {
  return pathname === PATHS.home || pathname === PATHS.customDevelopment
}
