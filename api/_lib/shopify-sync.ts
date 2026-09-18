/**
 * Shopify Partner sync engine.
 *
 * runShopifyFullSync()  — historical import / reconciliation
 * runShopifyDeltaSync() — incremental changes since last successful checkpoint
 *
 * Both reuse the same Partner API client, matching, status, payment, and revenue helpers.
 * HTTP handlers and a future cron job should call these functions rather than duplicating logic.
 */

import { supabaseAdmin } from './supabase-admin.js'
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
} from './shopify.js'
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
} from './shopify-lifecycle.js'

export const SHOPIFY_SYNC_TIME_BUDGET_MS = 45_000
const EVENT_WINDOW_DAYS = 365
const MAX_LOOKBACK_DAYS = 365 * 8
const DAY_MS = 24 * 60 * 60 * 1000
const OVERLAP_MS = 5 * 60 * 1000

export type ShopifySyncMode = 'initial' | 'delta'

type SyncPhase = 'events' | 'transactions' | 'lifecycle' | 'finalize'

export interface ShopifySyncStats {
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
  v: 2
  mode: ShopifySyncMode
  phase: SyncPhase
  syncFrom: string
  syncTo: string
  windowIndex: number
  eventAfter: string | null
  shopOffset: number
  txnCursor: string | null
  logId: string | null
  affectedShops: ShopifyShopRef[]
  stats: ShopifySyncStats
  eventWindowCount: number
  txnPages: number
  lifecycleTotal: number | null
}

export interface ShopifySyncProgress {
  percent: number
  phase: SyncPhase
  label: string
}

export interface ShopifySyncResult {
  success: boolean
  complete: boolean
  continue: boolean
  mode: ShopifySyncMode
  checkpointRequired?: boolean
  processed: number
  created: number
  updated: number
  errors: number
  stats: ShopifySyncStats
  progress: ShopifySyncProgress
  syncFrom: string | null
  syncTo: string | null
  durationMs: number
  error?: string
}

function emptyProgress(phase: SyncPhase = 'events'): ShopifySyncProgress {
  return { percent: 0, phase, label: 'Starting' }
}

function computeProgress(cursor: ShopifySyncCursor, complete: boolean): ShopifySyncProgress {
  if (complete) {
    return { percent: 100, phase: 'finalize', label: 'Complete' }
  }

  const windows = Math.max(cursor.eventWindowCount || 1, 1)
  const eventFrac =
    cursor.phase === 'events'
      ? Math.min(1, (cursor.windowIndex + (cursor.eventAfter ? 0.5 : 0)) / windows)
      : 1

  let txnFrac = 0
  if (cursor.phase === 'transactions') {
    txnFrac = Math.min(0.92, 1 - Math.pow(0.88, Math.max(cursor.txnPages, 0)))
  } else if (cursor.phase !== 'events') {
    txnFrac = 1
  }

  let lifeFrac = 0
  if (cursor.phase === 'lifecycle') {
    const total = Math.max(cursor.lifecycleTotal ?? 0, 1)
    lifeFrac = Math.min(1, cursor.shopOffset / total)
  } else if (cursor.phase === 'finalize') {
    lifeFrac = 1
  }

  const finFrac = cursor.phase === 'finalize' ? 0.5 : 0
  const percent = Math.max(
    1,
    Math.min(99, Math.round(eventFrac * 18 + txnFrac * 22 + lifeFrac * 58 + finFrac * 2))
  )

  let label = 'Syncing'
  if (cursor.phase === 'events') {
    label = `Importing history (window ${Math.min(cursor.windowIndex + 1, windows)} of ${windows})`
  } else if (cursor.phase === 'transactions') {
    label = `Importing transactions (${cursor.stats.txnProcessed} so far)`
  } else if (cursor.phase === 'lifecycle') {
    label =
      cursor.lifecycleTotal != null
        ? `Updating shops ${Math.min(cursor.shopOffset, cursor.lifecycleTotal)} of ${cursor.lifecycleTotal}`
        : 'Updating shops'
  } else {
    label = 'Finishing revenue totals'
  }

  return { percent, phase: cursor.phase, label }
}

function emptyStats(): ShopifySyncStats {
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

function shopKey(shop: ShopifyShopRef): string {
  return shopGidNumeric(shop.shopId) || (shop.domain ? `domain:${shop.domain}` : '')
}

function addAffectedShop(cursor: ShopifySyncCursor, shop: ShopifyShopRef) {
  const key = shopKey(shop)
  if (!key) return
  const existing = cursor.affectedShops.find((s) => shopKey(s) === key)
  if (existing) {
    existing.shopId = existing.shopId || shop.shopId
    existing.domain = existing.domain || shop.domain
    existing.name = existing.name || shop.name
    return
  }
  cursor.affectedShops.push({
    shopId: shop.shopId || '',
    domain: shop.domain,
    name: shop.name,
  })
}

export async function runShopifyFullSync(): Promise<ShopifySyncResult> {
  return executeShopifySync('initial')
}

export async function runShopifyDeltaSync(): Promise<ShopifySyncResult> {
  return executeShopifySync('delta')
}

async function executeShopifySync(mode: ShopifySyncMode): Promise<ShopifySyncResult> {
  const started = Date.now()

  if (!isShopifyConfigured()) {
    return {
      success: false,
      complete: true,
      continue: false,
      mode,
      processed: 0,
      created: 0,
      updated: 0,
      errors: 1,
      stats: emptyStats(),
      progress: emptyProgress(),
      syncFrom: null,
      syncTo: null,
      durationMs: 0,
      error:
        'Shopify Partner API not configured. Set SHOPIFY_PARTNER_ORG_ID, SHOPIFY_PARTNER_ACCESS_TOKEN, and SHOPIFY_APP_ID.',
    }
  }

  const { data: syncState } = await supabaseAdmin
    .from('crm_sync_state')
    .select('sync_cursor, last_successful_at')
    .eq('provider', 'shopify')
    .single()

  const nowIso = new Date().toISOString()
  const lastSuccessfulAt = syncState?.last_successful_at ?? null

  if (mode === 'delta' && !lastSuccessfulAt) {
    return {
      success: false,
      complete: true,
      continue: false,
      mode,
      checkpointRequired: true,
      processed: 0,
      created: 0,
      updated: 0,
      errors: 0,
      stats: emptyStats(),
      progress: emptyProgress(),
      syncFrom: null,
      syncTo: null,
      durationMs: Date.now() - started,
      error: 'Run Initial Sync first to establish a Shopify checkpoint.',
    }
  }

  let cursor = parseResumeCursor(syncState?.sync_cursor, mode)
  if (!cursor) {
    cursor = createCursor(mode, lastSuccessfulAt, nowIso)
  }

  if (!cursor.logId) {
    const { data: syncLog } = await supabaseAdmin
      .from('crm_sync_logs')
      .insert({
        provider: 'shopify',
        sync_type: mode,
        status: 'running',
        metadata: {
          mode,
          sync_from: cursor.syncFrom,
          sync_to: cursor.syncTo,
        },
      })
      .select('id')
      .single()
    cursor.logId = syncLog?.id ?? null
  }

  await supabaseAdmin
    .from('crm_sync_state')
    .update({ status: 'running', last_sync_at: nowIso, error_message: null })
    .eq('provider', 'shopify')

  console.log(
    `[Shopify Sync] mode=${mode} phase=${cursor.phase} appId=${shopifyAppNumericId()} from=${cursor.syncFrom} to=${cursor.syncTo}`
  )

  const index = await loadShopifyCustomerIndex()
  const errorDetails: Array<{ message: string; record?: string }> = []
  let complete = false

  try {
    while (Date.now() - started < SHOPIFY_SYNC_TIME_BUDGET_MS && !complete) {
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
        const customerIds =
          mode === 'delta'
            ? uniqueCustomerIds(index, cursor.affectedShops)
            : undefined
        await recalcShopifyRevenue(errorDetails, customerIds)
        complete = true
      }
    }

    if (complete) {
      await supabaseAdmin
        .from('crm_sync_state')
        .update({
          status: 'idle',
          sync_cursor: null,
          last_successful_at: cursor.syncTo,
          error_message: null,
          last_sync_at: new Date().toISOString(),
        })
        .eq('provider', 'shopify')
    } else {
      await persistCursor(cursor)
      await supabaseAdmin
        .from('crm_sync_state')
        .update({
          status: 'idle',
          error_message: null,
          last_sync_at: new Date().toISOString(),
        })
        .eq('provider', 'shopify')
    }

    logStats(cursor.stats)

    if (cursor.logId) {
      await supabaseAdmin
        .from('crm_sync_logs')
        .update({
          completed_at: complete ? new Date().toISOString() : null,
          status: complete ? 'completed' : 'running',
          records_processed:
            cursor.stats.txnProcessed +
            cursor.stats.historicalEventsProcessed +
            cursor.stats.shopsProcessed,
          records_created: cursor.stats.customersCreated,
          records_updated: cursor.stats.customersUpdated,
          records_skipped: cursor.stats.skippedMissingIds,
          errors: cursor.stats.apiErrors + errorDetails.length,
          error_details: errorDetails.slice(0, 50),
          metadata: {
            mode,
            sync_from: cursor.syncFrom,
            sync_to: cursor.syncTo,
            complete,
            phase: cursor.phase,
            percent: computeProgress(cursor, complete).percent,
            progress_label: computeProgress(cursor, complete).label,
            ...cursor.stats,
            status_changes:
              cursor.stats.movedToInTrial +
              cursor.stats.movedToActive +
              cursor.stats.movedToCanceled,
          },
        })
        .eq('id', cursor.logId)
    }

    return {
      success: true,
      complete,
      continue: !complete,
      mode,
      processed:
        cursor.stats.txnProcessed +
        cursor.stats.historicalEventsProcessed +
        cursor.stats.shopsProcessed,
      created: cursor.stats.customersCreated,
      updated: cursor.stats.customersUpdated,
      errors: cursor.stats.apiErrors + errorDetails.length,
      stats: cursor.stats,
      progress: computeProgress(cursor, complete),
      syncFrom: cursor.syncFrom,
      syncTo: cursor.syncTo,
      durationMs: Date.now() - started,
    }
  } catch (e) {
    const message = e instanceof Error ? `${e.message}\n${e.stack}` : String(e)
    console.error('[Shopify Sync] Fatal error:', message)

    await supabaseAdmin
      .from('crm_sync_state')
      .update({
        status: 'idle',
        sync_cursor: null,
        error_message: message.substring(0, 500),
        last_sync_at: new Date().toISOString(),
      })
      .eq('provider', 'shopify')

    if (cursor.logId) {
      await supabaseAdmin
        .from('crm_sync_logs')
        .update({
          completed_at: new Date().toISOString(),
          status: 'failed',
          errors: cursor.stats.apiErrors + errorDetails.length + 1,
          error_details: [...errorDetails, { message }].slice(0, 50),
          metadata: {
            mode,
            sync_from: cursor.syncFrom,
            sync_to: cursor.syncTo,
            complete: false,
            phase: cursor.phase,
            percent: computeProgress(cursor, complete).percent,
            progress_label: computeProgress(cursor, complete).label,
            ...cursor.stats,
          },
        })
        .eq('id', cursor.logId)
    }

    return {
      success: false,
      complete: true,
      continue: false,
      mode,
      processed:
        cursor.stats.txnProcessed +
        cursor.stats.historicalEventsProcessed +
        cursor.stats.shopsProcessed,
      created: cursor.stats.customersCreated,
      updated: cursor.stats.customersUpdated,
      errors: cursor.stats.apiErrors + errorDetails.length + 1,
      stats: cursor.stats,
      progress: computeProgress(cursor, false),
      syncFrom: cursor.syncFrom,
      syncTo: cursor.syncTo,
      durationMs: Date.now() - started,
      error: message.substring(0, 1000),
    }
  }
}

function parseResumeCursor(raw: string | null | undefined, mode: ShopifySyncMode): ShopifySyncCursor | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as ShopifySyncCursor
    if (parsed?.v === 2 && parsed.mode === mode && parsed.phase && parsed.syncFrom && parsed.syncTo) {
      parsed.affectedShops = parsed.affectedShops ?? []
      parsed.stats = parsed.stats ?? emptyStats()
      parsed.eventWindowCount = parsed.eventWindowCount || eventWindows(parsed.syncFrom, parsed.syncTo).length
      parsed.txnPages = parsed.txnPages ?? 0
      parsed.lifecycleTotal = parsed.lifecycleTotal ?? null
      return parsed
    }
  } catch {
    /* stale v1 cursor from the previous all-history job — start a clean run */
  }
  return null
}

function createCursor(
  mode: ShopifySyncMode,
  lastSuccessfulAt: string | null,
  nowIso: string
): ShopifySyncCursor {
  const syncTo = nowIso
  const syncFrom =
    mode === 'initial'
      ? new Date(Date.now() - MAX_LOOKBACK_DAYS * DAY_MS).toISOString()
      : new Date(new Date(lastSuccessfulAt as string).getTime() - OVERLAP_MS).toISOString()

  return {
    v: 2,
    mode,
    phase: 'events',
    syncFrom,
    syncTo,
    windowIndex: 0,
    eventAfter: null,
    shopOffset: 0,
    txnCursor: null,
    logId: null,
    affectedShops: [],
    stats: emptyStats(),
    eventWindowCount: eventWindows(syncFrom, syncTo).length,
    txnPages: 0,
    lifecycleTotal: null,
  }
}

function logStats(stats: ShopifySyncStats) {
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
  const windows = eventWindows(cursor.syncFrom, cursor.syncTo)

  while (Date.now() - started < SHOPIFY_SYNC_TIME_BUDGET_MS) {
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
      addAffectedShop(cursor, shop)
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
  const createdAtMin = cursor.mode === 'delta' ? cursor.syncFrom : undefined
  const createdAtMax = cursor.mode === 'delta' ? cursor.syncTo : undefined

  while (Date.now() - started < SHOPIFY_SYNC_TIME_BUDGET_MS) {
    if (cursor.txnCursor) await partnerRateLimitPause()

    let page
    try {
      page = await getAppTransactions(cursor.txnCursor, createdAtMin, createdAtMax)
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
      const shop = { shopId: shopId ?? '', domain, name: tx.shop?.name ?? null }
      addAffectedShop(cursor, shop)
      try {
        const result = await findOrCreateShopifyCustomer(index, shop, null)
        if (result.created) cursor.stats.customersCreated++
        const attachId = result.skippedStripe ? null : result.customer?.id ?? null
        if (result.skippedStripe) {
          console.log(
            `[Shopify Sync] Preserving Stripe billing authority; not attaching Shopify revenue for ${shop.domain ?? shop.shopId}`
          )
        }
        rows.push(toTxnRow(tx, attachId))
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
    cursor.txnPages = (cursor.txnPages ?? 0) + 1
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
  const shops =
    cursor.mode === 'delta' ? cursor.affectedShops : await loadShopsToProcess(index)
  cursor.lifecycleTotal = shops.length
  const paid = await loadConfirmedShopifyPaymentShopIds()

  while (cursor.shopOffset < shops.length && Date.now() - started < SHOPIFY_SYNC_TIME_BUDGET_MS) {
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
        const hasPayment = shopHasConfirmedPayment(paid, {
          shopId: shop.shopId,
          domain: shop.domain,
          customerId: result.customer.id,
        })

        const update = shopifyCustomerUpdateFromLifecycle({
          customer: result.customer,
          shop,
          derived,
          hasConfirmedPayment: hasPayment,
        })
        const { error } = await supabaseAdmin
          .from('crm_customers')
          .update(update.record)
          .eq('id', result.customer.id)
        if (error) {
          errorDetails.push({ message: `Customer update: ${error.message}`, record: shop.shopId })
        } else {
          if (!update.stripePreserved) {
            cursor.stats.customersUpdated++
            tallyStatusMove(cursor.stats, result.customer.client_status, update.nextStatus)
            index.add({ ...result.customer, ...update.record } as typeof result.customer)
          }

          if (shop.shopId && !update.stripePreserved) {
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
          } else if (shop.shopId && update.stripePreserved) {
            await supabaseAdmin
              .from('crm_shopify_subscription_events')
              .update({ crm_customer_id: result.customer.id })
              .eq('shopify_shop_id', shop.shopId)
              .is('crm_customer_id', null)
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

function uniqueCustomerIds(index: ShopifyCustomerIndex, shops: ShopifyShopRef[]): string[] {
  const ids = new Set<string>()
  for (const shop of shops) {
    const customer = index.find(shop.shopId, null, shop.domain)
    if (customer?.id) ids.add(customer.id)
  }
  return [...ids]
}

function tallyStatusMove(stats: ShopifySyncStats, previous: string | null, next: string | null) {
  if (!next || previous === next) return
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
  const raw = parseFloat(tx.grossAmount?.amount ?? tx.netAmount?.amount ?? '0')
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
  const signed = txType === 'app_sale_credit' ? -Math.abs(raw) : raw
  return {
    provider: 'shopify',
    provider_transaction_id: tx.id,
    crm_customer_id: customerId,
    amount: Math.abs(signed),
    currency: tx.grossAmount?.currencyCode ?? tx.netAmount?.currencyCode ?? 'USD',
    transaction_date: tx.createdAt,
    status: signed < 0 ? 'adjusted' : 'succeeded',
    transaction_type: txType,
    shopify_charge_id: tx.chargeId ?? null,
    shopify_shop_id: shopGidNumeric(tx.shop?.id),
    shopify_shop_domain: tx.shop?.myshopifyDomain ?? null,
    shopify_gross_amount: Number.isFinite(raw) ? raw : null,
    shopify_net_amount: tx.netAmount ? parseFloat(tx.netAmount.amount) : null,
    shopify_fee: tx.shopifyFee ? parseFloat(tx.shopifyFee.amount) : null,
    description: `Shopify ${tx.__typename} for ${tx.shop?.name ?? tx.shop?.myshopifyDomain ?? 'unknown shop'}`,
  }
}

async function recalcShopifyRevenue(
  errorDetails: Array<{ message: string }>,
  customerIds?: string[]
) {
  if (customerIds && customerIds.length === 0) return

  const PAGE = 1000
  const shopifyByCustomer = new Map<string, number>()
  let from = 0
  for (;;) {
    let query = supabaseAdmin
      .from('crm_revenue_transactions')
      .select('crm_customer_id, amount, transaction_type, status, shopify_gross_amount')
      .eq('provider', 'shopify')
      .in('status', ['succeeded', 'adjusted'])
      .not('crm_customer_id', 'is', null)
      .range(from, from + PAGE - 1)

    if (customerIds) {
      query = query.in('crm_customer_id', customerIds)
    }

    const { data, error } = await query
    if (error) {
      errorDetails.push({ message: `Revenue load: ${error.message}` })
      break
    }
    for (const t of data ?? []) {
      if (!t.crm_customer_id) continue
      let delta = Number(t.amount) || 0
      if (t.transaction_type === 'app_sale_credit') {
        delta = -Math.abs(delta)
      } else if (t.transaction_type === 'app_sale_adjustment') {
        const gross = t.shopify_gross_amount == null ? null : Number(t.shopify_gross_amount)
        delta = gross != null && Number.isFinite(gross) ? gross : t.status === 'adjusted' ? -Math.abs(delta) : delta
      }
      shopifyByCustomer.set(t.crm_customer_id, (shopifyByCustomer.get(t.crm_customer_id) ?? 0) + delta)
    }
    if (!data || data.length < PAGE) break
    from += PAGE
  }

  const ids = customerIds ?? [...shopifyByCustomer.keys()]
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50)
    await Promise.all(
      batch.map((id) =>
        supabaseAdmin
          .from('crm_customers')
          .update({
            calculated_total_revenue: shopifyByCustomer.get(id) ?? 0,
          })
          .eq('id', id)
          .eq('billing_channel', 'shopify')
      )
    )
  }
}
