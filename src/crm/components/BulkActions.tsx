import { useState } from 'react'
import { Trash2, Download, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { CrmCustomer } from '../types'

interface BulkActionsProps {
  selectedIds: Set<string>
  customers: CrmCustomer[]
  onClearSelection: () => void
  onRefresh: () => void
}

export default function BulkActions({
  selectedIds,
  customers,
  onClearSelection,
  onRefresh,
}: BulkActionsProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const selectedCustomers = customers.filter((c) => selectedIds.has(c.id))
  const count = selectedIds.size

  async function handleBulkDelete() {
    setDeleting(true)
    const { error } = await supabase
      .from('crm_customers')
      .delete()
      .in('id', Array.from(selectedIds))

    if (error) {
      alert(`Delete failed: ${error.message}`)
    } else {
      onClearSelection()
      onRefresh()
    }
    setDeleting(false)
    setShowDeleteConfirm(false)
  }

  function handleBulkExport() {
    const headers = [
      'Name', 'Email', 'Signup Date', 'Store URL', 'User Type', 'Billing Channel',
      'Client Status', 'Cancellation Date', 'MRR', 'Total Revenue', 'Source', 'Notes',
    ]
    const rows = selectedCustomers.map((c) => [
      c.name ?? '',
      c.email ?? '',
      c.signup_date ? new Date(c.signup_date).toISOString().split('T')[0] : '',
      c.store_url ?? '',
      c.user_type,
      c.billing_channel,
      c.client_status,
      c.cancellation_date ? new Date(c.cancellation_date).toISOString().split('T')[0] : '',
      String(c.mrr_override ?? c.calculated_mrr),
      String(c.total_revenue_override ?? c.calculated_total_revenue),
      c.source ?? '',
      c.notes ?? '',
    ])

    const csv = [headers, ...rows].map((r) =>
      r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')
    ).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `crm-export-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleCopyEmails() {
    const emails = selectedCustomers
      .map((c) => c.email)
      .filter(Boolean)
      .join(', ')
    navigator.clipboard.writeText(emails)
  }

  if (count === 0) return null

  return (
    <>
      <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-4 py-2">
        <span className="text-sm font-medium text-primary">{count} selected</span>
        <div className="h-4 w-px bg-primary/20" />
        <button
          onClick={handleCopyEmails}
          className="text-sm text-gray-600 hover:text-primary transition-colors"
        >
          Copy Emails
        </button>
        <button
          onClick={handleBulkExport}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary transition-colors"
        >
          <Download size={14} />
          Export
        </button>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 transition-colors"
        >
          <Trash2 size={14} />
          Delete CRM Records
        </button>
        <button
          onClick={onClearSelection}
          className="ml-auto text-gray-400 hover:text-gray-600"
        >
          <X size={16} />
        </button>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete CRM Records</h3>
            <p className="text-sm text-gray-600 mb-1">
              This will delete <strong>{count}</strong> CRM record{count !== 1 ? 's' : ''}.
            </p>
            <p className="text-sm text-amber-600 mb-4">
              ⚠️ This does NOT delete the associated Boardroom user accounts. This only removes the CRM tracking data.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Deleting…' : `Delete ${count} Record${count !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
