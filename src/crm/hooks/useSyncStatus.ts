import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { CrmSyncState, SyncProvider } from '../types'

export function useSyncStatus() {
  const [states, setStates] = useState<CrmSyncState[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<SyncProvider | 'all' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchStates = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('crm_sync_state')
      .select('*')
      .order('provider')

    if (err) {
      setError(err.message)
    } else {
      setStates((data ?? []) as CrmSyncState[])
    }
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

  const triggerSync = useCallback(
    async (provider: SyncProvider | 'all') => {
      if (syncing) return
      setSyncing(provider)
      setError(null)

      try {
        const endpoint = provider === 'all' ? '/api/crm/sync/all' : `/api/crm/sync/${provider}`
        const { data: { session } } = await supabase.auth.getSession()

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token ?? ''}`,
          },
        })

        const contentType = res.headers.get('content-type') ?? ''
        if (!res.ok) {
          if (contentType.includes('application/json')) {
            const body = await res.json().catch(() => ({ error: 'Sync failed' }))
            setError(`${provider} sync: ${body.error ?? `HTTP ${res.status}`}`)
          } else {
            const text = await res.text().catch(() => '')
            setError(`${provider} sync: HTTP ${res.status}${text ? ` — ${text.substring(0, 200)}` : ''}`)
          }
        } else {
          const body = await res.json().catch(() => null)
          if (body) {
            console.log(`[CRM] ${provider} sync result:`, body)
          }
        }

        await fetchStates()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Sync failed')
      } finally {
        setSyncing(null)
      }
    },
    [syncing, fetchStates]
  )

  return { states, getState, loading, syncing, error, triggerSync, refresh: fetchStates }
}
