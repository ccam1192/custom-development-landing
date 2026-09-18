import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { copyCanonicalMyshopifyFields } from '../api/_lib/crm-identity-merge.ts'
import { recastCrmClientStatuses, formatRecastSummary } from '../api/_lib/crm-status-recast.ts'

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Missing Supabase credentials')

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

console.log('=== identity copy / billing backfill ===')
const identity = await copyCanonicalMyshopifyFields(supabase, {
  skipCopy: process.env.CRM_SKIP_IDENTITY_COPY === '1',
})
console.log(identity)

if (process.env.CRM_SKIP_RECAST === '1') {
  process.exit(0)
}

console.log('=== status recast ===')
const recast = await recastCrmClientStatuses(supabase)
console.log(formatRecastSummary(recast))

if (process.env.STRIPE_SECRET_KEY) {
  console.log('=== stripe signup_date backfill ===')
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const createdById = new Map<string, number>()
  let startingAfter: string | undefined
  for (;;) {
    const page = await stripe.customers.list({ limit: 100, starting_after: startingAfter })
    for (const c of page.data) {
      if (!c.deleted && c.created) createdById.set(c.id, c.created)
    }
    if (!page.has_more || page.data.length === 0) break
    startingAfter = page.data[page.data.length - 1].id
  }
  const missing: Array<{ id: string; stripe_customer_id: string }> = []
  let from = 0
  for (;;) {
    const { data, error } = await supabase
      .from('crm_customers')
      .select('id, stripe_customer_id')
      .is('signup_date', null)
      .not('stripe_customer_id', 'is', null)
      .range(from, from + 999)
    if (error) throw error
    missing.push(...((data ?? []) as Array<{ id: string; stripe_customer_id: string }>))
    if (!data || data.length < 1000) break
    from += 1000
  }
  const pending = missing
    .map((row) => {
      const created = createdById.get(row.stripe_customer_id)
      if (!created) return null
      return { id: row.id, signup_date: new Date(created * 1000).toISOString() }
    })
    .filter((row): row is { id: string; signup_date: string } => !!row)
  let filled = 0
  for (let i = 0; i < pending.length; i += 20) {
    const batch = pending.slice(i, i + 20)
    const results = await Promise.all(
      batch.map((row) =>
        supabase
          .from('crm_customers')
          .update({ signup_date: row.signup_date })
          .eq('id', row.id)
          .is('signup_date', null)
      )
    )
    for (const result of results) {
      if (!result.error) filled++
    }
  }
  console.log(`Backfilled signup_date on ${filled} Stripe customers`)
}

