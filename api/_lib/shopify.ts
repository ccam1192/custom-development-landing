/**
 * Shopify Partner API Integration
 *
 * Uses the root `transactions` query (App.transactions was removed)
 * to fetch actual collected revenue: usage sales, subscription sales,
 * adjustments, and credits.
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

const TRANSACTION_FIELDS = `
  id
  createdAt
  __typename
  ... on AppUsageSale {
    chargeId
    grossAmount { amount currencyCode }
    netAmount { amount currencyCode }
    shopifyFee { amount currencyCode }
    shop { id myshopifyDomain name }
  }
  ... on AppSubscriptionSale {
    chargeId
    grossAmount { amount currencyCode }
    netAmount { amount currencyCode }
    shopifyFee { amount currencyCode }
    shop { id myshopifyDomain name }
  }
  ... on AppOneTimeSale {
    chargeId
    grossAmount { amount currencyCode }
    netAmount { amount currencyCode }
    shopifyFee { amount currencyCode }
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
`

/**
 * Fetch collected-revenue transactions for the app.
 *
 * Partner API 2025+: `transactions` lives on QueryRoot, not App.
 */
export async function getAppTransactions(
  after?: string | null,
  createdAtMin?: string
): Promise<TransactionsPage> {
  const query = `
    query AppTransactions($appId: ID!, $after: String, $types: [TransactionType!], $createdAtMin: DateTime) {
      transactions(
        first: 100
        after: $after
        appId: $appId
        types: $types
        createdAtMin: $createdAtMin
      ) {
        edges {
          node {
            ${TRANSACTION_FIELDS}
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `

  const data = await partnerQuery<{
    transactions: {
      edges: Array<{ node: ShopifyTransaction }>
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
    }
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
    createdAtMin: createdAtMin ?? null,
  })

  const txns = data.transactions
  if (!txns) {
    throw new Error('Shopify Partner API returned no transactions connection')
  }

  return {
    transactions: txns.edges.map((e) => e.node),
    hasNextPage: txns.pageInfo.hasNextPage,
    endCursor: txns.pageInfo.endCursor,
  }
}

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
