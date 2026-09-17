import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, CheckCircle, Info, RefreshCw, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { CrmDataHealthIssue } from '../types'

export default function DataHealthPanel() {
  const [issues, setIssues] = useState<CrmDataHealthIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)

  const fetchIssues = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('crm_data_health_issues')
      .select('*')
      .eq('resolved', false)
      .order('severity')
      .order('created_at', { ascending: false })
      .limit(100)

    setIssues((data ?? []) as CrmDataHealthIssue[])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchIssues()
  }, [fetchIssues])

  async function runHealthCheck() {
    setRunning(true)
    const { data: session } = await supabase.auth.getSession()
    try {
      await fetch('/api/crm/data-health', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.session?.access_token ?? ''}`,
        },
      })
      await fetchIssues()
    } catch {
      // handled by fetchIssues
    }
    setRunning(false)
  }

  async function resolveIssue(id: string) {
    await supabase
      .from('crm_data_health_issues')
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', id)
    fetchIssues()
  }

  const severityIcon = (s: string) => {
    switch (s) {
      case 'error': return <AlertTriangle size={14} className="text-red-500" />
      case 'warning': return <AlertTriangle size={14} className="text-amber-500" />
      default: return <Info size={14} className="text-blue-500" />
    }
  }

  const severityBg = (s: string) => {
    switch (s) {
      case 'error': return 'border-red-200 bg-red-50/50'
      case 'warning': return 'border-amber-200 bg-amber-50/50'
      default: return 'border-blue-200 bg-blue-50/50'
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Data Health</h3>
        <button
          onClick={runHealthCheck}
          disabled={running}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary-dark disabled:opacity-50"
        >
          {running ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          Run Check
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-gray-400">Loading…</p>
      ) : issues.length === 0 ? (
        <div className="flex items-center gap-2 text-green-600 text-sm">
          <CheckCircle size={16} />
          No data quality issues found
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {issues.map((issue) => (
            <div
              key={issue.id}
              className={`border rounded-lg p-3 ${severityBg(issue.severity)}`}
            >
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 mt-0.5">{severityIcon(issue.severity)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">{issue.description}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{issue.issue_type}</p>
                </div>
                <button
                  onClick={() => resolveIssue(issue.id)}
                  className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
