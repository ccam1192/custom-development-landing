import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../../_lib/auth.js'
import { backfillShopifyTrialEmails } from '../../_lib/shopify-email.js'

export const config = { maxDuration: 300 }

/**
 * POST /api/crm/sync/shopify-trial-emails
 *
 * Targeted backfill: Shopify-billed customers currently In Trial.
 * Writes email only. Does not create customers or change billing/status/revenue.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const user = await requireAuth(req, res)
  if (!user) return

  try {
    const result = await backfillShopifyTrialEmails()
    return res.json({
      success: true,
      ...result,
      errorCount: result.errors.length,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Trial email backfill failed'
    return res.status(/not configured/i.test(message) ? 503 : 500).json({
      success: false,
      error: message,
    })
  }
}
