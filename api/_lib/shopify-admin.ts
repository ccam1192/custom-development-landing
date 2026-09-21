/**
 * Shopify Admin GraphQL helper for Shop.email.
 *
 * The CRM's existing Shopify integration is Partner API only. Partner Shop
 * has no email field. Shop.email lives on Admin GraphQL 2026-07.
 *
 * Auth: client credentials grant using the same Boardroom app credentials
 * (SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET). No extra Admin access scope
 * is required for `shop { email }` beyond the app already being installed.
 *
 * Client credentials only succeed for shops in the same Shopify org as the
 * app (typically Dev Dashboard stores). Merchant shops that installed the
 * public/custom app need a stored offline Admin token; those are not in this
 * CRM. Failures leave CRM email unchanged.
 */

import { myshopifyDomainFromUnknown } from './shopify-lifecycle.js'

const ADMIN_API_VERSION = '2026-07'
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID ?? process.env.SHOPIFY_APP_CLIENT_ID ?? ''
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET ?? process.env.SHOPIFY_APP_CLIENT_SECRET ?? ''

const tokenCache = new Map<string, { token: string; expiresAt: number }>()

const SHOP_EMAIL_QUERY = `
  query ShopEmail {
    shop {
      email
    }
  }
`

export function isShopifyAdminConfigured(): boolean {
  return !!CLIENT_ID && !!CLIENT_SECRET
}

export function shopifyAdminConfigError(): string {
  return (
    'Shopify Admin API is not configured. Partner API cannot return Shop.email. ' +
    'Set SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET (the Boardroom app client credentials) ' +
    'to query Admin GraphQL shop { email }. No additional Admin access scope is required for that field.'
  )
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function getAdminAccessToken(shopDomain: string): Promise<string> {
  const cached = tokenCache.get(shopDomain)
  if (cached && Date.now() < cached.expiresAt - 60_000) return cached.token

  const res = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  })

  const json = (await res.json().catch(() => null)) as
    | { access_token?: string; expires_in?: number; error?: string; error_description?: string }
    | null

  if (!res.ok || !json?.access_token) {
    const detail = json?.error_description || json?.error || `HTTP ${res.status}`
    throw new Error(`Admin token for ${shopDomain}: ${detail}`)
  }

  const expiresIn = Number(json.expires_in ?? 86399)
  tokenCache.set(shopDomain, {
    token: json.access_token,
    expiresAt: Date.now() + expiresIn * 1000,
  })
  return json.access_token
}

/**
 * Returns Shop.email for a myshopify domain, or null if Shopify returns none.
 * Throws on auth/API errors so callers can count them without nulling CRM email.
 */
export async function fetchShopifyShopEmail(storeUrlOrDomain: string | null | undefined): Promise<string | null> {
  if (!isShopifyAdminConfigured()) {
    throw new Error(shopifyAdminConfigError())
  }

  const domain = myshopifyDomainFromUnknown(storeUrlOrDomain)
  if (!domain) {
    throw new Error('Missing myshopify.com domain for Admin Shop.email lookup')
  }

  const token = await getAdminAccessToken(domain)
  const res = await fetch(`https://${domain}/admin/api/${ADMIN_API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query: SHOP_EMAIL_QUERY }),
  })

  const json = (await res.json().catch(() => null)) as {
    data?: { shop?: { email?: string | null } | null }
    errors?: Array<{ message?: string }>
  } | null

  if (!res.ok) {
    throw new Error(`Admin GraphQL HTTP ${res.status} for ${domain}`)
  }
  if (json?.errors?.length) {
    throw new Error(`Admin GraphQL: ${json.errors.map((e) => e.message).join('; ')}`)
  }

  const email = json?.data?.shop?.email?.trim() ?? ''
  return email || null
}

export async function pauseBetweenShopEmailLookups() {
  await sleep(350)
}
