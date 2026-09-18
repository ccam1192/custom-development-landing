import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, CheckCircle, Info, RefreshCw, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { CrmDataHealthIssue } from '../types'

export default function DataHealthPanel() {
  const [issues, setIssues] = useState<CrmDataHealthIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [dismissingAll, setDismissingAll] = useState(false)
  const [dryRun, setDryRun] = useState<string | null>(null)
  const [summary, setSummary] = useState<Record<string, number> | null>(null)

  const fetchIssues = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    const { data } = await supabase
      .from('crm_data_health_issues')
      .select('*')
      .eq('resolved', false)
      .order('severity')
      .order('created_at', { ascending: false })
      .limit(100)

    setIssues((data ?? []) as CrmDataHealthIssue[])
    if (!silent) setLoading(false)
  }, [])

  useEffect(() => {
    fetchIssues()
  }, [fetchIssues])

  async function runHealthCheck() {
    setRunning(true)
    const { data: session } = await supabase.auth.getSession()
    try {
      const res = await fetch('/api/crm/data-health', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.session?.access_token ?? ''}`,
        },
      })
      const json = await res.json().catch(() => null)
      if (json?.dry_run) setDryRun(json.dry_run)
      if (json?.summary) setSummary(json.summary)
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
    fetchIssues(true)
  }

  async function dismissAll() {
    if (issues.length === 0 || dismissingAll) return
    setDismissingAll(true)
    try {
      await supabase
        .from('crm_data_health_issues')
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq('resolved', false)
      await fetchIssues(true)
    } finally {
      setDismissingAll(false)
    }
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
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={dismissAll}
          disabled={issues.length === 0 || dismissingAll || loading}
          className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {dismissingAll ? 'Dismissing…' : 'Dismiss All'}
        </button>
        <button
          onClick={runHealthCheck}
          disabled={running}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary-dark disabled:opacity-50"
        >
          {running ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          Run Check
        </button>
      </div>

      {dryRun && (
        <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 whitespace-pre-wrap text-gray-700">
          {dryRun}
        </pre>
      )}

      {summary && summary.scenario_tests_failed > 0 && (
        <p className="text-xs text-red-600">
          {summary.scenario_tests_failed} built-in status scenario(s) failed
        </p>
      )}

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
