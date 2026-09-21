import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../../_lib/auth.js'
import { supabaseAdmin, fetchAllRows } from '../../_lib/supabase-admin.js'
import { determineClientStatus, calculateMrr } from '../../_lib/status-engine.js'
import {
  myshopifyDomainFromMetadata,
  myshopifyDomainFromUnknown,
} from '../../_lib/shopify-lifecycle.js'
import {
  isStripeConfigured,
  getAllStripeCustomers,
  getAllStripeSubscriptions,
  getPaidInvoices,
} from '../../_lib/stripe.js'
import { advanceLastPayments, existingProviderTxnIds } from '../../_lib/last-payment.js'
import { attachOrphanStripeTransactions, nextCalculatedTotalRevenue } from '../../_lib/revenue.js'

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

    // ── Phase 2: Pre-fetch ALL existing CRM customers (paginated — PostgREST caps at 1000) ──
    const existingCrm = await fetchAllRows<{
      id: string
      email: string | null
      stripe_customer_id: string | null
      client_status: string | null
      billing_channel: string | null
      name: string | null
      store_url: string | null
      shopify_shop_domain: string | null
      signup_date: string | null
      total_revenue_override: number | null
      calculated_total_revenue: number | null
    }>(
      'crm_customers',
      'id, email, stripe_customer_id, client_status, billing_channel, name, store_url, shopify_shop_domain, signup_date, total_revenue_override, calculated_total_revenue'
    )

    const crmByStripeId = new Map<string, string>()
    const crmByEmail = new Map<string, string>()
    const crmByDomain = new Map<string, string>()
    const crmStatusById = new Map<string, string>()
    const crmBillingById = new Map<string, string>()
    const crmDomainById = new Map<string, string>()
    const crmStoreUrlById = new Map<string, string | null>()
    const crmSignupById = new Map<string, string | null>()
    const crmStoredRevenueById = new Map<string, number>()
    const crmCalculatedRevenueById = new Map<string, number>()
    const crmRevenueOverrideById = new Map<string, number>()
    for (const c of existingCrm) {
      if (c.stripe_customer_id) crmByStripeId.set(c.stripe_customer_id, c.id)
      if (c.email) crmByEmail.set(c.email.toLowerCase().trim(), c.id)
      crmStatusById.set(c.id, c.client_status ?? 'prospect')
      crmBillingById.set(c.id, c.billing_channel ?? 'none')
      crmStoreUrlById.set(c.id, c.store_url)
      crmSignupById.set(c.id, c.signup_date)
      crmCalculatedRevenueById.set(c.id, Number(c.calculated_total_revenue ?? 0))
      crmRevenueOverrideById.set(c.id, Number(c.total_revenue_override ?? 0))
      crmStoredRevenueById.set(
        c.id,
        Math.max(Number(c.total_revenue_override ?? 0), Number(c.calculated_total_revenue ?? 0))
      )
      const domain =
        myshopifyDomainFromUnknown(c.shopify_shop_domain) ?? myshopifyDomainFromUnknown(c.store_url)
      if (domain) {
        crmByDomain.set(domain, c.id)
        crmDomainById.set(c.id, domain)
      }
    }
    console.log(`[Stripe Sync] Loaded ${existingCrm.length} existing CRM customers for matching`)

    // ── Phase 3: Build in-memory maps ──

    const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due'])

    // Subscription lookup: prefer active/trialing over canceled; tie-break by created
    const subsByCustomer = new Map<string, (typeof subscriptions)[0]>()
    for (const sub of subscriptions) {
      const custId = typeof sub.customer === 'string' ? sub.customer : (sub.customer as { id: string }).id
      const existing = subsByCustomer.get(custId)
      if (!existing) {
        subsByCustomer.set(custId, sub)
      } else {
        const existingActive = ACTIVE_STATUSES.has(existing.status)
        const newActive = ACTIVE_STATUSES.has(sub.status)
        if ((newActive && !existingActive) || (newActive === existingActive && sub.created > existing.created)) {
          subsByCustomer.set(custId, sub)
        }
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
    const paidAtByTxnId = new Map<string, string>()
    for (const inv of invoices) {
      if (!inv.id || !inv.amount_paid || inv.amount_paid <= 0) continue
      const custId =
        typeof inv.customer === 'string'
          ? inv.customer
          : (inv.customer as { id: string } | null)?.id ?? null

      const crmId = custId
        ? crmByStripeId.get(custId) ?? null
        : null

      const created = (inv as { created: number }).created
      const paidAt = inv.status_transitions?.paid_at ?? created
      paidAtByTxnId.set(inv.id, new Date(paidAt * 1000).toISOString())

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
        transaction_date: new Date(created * 1000).toISOString(),
        status: 'succeeded',
        transaction_type: 'payment',
        description: `Invoice ${(inv as { number?: string }).number ?? inv.id}`,
      })
    }

    // Upsert in chunks of 500
    for (let i = 0; i < txnRows.length; i += 500) {
      const batch = txnRows.slice(i, i + 500)
      const already = await existingProviderTxnIds(
        'stripe',
        batch.map((row) => String(row.provider_transaction_id ?? ''))
      )
      const { error: txnErr } = await supabaseAdmin
        .from('crm_revenue_transactions')
        .upsert(batch, { onConflict: 'provider,provider_transaction_id' })
      if (txnErr) {
        errors++
        errorDetails.push({ message: `Txn batch ${i / 500 + 1}: ${txnErr.message}` })
      } else {
        await advanceLastPayments(
          batch
            .filter(
              (row) =>
                row.crm_customer_id &&
                row.status === 'succeeded' &&
                Number(row.amount) > 0 &&
                !already.has(String(row.provider_transaction_id ?? ''))
            )
            .map((row) => ({
              customerId: String(row.crm_customer_id),
              paymentAt:
                paidAtByTxnId.get(String(row.provider_transaction_id)) ?? String(row.transaction_date),
              provider: 'stripe' as const,
            }))
        )
      }
    }
    console.log(`[Stripe Sync] Upserted ${txnRows.length} transactions`)

    // ── Phase 5: Consolidate duplicate Stripe customers by email ──
    // Stripe often has multiple customer objects for the same person.
    // Merge them: prefer the one with an active subscription, combine revenue.
    interface MergedCustomer {
      primaryId: string
      allIds: string[]
      email: string | null
      name: string | null
      totalRevenue: number
      hasPayment: boolean
      storeDomain: string | null
      created: number | null
      sub: (typeof subscriptions)[0] | undefined
    }

    const mergedByEmail = new Map<string, MergedCustomer>()
    const noEmailCustomers: MergedCustomer[] = []

    for (const cust of customers) {
      const email = (cust as { email?: string | null }).email ?? null
      const name = (cust as { name?: string | null }).name ?? null
      const storeDomain = myshopifyDomainFromMetadata(
        (cust as { metadata?: Record<string, string> | null }).metadata
      )
      const created = typeof cust.created === 'number' ? cust.created : null
      const sub = subsByCustomer.get(cust.id)
      const rev = revenueByCustomer.get(cust.id) ?? 0
      const emailKey = email?.toLowerCase() ?? null

      if (emailKey && mergedByEmail.has(emailKey)) {
        const existing = mergedByEmail.get(emailKey)!
        existing.allIds.push(cust.id)
        existing.totalRevenue += rev
        existing.hasPayment = existing.hasPayment || rev > 0
        if (!existing.name && name) existing.name = name
        if (!existing.storeDomain && storeDomain) existing.storeDomain = storeDomain
        if (created != null && (existing.created == null || created < existing.created)) {
          existing.created = created
        }

        // Prefer active subscription
        if (sub) {
          if (!existing.sub) {
            existing.sub = sub
            existing.primaryId = cust.id
          } else {
            const existingActive = ACTIVE_STATUSES.has(existing.sub.status)
            const newActive = ACTIVE_STATUSES.has(sub.status)
            if ((newActive && !existingActive) || (newActive === existingActive && sub.created > existing.sub.created)) {
              existing.sub = sub
              existing.primaryId = cust.id
            }
          }
        }
      } else {
        const merged: MergedCustomer = {
          primaryId: cust.id,
          allIds: [cust.id],
          email,
          name,
          totalRevenue: rev,
          hasPayment: rev > 0,
          storeDomain,
          created,
          sub,
        }
        if (emailKey) {
          mergedByEmail.set(emailKey, merged)
        } else {
          noEmailCustomers.push(merged)
        }
      }
    }

    const allMerged = [...mergedByEmail.values(), ...noEmailCustomers]
    console.log(`[Stripe Sync] Consolidated ${customers.length} Stripe customers → ${allMerged.length} unique`)

    // ── Phase 6: Process merged customers — batch creates and updates ──
    console.log('[Stripe Sync] Processing customers...')
    const toCreate: Array<Record<string, unknown>> = []
    const toUpdate: Array<{ id: string; record: Record<string, unknown> }> = []

    for (const merged of allMerged) {
      processed++
      try {
        const sub = merged.sub
        const planAmount = sub?.items?.data?.[0]?.price?.unit_amount ?? null

        const record: Record<string, unknown> = {
          stripe_customer_id: merged.primaryId,
          stripe_subscription_id: sub?.id ?? null,
          stripe_subscription_status: sub?.status ?? null,
          stripe_trial_end: sub?.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
          stripe_current_period_end: sub?.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null,
          stripe_plan_amount: planAmount,
          stripe_cancel_at: sub?.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null,
          stripe_canceled_at: sub?.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
          last_synced_at: new Date().toISOString(),
          billing_channel: 'stripe',
        }

        if (sub?.canceled_at) {
          record.cancellation_date = new Date(sub.canceled_at * 1000).toISOString()
        }

        // Find existing CRM customer (in-memory lookup, zero DB queries)
        let existingId: string | null = null
        for (const sid of merged.allIds) {
          existingId = crmByStripeId.get(sid) ?? null
          if (existingId) break
        }
        if (!existingId && merged.storeDomain) {
          existingId = crmByDomain.get(merged.storeDomain) ?? null
        }
        if (!existingId && merged.email) {
          const byEmail = crmByEmail.get(merged.email.toLowerCase().trim()) ?? null
          if (byEmail && merged.storeDomain) {
            const existingDomain = crmDomainById.get(byEmail)
            if (existingDomain && existingDomain !== merged.storeDomain) {
              console.log(
                `[Stripe Sync] Email match conflict: ${merged.email} stripe_store=${merged.storeDomain} existing_store=${existingDomain} customer=${byEmail} — not merging`
              )
            } else {
              existingId = byEmail
            }
          } else {
            existingId = byEmail
          }
        }
        if (existingId === 'pending') existingId = null

        record.calculated_total_revenue = nextCalculatedTotalRevenue({
          existingCalculated: existingId ? crmCalculatedRevenueById.get(existingId) : 0,
          existingOverride: existingId ? crmRevenueOverrideById.get(existingId) : 0,
          ledgerTotal: merged.totalRevenue,
        })

        const storedRev = existingId ? (crmStoredRevenueById.get(existingId) ?? 0) : 0
        const paid = merged.hasPayment || storedRev > 0
        const clientStatus = determineClientStatus({
          stripeSubscriptionStatus: sub?.status ?? null,
          stripeTrialEnd: sub?.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
          stripeCanceledAt: sub?.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
          hasSuccessfulPayment: paid,
          hasShopifyRevenue: false,
        })
        const calculatedMrr = calculateMrr({ clientStatus, stripePlanAmount: planAmount })
        record.calculated_mrr = calculatedMrr
        if (merged.storeDomain && (!existingId || !crmStoreUrlById.get(existingId))) {
          record.store_url = `https://${merged.storeDomain}`
        }
        if (merged.created) {
          const signupIso = new Date(merged.created * 1000).toISOString()
          if (!existingId || !crmSignupById.get(existingId)) {
            record.signup_date = signupIso
          }
        }

        // Shopify is authoritative for Shopify-billed customers.
        if (existingId && crmBillingById.get(existingId) === 'shopify') {
          const stripeOnly: Record<string, unknown> = {
            last_synced_at: new Date().toISOString(),
          }
          if (merged.primaryId) stripeOnly.stripe_customer_id = merged.primaryId
          toUpdate.push({ id: existingId, record: stripeOnly })
          continue
        }

        // Skip empty Stripe shell customers (no email, no payment, no live sub)
        const hasLiveSub = !!sub && ACTIVE_STATUSES.has(sub.status)
        if (!existingId && !merged.email && !merged.hasPayment && !hasLiveSub) {
          continue
        }

        if (existingId) {
          const existingStatus = crmStatusById.get(existingId)
          // Don't demote a real spreadsheet/CRM status to Prospect just because
          // Stripe has a shell customer with no subscription.
          if (
            clientStatus === 'prospect' &&
            existingStatus &&
            existingStatus !== 'prospect'
          ) {
            record.client_status = existingStatus
          } else {
            record.client_status = clientStatus
          }
          toUpdate.push({ id: existingId, record })
          updated++
        } else {
          record.client_status = clientStatus
          record.name = merged.name
          record.email = merged.email
          record.source = 'stripe'
          toCreate.push(record)
          created++

          if (merged.email) crmByEmail.set(merged.email.toLowerCase().trim(), 'pending')
        }
      } catch (e) {
        errors++
        errorDetails.push({
          message: e instanceof Error ? e.message : String(e),
          record: merged.email ?? merged.primaryId,
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

    const stripeIdsToAttach = [
      ...new Set(allMerged.flatMap((merged) => merged.allIds).filter(Boolean)),
    ]
    await attachOrphanStripeTransactions(stripeIdsToAttach)

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
