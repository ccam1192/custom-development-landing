import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Lazily-initialized Supabase admin client.
 * Defers createClient() so a missing env var produces a clear
 * error message instead of crashing the entire serverless function
 * at module-load time.
 */
let _client: SupabaseClient | null = null

function getSupabaseAdmin(): SupabaseClient {
  if (!_client) {
    const url =
      process.env.SUPABASE_URL ??
      process.env.VITE_SUPABASE_URL ??
      process.env.NEXT_PUBLIC_SUPABASE_URL ??
      ''
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

    if (!url || !key) {
      throw new Error(
        `[CRM] Supabase not configured. ` +
          `SUPABASE_URL=${url ? 'set' : 'MISSING'}, ` +
          `VITE_SUPABASE_URL=${process.env.VITE_SUPABASE_URL ? 'set' : 'MISSING'}, ` +
          `SUPABASE_SERVICE_ROLE_KEY=${key ? 'set' : 'MISSING'}. ` +
          `Add these in Vercel → Settings → Environment Variables.`
      )
    }

    _client = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return _client
}

/**
 * Drop-in replacement: behaves like a SupabaseClient but
 * defers initialization until first use.
 */
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop: string | symbol) {
    const client = getSupabaseAdmin()
    const value = (client as Record<string | symbol, unknown>)[prop]
    return typeof value === 'function' ? (value as Function).bind(client) : value
  },
})
