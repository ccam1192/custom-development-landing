import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../_lib/auth.js'
import { supabaseAdmin } from '../_lib/supabase-admin.js'

/**
 * Data Health Check — scans for data quality issues
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const user = await requireAuth(req, res)
  if (!user) return

  try {
    // Clear old unresolved issues before re-running
    await supabaseAdmin
      .from('crm_data_health_issues')
      .delete()
      .eq('resolved', false)

    const issues: Array<{
      issue_type: string
      severity: string
      description: string
      crm_customer_id?: string
      details?: Record<string, unknown>
    }> = []

    // 1. Duplicate emails
    const { data: dupEmails } = await supabaseAdmin.rpc('crm_find_duplicate_emails')
    if (dupEmails && Array.isArray(dupEmails)) {
      for (const dup of dupEmails) {
        issues.push({
          issue_type: 'duplicate_email',
          severity: 'warning',
          description: `Duplicate email found: ${dup.email} (${dup.count} records)`,
          details: { email: dup.email, count: dup.count },
        })
      }
    }

    // 2. Customers with Stripe ID but no transactions
    const { data: stripeNoTx } = await supabaseAdmin
      .from('crm_customers')
      .select('id, name, email, stripe_customer_id')
      .not('stripe_customer_id', 'is', null)
      .eq('client_status', 'active_customer')

    if (stripeNoTx) {
      for (const cust of stripeNoTx) {
        const { count } = await supabaseAdmin
          .from('crm_revenue_transactions')
          .select('*', { count: 'exact', head: true })
          .eq('crm_customer_id', cust.id)

        if ((count ?? 0) === 0) {
          issues.push({
            issue_type: 'active_no_transactions',
            severity: 'warning',
            description: `Active customer "${cust.name ?? cust.email}" has no revenue transactions`,
            crm_customer_id: cust.id,
          })
        }
      }
    }

    // 3. Orphaned transactions (no customer link)
    const { count: orphanedTxCount } = await supabaseAdmin
      .from('crm_revenue_transactions')
      .select('*', { count: 'exact', head: true })
      .is('crm_customer_id', null)

    if ((orphanedTxCount ?? 0) > 0) {
      issues.push({
        issue_type: 'orphaned_transactions',
        severity: 'error',
        description: `${orphanedTxCount} revenue transaction(s) not linked to any CRM customer`,
        details: { count: orphanedTxCount },
      })
    }

    // 4. Customers missing email
    const { count: noEmailCount } = await supabaseAdmin
      .from('crm_customers')
      .select('*', { count: 'exact', head: true })
      .is('email', null)

    if ((noEmailCount ?? 0) > 0) {
      issues.push({
        issue_type: 'missing_email',
        severity: 'info',
        description: `${noEmailCount} customer(s) have no email address`,
        details: { count: noEmailCount },
      })
    }

    // 5. Customers with billing channel but no external ID
    const { data: noExtId } = await supabaseAdmin
      .from('crm_customers')
      .select('id, name, email, billing_channel')
      .eq('billing_channel', 'stripe')
      .is('stripe_customer_id', null)

    if (noExtId) {
      for (const cust of noExtId) {
        issues.push({
          issue_type: 'billing_no_external_id',
          severity: 'warning',
          description: `Customer "${cust.name ?? cust.email}" has billing_channel=stripe but no Stripe Customer ID`,
          crm_customer_id: cust.id,
        })
      }
    }

    const { data: noShopifyId } = await supabaseAdmin
      .from('crm_customers')
      .select('id, name, email, billing_channel')
      .eq('billing_channel', 'shopify')
      .is('shopify_shop_id', null)
      .is('shopify_shop_domain', null)

    if (noShopifyId) {
      for (const cust of noShopifyId) {
        issues.push({
          issue_type: 'billing_no_external_id',
          severity: 'warning',
          description: `Customer "${cust.name ?? cust.email}" has billing_channel=shopify but no Shopify shop ID or domain`,
          crm_customer_id: cust.id,
        })
      }
    }

    // Insert all issues
    if (issues.length > 0) {
      await supabaseAdmin.from('crm_data_health_issues').insert(issues)
    }

    return res.json({ success: true, issues_found: issues.length })
  } catch (e) {
    return res.status(500).json({
      error: e instanceof Error ? e.message : 'Health check failed',
    })
  }
}
