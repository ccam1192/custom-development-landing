import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

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

  const token = authHeader.slice(7)
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    res.status(401).json({ error: 'Invalid or expired token' })
    return null
  }

  // Optional: restrict to allowed emails/domains
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
