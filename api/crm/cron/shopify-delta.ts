import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireCronAuth } from '../../_lib/cron-auth.js'
import { runShopifyDeltaSync } from '../../_lib/shopify-sync.js'

export const config = { maxDuration: 300 }

const MAX_ROUNDS = 6

/**
 * Daily Shopify incremental sync.
 * POST /api/crm/cron/shopify-delta
 *
 * Invokes the same runShopifyDeltaSync() used by the CRM "Sync Changes" button.
 * Does not run Initial Sync. Does not advance last_successful_at unless the
 * existing engine reports a complete successful run.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!requireCronAuth(req, res)) return

  let rounds = 0
  let last = await runShopifyDeltaSync()
  rounds++

  while (last.success && last.continue && rounds < MAX_ROUNDS) {
    last = await runShopifyDeltaSync()
    rounds++
  }

  if (last.checkpointRequired) {
    return res.status(409).json({
      success: false,
      source: 'cron',
      rounds,
      error: last.error,
    })
  }

  if (!last.success) {
    return res.status(last.error?.includes('not configured') ? 503 : 500).json({
      success: false,
      source: 'cron',
      rounds,
      complete: last.complete,
      continue: last.continue,
      processed: last.processed,
      created: last.created,
      updated: last.updated,
      errors: last.errors,
      progress: last.progress,
      error: last.error,
    })
  }

  return res.status(last.continue ? 202 : 200).json({
    success: true,
    source: 'cron',
    rounds,
    complete: last.complete,
    continue: last.continue,
    processed: last.processed,
    created: last.created,
    updated: last.updated,
    errors: last.errors,
    stats: last.stats,
    progress: last.progress,
    syncFrom: last.syncFrom,
    syncTo: last.syncTo,
  })
}
