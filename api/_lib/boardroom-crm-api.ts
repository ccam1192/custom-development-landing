/**
 * Server-only Boardroom CRM API reader for email enrichment.
 * Do not import this from browser code. Do not send Origin / Sec-Fetch-Site.
 *
 * Existing api/_lib/boardroom.ts remains unchanged (different, unused path).
 */

import { myshopifyDomainFromUnknown } from './shopify-lifecycle.js'

const PER_PAGE = 500
const MAX_PAGES = 250

export interface BoardroomEmailSourceUser {
  id: string
  email: string | null
  shopifyDomains: string[]
}

interface BoardroomUsersEnvelope {
  data?: unknown
  meta?: unknown
  links?: { next?: unknown }
}

interface BoardroomStore {
  type?: unknown
  shopify_shop_domain?: unknown
}

function getConfig(): { baseUrl: string; apiKey: string } {
  return {
    baseUrl: (process.env.BOARDROOM_API_BASE_URL ?? '').replace(/\/$/, ''),
    apiKey: process.env.BOARDROOM_API_KEY ?? '',
  }
}

export function isBoardroomCrmApiConfigured(): boolean {
  const { baseUrl, apiKey } = getConfig()
  return Boolean(baseUrl && apiKey)
}

export function boardroomCrmApiConfigError(): string {
  return 'Boardroom API not configured. Set BOARDROOM_API_BASE_URL and BOARDROOM_API_KEY.'
}

function redactSecrets(text: string): string {
  const { apiKey } = getConfig()
  let out = text
  if (apiKey) out = out.split(apiKey).join('[redacted]')
  return out.replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
}

/** Laravel pagination links omit per_page, which would silently drop back to 100. */
export function usersPageUrl(baseUrl: string, page: number, perPage = PER_PAGE): string {
  const url = new URL(baseUrl.endsWith('/') ? `${baseUrl}users` : `${baseUrl}/users`)
  url.searchParams.set('page', String(page))
  url.searchParams.set('per_page', String(perPage))
  return url.toString()
}

export function collectBoardroomShopifyDomains(input: {
  shopify_shop_domains?: unknown
  stores?: unknown
}): string[] {
  const domains = new Set<string>()

  if (Array.isArray(input.shopify_shop_domains)) {
    for (const value of input.shopify_shop_domains) {
      const domain = myshopifyDomainFromUnknown(typeof value === 'string' ? value : null)
      if (domain) domains.add(domain)
    }
  }

  if (Array.isArray(input.stores)) {
    for (const store of input.stores as BoardroomStore[]) {
      if (store?.type !== 'shopify') continue
      const domain = myshopifyDomainFromUnknown(
        typeof store.shopify_shop_domain === 'string' ? store.shopify_shop_domain : null
      )
      if (domain) domains.add(domain)
    }
  }

  return [...domains]
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim()
  return email || null
}

function slimUser(raw: unknown): BoardroomEmailSourceUser | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as {
    id?: unknown
    email?: unknown
    shopify_shop_domains?: unknown
    stores?: unknown
  }
  if (row.id == null || row.id === '') return null
  return {
    id: String(row.id),
    email: normalizeEmail(row.email),
    shopifyDomains: collectBoardroomShopifyDomains(row),
  }
}

async function getJson(url: string, apiKey: string): Promise<BoardroomUsersEnvelope> {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
  })
  const body = await res.text().catch(() => '')
  if (!res.ok) {
    throw new Error(redactSecrets(`Boardroom API error ${res.status}: ${body.slice(0, 300)}`))
  }
  try {
    return JSON.parse(body) as BoardroomUsersEnvelope
  } catch {
    throw new Error('Boardroom API returned non-JSON for GET /users')
  }
}

/**
 * Paginate GET /users with an explicit page + per_page=500.
 * Do not follow links.next as-is: Boardroom omits per_page, so page 2+ would
 * silently fall back to 100 and miss newer users under a page cap.
 */
export async function fetchBoardroomUsersForEmailLookup(): Promise<BoardroomEmailSourceUser[]> {
  if (!isBoardroomCrmApiConfigured()) {
    throw new Error(boardroomCrmApiConfigError())
  }

  const { baseUrl, apiKey } = getConfig()
  const users: BoardroomEmailSourceUser[] = []
  const seenIds = new Set<string>()
  let page = 1
  let lastPage = 1

  while (page <= lastPage && page <= MAX_PAGES) {
    const envelope = await getJson(usersPageUrl(baseUrl, page), apiKey)
    if (!Array.isArray(envelope.data)) {
      throw new Error('Boardroom API GET /users did not return a data array')
    }
    for (const row of envelope.data) {
      const user = slimUser(row)
      if (!user || seenIds.has(user.id)) continue
      seenIds.add(user.id)
      users.push(user)
    }

    const metaPage = Number((envelope.meta as { page?: unknown } | undefined)?.page)
    const metaLast = Number((envelope.meta as { last_page?: unknown } | undefined)?.last_page)
    if (Number.isFinite(metaLast) && metaLast > 0) lastPage = metaLast
    if (envelope.data.length === 0) break
    page = (Number.isFinite(metaPage) && metaPage > 0 ? metaPage : page) + 1
  }

  return users
}
