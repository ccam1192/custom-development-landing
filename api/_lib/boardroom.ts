/**
 * Boardroom API Integration Adapter
 *
 * This module provides a clean interface to the Boardroom API.
 * The actual API endpoints will be provided by Alex.
 *
 * Required environment variables:
 *   BOARDROOM_API_BASE_URL - Base URL of the Boardroom API
 *   BOARDROOM_API_KEY      - API authentication key
 */

const BASE_URL = process.env.BOARDROOM_API_BASE_URL ?? ''
const API_KEY = process.env.BOARDROOM_API_KEY ?? ''

export interface BoardroomUser {
  id: string
  name: string
  email: string
  storeUrl?: string
  signupDate?: string
  userType?: 'agency' | 'agency_client' | 'standard'
  agencyParentId?: string
  subscriptionId?: string
  subscriptionStatus?: string
  billingChannel?: 'stripe' | 'shopify' | 'other' | 'none'
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  shopifyShopId?: string
  shopifyShopDomain?: string
}

export interface BoardroomSubscription {
  id: string
  userId: string
  status: string
  billingChannel: string
  planAmount?: number
  trialEnd?: string
  currentPeriodEnd?: string
  cancelAt?: string
  canceledAt?: string
}

function isConfigured(): boolean {
  return !!BASE_URL && !!API_KEY
}

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  if (!isConfigured()) {
    throw new Error(
      'Boardroom API not configured. Set BOARDROOM_API_BASE_URL and BOARDROOM_API_KEY environment variables.'
    )
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
      ...(options?.headers ?? {}),
    },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Boardroom API error ${res.status}: ${body}`)
  }

  return res.json()
}

/** Fetch all Boardroom users. Endpoint TBD by Alex. */
export async function getBoardroomUsers(): Promise<BoardroomUser[]> {
  return apiRequest<BoardroomUser[]>('/api/users')
}

/** Fetch a single Boardroom user by ID. */
export async function getBoardroomUser(id: string): Promise<BoardroomUser> {
  return apiRequest<BoardroomUser>(`/api/users/${id}`)
}

/** Fetch all subscriptions. */
export async function getBoardroomSubscriptions(): Promise<BoardroomSubscription[]> {
  return apiRequest<BoardroomSubscription[]>('/api/subscriptions')
}

/** Fetch a single subscription. */
export async function getBoardroomSubscription(id: string): Promise<BoardroomSubscription> {
  return apiRequest<BoardroomSubscription>(`/api/subscriptions/${id}`)
}

/* ─── Future destructive operations (placeholders) ──────────────────────────
 * Do NOT implement until Alex provides secure server-side API endpoints.
 */

export async function loginAsUser(_userId: string): Promise<never> {
  throw new Error('Not implemented. Awaiting secure Boardroom API endpoint from Alex.')
}

export async function cancelSubscription(_subscriptionId: string): Promise<never> {
  throw new Error('Not implemented. Awaiting secure Boardroom API endpoint from Alex.')
}

export async function changeSubscription(_subscriptionId: string, _planId: string): Promise<never> {
  throw new Error('Not implemented. Awaiting secure Boardroom API endpoint from Alex.')
}

export async function deleteUser(_userId: string): Promise<never> {
  throw new Error('Not implemented. Awaiting secure Boardroom API endpoint from Alex.')
}

export { isConfigured as isBoardroomConfigured }
