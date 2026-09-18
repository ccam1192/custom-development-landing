/**
 * CRM reconciliation diagnostics. Read-only against existing CRM tables.
 * Does not call Shopify or Stripe APIs and does not mutate customer/revenue data
 * except by writing crm_data_health_issues when requested.
 */

import { supabaseAdmin, fetchAllRows } from './supabase-admin.js'
import { shopGidNumeric } from './shopify.js'
import { normalizeShopDomain } from './shopify-lifecycle.js'
import { resolveClientStatus, runStatusScenarios, type ShopifyLifecycleState } from './status-engine.js'

export type ReconcileIssue = {
  issue_type: string
  severity: 'error' | 'warning' | 'info'
  description: string
  crm_customer_id?: string
  details?: Record<string, unknown>
}

type CustomerRow = {
  id: string
  name: string | null
  email: string | null
  billing_channel: string | null
  client_status: string | null
  user_type: string | null
  store_url: string | null
  shopify_shop_id: string | null
  shopify_shop_domain: string | null
  shopify_subscription_status: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_subscription_status: string | null
  stripe_trial_end: string | null
  stripe_canceled_at: string | null
  cancellation_date: string | null
  calculated_total_revenue: number | null
  calculated_mrr: number | null
  mrr_override: number | null
  total_revenue_override: number | null
}

type TxnRow = {
  id: string
  crm_customer_id: string | null
  provider: string
  provider_transaction_id: string
  amount: number
  status: string
  transaction_type: string
  shopify_gross_amount: number | null
}

export async function buildReconciliationReport(): Promise<{
  summary: Record<string, number>
  issues: ReconcileIssue[]
  scenarioTests: ReturnType<typeof runStatusScenarios>
  dryRun: string
}> {
  const customers = await fetchAllRows<CustomerRow>(
    'crm_customers',
    'id, name, email, billing_channel, client_status, user_type, store_url, shopify_shop_id, shopify_shop_domain, shopify_subscription_status, stripe_customer_id, stripe_subscription_id, stripe_subscription_status, stripe_trial_end, stripe_canceled_at, cancellation_date, calculated_total_revenue, calculated_mrr, mrr_override, total_revenue_override'
  )

  const txns = await fetchAllRows<TxnRow>(
    'crm_revenue_transactions',
    'id, crm_customer_id, provider, provider_transaction_id, amount, status, transaction_type, shopify_gross_amount'
  )

  const issues: ReconcileIssue[] = []
  let statusMismatchCount = 0
  const byDomain = new Map<string, CustomerRow[]>()
  const byShopId = new Map<string, CustomerRow[]>()
  const byStripeId = new Map<string, CustomerRow[]>()
  const byEmail = new Map<string, CustomerRow[]>()

  for (const c of customers) {
    const domain = normalizeShopDomain(c.shopify_shop_domain) ?? normalizeShopDomain(c.store_url)
    if (domain) {
      const list = byDomain.get(domain) ?? []
      list.push(c)
      byDomain.set(domain, list)
    }
    const shopId = shopGidNumeric(c.shopify_shop_id)
    if (shopId) {
      const list = byShopId.get(shopId) ?? []
      list.push(c)
      byShopId.set(shopId, list)
    }
    if (c.stripe_customer_id) {
      const list = byStripeId.get(c.stripe_customer_id) ?? []
      list.push(c)
      byStripeId.set(c.stripe_customer_id, list)
    }
    if (c.email) {
      const key = c.email.toLowerCase().trim()
      const list = byEmail.get(key) ?? []
      list.push(c)
      byEmail.set(key, list)
    }
  }

  for (const [domain, rows] of byDomain) {
    if (rows.length < 2) continue
    const stripe = rows.filter((r) => r.billing_channel === 'stripe')
    const shopify = rows.filter((r) => r.billing_channel === 'shopify')
    if (stripe.length && shopify.length) {
      issues.push({
        issue_type: 'stripe_shopify_overlap',
        severity: 'error',
        description: `Stripe/Shopify overlap: ${domain}. Stripe customer ${stripe[0].id}; Shopify customer ${shopify[0].id}. Recommended canonical record: ${stripe[0].id}`,
        crm_customer_id: stripe[0].id,
        details: {
          domain,
          customer_ids: rows.map((r) => r.id),
          recommended_canonical: stripe[0].id,
        },
      })
    } else {
      issues.push({
        issue_type: 'duplicate_store_url',
        severity: 'error',
        description: `Duplicate Store URL: ${domain}. Customer IDs: ${rows.map((r) => r.id).join(', ')}`,
        crm_customer_id: rows[0].id,
        details: { domain, customer_ids: rows.map((r) => r.id) },
      })
    }
  }

  for (const [shopId, rows] of byShopId) {
    if (rows.length < 2) continue
    issues.push({
      issue_type: 'duplicate_shopify_shop_id',
      severity: 'error',
      description: `Duplicate Shopify shop ID ${shopId}. Customer IDs: ${rows.map((r) => r.id).join(', ')}`,
      crm_customer_id: rows[0].id,
      details: { shop_id: shopId, customer_ids: rows.map((r) => r.id) },
    })
  }

  for (const [stripeId, rows] of byStripeId) {
    if (rows.length < 2) continue
    issues.push({
      issue_type: 'duplicate_stripe_customer_id',
      severity: 'error',
      description: `Duplicate Stripe customer ID ${stripeId}. Customer IDs: ${rows.map((r) => r.id).join(', ')}`,
      crm_customer_id: rows[0].id,
      details: { stripe_customer_id: stripeId, customer_ids: rows.map((r) => r.id) },
    })
  }

  for (const [email, rows] of byEmail) {
    if (rows.length < 2) continue
    const domains = new Set(
      rows
        .map((r) => normalizeShopDomain(r.shopify_shop_domain) ?? normalizeShopDomain(r.store_url))
        .filter(Boolean)
    )
    if (domains.size > 1) {
      issues.push({
        issue_type: 'same_email_different_stores',
        severity: 'warning',
        description: `Same email, different stores: ${email}. Do not merge. Customer IDs: ${rows.map((r) => r.id).join(', ')}`,
        details: { email, customer_ids: rows.map((r) => r.id), domains: [...domains] },
      })
    }
  }

  const ledgerShopify = new Map<string, number>()
  const ledgerStripe = new Map<string, number>()
  const txnIds = new Map<string, number>()
  for (const t of txns) {
    const key = `${t.provider}:${t.provider_transaction_id}`
    txnIds.set(key, (txnIds.get(key) ?? 0) + 1)
    if (!t.crm_customer_id) continue
    if (t.status !== 'succeeded' && t.status !== 'adjusted') continue
    let delta = Number(t.amount) || 0
    if (t.provider === 'shopify') {
      if (t.transaction_type === 'app_sale_credit') {
        delta = -Math.abs(delta)
      } else if (t.transaction_type === 'app_sale_adjustment') {
        const gross = t.shopify_gross_amount == null ? null : Number(t.shopify_gross_amount)
        delta = gross != null && Number.isFinite(gross) ? gross : t.status === 'adjusted' ? -Math.abs(delta) : delta
      }
      ledgerShopify.set(t.crm_customer_id, (ledgerShopify.get(t.crm_customer_id) ?? 0) + delta)
    }
    if (t.provider === 'stripe' && t.status === 'succeeded') {
      ledgerStripe.set(t.crm_customer_id, (ledgerStripe.get(t.crm_customer_id) ?? 0) + t.amount)
    }
  }

  for (const [key, count] of txnIds) {
    if (count > 1) {
      issues.push({
        issue_type: 'duplicate_transaction_id',
        severity: 'error',
        description: `Duplicate revenue transaction external ID ${key} (${count} rows)`,
        details: { key, count },
      })
    }
  }

  for (const c of customers) {
    const revenue = Number(c.total_revenue_override ?? c.calculated_total_revenue ?? 0)
    const shopifyStatus = (c.shopify_subscription_status ?? 'NONE') as ShopifyLifecycleState
    const intended =
      c.user_type === 'agency_client'
        ? 'agency_client'
        : c.billing_channel === 'stripe'
          ? resolveClientStatus({
              userType: c.user_type,
              billingChannel: 'stripe',
              stripeSubscriptionStatus: c.stripe_subscription_status,
              stripeTrialEnd: c.stripe_trial_end,
              stripeCanceledAt: c.stripe_canceled_at,
              confirmedRevenue: Number(ledgerStripe.get(c.id) ?? 0),
              hasSuccessfulStripePayment: (ledgerStripe.get(c.id) ?? 0) > 0,
            })
          : resolveClientStatus({
              userType: c.user_type,
              billingChannel: 'shopify',
              shopifyLifecycle: shopifyStatus,
              confirmedRevenue: Number(ledgerShopify.get(c.id) ?? revenue),
            })

    if (c.client_status && c.client_status !== intended) {
      statusMismatchCount++
      if (statusMismatchCount <= 200) {
        issues.push({
          issue_type: 'status_mismatch',
          severity: 'warning',
          description: `Intended status ${intended} vs current ${c.client_status}: ${c.name ?? c.email ?? c.id}`,
          crm_customer_id: c.id,
          details: { current: c.client_status, intended, billing_channel: c.billing_channel },
        })
      }
    }

    if (c.billing_channel === 'shopify' && revenue <= 0 && c.client_status === 'active_customer') {
      issues.push({
        issue_type: 'active_zero_revenue',
        severity: 'error',
        description: `Active Customer + Revenue = 0: ${c.name ?? c.email ?? c.id}`,
        crm_customer_id: c.id,
      })
    }
    if (revenue > 0 && c.client_status === 'prospect') {
      issues.push({
        issue_type: 'prospect_with_revenue',
        severity: 'error',
        description: `Prospect + Revenue > 0: ${c.name ?? c.email ?? c.id} (intended ${intended})`,
        crm_customer_id: c.id,
      })
    }
    if (c.client_status === 'prospect' && c.cancellation_date) {
      issues.push({
        issue_type: 'prospect_with_cancellation',
        severity: 'warning',
        description: `Prospect + Cancellation Date: ${c.name ?? c.email ?? c.id}`,
        crm_customer_id: c.id,
      })
    }
    if (c.billing_channel === 'shopify' && shopifyStatus === 'FROZEN' && c.client_status !== 'canceled') {
      issues.push({
        issue_type: 'frozen_not_canceled',
        severity: 'error',
        description: `Shopify Frozen + ${c.client_status}: ${c.name ?? c.email ?? c.id}`,
        crm_customer_id: c.id,
      })
    }
    if (c.billing_channel === 'shopify' && (shopifyStatus === 'ACTIVE' || shopifyStatus === 'TRIAL') && c.client_status === 'canceled') {
      issues.push({
        issue_type: 'canceled_but_active_subscription',
        severity: 'warning',
        description: `Canceled + currently active/trial Shopify subscription: ${c.name ?? c.email ?? c.id}`,
        crm_customer_id: c.id,
      })
    }
    if (c.billing_channel === 'shopify' && c.stripe_customer_id) {
      issues.push({
        issue_type: 'shopify_channel_has_stripe_id',
        severity: 'warning',
        description: `Billing Channel = Shopify but Stripe customer ID exists: ${c.name ?? c.email ?? c.id}`,
        crm_customer_id: c.id,
      })
    }
    if (c.billing_channel === 'stripe') {
      const shopifyAmt = ledgerShopify.get(c.id) ?? 0
      const stripeAmt = ledgerStripe.get(c.id) ?? 0
      if (shopifyAmt > 0 && Math.abs(revenue - (stripeAmt + shopifyAmt)) < 0.01) {
        issues.push({
          issue_type: 'stripe_total_includes_shopify',
          severity: 'error',
          description: `Billing Channel = Stripe but Total Revenue appears to include Shopify ledger (${c.name ?? c.email ?? c.id})`,
          crm_customer_id: c.id,
          details: { stripe: stripeAmt, shopify: shopifyAmt, stored: revenue },
        })
      }
    }
    if (c.billing_channel === 'shopify') {
      const ledger = Number(ledgerShopify.get(c.id) ?? 0)
      if (c.total_revenue_override == null && Math.abs(ledger - Number(c.calculated_total_revenue ?? 0)) > 0.5) {
        issues.push({
          issue_type: 'revenue_ledger_mismatch',
          severity: 'warning',
          description: `Shopify Total Revenue does not match ledger for ${c.name ?? c.email ?? c.id} (stored ${c.calculated_total_revenue}, ledger ${ledger})`,
          crm_customer_id: c.id,
        })
      }
    }
  }

  const scenarioTests = runStatusScenarios()
  const failedScenarios = scenarioTests.filter((s) => !s.pass)
  if (failedScenarios.length) {
    issues.push({
      issue_type: 'status_scenario_failure',
      severity: 'error',
      description: `${failedScenarios.length} built-in status scenario(s) failed`,
      details: { failed: failedScenarios },
    })
  }

  const counts = (type: string) => issues.filter((i) => i.issue_type === type).length
  const summary = {
    customers: customers.length,
    transactions: txns.length,
    duplicate_store_url: counts('duplicate_store_url'),
    duplicate_shopify_shop_id: counts('duplicate_shopify_shop_id'),
    duplicate_stripe_customer_id: counts('duplicate_stripe_customer_id'),
    stripe_shopify_overlap: counts('stripe_shopify_overlap'),
    same_email_different_stores: counts('same_email_different_stores'),
    prospect_with_revenue: counts('prospect_with_revenue'),
    active_zero_revenue: counts('active_zero_revenue'),
    frozen_not_canceled: counts('frozen_not_canceled'),
    status_mismatch: statusMismatchCount,
    issues: issues.length,
    scenario_tests_passed: scenarioTests.filter((s) => s.pass).length,
    scenario_tests_failed: failedScenarios.length,
  }

  return { summary, issues, scenarioTests, dryRun: formatDryRun(summary) }
}

export function formatDryRun(summary: Record<string, number>): string {
  return [
    `Existing customers scanned: ${summary.customers}`,
    `Transactions scanned: ${summary.transactions}`,
    `Duplicate Store URL: ${summary.duplicate_store_url}`,
    `Duplicate Shopify Shop ID: ${summary.duplicate_shopify_shop_id}`,
    `Duplicate Stripe customer ID: ${summary.duplicate_stripe_customer_id}`,
    `Stripe/Shopify overlaps: ${summary.stripe_shopify_overlap}`,
    `Same email, different stores: ${summary.same_email_different_stores}`,
    `Prospect + Revenue > 0: ${summary.prospect_with_revenue}`,
    `Active Customer + Revenue = 0: ${summary.active_zero_revenue}`,
    `Shopify Frozen not Canceled: ${summary.frozen_not_canceled}`,
    `Status changes if resolver reapplied: ${summary.status_mismatch}`,
    `Built-in status scenarios passed: ${summary.scenario_tests_passed}/${summary.scenario_tests_passed + summary.scenario_tests_failed}`,
    `Total issues: ${summary.issues}`,
  ].join('\n')
}

export async function persistReconciliationIssues(issues: ReconcileIssue[]) {
  await supabaseAdmin.from('crm_data_health_issues').delete().eq('resolved', false)
  if (!issues.length) return
  const rows = issues.slice(0, 2000).map((issue) => ({
    issue_type: issue.issue_type,
    severity: issue.severity,
    description: issue.description,
    crm_customer_id: issue.crm_customer_id ?? null,
    details: issue.details ?? {},
  }))
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await supabaseAdmin.from('crm_data_health_issues').insert(rows.slice(i, i + 200))
    if (error) {
      console.error('[CRM Reconcile] persist issues:', error.message)
      break
    }
  }
}
