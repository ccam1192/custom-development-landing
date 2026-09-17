import { useState } from 'react'
import { X, RotateCcw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { CrmCustomer, ClientStatus, Source } from '../types'
import {
  CLIENT_STATUS_LABELS,
  SOURCE_LABELS,
  getDisplayMrr,
  getDisplayRevenue,
  hasMrrOverride,
  hasRevenueOverride,
} from '../types'

interface EditCustomerModalProps {
  customer: CrmCustomer
  onClose: () => void
  onSaved: () => void
}

export default function EditCustomerModal({ customer, onClose, onSaved }: EditCustomerModalProps) {
  const [clientStatus, setClientStatus] = useState<ClientStatus>(customer.client_status)
  const [cancellationDate, setCancellationDate] = useState(
    customer.cancellation_date ? customer.cancellation_date.split('T')[0] : ''
  )
  const [mrrValue, setMrrValue] = useState(String(getDisplayMrr(customer)))
  const [mrrIsOverride, setMrrIsOverride] = useState(hasMrrOverride(customer))
  const [revenueValue, setRevenueValue] = useState(String(getDisplayRevenue(customer)))
  const [revenueIsOverride, setRevenueIsOverride] = useState(hasRevenueOverride(customer))
  const [notes, setNotes] = useState(customer.notes ?? '')
  const [source, setSource] = useState<Source | ''>(customer.source ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)

    const updates: Record<string, unknown> = {
      client_status: clientStatus,
      cancellation_date: cancellationDate || null,
      notes: notes || null,
      source: source || null,
      updated_by: 'crm_manual',
    }

    // MRR: if user changed the value, store as override; if cleared override, set null
    if (mrrIsOverride) {
      updates.mrr_override = Number(mrrValue) || 0
    } else {
      updates.mrr_override = null
    }

    // Revenue: same logic
    if (revenueIsOverride) {
      updates.total_revenue_override = Number(revenueValue) || 0
    } else {
      updates.total_revenue_override = null
    }

    const { error: err } = await supabase
      .from('crm_customers')
      .update(updates)
      .eq('id', customer.id)

    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Edit CRM Fields</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          {customer.name ?? 'Unknown'} — {customer.email ?? 'No email'}
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Client Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client Status</label>
            <select
              value={clientStatus}
              onChange={(e) => setClientStatus(e.target.value as ClientStatus)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              {Object.entries(CLIENT_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Source */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as Source | '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">Not set</option>
              {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Cancellation Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cancellation Date</label>
            <input
              type="date"
              value={cancellationDate}
              onChange={(e) => setCancellationDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* MRR */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">MRR</label>
              {mrrIsOverride ? (
                <button
                  onClick={() => {
                    setMrrIsOverride(false)
                    setMrrValue(String(customer.calculated_mrr))
                  }}
                  className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700"
                >
                  <RotateCcw size={12} />
                  Revert to calculated (${customer.calculated_mrr})
                </button>
              ) : (
                <span className="text-xs text-gray-400">Calculated: ${customer.calculated_mrr}</span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                step="0.01"
                value={mrrValue}
                onChange={(e) => {
                  setMrrValue(e.target.value)
                  if (Number(e.target.value) !== customer.calculated_mrr) {
                    setMrrIsOverride(true)
                  }
                }}
                className={`w-full pl-7 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                  mrrIsOverride ? 'border-amber-300 bg-amber-50/50' : 'border-gray-300'
                }`}
              />
            </div>
            {mrrIsOverride && (
              <p className="text-xs text-amber-600 mt-1">⚡ Manual override active</p>
            )}
          </div>

          {/* Total Revenue */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">Total Revenue</label>
              {revenueIsOverride ? (
                <button
                  onClick={() => {
                    setRevenueIsOverride(false)
                    setRevenueValue(String(customer.calculated_total_revenue))
                  }}
                  className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700"
                >
                  <RotateCcw size={12} />
                  Revert to calculated (${customer.calculated_total_revenue})
                </button>
              ) : (
                <span className="text-xs text-gray-400">
                  Calculated: ${customer.calculated_total_revenue}
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                step="0.01"
                value={revenueValue}
                onChange={(e) => {
                  setRevenueValue(e.target.value)
                  if (Number(e.target.value) !== customer.calculated_total_revenue) {
                    setRevenueIsOverride(true)
                  }
                }}
                className={`w-full pl-7 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                  revenueIsOverride ? 'border-amber-300 bg-amber-50/50' : 'border-gray-300'
                }`}
              />
            </div>
            {revenueIsOverride && (
              <p className="text-xs text-amber-600 mt-1">⚡ Manual override active</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y"
              placeholder="Internal notes…"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
