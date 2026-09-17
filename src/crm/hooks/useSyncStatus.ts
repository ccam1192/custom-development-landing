import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { CrmSyncLog, CrmSyncState, SyncProvider } from '../types'

export type SyncingTarget = SyncProvider | 'all' | 'shopify_initial' | 'shopify_delta' | null

export function useSyncStatus(onSyncComplete?: () => void) {
  const [states, setStates] = useState<CrmSyncState[]>([])
  const [lastShopifyLog, setLastShopifyLog] = useState<CrmSyncLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<SyncingTarget>(null)
  const [shopifyProgress, setShopifyProgress] = useState<{ percent: number; label: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchStates = useCallback(async () => {
    const [{ data, error: err }, { data: shopifyLogs }] = await Promise.all([
      supabase.from('crm_sync_state').select('*').order('provider'),
      supabase
        .from('crm_sync_logs')
        .select('*')
        .eq('provider', 'shopify')
        .order('started_at', { ascending: false })
        .limit(1),
    ])

    if (err) {
      setError(err.message)
    } else {
      setStates((data ?? []) as CrmSyncState[])
    }
    setLastShopifyLog(((shopifyLogs ?? [])[0] as CrmSyncLog | undefined) ?? null)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchStates()
  }, [fetchStates])

  const getState = useCallback(
    (provider: SyncProvider): CrmSyncState | undefined =>
      states.find((s) => s.provider === provider),
    [states]
  )

  const postSync = useCallback(async (
    endpoint: string,
    label: string,
    body?: Record<string, unknown>,
    loopShopify = false
  ) => {
    const { data: { session } } = await supabase.auth.getSession()
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token ?? ''}`,
    }

    let keepGoing = true
    let rounds = 0
    while (keepGoing) {
      rounds++
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: body ? JSON.stringify(body) : undefined,
      })
      const contentType = res.headers.get('content-type') ?? ''

      if (!res.ok) {
        if (contentType.includes('application/json')) {
          const payload = await res.json().catch(() => ({ error: 'Sync failed' }))
          setError(`${label}: ${payload.error ?? `HTTP ${res.status}`}`)
        } else {
          const text = await res.text().catch(() => '')
          setError(`${label}: HTTP ${res.status}${text ? ` — ${text.substring(0, 200)}` : ''}`)
        }
        break
      }

      const payload = await res.json().catch(() => null)
      if (payload) {
        console.log(`[CRM] ${label} result (round ${rounds}):`, payload)
        if (payload.progress?.percent != null) {
          setShopifyProgress({
            percent: Number(payload.progress.percent),
            label: String(payload.progress.label ?? ''),
          })
        }
      }

      keepGoing = loopShopify && payload?.continue === true && rounds < 80
    }
  }, [])

  const triggerSync = useCallback(
    async (provider: SyncProvider | 'all') => {
      if (syncing) return
      setSyncing(provider)
      setError(null)

      try {
        const endpoint = provider === 'all' ? '/api/crm/sync/all' : `/api/crm/sync/${provider}`
        const loopShopify = provider === 'shopify'
        await postSync(
          endpoint,
          `${provider} sync`,
          provider === 'shopify' ? { mode: 'delta' } : undefined,
          loopShopify
        )
        await fetchStates()
        onSyncComplete?.()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Sync failed')
      } finally {
        setSyncing(null)
      }
    },
    [syncing, fetchStates, onSyncComplete, postSync]
  )

  const triggerShopifySync = useCallback(
    async (mode: 'initial' | 'delta') => {
      if (syncing) return
      setSyncing(mode === 'initial' ? 'shopify_initial' : 'shopify_delta')
      setError(null)
      setShopifyProgress({ percent: 1, label: 'Starting' })

      try {
        await postSync(
          '/api/crm/sync/shopify',
          mode === 'initial' ? 'Shopify Initial Sync' : 'Shopify Sync Changes',
          { mode },
          true
        )
        await fetchStates()
        onSyncComplete?.()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Sync failed')
      } finally {
        setSyncing(null)
      }
    },
    [syncing, fetchStates, onSyncComplete, postSync]
  )

  return {
    states,
    getState,
    loading,
    syncing,
    error,
    triggerSync,
    triggerShopifySync,
    lastShopifyLog,
    shopifyProgress,
    refresh: fetchStates,
  }
}
