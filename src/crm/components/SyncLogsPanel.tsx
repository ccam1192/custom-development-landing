import { useState, useEffect, useCallback } from 'react'
import { CheckCircle, XCircle, Loader2, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { CrmSyncLog } from '../types'

export default function SyncLogsPanel() {
  const [logs, setLogs] = useState<CrmSyncLog[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('crm_sync_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(50)

    setLogs((data ?? []) as CrmSyncLog[])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  function formatDate(d: string): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(d))
  }

  function duration(start: string, end: string | null): string {
    if (!end) return 'running…'
    const ms = new Date(end).getTime() - new Date(start).getTime()
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const statusIcon = (s: string) => {
    switch (s) {
      case 'completed': return <CheckCircle size={14} className="text-green-500" />
      case 'failed': return <XCircle size={14} className="text-red-500" />
      case 'running': return <Loader2 size={14} className="text-blue-500 animate-spin" />
      default: return <Clock size={14} className="text-gray-400" />
    }
  }

  if (loading) return <p className="text-xs text-gray-400">Loading sync logs…</p>

  if (logs.length === 0) return <p className="text-sm text-gray-400">No sync activity yet</p>

  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto">
      {logs.map((log) => (
        <div key={log.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50/50">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              {statusIcon(log.status)}
              <span className="text-sm font-medium text-gray-800 capitalize">{log.provider}</span>
              <span className="text-xs text-gray-400">{log.sync_type}</span>
            </div>
            <span className="text-xs text-gray-400">{formatDate(log.started_at)}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>{log.records_processed} processed</span>
            <span className="text-green-600">{log.records_created} created</span>
            <span className="text-blue-600">{log.records_updated} updated</span>
            {log.records_skipped > 0 && <span>{log.records_skipped} skipped</span>}
            {log.errors > 0 && <span className="text-red-600">{log.errors} errors</span>}
            <span className="ml-auto">{duration(log.started_at, log.completed_at)}</span>
          </div>
          {log.error_details && Array.isArray(log.error_details) && log.error_details.length > 0 && (
            <div className="mt-2 text-xs text-red-600 bg-red-50 rounded p-2 max-h-20 overflow-y-auto">
              {log.error_details.slice(0, 5).map((e, i) => (
                <p key={i}>{typeof e === 'object' && e !== null && 'message' in e ? (e as { message: string }).message : String(e)}</p>
              ))}
              {log.error_details.length > 5 && (
                <p className="text-red-400">…and {log.error_details.length - 5} more</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
