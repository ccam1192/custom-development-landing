import { RefreshCw, CheckCircle, AlertCircle, Clock, Loader2 } from 'lucide-react'
import type { CrmSyncState, SyncProvider } from '../types'

interface SyncControlsProps {
  states: CrmSyncState[]
  syncing: SyncProvider | 'all' | null
  onSync: (provider: SyncProvider | 'all') => void
}

function formatDate(d: string | null): string {
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

const PROVIDERS: { key: SyncProvider; label: string }[] = [
  { key: 'boardroom', label: 'Boardroom' },
  { key: 'stripe', label: 'Stripe' },
  { key: 'shopify', label: 'Shopify' },
]

export default function SyncControls({ states, syncing, onSync }: SyncControlsProps) {
  const getState = (p: SyncProvider) => states.find((s) => s.provider === p)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PROVIDERS.map(({ key, label }) => {
        const state = getState(key)
        const isRunning = syncing === key || syncing === 'all'
        return (
          <button
            key={key}
            onClick={() => onSync(key)}
            disabled={!!syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:border-primary hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white"
          >
            {isRunning ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
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
      <button
        onClick={() => onSync('all')}
        disabled={!!syncing}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {syncing === 'all' ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <RefreshCw size={14} />
        )}
        Sync All
      </button>
    </div>
  )
}
