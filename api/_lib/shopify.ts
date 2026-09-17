/**
 * Shopify Partner API Integration
 *
 * Uses the GraphQL Partner API to fetch actual collected revenue
 * from APP_USAGE_SALE transactions (not merely usage charges).
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

interface ShopifyTransaction {
  id: string
  type: string
  createdAt: string
  chargeId: string | null
  grossAmount: { amount: string; currencyCode: string }
  netAmount: { amount: string; currencyCode: string }
  shopifyFee: { amount: string; currencyCode: string }
  processingFee?: { amount: string; currencyCode: string }
  regulatoryOperatingFee?: { amount: string; currencyCode: string }
  shop: {
    id: string
    myshopifyDomain: string
    name: string
  }
}

interface TransactionsPage {
  transactions: ShopifyTransaction[]
  hasNextPage: boolean
  endCursor: string | null
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
    throw new Error(`Shopify Partner API: ${json.errors[0].message}`)
  }

  return json.data
}

/**
 * Fetch APP_USAGE_SALE, APP_SALE_ADJUSTMENT, and APP_SALE_CREDIT transactions.
 *
 * These represent actual collected revenue, not merely created usage charges.
 */
export async function getAppTransactions(
  after?: string | null,
  createdAtMin?: string
): Promise<TransactionsPage> {
  const query = `
    query AppTransactions($appId: ID!, $after: String, $types: [AppTransactionType!]${createdAtMin ? ', $createdAtMin: DateTime' : ''}) {
      app(id: $appId) {
        transactions(
          first: 100
          after: $after
          types: $types
          ${createdAtMin ? 'createdAtMin: $createdAtMin' : ''}
        ) {
          edges {
            node {
              id
              type
              createdAt
              ... on AppUsageSale {
                chargeId
                grossAmount { amount currencyCode }
                netAmount { amount currencyCode }
                shopifyFee { amount currencyCode }
                processingFee { amount currencyCode }
                regulatoryOperatingFee { amount currencyCode }
                shop { id myshopifyDomain name }
              }
              ... on AppSaleAdjustment {
                grossAmount { amount currencyCode }
                netAmount { amount currencyCode }
                shopifyFee { amount currencyCode }
                shop { id myshopifyDomain name }
              }
              ... on AppSaleCredit {
                grossAmount { amount currencyCode }
                netAmount { amount currencyCode }
                shopifyFee { amount currencyCode }
                shop { id myshopifyDomain name }
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  `

  const data = await partnerQuery<{
    app: {
      transactions: {
        edges: Array<{ node: ShopifyTransaction }>
        pageInfo: { hasNextPage: boolean; endCursor: string | null }
      }
    }
  }>(query, {
    appId: `gid://partners/App/${APP_ID}`,
    after: after || null,
    types: ['APP_USAGE_SALE', 'APP_SALE_ADJUSTMENT', 'APP_SALE_CREDIT'],
    ...(createdAtMin ? { createdAtMin } : {}),
  })

  const txns = data.app.transactions

  return {
    transactions: txns.edges.map((e) => e.node),
    hasNextPage: txns.pageInfo.hasNextPage,
    endCursor: txns.pageInfo.endCursor,
  }
}

/**
 * Fetch ALL historical transactions with automatic pagination.
 */
export async function getAllAppTransactions(
  createdAtMin?: string
): Promise<ShopifyTransaction[]> {
  const all: ShopifyTransaction[] = []
  let cursor: string | null = null
  let hasNext = true

  while (hasNext) {
    const page = await getAppTransactions(cursor, createdAtMin)
    all.push(...page.transactions)
    hasNext = page.hasNextPage
    cursor = page.endCursor
  }

  return all
}

export type { ShopifyTransaction }
