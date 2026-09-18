import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../_lib/auth.js'
import { buildReconciliationReport, persistReconciliationIssues } from '../_lib/crm-reconcile.js'

/**
 * Data Health / reconciliation scan.
 * Read-only against CRM tables except writing crm_data_health_issues.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const user = await requireAuth(req, res)
  if (!user) return

  try {
    const report = await buildReconciliationReport()
    await persistReconciliationIssues(report.issues)
    return res.json({
      success: true,
      issues_found: report.issues.length,
      summary: report.summary,
      dry_run: report.dryRun,
      scenario_tests: report.scenarioTests,
    })
  } catch (e) {
    return res.status(500).json({
      error: e instanceof Error ? e.message : 'Health check failed',
    })
  }
}
