/**
 * Shopify Partner API Integration
 *
 * Schema notes (Partner API 2026-01, verified against shopify.dev):
 *   - transactions lives on QueryRoot, NOT App
 *   - PageInfo only has hasNextPage / hasPreviousPage (no endCursor)
 *   - Pagination cursor is on TransactionEdge.cursor
 *   - Transaction interface fields: id, createdAt
 *   - Sale types expose chargeId, grossAmount, netAmount, shopifyFee, shop
 *
 * Required env:
 *   SHOPIFY_PARTNER_ORG_ID
 *   SHOPIFY_PARTNER_ACCESS_TOKEN
 *   SHOPIFY_APP_ID
 */

const ORG_ID = process.env.SHOPIFY_PARTNER_ORG_ID ?? ''
const ACCESS_TOKEN = process.env.SHOPIFY_PARTNER_ACCESS_TOKEN ?? ''
const APP_ID = process.env.SHOPIFY_APP_ID ?? ''

const PARTNER_API_URL = `https://partners.shopify.com/${ORG_ID}/api/2026-01/graphql.json`

export function isShopifyConfigured(): boolean {
  return !!ORG_ID && !!ACCESS_TOKEN && !!APP_ID
}

interface Money {
  amount: string
  currencyCode: string
}

interface ShopifyTransaction {
  id: string
  createdAt: string
  __typename: string
  chargeId?: string | null
  grossAmount?: Money | null
  netAmount?: Money | null
  shopifyFee?: Money | null
  shop?: {
    id: string
    myshopifyDomain: string
    name: string
  } | null
}

interface TransactionsPage {
  transactions: ShopifyTransaction[]
  hasNextPage: boolean
  cursor: string | null
}

const PAGE_SIZE = 100
const PAGE_DELAY_MS = 350 // Partner API: 4 requests/second
const MAX_RETRIES = 8

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function partnerRateLimitPause() {
  return sleep(PAGE_DELAY_MS)
}

function isRateLimit(status: number, errors?: Array<{ message?: string; extensions?: { code?: string } }>): boolean {
  if (status === 429) return true
  return (errors ?? []).some(
    (e) => e.extensions?.code === '429' || /too many requests/i.test(e.message ?? '')
  )
}

async function partnerQuery<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  if (!isShopifyConfigured()) {
    throw new Error(
      'Shopify Partner API not configured. Set SHOPIFY_PARTNER_ORG_ID, SHOPIFY_PARTNER_ACCESS_TOKEN, and SHOPIFY_APP_ID.'
    )
  }

  let lastError = 'Shopify Partner API request failed'

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(PARTNER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': ACCESS_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    })

    const retryAfterHeader = res.headers.get('retry-after')
    const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : NaN
    const backoffMs = Number.isFinite(retryAfterMs) && retryAfterMs > 0
      ? retryAfterMs
      : Math.min(30_000, 1000 * 2 ** attempt)

    if (res.status === 429) {
      lastError = `Shopify Partner API error 429 (attempt ${attempt + 1}/${MAX_RETRIES + 1})`
      console.warn(`[Shopify] Rate limited. Waiting ${backoffMs}ms before retry`)
      await sleep(backoffMs)
      continue
    }

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      const body = typeof json === 'object' ? JSON.stringify(json) : await res.text().catch(() => '')
      lastError = `Shopify Partner API error ${res.status}: ${body}`
      if (attempt < MAX_RETRIES && res.status >= 500) {
        await sleep(backoffMs)
        continue
      }
      throw new Error(lastError)
    }

    if (json?.errors?.length) {
      if (isRateLimit(res.status, json.errors) && attempt < MAX_RETRIES) {
        lastError = `Shopify Partner API: ${json.errors[0].message}`
        console.warn(`[Shopify] Rate limited in GraphQL errors. Waiting ${backoffMs}ms before retry`)
        await sleep(backoffMs)
        continue
      }
      const messages = json.errors.map((e: { message: string }) => e.message).join('; ')
      throw new Error(`Shopify Partner API: ${messages}`)
    }

    return json.data as T
  }

  throw new Error(lastError)
}

/** Fields shared by all App*Sale types in 2026-01 */
const SALE_FIELDS = `
  chargeId
  grossAmount { amount currencyCode }
  netAmount { amount currencyCode }
  shopifyFee { amount currencyCode }
  shop { id myshopifyDomain name }
`

/**
 * Fetch one page of collected-revenue transactions for the app.
 *
 * Partner API PageInfo has no endCursor — use edges { cursor }.
 */
export async function getAppTransactions(
  after?: string | null,
  createdAtMin?: string
): Promise<TransactionsPage> {
  const extraVar = createdAtMin ? ', $createdAtMin: DateTime' : ''
  const extraArg = createdAtMin ? 'createdAtMin: $createdAtMin' : ''

  const query = `
    query AppTransactions($appId: ID!, $after: String, $types: [TransactionType!]${extraVar}) {
      transactions(
        first: ${PAGE_SIZE}
        after: $after
        appId: $appId
        types: $types
        ${extraArg}
      ) {
        edges {
          cursor
          node {
            __typename
            id
            createdAt
            ... on AppUsageSale { ${SALE_FIELDS} }
            ... on AppSubscriptionSale { ${SALE_FIELDS} }
            ... on AppOneTimeSale { ${SALE_FIELDS} }
            ... on AppSaleAdjustment { ${SALE_FIELDS} }
            ... on AppSaleCredit { ${SALE_FIELDS} }
          }
        }
        pageInfo {
          hasNextPage
        }
      }
    }
  `

  const data = await partnerQuery<{
    transactions: {
      edges: Array<{ cursor: string; node: ShopifyTransaction }>
      pageInfo: { hasNextPage: boolean }
    } | null
  }>(query, {
    appId: `gid://partners/App/${APP_ID}`,
    after: after || null,
    types: [
      'APP_USAGE_SALE',
      'APP_SUBSCRIPTION_SALE',
      'APP_ONE_TIME_SALE',
      'APP_SALE_ADJUSTMENT',
      'APP_SALE_CREDIT',
    ],
    ...(createdAtMin ? { createdAtMin } : {}),
  })

  const txns = data.transactions
  if (!txns) {
    throw new Error('Shopify Partner API returned no transactions connection')
  }

  const lastEdge = txns.edges[txns.edges.length - 1]

  return {
    transactions: txns.edges.map((e) => e.node),
    hasNextPage: txns.pageInfo.hasNextPage,
    cursor: lastEdge?.cursor ?? null,
  }
}

export async function getAllAppTransactions(
  createdAtMin?: string
): Promise<ShopifyTransaction[]> {
  const all: ShopifyTransaction[] = []
  let cursor: string | null = null
  let hasNext = true
  let pages = 0
  const MAX_PAGES = 500

  while (hasNext) {
    if (pages > 0) await sleep(PAGE_DELAY_MS)
    const page = await getAppTransactions(cursor, createdAtMin)
    all.push(...page.transactions)
    hasNext = page.hasNextPage && !!page.cursor
    cursor = page.cursor
    pages++
    if (pages >= MAX_PAGES) {
      throw new Error(`Shopify sync stopped after ${MAX_PAGES} pages (${all.length} transactions) to avoid a runaway loop`)
    }
  }

  return all
}

export type { ShopifyTransaction }
