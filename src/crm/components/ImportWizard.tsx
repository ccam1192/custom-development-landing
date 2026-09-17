import { useState, useCallback } from 'react'
import { Upload, FileSpreadsheet, ArrowRight, ArrowLeft, Check, AlertTriangle, Loader2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { ClientStatus, BillingChannel, UserType, Source } from '../types'
import * as XLSX from 'xlsx'

interface ImportWizardProps {
  onClose: () => void
  onComplete: () => void
}

interface ParsedRow {
  [key: string]: string
}

interface ColumnMapping {
  name: string
  email: string
  store_url: string
  signup_date: string
  user_type: string
  billing_channel: string
  client_status: string
  cancellation_date: string
  mrr: string
  total_revenue: string
  source: string
  notes: string
  boardroom_user_id: string
  stripe_customer_id: string
  shopify_shop_id: string
}

const CRM_FIELDS: { key: keyof ColumnMapping; label: string; required?: boolean }[] = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'store_url', label: 'Store URL' },
  { key: 'signup_date', label: 'Signup Date' },
  { key: 'user_type', label: 'User Type' },
  { key: 'billing_channel', label: 'Billing Channel' },
  { key: 'client_status', label: 'Client Status / Status' },
  { key: 'cancellation_date', label: 'Cancel Date' },
  { key: 'mrr', label: 'Monthly Rate / MRR' },
  { key: 'total_revenue', label: 'Total Revenue' },
  { key: 'source', label: 'Source' },
  { key: 'notes', label: 'Notes' },
  { key: 'boardroom_user_id', label: 'Boardroom User ID' },
  { key: 'stripe_customer_id', label: 'Stripe Customer ID' },
  { key: 'shopify_shop_id', label: 'Shopify Shop ID' },
]

const EMPTY_MAPPING: ColumnMapping = {
  name: '', email: '', store_url: '', signup_date: '', user_type: '',
  billing_channel: '', client_status: '', cancellation_date: '', mrr: '',
  total_revenue: '', source: '', notes: '', boardroom_user_id: '',
  stripe_customer_id: '', shopify_shop_id: '',
}

function autoMapColumns(headers: string[]): ColumnMapping {
  const mapping = { ...EMPTY_MAPPING }
  const lower = headers.map((h) => h.toLowerCase().trim())

  const patterns: [keyof ColumnMapping, RegExp][] = [
    ['name', /^name$/i],
    ['email', /email/i],
    ['store_url', /store.*url|shop.*url|url|domain|store/i],
    ['signup_date', /signup|sign.?up|created|joined/i],
    ['user_type', /user.?type|type/i],
    ['billing_channel', /billing|channel/i],
    ['client_status', /status|state/i],
    ['cancellation_date', /cancel.*date|cancel/i],
    ['mrr', /monthly.*rate|mrr|monthly/i],
    ['total_revenue', /total.*rev|revenue|total/i],
    ['source', /source/i],
    ['notes', /notes?|comment/i],
    ['boardroom_user_id', /boardroom.*id|user.*id/i],
    ['stripe_customer_id', /stripe.*id|stripe.*cust/i],
    ['shopify_shop_id', /shopify.*id|shop.*id/i],
  ]

  for (const [field, pattern] of patterns) {
    const idx = lower.findIndex((h) => pattern.test(h))
    if (idx !== -1 && !mapping[field]) {
      mapping[field] = headers[idx]
    }
  }

  return mapping
}

function parseStatus(val: string): ClientStatus {
  const v = val?.toLowerCase().trim() ?? ''
  if (v.includes('active') && !v.includes('cancel')) return 'active_customer'
  if (v.includes('trial')) return 'in_trial'
  if (v.includes('cancel')) return 'canceled'
  if (v.includes('agency') && v.includes('client')) return 'agency_client'
  if (v.includes('prospect') || v === '') return 'prospect'
  return 'prospect'
}

function parseSource(val: string): Source | null {
  const v = val?.toLowerCase().trim() ?? ''
  if (v.includes('stripe')) return 'stripe'
  if (v.includes('shopify')) return 'shopify'
  if (v.includes('agency')) return 'agency'
  if (v.includes('appsumo')) return 'appsumo'
  if (v.includes('custom')) return 'custom'
  if (v) return 'other'
  return null
}

function parseBillingChannel(val: string): BillingChannel {
  const v = val?.toLowerCase().trim() ?? ''
  if (v.includes('stripe')) return 'stripe'
  if (v.includes('shopify')) return 'shopify'
  if (v.includes('other')) return 'other'
  return 'none'
}

function parseUserType(val: string): UserType {
  const v = val?.toLowerCase().trim() ?? ''
  if (v.includes('agency') && v.includes('client')) return 'agency_client'
  if (v.includes('agency')) return 'agency'
  return 'standard'
}

type Step = 'upload' | 'mapping' | 'preview' | 'importing' | 'complete'

export default function ImportWizard({ onClose, onComplete }: ImportWizardProps) {
  const [step, setStep] = useState<Step>('upload')
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [mapping, setMapping] = useState<ColumnMapping>(EMPTY_MAPPING)
  const [importResult, setImportResult] = useState<{
    imported: number; matched: number; created: number; skipped: number; errors: string[]
  } | null>(null)
  const [importProgress, setImportProgress] = useState(0)

  function handleFile(file: File) {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json<ParsedRow>(sheet, { defval: '' })
        if (json.length === 0) return

        const hdrs = Object.keys(json[0])
        setHeaders(hdrs)
        setRows(json)
        setMapping(autoMapColumns(hdrs))
        setStep('mapping')
      } catch {
        alert('Failed to parse file. Ensure it is a valid CSV or XLSX.')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [])

  async function runImport() {
    setStep('importing')
    const result = { imported: 0, matched: 0, created: 0, skipped: 0, errors: [] as string[] }

    const str = (v: unknown): string => (v == null ? '' : String(v).trim())

    // Phase 1: Pre-fetch ALL existing customers for fast matching
    setImportProgress(1)
    const { data: existingCustomers } = await supabase
      .from('crm_customers')
      .select('id, email, boardroom_user_id, stripe_customer_id, shopify_shop_id')

    const byEmail = new Map<string, string>()
    const byBoardroom = new Map<string, string>()
    const byStripe = new Map<string, string>()
    const byShopify = new Map<string, string>()

    for (const c of existingCustomers ?? []) {
      if (c.email) byEmail.set(c.email.toLowerCase(), c.id)
      if (c.boardroom_user_id) byBoardroom.set(c.boardroom_user_id, c.id)
      if (c.stripe_customer_id) byStripe.set(c.stripe_customer_id, c.id)
      if (c.shopify_shop_id) byShopify.set(c.shopify_shop_id, c.id)
    }

    setImportProgress(5)

    // Phase 2: Build all records, separate into creates vs updates
    const toCreate: Array<Record<string, unknown>> = []
    const toUpdate: Array<{ id: string; fields: Record<string, unknown> }> = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        const email = mapping.email ? str(row[mapping.email]) : ''
        const name = mapping.name ? str(row[mapping.name]) : ''
        const boardroomId = mapping.boardroom_user_id ? str(row[mapping.boardroom_user_id]) : ''
        const stripeId = mapping.stripe_customer_id ? str(row[mapping.stripe_customer_id]) : ''
        const shopifyId = mapping.shopify_shop_id ? str(row[mapping.shopify_shop_id]) : ''

        if (!email && !name && !boardroomId) {
          result.skipped++
          continue
        }

        // Fast in-memory lookup
        const existingId =
          (boardroomId && byBoardroom.get(boardroomId)) ||
          (stripeId && byStripe.get(stripeId)) ||
          (shopifyId && byShopify.get(shopifyId)) ||
          (email && byEmail.get(email.toLowerCase())) ||
          null

        const record: Record<string, unknown> = {}

        if (name) record.name = name
        if (email) record.email = email
        if (mapping.store_url && row[mapping.store_url]) record.store_url = str(row[mapping.store_url])
        if (mapping.signup_date && row[mapping.signup_date]) {
          const parsed = new Date(row[mapping.signup_date])
          if (!isNaN(parsed.getTime())) record.signup_date = parsed.toISOString()
        }
        if (mapping.user_type && row[mapping.user_type]) record.user_type = parseUserType(str(row[mapping.user_type]))
        if (mapping.billing_channel && row[mapping.billing_channel]) record.billing_channel = parseBillingChannel(str(row[mapping.billing_channel]))
        if (mapping.client_status && row[mapping.client_status]) record.client_status = parseStatus(str(row[mapping.client_status]))
        if (mapping.cancellation_date && row[mapping.cancellation_date]) {
          const parsed = new Date(row[mapping.cancellation_date])
          if (!isNaN(parsed.getTime())) record.cancellation_date = parsed.toISOString()
        }
        if (mapping.source && row[mapping.source]) record.source = parseSource(str(row[mapping.source]))
        if (mapping.notes && row[mapping.notes]) record.notes = str(row[mapping.notes])

        if (mapping.mrr && row[mapping.mrr] != null && row[mapping.mrr] !== '') {
          const raw = row[mapping.mrr]
          const val = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[$,]/g, ''))
          if (!isNaN(val) && val > 0) record.mrr_override = val
        }
        if (mapping.total_revenue && row[mapping.total_revenue] != null && row[mapping.total_revenue] !== '') {
          const raw = row[mapping.total_revenue]
          const val = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[$,]/g, ''))
          if (!isNaN(val) && val > 0) record.total_revenue_override = val
        }

        if (boardroomId) record.boardroom_user_id = boardroomId
        if (stripeId) record.stripe_customer_id = stripeId
        if (shopifyId) record.shopify_shop_id = shopifyId

        if (existingId) {
          const mergeFields: Record<string, unknown> = {}
          if (record.notes) mergeFields.notes = record.notes
          if (record.client_status) mergeFields.client_status = record.client_status
          if (record.cancellation_date) mergeFields.cancellation_date = record.cancellation_date
          if (record.source) mergeFields.source = record.source
          if (record.mrr_override) mergeFields.mrr_override = record.mrr_override
          if (record.total_revenue_override) mergeFields.total_revenue_override = record.total_revenue_override
          mergeFields.updated_by = 'spreadsheet_import'
          toUpdate.push({ id: existingId, fields: mergeFields })
          result.matched++
        } else {
          record.updated_by = 'spreadsheet_import'
          toCreate.push(record)
        }
        result.imported++
      } catch (e) {
        result.errors.push(`Row ${i + 1}: ${e instanceof Error ? e.message : 'Unknown error'}`)
      }
    }

    setImportProgress(20)

    // Phase 3: Batch insert new records (chunks of 200)
    for (let i = 0; i < toCreate.length; i += 200) {
      const batch = toCreate.slice(i, i + 200)
      const { error } = await supabase.from('crm_customers').insert(batch)
      if (error) {
        result.errors.push(`Insert batch ${Math.floor(i / 200) + 1}: ${error.message}`)
      } else {
        result.created += batch.length
      }
      setImportProgress(20 + Math.round(((i + batch.length) / (toCreate.length + toUpdate.length)) * 70))
    }

    // Phase 4: Batch update existing records (individual updates needed for different IDs)
    // Process in parallel batches of 20
    for (let i = 0; i < toUpdate.length; i += 20) {
      const batch = toUpdate.slice(i, i + 20)
      await Promise.all(
        batch.map(({ id, fields }) =>
          supabase.from('crm_customers').update(fields).eq('id', id)
            .then(({ error }) => {
              if (error) result.errors.push(`Update ${id}: ${error.message}`)
            })
        )
      )
      setImportProgress(20 + Math.round(((toCreate.length + i + batch.length) / (toCreate.length + toUpdate.length)) * 70))
    }

    // Log the import
    await supabase.from('crm_sync_logs').insert({
      provider: 'spreadsheet',
      sync_type: 'import',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      status: result.errors.length > 0 ? 'failed' : 'completed',
      records_processed: rows.length,
      records_created: result.created,
      records_updated: result.matched,
      records_skipped: result.skipped,
      errors: result.errors.length,
      error_details: result.errors.map((e) => ({ message: e })),
    })

    setImportResult(result)
    setStep('complete')
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full mx-4 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <FileSpreadsheet size={20} className="text-primary" />
            <h3 className="text-lg font-bold text-gray-900">Import Spreadsheet</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-2 text-xs">
          {(['upload', 'mapping', 'preview', 'importing', 'complete'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <div className="w-6 h-px bg-gray-200" />}
              <span className={`px-2 py-1 rounded-full ${
                step === s ? 'bg-primary text-white font-medium' : 'text-gray-400'
              }`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </span>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === 'upload' && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-primary transition-colors"
            >
              <Upload size={40} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-2">Drag & drop a CSV or XLSX file</p>
              <p className="text-gray-400 text-sm mb-4">or</p>
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium cursor-pointer hover:bg-primary-dark transition-colors">
                <Upload size={16} />
                Choose File
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {step === 'mapping' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-4">
                Map your spreadsheet columns to CRM fields. File: <strong>{fileName}</strong> ({rows.length} rows, {headers.length} columns)
              </p>
              {CRM_FIELDS.map((field) => (
                <div key={field.key} className="flex items-center gap-3">
                  <label className="w-40 text-sm text-gray-700 font-medium flex-shrink-0">{field.label}</label>
                  <ArrowRight size={14} className="text-gray-300 flex-shrink-0" />
                  <select
                    value={mapping[field.key]}
                    onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                    className="flex-1 px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">— Skip —</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}

          {step === 'preview' && (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Preview: first 5 rows of <strong>{rows.length}</strong> total
              </p>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-2 py-1.5 text-left font-medium text-gray-500">#</th>
                      {CRM_FIELDS.filter((f) => mapping[f.key]).map((f) => (
                        <th key={f.key} className="px-2 py-1.5 text-left font-medium text-gray-500">{f.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="px-2 py-1.5 text-gray-400">{i + 1}</td>
                        {CRM_FIELDS.filter((f) => mapping[f.key]).map((f) => (
                          <td key={f.key} className="px-2 py-1.5 text-gray-700 max-w-[150px] truncate">
                            {row[mapping[f.key]] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 'importing' && (
            <div className="text-center py-12">
              <Loader2 size={40} className="mx-auto text-primary animate-spin mb-4" />
              <p className="text-gray-600 font-medium">Importing…</p>
              <div className="w-full max-w-xs mx-auto mt-4 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-400 mt-2">{importProgress}%</p>
            </div>
          )}

          {step === 'complete' && importResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600 mb-4">
                <Check size={24} />
                <span className="text-lg font-bold">Import Complete</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-gray-900">{importResult.imported}</p>
                  <p className="text-xs text-gray-500">Rows Processed</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-green-700">{importResult.created}</p>
                  <p className="text-xs text-green-600">New Records</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-blue-700">{importResult.matched}</p>
                  <p className="text-xs text-blue-600">Matched Existing</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-gray-500">{importResult.skipped}</p>
                  <p className="text-xs text-gray-500">Skipped</p>
                </div>
              </div>
              {importResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-1 text-red-700 text-sm font-medium mb-2">
                    <AlertTriangle size={14} />
                    {importResult.errors.length} Error{importResult.errors.length !== 1 ? 's' : ''}
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {importResult.errors.map((err, i) => (
                      <p key={i} className="text-xs text-red-600">{err}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          <div>
            {step === 'mapping' && (
              <button onClick={() => setStep('upload')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
                <ArrowLeft size={14} /> Back
              </button>
            )}
            {step === 'preview' && (
              <button onClick={() => setStep('mapping')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
                <ArrowLeft size={14} /> Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {step !== 'importing' && step !== 'complete' && (
              <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
                Cancel
              </button>
            )}
            {step === 'mapping' && (
              <button
                onClick={() => setStep('preview')}
                className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors"
              >
                Preview
              </button>
            )}
            {step === 'preview' && (
              <button
                onClick={runImport}
                className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors"
              >
                Import {rows.length} Rows
              </button>
            )}
            {step === 'complete' && (
              <button
                onClick={() => { onComplete(); onClose() }}
                className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
