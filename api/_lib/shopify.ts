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

async function partnerQuery<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  if (!isShopifyConfigured()) {
    throw new Error(
      'Shopify Partner API not configured. Set SHOPIFY_PARTNER_ORG_ID, SHOPIFY_PARTNER_ACCESS_TOKEN, and SHOPIFY_APP_ID.'
    )
  }

  const res = await fetch(PARTNER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': ACCESS_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Shopify Partner API error ${res.status}: ${body}`)
  }

  const json = await res.json()
  if (json.errors?.length) {
    const messages = json.errors.map((e: { message: string }) => e.message).join('; ')
    throw new Error(`Shopify Partner API: ${messages}`)
  }

  return json.data
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
        first: 100
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
