import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../../_lib/auth.js'
import { supabaseAdmin } from '../../_lib/supabase-admin.js'
import {
  isShopifyConfigured,
  getAppTransactions,
  getHistoricalEvents,
  getActiveSubscription,
  partnerRateLimitPause,
  shopGidNumeric,
  shopifyAppNumericId,
  type ShopifyTransaction,
  type ShopifyPartnerEvent,
} from '../../_lib/shopify.js'
import {
  ShopifyCustomerIndex,
  loadShopifyCustomerIndex,
  findOrCreateShopifyCustomer,
  toSubscriptionEventRow,
  loadShopsToProcess,
  loadEventsForShop,
  loadConfirmedShopifyPaymentShopIds,
  shopHasConfirmedPayment,
  deriveShopifyLifecycle,
  shopifyCustomerUpdateFromLifecycle,
  normalizeShopDomain,
  type ShopifyShopRef,
} from '../../_lib/shopify-lifecycle.js'

export const config = { maxDuration: 300 }

/** Stay well under Vercel timeout. Browser will call this endpoint again to resume. */
const TIME_BUDGET_MS = 45_000
const EVENT_WINDOW_DAYS = 365
const MAX_LOOKBACK_DAYS = 365 * 8
const DAY_MS = 24 * 60 * 60 * 1000

type SyncPhase = 'events' | 'transactions' | 'lifecycle' | 'finalize'

interface SyncStats {
  shopsProcessed: number
  activeSubscriptionsFound: number
  historicalEventsProcessed: number
  customersCreated: number
  customersUpdated: number
  movedToInTrial: number
  movedToActive: number
  movedToCanceled: number
  skippedMissingIds: number
  apiErrors: number
  txnProcessed: number
  txnUpserted: number
}

interface ShopifySyncCursor {
  v: 1
  phase: SyncPhase
  origin: string
  lookbackStart: string
  windowIndex: number
  eventAfter: string | null
  shopOffset: number
  txnCursor: string | null
  txnCreatedAtMin?: string
  stats: SyncStats
}

function emptyStats(): SyncStats {
  return {
    shopsProcessed: 0,
    activeSubscriptionsFound: 0,
    historicalEventsProcessed: 0,
    customersCreated: 0,
    customersUpdated: 0,
    movedToInTrial: 0,
    movedToActive: 0,
    movedToCanceled: 0,
    skippedMissingIds: 0,
    apiErrors: 0,
    txnProcessed: 0,
    txnUpserted: 0,
  }
}

function eventWindows(lookbackStart: string, origin: string): Array<{ min: string; max: string }> {
  const windows: Array<{ min: string; max: string }> = []
  let cursor = new Date(lookbackStart).getTime()
  const end = new Date(origin).getTime()
  while (cursor < end) {
    const wEnd = Math.min(cursor + EVENT_WINDOW_DAYS * DAY_MS, end)
    windows.push({ min: new Date(cursor).toISOString(), max: new Date(wEnd).toISOString() })
    cursor = wEnd
  }
  return windows.length ? windows : [{ min: lookbackStart, max: origin }]
}

async function needsLifecycleBackfill(): Promise<boolean> {
  const { count, error } = await supabaseAdmin
    .from('crm_customers')
    .select('id', { count: 'exact', head: true })
    .not('shopify_last_status_sync_at', 'is', null)
  if (error) {
    console.error('[Shopify Sync] lifecycle backfill check:', error.message)
    return true
  }
  return (count ?? 0) === 0
}

function parseCursor(
  raw: string | null | undefined,
  lastSuccessfulAt: string | null | undefined,
  backfill: boolean,
  nowIso: string
): ShopifySyncCursor {
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as ShopifySyncCursor
      if (parsed?.v === 1 && parsed.phase) return parsed
    } catch {
      return {
        v: 1,
        phase: 'transactions',
        origin: nowIso,
        lookbackStart: new Date(Date.now() - MAX_LOOKBACK_DAYS * DAY_MS).toISOString(),
        windowIndex: 0,
        eventAfter: null,
        shopOffset: 0,
        txnCursor: raw,
        txnCreatedAtMin: lastSuccessfulAt ?? undefined,
        stats: emptyStats(),
      }
    }
  }

  const lookbackStart = backfill || !lastSuccessfulAt
    ? new Date(Date.now() - MAX_LOOKBACK_DAYS * DAY_MS).toISOString()
    : new Date(new Date(lastSuccessfulAt).getTime() - DAY_MS).toISOString()

  return {
    v: 1,
    phase: 'events',
    origin: nowIso,
    lookbackStart,
    windowIndex: 0,
    eventAfter: null,
    shopOffset: 0,
    txnCursor: null,
    txnCreatedAtMin: backfill ? undefined : lastSuccessfulAt ?? undefined,
    stats: emptyStats(),
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const started = Date.now()

  try {
    const user = await requireAuth(req, res)
    if (!user) return

    if (!isShopifyConfigured()) {
      return res.status(503).json({
        error: 'Shopify Partner API not configured. Set SHOPIFY_PARTNER_ORG_ID, SHOPIFY_PARTNER_ACCESS_TOKEN, and SHOPIFY_APP_ID.',
      })
    }

    const { data: syncState } = await supabaseAdmin
      .from('crm_sync_state')
      .select('sync_cursor, last_successful_at')
      .eq('provider', 'shopify')
      .single()

    const backfill = await needsLifecycleBackfill()
    const nowIso = new Date().toISOString()
    const cursor = parseCursor(syncState?.sync_cursor, syncState?.last_successful_at, backfill, nowIso)

    const { data: syncLog } = await supabaseAdmin
      .from('crm_sync_logs')
      .insert({
        provider: 'shopify',
        sync_type: syncState?.sync_cursor ? 'resume' : backfill ? 'full' : 'incremental',
      })
      .select('id')
      .single()

    const logId = syncLog?.id

    await supabaseAdmin
      .from('crm_sync_state')
      .update({ status: 'running', last_sync_at: nowIso, error_message: null })
      .eq('provider', 'shopify')

    console.log(
      `[Shopify Sync] start phase=${cursor.phase} appId=${shopifyAppNumericId()} backfill=${backfill}`
    )

    const index = await loadShopifyCustomerIndex()
    const errorDetails: Array<{ message: string; record?: string }> = []
    let complete = false

    while (Date.now() - started < TIME_BUDGET_MS && !complete) {
      if (cursor.phase === 'events') {
        const done = await runEventsPhase(cursor, index, errorDetails, started)
        if (done) cursor.phase = 'transactions'
        else break
      } else if (cursor.phase === 'transactions') {
        const done = await runTransactionsPhase(cursor, index, errorDetails, started)
        if (done) {
          cursor.phase = 'lifecycle'
          cursor.shopOffset = 0
        } else break
      } else if (cursor.phase === 'lifecycle') {
        const done = await runLifecyclePhase(cursor, index, errorDetails, started)
        if (done) cursor.phase = 'finalize'
        else break
      } else {
        await recalcShopifyRevenue(errorDetails)
        complete = true
      }
    }

    await supabaseAdmin
      .from('crm_sync_state')
      .update({
        status: 'idle',
        sync_cursor: complete ? null : JSON.stringify(cursor),
        last_successful_at: complete ? new Date().toISOString() : syncState?.last_successful_at ?? null,
        error_message: null,
        last_sync_at: new Date().toISOString(),
      })
      .eq('provider', 'shopify')

    logStats(cursor.stats)

    if (logId) {
      await supabaseAdmin
        .from('crm_sync_logs')
        .update({
          completed_at: new Date().toISOString(),
          status: cursor.stats.apiErrors > 0 || errorDetails.length > 0 ? 'failed' : 'completed',
          records_processed: cursor.stats.txnProcessed + cursor.stats.historicalEventsProcessed + cursor.stats.shopsProcessed,
          records_created: cursor.stats.customersCreated,
          records_updated: cursor.stats.customersUpdated,
          records_skipped: cursor.stats.skippedMissingIds,
          errors: cursor.stats.apiErrors + errorDetails.length,
          error_details: errorDetails.slice(0, 50),
          metadata: { ...cursor.stats, complete, phase: cursor.phase, backfill },
        })
        .eq('id', logId)
    }

    return res.json({
      success: true,
      complete,
      continue: !complete,
      phase: cursor.phase,
      processed: cursor.stats.txnProcessed + cursor.stats.historicalEventsProcessed + cursor.stats.shopsProcessed,
      created: cursor.stats.customersCreated,
      updated: cursor.stats.customersUpdated,
      errors: cursor.stats.apiErrors + errorDetails.length,
      stats: cursor.stats,
      durationMs: Date.now() - started,
    })
  } catch (e) {
    const message = e instanceof Error ? `${e.message}\n${e.stack}` : String(e)
    console.error('[Shopify Sync] Fatal error:', message)

    try {
      await supabaseAdmin
        .from('crm_sync_state')
        .update({ status: 'idle', error_message: message.substring(0, 500) })
        .eq('provider', 'shopify')
    } catch { /* ignore */ }

    return res.status(500).json({ error: message.substring(0, 1000) })
  }
}

function logStats(stats: SyncStats) {
  console.log(
    `[Shopify Sync] shops=${stats.shopsProcessed} activeSubs=${stats.activeSubscriptionsFound} events=${stats.historicalEventsProcessed} created=${stats.customersCreated} updated=${stats.customersUpdated} inTrial=${stats.movedToInTrial} active=${stats.movedToActive} canceled=${stats.movedToCanceled} skippedMissing=${stats.skippedMissingIds} apiErrors=${stats.apiErrors}`
  )
}

async function persistCursor(cursor: ShopifySyncCursor) {
  await supabaseAdmin
    .from('crm_sync_state')
    .update({ sync_cursor: JSON.stringify(cursor), last_sync_at: new Date().toISOString() })
    .eq('provider', 'shopify')
}

async function runEventsPhase(
  cursor: ShopifySyncCursor,
  index: ShopifyCustomerIndex,
  errorDetails: Array<{ message: string; record?: string }>,
  started: number
): Promise<boolean> {
  const windows = eventWindows(cursor.lookbackStart, cursor.origin)

  while (Date.now() - started < TIME_BUDGET_MS) {
    if (cursor.windowIndex >= windows.length) return true

    const window = windows[cursor.windowIndex]
    if (cursor.eventAfter || cursor.windowIndex > 0) await partnerRateLimitPause()

    let page
    try {
      page = await getHistoricalEvents(cursor.eventAfter, window.min, window.max)
    } catch (e) {
      cursor.stats.apiErrors++
      const message = e instanceof Error ? e.message : String(e)
      errorDetails.push({ message: `events: ${message}` })
      console.error('[Shopify Sync] events API error:', message)
      throw e
    }

    const rows = []
    for (const event of page.events) {
      cursor.stats.historicalEventsProcessed++
      const shop = shopFromEvent(event)
      if (!shop.shopId && !shop.domain) {
        cursor.stats.skippedMissingIds++
        continue
      }
      try {
        const isSubscriptionEvent = event.eventType.startsWith('SUBSCRIPTION_')
        if (!isSubscriptionEvent) {
          const existing = index.find(shop.shopId, null, shop.domain)
          rows.push(toSubscriptionEventRow(event, existing?.id ?? null))
          continue
        }
        const result = await findOrCreateShopifyCustomer(index, shop, null)
        if (result.skippedMissing) {
          cursor.stats.skippedMissingIds++
          continue
        }
        if (result.created) cursor.stats.customersCreated++
        rows.push(toSubscriptionEventRow(event, result.customer?.id ?? null))
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        errorDetails.push({ message, record: shop.domain ?? shop.shopId })
      }
    }

    for (let i = 0; i < rows.length; i += 200) {
      const batch = rows.slice(i, i + 200)
      const { error } = await supabaseAdmin
        .from('crm_shopify_subscription_events')
        .upsert(batch, { onConflict: 'shopify_event_id' })
      if (error) {
        errorDetails.push({ message: `Event upsert: ${error.message}` })
      }
    }

    if (page.hasNextPage && page.cursor) {
      cursor.eventAfter = page.cursor
    } else {
      cursor.windowIndex++
      cursor.eventAfter = null
    }

    await persistCursor(cursor)
  }

  return cursor.windowIndex >= windows.length
}

async function runTransactionsPhase(
  cursor: ShopifySyncCursor,
  index: ShopifyCustomerIndex,
  errorDetails: Array<{ message: string; record?: string }>,
  started: number
): Promise<boolean> {
  while (Date.now() - started < TIME_BUDGET_MS) {
    if (cursor.txnCursor) await partnerRateLimitPause()

    let page
    try {
      page = await getAppTransactions(cursor.txnCursor, cursor.txnCreatedAtMin)
    } catch (e) {
      cursor.stats.apiErrors++
      const message = e instanceof Error ? e.message : String(e)
      errorDetails.push({ message: `transactions: ${message}` })
      console.error('[Shopify Sync] transactions API error:', message)
      throw e
    }

    const rows = []
    for (const tx of page.transactions) {
      cursor.stats.txnProcessed++
      const shopId = shopGidNumeric(tx.shop?.id)
      const domain = normalizeShopDomain(tx.shop?.myshopifyDomain)
      if (!shopId && !domain) {
        cursor.stats.skippedMissingIds++
        rows.push(toTxnRow(tx, null))
        continue
      }
      try {
        const result = await findOrCreateShopifyCustomer(
          index,
          { shopId: shopId ?? '', domain, name: tx.shop?.name ?? null },
          null
        )
        if (result.created) cursor.stats.customersCreated++
        rows.push(toTxnRow(tx, result.customer?.id ?? null))
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        errorDetails.push({ message, record: domain ?? shopId ?? undefined })
        rows.push(toTxnRow(tx, null))
      }
    }

    for (let i = 0; i < rows.length; i += 200) {
      const batch = rows.slice(i, i + 200)
      const { error: upsertErr } = await supabaseAdmin
        .from('crm_revenue_transactions')
        .upsert(batch, { onConflict: 'provider,provider_transaction_id' })
      if (upsertErr) {
        errorDetails.push({ message: `Upsert batch: ${upsertErr.message}` })
      } else {
        cursor.stats.txnUpserted += batch.length
      }
    }

    cursor.txnCursor = page.cursor
    await persistCursor(cursor)

    if (!page.hasNextPage || !page.cursor) {
      cursor.txnCursor = null
      return true
    }
  }

  return false
}

async function runLifecyclePhase(
  cursor: ShopifySyncCursor,
  index: ShopifyCustomerIndex,
  errorDetails: Array<{ message: string; record?: string }>,
  started: number
): Promise<boolean> {
  const shops = await loadShopsToProcess(index)
  const paid = await loadConfirmedShopifyPaymentShopIds()

  while (cursor.shopOffset < shops.length && Date.now() - started < TIME_BUDGET_MS) {
    const shop = shops[cursor.shopOffset]
    cursor.stats.shopsProcessed++

    if (!shop.shopId && !shop.domain) {
      cursor.stats.skippedMissingIds++
      cursor.shopOffset++
      continue
    }

    if (cursor.shopOffset > 0) await partnerRateLimitPause()

    let activeSub = null
    if (shop.shopId) {
      try {
        activeSub = await getActiveSubscription(shop.shopId)
        if (activeSub) {
          cursor.stats.activeSubscriptionsFound++
          shop.domain = normalizeShopDomain(activeSub.shop?.myshopifyDomain) ?? shop.domain
          shop.name = activeSub.shop?.name ?? shop.name
          shop.shopId = shopGidNumeric(activeSub.shop?.id) ?? shop.shopId
        }
      } catch (e) {
        cursor.stats.apiErrors++
        const message = e instanceof Error ? e.message : String(e)
        errorDetails.push({ message: `activeSubscription: ${message}`, record: shop.shopId })
        console.error('[Shopify Sync] activeSubscription error for shop', shop.shopId, message)
      }
    }

    const events = shop.shopId ? await loadEventsForShop(shop.shopId) : []
    const derived = deriveShopifyLifecycle({ activeSub, events })

    try {
      const result = await findOrCreateShopifyCustomer(index, shop, derived.subscriptionId)
      if (result.skippedMissing || !result.customer) {
        cursor.stats.skippedMissingIds++
      } else {
        if (result.created) cursor.stats.customersCreated++
        if (!result.skippedStripe) {
          const hasPayment = shopHasConfirmedPayment(paid, {
            shopId: shop.shopId,
            domain: shop.domain,
            customerId: result.customer.id,
          })

          const previousStatus = result.customer.client_status
          const update = shopifyCustomerUpdateFromLifecycle({
            customer: result.customer,
            shop,
            derived,
            hasConfirmedPayment: hasPayment,
          })
          if (update) {
            const { error } = await supabaseAdmin
              .from('crm_customers')
              .update(update.record)
              .eq('id', result.customer.id)
            if (error) {
              errorDetails.push({ message: `Customer update: ${error.message}`, record: shop.shopId })
            } else {
              cursor.stats.customersUpdated++
              tallyStatusMove(cursor.stats, previousStatus, update.nextStatus)

              if (shop.shopId) {
                await supabaseAdmin
                  .from('crm_shopify_subscription_events')
                  .update({ crm_customer_id: result.customer.id })
                  .eq('shopify_shop_id', shop.shopId)
                  .is('crm_customer_id', null)

                await supabaseAdmin
                  .from('crm_revenue_transactions')
                  .update({ crm_customer_id: result.customer.id })
                  .eq('provider', 'shopify')
                  .eq('shopify_shop_id', shop.shopId)
                  .is('crm_customer_id', null)
              }
            }
          }
        }
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      errorDetails.push({ message, record: shop.shopId || shop.domain || undefined })
    }

    cursor.shopOffset++
    await persistCursor(cursor)
  }

  return cursor.shopOffset >= shops.length
}

function tallyStatusMove(stats: SyncStats, previous: string | null, next: string) {
  if (previous === next) return
  if (next === 'in_trial') stats.movedToInTrial++
  if (next === 'active_customer') stats.movedToActive++
  if (next === 'canceled') stats.movedToCanceled++
}

function shopFromEvent(event: ShopifyPartnerEvent): ShopifyShopRef {
  return {
    shopId: shopGidNumeric(event.shop?.id) ?? '',
    domain: normalizeShopDomain(event.shop?.myshopifyDomain),
    name: event.shop?.name ?? null,
  }
}

function toTxnRow(tx: ShopifyTransaction, customerId: string | null) {
  const amount = parseFloat(tx.grossAmount?.amount ?? tx.netAmount?.amount ?? '0')
  let txType = 'payment'
  switch (tx.__typename) {
    case 'AppUsageSale':
      txType = 'app_usage_sale'
      break
    case 'AppSubscriptionSale':
      txType = 'app_subscription_sale'
      break
    case 'AppSaleAdjustment':
      txType = 'app_sale_adjustment'
      break
    case 'AppSaleCredit':
      txType = 'app_sale_credit'
      break
  }
  return {
    provider: 'shopify',
    provider_transaction_id: tx.id,
    crm_customer_id: customerId,
    amount: Math.abs(amount),
    currency: tx.grossAmount?.currencyCode ?? tx.netAmount?.currencyCode ?? 'USD',
    transaction_date: tx.createdAt,
    status: amount >= 0 ? 'succeeded' : 'adjusted',
    transaction_type: txType,
    shopify_charge_id: tx.chargeId ?? null,
    shopify_shop_id: shopGidNumeric(tx.shop?.id),
    shopify_shop_domain: tx.shop?.myshopifyDomain ?? null,
    shopify_gross_amount: tx.grossAmount ? parseFloat(tx.grossAmount.amount) : null,
    shopify_net_amount: tx.netAmount ? parseFloat(tx.netAmount.amount) : null,
    shopify_fee: tx.shopifyFee ? parseFloat(tx.shopifyFee.amount) : null,
    description: `Shopify ${tx.__typename} for ${tx.shop?.name ?? tx.shop?.myshopifyDomain ?? 'unknown shop'}`,
  }
}

async function recalcShopifyRevenue(errorDetails: Array<{ message: string }>) {
  const PAGE = 1000
  const shopifyByCustomer = new Map<string, number>()
  let from = 0
  for (;;) {
    const { data, error } = await supabaseAdmin
      .from('crm_revenue_transactions')
      .select('crm_customer_id, amount, transaction_type')
      .eq('provider', 'shopify')
      .in('status', ['succeeded', 'adjusted'])
      .not('crm_customer_id', 'is', null)
      .range(from, from + PAGE - 1)
    if (error) {
      errorDetails.push({ message: `Revenue load: ${error.message}` })
      break
    }
    for (const t of data ?? []) {
      if (!t.crm_customer_id) continue
      const delta =
        t.transaction_type === 'app_sale_adjustment' || t.transaction_type === 'app_sale_credit'
          ? -Math.abs(t.amount)
          : t.amount
      shopifyByCustomer.set(t.crm_customer_id, (shopifyByCustomer.get(t.crm_customer_id) ?? 0) + delta)
    }
    if (!data || data.length < PAGE) break
    from += PAGE
  }

  const ids = [...shopifyByCustomer.keys()]
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50)
    const { data: stripeTxns } = await supabaseAdmin
      .from('crm_revenue_transactions')
      .select('crm_customer_id, amount')
      .eq('provider', 'stripe')
      .eq('status', 'succeeded')
      .in('crm_customer_id', batch)

    const stripeByCustomer = new Map<string, number>()
    for (const t of stripeTxns ?? []) {
      if (!t.crm_customer_id) continue
      stripeByCustomer.set(t.crm_customer_id, (stripeByCustomer.get(t.crm_customer_id) ?? 0) + t.amount)
    }

    await Promise.all(
      batch.map((id) =>
        supabaseAdmin
          .from('crm_customers')
          .update({
            calculated_total_revenue:
              (shopifyByCustomer.get(id) ?? 0) + (stripeByCustomer.get(id) ?? 0),
          })
          .eq('id', id)
          .eq('billing_channel', 'shopify')
      )
    )
  }
}
