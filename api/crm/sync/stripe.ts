import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../../_lib/auth.js'
import { supabaseAdmin } from '../../_lib/supabase-admin.js'
import { determineClientStatus, calculateMrr } from '../../_lib/status-engine.js'
import {
  isStripeConfigured,
  getAllStripeCustomers,
  getAllStripeSubscriptions,
  getPaidInvoices,
} from '../../_lib/stripe.js'

export const config = { maxDuration: 300 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const user = await requireAuth(req, res)
    if (!user) return

    if (!isStripeConfigured()) {
      return res.status(503).json({ error: 'Stripe not configured. Set STRIPE_SECRET_KEY.' })
    }

    const { data: syncLog } = await supabaseAdmin
      .from('crm_sync_logs')
      .insert({ provider: 'stripe', sync_type: 'full' })
      .select('id')
      .single()

    const logId = syncLog?.id
    let processed = 0, created = 0, updated = 0, errors = 0
    const errorDetails: Array<{ message: string; record?: string }> = []

    await supabaseAdmin
      .from('crm_sync_state')
      .update({ status: 'running', last_sync_at: new Date().toISOString() })
      .eq('provider', 'stripe')

    // ── Phase 1: Fetch Stripe data (parallel where possible) ──
    console.log('[Stripe Sync] Fetching Stripe data...')
    const t0 = Date.now()

    const [customers, subscriptions, invoices] = await Promise.all([
      getAllStripeCustomers(),
      getAllStripeSubscriptions(),
      getPaidInvoices(),
    ])

    console.log(
      `[Stripe Sync] Fetched ${customers.length} customers, ${subscriptions.length} subs, ${invoices.length} invoices in ${Date.now() - t0}ms`
    )

    // ── Phase 2: Pre-fetch ALL existing CRM customers (ONE query) ──
    const { data: existingCrm } = await supabaseAdmin
      .from('crm_customers')
      .select('id, email, stripe_customer_id')

    const crmByStripeId = new Map<string, string>()
    const crmByEmail = new Map<string, string>()
    for (const c of existingCrm ?? []) {
      if (c.stripe_customer_id) crmByStripeId.set(c.stripe_customer_id, c.id)
      if (c.email) crmByEmail.set(c.email.toLowerCase(), c.id)
    }

    // ── Phase 3: Build in-memory maps ──

    // Subscription lookup: most recent per customer
    const subsByCustomer = new Map<string, (typeof subscriptions)[0]>()
    for (const sub of subscriptions) {
      const custId = typeof sub.customer === 'string' ? sub.customer : (sub.customer as { id: string }).id
      const existing = subsByCustomer.get(custId)
      if (!existing || sub.created > existing.created) {
        subsByCustomer.set(custId, sub)
      }
    }

    // Revenue per Stripe customer (calculated from invoices in memory)
    const revenueByCustomer = new Map<string, number>()
    for (const inv of invoices) {
      if (!inv.amount_paid || inv.amount_paid <= 0) continue
      const custId =
        typeof inv.customer === 'string'
          ? inv.customer
          : (inv.customer as { id: string } | null)?.id ?? null
      if (custId) {
        revenueByCustomer.set(custId, (revenueByCustomer.get(custId) ?? 0) + inv.amount_paid / 100)
      }
    }

    // ── Phase 4: Batch upsert revenue transactions ──
    console.log('[Stripe Sync] Upserting revenue transactions...')
    const txnRows: Array<Record<string, unknown>> = []
    for (const inv of invoices) {
      if (!inv.id || !inv.amount_paid || inv.amount_paid <= 0) continue
      const custId =
        typeof inv.customer === 'string'
          ? inv.customer
          : (inv.customer as { id: string } | null)?.id ?? null

      const crmId = custId
        ? crmByStripeId.get(custId) ?? null
        : null

      txnRows.push({
        provider: 'stripe',
        provider_transaction_id: inv.id,
        provider_customer_id: custId,
        provider_subscription_id:
          typeof inv.subscription === 'string'
            ? inv.subscription
            : (inv.subscription as { id: string } | null)?.id ?? null,
        crm_customer_id: crmId,
        amount: inv.amount_paid / 100,
        currency: (inv.currency ?? 'usd').toUpperCase(),
        transaction_date: new Date((inv as { created: number }).created * 1000).toISOString(),
        status: 'succeeded',
        transaction_type: 'payment',
        description: `Invoice ${(inv as { number?: string }).number ?? inv.id}`,
      })
    }

    // Upsert in chunks of 500
    for (let i = 0; i < txnRows.length; i += 500) {
      const batch = txnRows.slice(i, i + 500)
      const { error: txnErr } = await supabaseAdmin
        .from('crm_revenue_transactions')
        .upsert(batch, { onConflict: 'provider,provider_transaction_id' })
      if (txnErr) {
        errors++
        errorDetails.push({ message: `Txn batch ${i / 500 + 1}: ${txnErr.message}` })
      }
    }
    console.log(`[Stripe Sync] Upserted ${txnRows.length} transactions`)

    // ── Phase 5: Process customers — batch creates and updates ──
    console.log('[Stripe Sync] Processing customers...')
    const toCreate: Array<Record<string, unknown>> = []
    const toUpdate: Array<{ id: string; record: Record<string, unknown> }> = []

    for (const cust of customers) {
      processed++
      try {
        const sub = subsByCustomer.get(cust.id)
        const email = (cust as { email?: string | null }).email ?? null
        const name = (cust as { name?: string | null }).name ?? null
        const totalStripeRevenue = revenueByCustomer.get(cust.id) ?? 0
        const hasPayment = totalStripeRevenue > 0
        const planAmount = sub?.items?.data?.[0]?.price?.unit_amount ?? null

        const clientStatus = determineClientStatus({
          stripeSubscriptionStatus: sub?.status ?? null,
          stripeTrialEnd: sub?.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
          stripeCanceledAt: sub?.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
          hasSuccessfulPayment: hasPayment,
          hasShopifyRevenue: false,
        })

        const calculatedMrr = calculateMrr({ clientStatus, stripePlanAmount: planAmount })

        const record: Record<string, unknown> = {
          stripe_customer_id: cust.id,
          stripe_subscription_id: sub?.id ?? null,
          stripe_subscription_status: sub?.status ?? null,
          stripe_trial_end: sub?.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
          stripe_current_period_end: sub?.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null,
          stripe_plan_amount: planAmount,
          stripe_cancel_at: sub?.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null,
          stripe_canceled_at: sub?.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
          client_status: clientStatus,
          calculated_mrr: calculatedMrr,
          calculated_total_revenue: totalStripeRevenue,
          cancellation_date: sub?.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
          last_synced_at: new Date().toISOString(),
        }

        // Find existing CRM customer (in-memory lookup, zero DB queries)
        const existingId =
          crmByStripeId.get(cust.id) ??
          (email ? crmByEmail.get(email.toLowerCase()) : undefined) ??
          null

        if (existingId) {
          toUpdate.push({ id: existingId, record })
          updated++
        } else {
          record.name = name
          record.email = email
          record.billing_channel = 'stripe'
          record.source = 'stripe'
          record.signup_date = new Date((cust as { created: number }).created * 1000).toISOString()
          toCreate.push(record)
          created++
        }
      } catch (e) {
        errors++
        errorDetails.push({
          message: e instanceof Error ? e.message : String(e),
          record: (cust as { email?: string }).email ?? cust.id,
        })
      }
    }

    // Batch insert new customers (chunks of 200)
    for (let i = 0; i < toCreate.length; i += 200) {
      const batch = toCreate.slice(i, i + 200)
      const { error: err } = await supabaseAdmin.from('crm_customers').insert(batch)
      if (err) {
        errors++
        errorDetails.push({ message: `Customer insert batch ${i / 200 + 1}: ${err.message}` })
      }
    }

    // Batch update existing customers (parallel, 20 at a time)
    for (let i = 0; i < toUpdate.length; i += 20) {
      const batch = toUpdate.slice(i, i + 20)
      await Promise.all(
        batch.map(({ id, record }) =>
          supabaseAdmin
            .from('crm_customers')
            .update(record)
            .eq('id', id)
            .then(({ error: err }) => {
              if (err) {
                errors++
                errorDetails.push({ message: `Update ${id}: ${err.message}` })
              }
            })
        )
      )
    }

    // Link orphan transactions to newly created customers
    // (only need this for customers that were just created)
    const { data: newCustomers } = await supabaseAdmin
      .from('crm_customers')
      .select('id, stripe_customer_id')
      .not('stripe_customer_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(toCreate.length + 10)

    if (newCustomers?.length) {
      for (let i = 0; i < newCustomers.length; i += 20) {
        const batch = newCustomers.slice(i, i + 20)
        await Promise.all(
          batch.map((c) =>
            supabaseAdmin
              .from('crm_revenue_transactions')
              .update({ crm_customer_id: c.id })
              .eq('provider', 'stripe')
              .eq('provider_customer_id', c.stripe_customer_id!)
              .is('crm_customer_id', null)
          )
        )
      }
    }

    console.log(`[Stripe Sync] Done: ${processed} processed, ${created} created, ${updated} updated, ${errors} errors`)

    await supabaseAdmin
      .from('crm_sync_state')
      .update({ status: 'idle', last_successful_at: new Date().toISOString(), error_message: null })
      .eq('provider', 'stripe')

    if (logId) {
      await supabaseAdmin
        .from('crm_sync_logs')
        .update({
          completed_at: new Date().toISOString(),
          status: errors > 0 ? 'failed' : 'completed',
          records_processed: processed,
          records_created: created,
          records_updated: updated,
          errors,
          error_details: errorDetails,
        })
        .eq('id', logId)
    }

    return res.json({
      success: true,
      processed,
      created,
      updated,
      errors,
      invoices: invoices.length,
      durationMs: Date.now() - t0,
    })
  } catch (e) {
    const message = e instanceof Error ? `${e.message}\n${e.stack}` : String(e)
    console.error('[Stripe Sync] Fatal error:', message)

    try {
      await supabaseAdmin
        .from('crm_sync_state')
        .update({ status: 'idle', error_message: message.substring(0, 500) })
        .eq('provider', 'stripe')
    } catch {
      /* ignore */
    }

    return res.status(500).json({ error: message.substring(0, 1000) })
  }
}
