/**
 * Shopify Partner API Integration
 *
 * Schema notes (Partner API 2026-07):
 *   - transactions lives on QueryRoot, NOT App (partners App GID)
 *   - PageInfo for transactions has no endCursor — use TransactionEdge.cursor
 *   - events + activeSubscription require 2026-07 and shopify App/Shop GIDs
 *   - events date window max is 365 days
 *
 * Required env:
 *   SHOPIFY_PARTNER_ORG_ID
 *   SHOPIFY_PARTNER_ACCESS_TOKEN
 *   SHOPIFY_APP_ID
 */

const ORG_ID = process.env.SHOPIFY_PARTNER_ORG_ID ?? ''
const ACCESS_TOKEN = process.env.SHOPIFY_PARTNER_ACCESS_TOKEN ?? ''
const APP_ID = process.env.SHOPIFY_APP_ID ?? ''

/** 2026-01 has transactions only. events + activeSubscription require 2026-07. */
const PARTNER_API_VERSION = '2026-07'
const PARTNER_API_URL = `https://partners.shopify.com/${ORG_ID}/api/${PARTNER_API_VERSION}/graphql.json`

export function isShopifyConfigured(): boolean {
  return !!ORG_ID && !!ACCESS_TOKEN && !!APP_ID
}

/** Transactions still use partners App GIDs. */
export function partnerAppGid(): string {
  return `gid://partners/App/${APP_ID}`
}

/** events + activeSubscription require shopify App GIDs. */
export function shopifyAppGid(): string {
  return `gid://shopify/App/${APP_ID}`
}

export function toShopifyShopGid(id: string | null | undefined): string | null {
  if (!id) return null
  const numeric = id.split('/').pop()
  if (!numeric) return null
  return `gid://shopify/Shop/${numeric}`
}

export function shopGidNumeric(id: string | null | undefined): string | null {
  if (!id) return null
  return id.split('/').pop() ?? null
}

export function shopifyAppNumericId(): string {
  return APP_ID
}

interface Money {
  amount: string
  currencyCode: string
}

export interface ShopifyTransaction {
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
  createdAtMin?: string,
  createdAtMax?: string
): Promise<TransactionsPage> {
  const extraVars: string[] = []
  const extraArgs: string[] = []
  if (createdAtMin) {
    extraVars.push('$createdAtMin: DateTime')
    extraArgs.push('createdAtMin: $createdAtMin')
  }
  if (createdAtMax) {
    extraVars.push('$createdAtMax: DateTime')
    extraArgs.push('createdAtMax: $createdAtMax')
  }
  const extraVar = extraVars.length ? `, ${extraVars.join(', ')}` : ''
  const extraArg = extraArgs.join('\n        ')

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
    appId: partnerAppGid(),
    after: after || null,
    types: [
      'APP_USAGE_SALE',
      'APP_SUBSCRIPTION_SALE',
      'APP_ONE_TIME_SALE',
      'APP_SALE_ADJUSTMENT',
      'APP_SALE_CREDIT',
    ],
    ...(createdAtMin ? { createdAtMin } : {}),
    ...(createdAtMax ? { createdAtMax } : {}),
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

export interface ShopifySubscriptionItem {
  handle: string | null
  description: string | null
  price: {
    __typename: string
    amount?: string
    currency?: string
    active?: boolean
  }
}

export interface ShopifyActiveSubscription {
  billingPeriod: string
  cancelAtEndOfCycle: boolean
  trialEndsAt: string | null
  legacySubscriptionId: string | null
  currentBillingCycle: { startTime: string; endTime: string } | null
  pendingUpdate: {
    billingPeriod: string
    legacySubscriptionId: string | null
    items: ShopifySubscriptionItem[]
  } | null
  shop: { id: string; myshopifyDomain: string; name: string }
  items: ShopifySubscriptionItem[]
}

export interface ShopifyPartnerEvent {
  id: string
  __typename: string
  occurredAt: string
  eventType: string
  shop: { id: string; myshopifyDomain: string; name: string } | null
  state?: string | null
  cancelEffectiveOn?: string | null
  plan?: { handle: string | null; billingPeriod: string | null; trialDays: number | null } | null
}

export interface HistoricalEventsPage {
  events: ShopifyPartnerEvent[]
  hasNextPage: boolean
  cursor: string | null
}

// Partner EventType values only. Do not add AppEventTypes such as
// SUBSCRIPTION_CHARGE_EXPIRED / FROZEN — those are a different GraphQL enum
// and would fail the events() filter. Managed-pricing freeze/cancel/expire
// equivalents are SUBSCRIPTION_FROZEN / CANCELED plus relationship deactivate.
const SUBSCRIPTION_EVENT_TYPES = [
  'SUBSCRIPTION_CREATED',
  'SUBSCRIPTION_UPDATED',
  'SUBSCRIPTION_CANCELED',
  'SUBSCRIPTION_CANCELLATION_SCHEDULED',
  'SUBSCRIPTION_FROZEN',
  'SUBSCRIPTION_UNFROZEN',
  'RELATIONSHIP_INSTALLED',
  'RELATIONSHIP_UNINSTALLED',
  'RELATIONSHIP_DEACTIVATED',
  'RELATIONSHIP_REACTIVATED',
]

export async function getHistoricalEvents(
  after?: string | null,
  occurredAtMin?: string,
  occurredAtMax?: string
): Promise<HistoricalEventsPage> {
  const query = `
    query HistoricalEvents($filter: EventFilterInput, $after: String) {
      events(first: 100, after: $after, filter: $filter, orderBy: OCCURRED_AT_ASC) {
        pageInfo { hasNextPage endCursor }
        edges {
          node {
            __typename
            id
            occurredAt
            eventType
            shop { id myshopifyDomain name }
            ... on SubscriptionStatus {
              state
              cancelEffectiveOn
              plan { handle billingPeriod trialDays }
            }
            ... on Relationship {
              state
            }
          }
        }
      }
    }
  `

  const data = await partnerQuery<{
    events: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
      edges: Array<{ node: ShopifyPartnerEvent }>
    } | null
  }>(query, {
    after: after || null,
    filter: {
      subjectType: 'APP',
      subjectId: shopifyAppGid(),
      eventTypes: SUBSCRIPTION_EVENT_TYPES,
      ...(occurredAtMin ? { occurredAtMin } : {}),
      ...(occurredAtMax ? { occurredAtMax } : {}),
    },
  })

  const conn = data.events
  if (!conn) throw new Error('Shopify Partner API returned no events connection')

  return {
    events: conn.edges.map((e) => e.node),
    hasNextPage: conn.pageInfo.hasNextPage,
    cursor: conn.pageInfo.endCursor,
  }
}

export async function getActiveSubscription(
  shopId: string
): Promise<ShopifyActiveSubscription | null> {
  const query = `
    query ActiveSub($appId: ID!, $shopId: ID!) {
      activeSubscription(appId: $appId, shopId: $shopId) {
        billingPeriod
        cancelAtEndOfCycle
        trialEndsAt
        legacySubscriptionId
        currentBillingCycle { startTime endTime }
        pendingUpdate {
          billingPeriod
          legacySubscriptionId
          items {
            handle
            description
            price {
              __typename
              ... on FlatRatePrice { amount currency active }
              ... on TieredPrice { currency active }
            }
          }
        }
        shop { id myshopifyDomain name }
        items {
          handle
          description
          price {
            __typename
            ... on FlatRatePrice { amount currency active }
            ... on TieredPrice { currency active }
          }
        }
      }
    }
  `

  const data = await partnerQuery<{ activeSubscription: ShopifyActiveSubscription | null }>(query, {
    appId: shopifyAppGid(),
    shopId: toShopifyShopGid(shopId) ?? shopId,
  })

  return data.activeSubscription ?? null
}
