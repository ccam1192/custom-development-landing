import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[CRM] Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.'
  )
}

const JWT_IAT_FUTURE = /jwt issued at future|issued at \(iat\) is in the future/i

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * PostgREST rejects tokens whose iat is a second or two ahead of its clock
 * ("JWT issued at future"). Common after sleep / morning clock sync.
 * Retry once; this is not a Stripe or Shopify failure.
 */
async function fetchWithJwtClockSkewRetry(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(input, init)
  if (res.status !== 401) return res
  let body = ''
  try {
    body = await res.clone().text()
  } catch {
    return res
  }
  if (!JWT_IAT_FUTURE.test(body)) return res
  await sleep(1500)
  return fetch(input, init)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: fetchWithJwtClockSkewRetry },
})
