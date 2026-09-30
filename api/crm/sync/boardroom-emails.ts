import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../../_lib/auth.js'
import { enrichShopifyEmailsFromBoardroom } from '../../_lib/boardroom-emails.js'

export const config = { maxDuration: 300 }

/**
 * POST /api/crm/sync/boardroom-emails
 *
 * Fills blank Shopify CRM emails from Boardroom users matched by MyShopify domain.
 * Writes email only. Does not create customers or change billing/status/revenue.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const user = await requireAuth(req, res)
  if (!user) return

  try {
    const result = await enrichShopifyEmailsFromBoardroom()
    return res.json({
      success: true,
      checked: result.checked,
      updated: result.updated,
      already_had_email: result.already_had_email,
      no_match: result.no_match,
      ambiguous: result.ambiguous,
      missing_boardroom_email: result.missing_boardroom_email,
      no_myshopify_domain: result.no_myshopify_domain,
      errors: result.errors,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Boardroom email sync failed'
    return res.status(/not configured/i.test(message) ? 503 : 500).json({
      success: false,
      error: message,
    })
  }
}
