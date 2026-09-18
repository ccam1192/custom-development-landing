import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Vercel Cron sends Authorization: Bearer $CRON_SECRET when CRON_SECRET is set.
 * Refuse the request if the secret is missing or does not match.
 */
export function requireCronAuth(req: VercelRequest, res: VercelResponse): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    res.status(500).json({ error: 'CRON_SECRET is not configured' })
    return false
  }
  const auth = req.headers.authorization
  if (auth !== `Bearer ${secret}`) {
    res.status(401).json({ error: 'Unauthorized' })
    return false
  }
  return true
}
