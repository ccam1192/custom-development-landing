import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../../_lib/auth.js'
import { runShopifyDeltaSync, runShopifyFullSync, type ShopifySyncMode } from '../../_lib/shopify-sync.js'

export const config = { maxDuration: 300 }

/**
 * POST /api/crm/sync/shopify
 * body: { mode?: 'initial' | 'delta' }
 *
 * Default is delta so a future cron can POST the same endpoint (or call runShopifyDeltaSync()).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const user = await requireAuth(req, res)
  if (!user) return

  const body = typeof req.body === 'object' && req.body ? req.body : {}
  const mode: ShopifySyncMode = body.mode === 'initial' ? 'initial' : 'delta'

  const result =
    mode === 'initial' ? await runShopifyFullSync() : await runShopifyDeltaSync()

  if (result.checkpointRequired) {
    return res.status(409).json(result)
  }

  if (!result.success) {
    return res.status(result.error?.includes('not configured') ? 503 : 500).json(result)
  }

  return res.json(result)
}
