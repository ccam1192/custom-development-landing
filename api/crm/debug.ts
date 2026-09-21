import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabaseAdmin } from '../_lib/supabase-admin.js'
import { isStripeConfigured, getStripe } from '../_lib/stripe.js'
import { isShopifyConfigured } from '../_lib/shopify.js'

export const config = { maxDuration: 30 }

/**
 * Diagnostic endpoint — returns which env vars are set (not their values)
 * and tests module imports / connectivity.
 */
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const checks: Record<string, unknown> = {}

  // 1. Environment variables (only reports presence, never values)
  const envVars = [
    'SUPABASE_URL',
    'VITE_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'SHOPIFY_PARTNER_ORG_ID',
    'SHOPIFY_PARTNER_ACCESS_TOKEN',
    'SHOPIFY_APP_ID',
    'SHOPIFY_CLIENT_ID',
    'SHOPIFY_CLIENT_SECRET',
    'CRM_ALLOWED_EMAILS',
    'BOARDROOM_API_BASE_URL',
    'BOARDROOM_API_KEY',
  ]

  checks.envVars = Object.fromEntries(
    envVars.map((name) => [name, process.env[name] ? `set (${process.env[name]!.length} chars)` : 'MISSING'])
  )

  // 2. Supabase admin client
  try {
    const { count } = await supabaseAdmin
      .from('crm_customers')
      .select('*', { count: 'exact', head: true })
    checks.supabase = { ok: true, customerCount: count }
  } catch (e) {
    checks.supabase = { ok: false, error: e instanceof Error ? e.message : String(e) }
  }

  // 3. Stripe SDK
  try {
    checks.stripe = { configured: isStripeConfigured() }
    if (isStripeConfigured()) {
      const stripe = getStripe()
      const acct = await stripe.accounts.retrieve()
      checks.stripe = { configured: true, ok: true, accountId: acct.id }
    }
  } catch (e) {
    checks.stripe = { ...(checks.stripe as object), ok: false, error: e instanceof Error ? e.message : String(e) }
  }

  // 4. Shopify Partner API
  try {
    checks.shopify = { configured: isShopifyConfigured() }
  } catch (e) {
    checks.shopify = { ok: false, error: e instanceof Error ? e.message : String(e) }
  }

  // 5. Runtime info
  checks.nodeVersion = process.version
  checks.timestamp = new Date().toISOString()

  return res.json(checks)
}
