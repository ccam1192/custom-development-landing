import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../../_lib/auth'
import { isBoardroomConfigured } from '../../_lib/boardroom'
import { isStripeConfigured } from '../../_lib/stripe'
import { isShopifyConfigured } from '../../_lib/shopify'

/**
 * Sync All providers sequentially.
 * Order: Boardroom → Stripe → Shopify
 * (Boardroom first so external IDs are available for matching)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const user = await requireAuth(req, res)
  if (!user) return

  const results: Record<string, { success: boolean; error?: string; [key: string]: unknown }> = {}
  const authHeader = req.headers.authorization ?? ''

  // Helper to call internal sync endpoints
  async function callSync(provider: string): Promise<{ success: boolean; error?: string }> {
    try {
      const protocol = req.headers['x-forwarded-proto'] ?? 'https'
      const host = req.headers.host ?? ''
      const baseUrl = `${protocol}://${host}`

      const resp = await fetch(`${baseUrl}/api/crm/sync/${provider}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
      })

      const body = await resp.json().catch(() => ({}))

      if (!resp.ok) {
        return { success: false, error: body.error ?? `${provider} sync failed` }
      }

      return { success: true, ...body }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : `${provider} sync failed` }
    }
  }

  // Run syncs sequentially
  if (isBoardroomConfigured()) {
    results.boardroom = await callSync('boardroom')
  } else {
    results.boardroom = { success: false, error: 'Not configured' }
  }

  if (isStripeConfigured()) {
    results.stripe = await callSync('stripe')
  } else {
    results.stripe = { success: false, error: 'Not configured' }
  }

  if (isShopifyConfigured()) {
    results.shopify = await callSync('shopify')
  } else {
    results.shopify = { success: false, error: 'Not configured' }
  }

  const allSuccess = Object.values(results).every((r) => r.success)

  return res.status(allSuccess ? 200 : 207).json({
    success: allSuccess,
    results,
  })
}
