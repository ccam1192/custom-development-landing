import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

/**
 * Verify the Supabase JWT from the Authorization header.
 * Returns the authenticated user or sends a 401 response.
 */
export async function requireAuth(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization token' })
    return null
  }

  const url =
    process.env.SUPABASE_URL ??
    process.env.VITE_SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

  if (!url || !key) {
    res.status(500).json({
      error: `Supabase not configured. SUPABASE_URL=${url ? 'set' : 'MISSING'}, SUPABASE_SERVICE_ROLE_KEY=${key ? 'set' : 'MISSING'}`,
    })
    return null
  }

  const token = authHeader.slice(7)
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token)

  if (error || !user) {
    res.status(401).json({ error: 'Invalid or expired token' })
    return null
  }

  const allowedEmails = process.env.CRM_ALLOWED_EMAILS
  if (allowedEmails) {
    const allowed = allowedEmails.split(',').map((e) => e.trim().toLowerCase())
    const email = user.email?.toLowerCase() ?? ''
    const domain = email.includes('@') ? `@${email.split('@')[1]}` : ''

    if (!allowed.includes(email) && !allowed.includes(domain)) {
      res.status(403).json({ error: 'Access denied. Your email is not authorized for CRM access.' })
      return null
    }
  }

  return user
}
