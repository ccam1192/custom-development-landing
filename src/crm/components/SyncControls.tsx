import { RefreshCw, CheckCircle, AlertCircle, Clock, Loader2 } from 'lucide-react'
import type { CrmSyncLog, CrmSyncState, SyncProvider } from '../types'
import type { SyncingTarget } from '../hooks/useSyncStatus'

interface SyncControlsProps {
  states: CrmSyncState[]
  syncing: SyncingTarget
  lastShopifyLog: CrmSyncLog | null
  shopifyProgress: { percent: number; label: string } | null
  onSync: (provider: SyncProvider | 'all') => void
  onShopifySync: (mode: 'initial' | 'delta') => void
}

function formatDate(d: string | null | undefined): string {
  if (!d) return 'Never'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(d))
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'running':
      return <Loader2 size={14} className="text-blue-500 animate-spin" />
    case 'completed':
      return <CheckCircle size={14} className="text-green-500" />
    case 'failed':
      return <AlertCircle size={14} className="text-red-500" />
    default:
      return <Clock size={14} className="text-gray-400" />
  }
}

function lastSyncLabel(status: string | undefined, logStatus: string | null | undefined): string {
  if (status === 'running' || logStatus === 'running') return 'Running'
  if (logStatus === 'failed') return 'Failed'
  if (logStatus === 'completed') return 'Completed'
  if (status === 'idle') return 'Idle'
  return status ? status : '—'
}

export default function SyncControls({
  states,
  syncing,
  lastShopifyLog,
  shopifyProgress,
  onSync,
  onShopifySync,
}: SyncControlsProps) {
  const getState = (p: SyncProvider) => states.find((s) => s.provider === p)
  const shopifyState = getState('shopify')
  const meta = (lastShopifyLog?.metadata ?? {}) as Record<string, unknown>
  const shopifyBusy = syncing === 'shopify' || syncing === 'shopify_initial' || syncing === 'shopify_delta'
  const statusChanges =
    Number(meta.status_changes ?? 0) ||
    Number(meta.movedToInTrial ?? 0) + Number(meta.movedToActive ?? 0) + Number(meta.movedToCanceled ?? 0)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {(['boardroom', 'stripe'] as SyncProvider[]).map((key) => {
        const label = key === 'boardroom' ? 'Boardroom' : 'Stripe'
        const state = getState(key)
        const isRunning = syncing === key || syncing === 'all'
        return (
          <button
            key={key}
            onClick={() => onSync(key)}
            disabled={!!syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:border-primary hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white"
          >
            {isRunning ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Sync {label}
            {state && (
              <span className="flex items-center gap-1 ml-1 text-xs text-gray-400">
                <StatusIcon status={state.status} />
                {formatDate(state.last_successful_at)}
              </span>
            )}
          </button>
        )
      })}

      <div className="flex flex-wrap items-center gap-2 pl-2 ml-1 border-l border-gray-200">
        <button
          onClick={() => onShopifySync('delta')}
          disabled={!!syncing}
          title="Incremental Shopify sync since the last successful checkpoint"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {syncing === 'shopify_delta' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RefreshCw size={14} />
          )}
          Sync Changes
        </button>
        <button
          onClick={() => onShopifySync('initial')}
          disabled={!!syncing}
          title="Full historical Shopify import. Use for first setup or a full reconciliation. This can take a while."
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:border-primary hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white"
        >
          {syncing === 'shopify_initial' ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Initial Sync {shopifyProgress ? `${shopifyProgress.percent}%` : ''}
            </>
          ) : (
            <>
              <RefreshCw size={14} />
              Initial Sync
            </>
          )}
        </button>
        <div className="text-[11px] leading-4 text-gray-500 min-w-[220px]">
          {shopifyBusy && shopifyProgress ? (
            <>
              <div className="text-gray-700 font-medium">
                {shopifyProgress.percent}% · {shopifyProgress.label}
              </div>
              <div className="mt-1 h-1.5 w-full max-w-[240px] bg-gray-200 rounded overflow-hidden">
                <div
                  className="h-full bg-primary transition-[width] duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, shopifyProgress.percent))}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                Last successful sync:{' '}
                <span className="text-gray-700">{formatDate(shopifyState?.last_successful_at)}</span>
              </div>
              <div>
                Last sync: {lastSyncLabel(shopifyBusy ? 'running' : shopifyState?.status, lastShopifyLog?.status)}
              </div>
              <div>
                New customers: {Number(lastShopifyLog?.records_created ?? 0)} · Updated:{' '}
                {Number(lastShopifyLog?.records_updated ?? 0)}
              </div>
              <div>
                Transactions: {Number(meta.txnProcessed ?? 0)} · Status changes: {statusChanges}
              </div>
            </>
          )}
        </div>
      </div>

      <button
        onClick={() => onSync('all')}
        disabled={!!syncing}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:border-primary hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white"
      >
        {syncing === 'all' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        Sync All
      </button>
    </div>
  )
}
