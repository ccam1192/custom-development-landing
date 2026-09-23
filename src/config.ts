/**
 * Site-wide configuration.
 *
 * Stripe: replace STRIPE_CHECKOUT_URL in this file only.
 * Every "Get Started" purchase CTA reads from this constant.
 */
export const STRIPE_CHECKOUT_URL = 'https://buy.stripe.com/5kQ9AS7cRfUe1Te18S3gk06'

export const PACKAGE_PRICE_LABEL = '$2,500'

export const BOOK_A_CALL_URL = 'https://meetings-na2.hubspot.com/charles-camisasca'

export const PATHS = {
  home: '/',
  customDevelopment: '/custom-development',
  requirementsGathering: '/requirements-gathering',
  bookACall: '/book-a-call',
  technologyPartners: '/technology-partners',
  accountingFirms: '/accounting-firms',
} as const

export function isCustomDevelopmentPath(pathname: string) {
  return pathname === PATHS.home || pathname === PATHS.customDevelopment
}
