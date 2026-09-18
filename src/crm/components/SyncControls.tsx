import { useState } from 'react'
import { RefreshCw, CheckCircle, AlertCircle, Clock, Loader2, ChevronDown } from 'lucide-react'
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
    year: 'numeric',
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
  const [menuOpen, setMenuOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [showError, setShowError] = useState(false)
  const getState = (p: SyncProvider) => states.find((s) => s.provider === p)
  const shopifyState = getState('shopify')
  const stripeState = getState('stripe')
  const boardroomState = getState('boardroom')
  const meta = (lastShopifyLog?.metadata ?? {}) as Record<string, unknown>
  const shopifyBusy = syncing === 'shopify' || syncing === 'shopify_initial' || syncing === 'shopify_delta'
  const failed = lastShopifyLog?.status === 'failed' || !!shopifyState?.error_message
  const errorText = shopifyState?.error_message || lastShopifyLog?.error_details?.[0]?.message || ''

  return (
    <div className="flex flex-wrap items-center gap-3 min-w-0">
      <button
        onClick={() => onShopifySync('delta')}
        disabled={!!syncing}
        title="Incremental Shopify sync since the last successful checkpoint. Normal daily operation."
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {syncing === 'shopify_delta' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        Sync Changes
      </button>

      <div className="relative">
        <button
          type="button"
          disabled={!!syncing}
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:border-primary hover:text-primary disabled:opacity-50 bg-white"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          Sync
          <ChevronDown size={14} />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
            <div role="menu" className="absolute left-0 top-full mt-1 z-40 w-64 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
              <p className="px-3 pt-2 pb-1 text-[11px] uppercase tracking-wider text-gray-400">Shopify</p>
              <button
                role="menuitem"
                className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => {
                  setMenuOpen(false)
                  onShopifySync('initial')
                }}
              >
                Initial Sync
                <span className="block text-[11px] text-gray-400">Full historical import</span>
              </button>
              <p className="px-3 pt-2 pb-1 text-[11px] uppercase tracking-wider text-gray-400">Stripe</p>
              <button
                role="menuitem"
                className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => {
                  setMenuOpen(false)
                  onSync('stripe')
                }}
              >
                Full Stripe sync
              </button>
              <p className="px-3 pt-2 pb-1 text-[11px] uppercase tracking-wider text-gray-400">Boardroom</p>
              <button
                role="menuitem"
                className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => {
                  setMenuOpen(false)
                  onSync('boardroom')
                }}
              >
                Sync Boardroom
              </button>
              <div className="border-t border-gray-100 mt-1 pt-1">
                <button
                  role="menuitem"
                  className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => {
                    setMenuOpen(false)
                    onSync('all')
                  }}
                >
                  Sync All
                  <span className="block text-[11px] text-gray-400">Boardroom, Stripe, then Shopify changes</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {shopifyBusy && shopifyProgress ? (
        <div className="text-[11px] leading-4 text-gray-500 min-w-[180px] max-w-[280px]">
          <div className="text-gray-700 font-medium flex items-center gap-1">
            <StatusIcon status="running" />
            {shopifyProgress.percent}% · {shopifyProgress.label}
          </div>
          <div className="mt-1 h-1.5 w-full max-w-[240px] bg-gray-200 rounded overflow-hidden">
            <div
              className="h-full bg-primary transition-[width] duration-300"
              style={{ width: `${Math.min(100, Math.max(0, shopifyProgress.percent))}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="relative">
          <button
            type="button"
            onClick={() => setDetailsOpen((v) => !v)}
            className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-md hover:bg-gray-50 ${
              failed ? 'text-red-600' : 'text-gray-500'
            }`}
            title="Batch sync status. Stripe also updates live via webhooks."
          >
            <StatusIcon status={failed ? 'failed' : lastShopifyLog?.status ?? shopifyState?.status ?? 'idle'} />
            Shopify · {lastSyncLabel(shopifyState?.status, lastShopifyLog?.status)}
            <ChevronDown size={12} className={detailsOpen ? 'rotate-180' : ''} />
          </button>
          {detailsOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setDetailsOpen(false)} />
              <div className="absolute left-0 top-full mt-1 z-40 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-[11px] leading-4 text-gray-600">
                <p className="text-gray-500 mb-2">
                  These timestamps are the last <span className="font-medium text-gray-700">batch syncs</span>. Stripe
                  also updates live via webhooks between full syncs.
                </p>
                <div className="space-y-1">
                  <div>
                    <span className="font-medium text-gray-700">Shopify</span>
                    {' · '}
                    {lastSyncLabel(shopifyState?.status, lastShopifyLog?.status)}
                    {' · '}
                    {formatDate(lastShopifyLog?.completed_at ?? lastShopifyLog?.started_at ?? shopifyState?.last_sync_at)}
                  </div>
                  <div>Last successful checkpoint: {formatDate(shopifyState?.last_successful_at)}</div>
                  <div className="text-gray-400">
                    {Number(lastShopifyLog?.records_processed ?? 0)} processed ·{' '}
                    {Number(lastShopifyLog?.records_updated ?? 0)} customers · {Number(meta.txnProcessed ?? 0)}{' '}
                    transactions
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Stripe</span>
                    {' · batch '}
                    {formatDate(stripeState?.last_successful_at)}
                    <span className="text-gray-400"> · live webhooks</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Boardroom</span>
                    {' · '}
                    {formatDate(boardroomState?.last_successful_at)}
                  </div>
                </div>
                {failed && errorText && (
                  <button type="button" className="text-red-600 hover:underline mt-2" onClick={() => setShowError((v) => !v)}>
                    {showError ? 'Hide error' : 'View error'}
                  </button>
                )}
                {showError && errorText && (
                  <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap text-[10px] text-red-700 bg-red-50 rounded p-1">
                    {errorText.replace(/sk_live_[A-Za-z0-9]+/g, '[redacted]')}
                  </pre>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
