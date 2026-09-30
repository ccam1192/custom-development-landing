/**
 * Server-only Boardroom CRM API reader for email enrichment.
 * Do not import this from browser code. Do not send Origin / Sec-Fetch-Site.
 *
 * Existing api/_lib/boardroom.ts remains unchanged (different, unused path).
 */

import { myshopifyDomainFromUnknown } from './shopify-lifecycle.js'

const PER_PAGE = 500
const MAX_PAGES = 100

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

function resolveNextUrl(next: string, baseUrl: string): string | null {
  try {
    const base = new URL(baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`)
    const nextUrl = new URL(next, base)
    if (
      nextUrl.protocol === 'https:' &&
      nextUrl.origin === base.origin &&
      nextUrl.pathname.startsWith(base.pathname.replace(/\/$/, ''))
    ) {
      return nextUrl.toString()
    }
    return null
  } catch {
    return null
  }
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
 * Paginate GET /users via links.next. Returns only id, email, and MyShopify domains.
 */
export async function fetchBoardroomUsersForEmailLookup(): Promise<BoardroomEmailSourceUser[]> {
  if (!isBoardroomCrmApiConfigured()) {
    throw new Error(boardroomCrmApiConfigError())
  }

  const { baseUrl, apiKey } = getConfig()
  const users: BoardroomEmailSourceUser[] = []
  const seen = new Set<string>()
  let url: string | null = `${baseUrl}/users?per_page=${PER_PAGE}`

  for (let page = 0; url && page < MAX_PAGES; page++) {
    if (seen.has(url)) break
    seen.add(url)

    const envelope = await getJson(url, apiKey)
    if (!Array.isArray(envelope.data)) {
      throw new Error('Boardroom API GET /users did not return a data array')
    }
    for (const row of envelope.data) {
      const user = slimUser(row)
      if (user) users.push(user)
    }

    const next = typeof envelope.links?.next === 'string' ? envelope.links.next : null
    url = next ? resolveNextUrl(next, baseUrl) : null
  }

  return users
}
