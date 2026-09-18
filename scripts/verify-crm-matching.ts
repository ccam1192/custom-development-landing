import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Missing Supabase credentials')

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function fetchAll<T>(table: string, columns: string): Promise<T[]> {
  const PAGE = 1000
  const all: T[] = []
  let from = 0
  for (;;) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + PAGE - 1)
    if (error) throw error
    all.push(...((data ?? []) as T[]))
    if (!data || data.length < PAGE) break
    from += PAGE
  }
  return all
}

type Customer = {
  id: string
  email: string | null
  billing_channel: string | null
  client_status: string | null
  store_url: string | null
  shopify_shop_domain: string | null
  shopify_shop_id: string | null
  shopify_subscription_status: string | null
  stripe_customer_id: string | null
  signup_date: string | null
  mrr_override: number | null
  calculated_mrr: number | null
  total_revenue_override: number | null
  calculated_total_revenue: number | null
}

const customers = await fetchAll<Customer>(
  'crm_customers',
  'id, email, billing_channel, client_status, store_url, shopify_shop_domain, shopify_shop_id, shopify_subscription_status, stripe_customer_id, signup_date, mrr_override, calculated_mrr, total_revenue_override, calculated_total_revenue'
)

const example = customers.filter(
  (c) =>
    (c.store_url ?? '').includes('3e7b0d-3') ||
    (c.shopify_shop_domain ?? '').includes('3e7b0d-3')
)
console.log('=== 3e7b0d-3 ===')
for (const c of example) {
  console.log({
    id: c.id,
    billing: c.billing_channel,
    status: c.client_status,
    shopify: c.shopify_subscription_status,
    store: c.store_url,
    domain: c.shopify_shop_domain,
    shopId: c.shopify_shop_id,
    mrr_override: c.mrr_override,
    calculated_mrr: c.calculated_mrr,
    rev_override: c.total_revenue_override,
    calculated_rev: c.calculated_total_revenue,
    signup: c.signup_date,
  })
}

const dirty = customers.filter(
  (c) => /[;,]/.test(c.store_url ?? '') || /[;,]/.test(c.shopify_shop_domain ?? '')
)
const billingNoneMyshopify = customers.filter((c) => {
  if (c.billing_channel && c.billing_channel !== 'none') return false
  const hay = `${c.store_url ?? ''} ${c.shopify_shop_domain ?? ''}`
  return hay.includes('myshopify.com')
})
const stripe = customers.filter((c) => c.stripe_customer_id)
const stripeMissingSignup = stripe.filter((c) => !c.signup_date)
const prospectRev = customers.filter((c) => {
  if (c.client_status !== 'prospect') return false
  return Number(c.total_revenue_override ?? c.calculated_total_revenue ?? 0) > 0
})
const shopifyActive = customers.filter(
  (c) =>
    c.billing_channel === 'shopify' &&
    (c.client_status === 'active_customer' || c.shopify_subscription_status === 'ACTIVE')
)
const shopifyActiveZeroMrr = shopifyActive.filter(
  (c) => Number(c.mrr_override ?? c.calculated_mrr ?? 0) === 0 && c.client_status === 'active_customer'
)
const shopifyActiveMrr = shopifyActive
  .filter((c) => c.client_status === 'active_customer')
  .reduce((sum, c) => sum + Number(c.mrr_override ?? c.calculated_mrr ?? 0), 0)

console.log('=== counts ===')
console.log({
  customers: customers.length,
  dirtyUrls: dirty.length,
  billingNoneMyshopify: billingNoneMyshopify.length,
  stripeCustomers: stripe.length,
  stripeMissingSignup: stripeMissingSignup.length,
  prospectWithRevenue: prospectRev.length,
  shopifyActiveCustomers: shopifyActive.filter((c) => c.client_status === 'active_customer').length,
  shopifyActiveZeroDisplayMrr: shopifyActiveZeroMrr.length,
  shopifyActiveDisplayMrr: Math.round(shopifyActiveMrr * 100) / 100,
})

if (prospectRev.length) {
  console.log('=== prospect + revenue samples ===')
  for (const c of prospectRev.slice(0, 8)) {
    console.log({
      id: c.id,
      billing: c.billing_channel,
      store: c.store_url,
      rev: c.total_revenue_override ?? c.calculated_total_revenue,
      shopify: c.shopify_subscription_status,
    })
  }
}

const dirtyMyshopify = dirty.filter((c) =>
  `${c.store_url ?? ''} ${c.shopify_shop_domain ?? ''}`.includes('myshopify.com')
)
console.log('dirty myshopify', dirtyMyshopify.length)
for (const c of dirtyMyshopify.slice(0, 8)) {
  console.log({ billing: c.billing_channel, store: c.store_url, domain: c.shopify_shop_domain, stripe: c.stripe_customer_id })
}
console.log('dirty samples', dirty.slice(0, 6).map((c) => ({ billing: c.billing_channel, store: c.store_url, domain: c.shopify_shop_domain })))
console.log(
  'active $0 mrr',
  shopifyActiveZeroMrr.map((c) => ({
    store: c.store_url,
    status: c.shopify_subscription_status,
    calc: c.calculated_mrr,
    override: c.mrr_override,
  }))
)

const { buildReconciliationReport, formatDryRun } = await import('../api/_lib/crm-reconcile.ts')
const report = await buildReconciliationReport()
console.log('=== data health ===')
console.log(formatDryRun(report.summary))
