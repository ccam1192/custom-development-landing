import { createClient } from '@supabase/supabase-js'
import { recastCrmClientStatuses, formatRecastSummary } from '../api/_lib/crm-status-recast.ts'

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const summary = await recastCrmClientStatuses(supabase)
console.log(formatRecastSummary(summary))
console.log('Samples:')
for (const s of summary.samples) {
  console.log(`  ${s.from} → ${s.to}  ${s.email ?? s.id}  ${s.domain ?? ''}`)
}
