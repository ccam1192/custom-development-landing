import { useState } from 'react'
import { Trash2, Download, X, Users, ChevronDown } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { ClientStatus, CrmCustomer, UserType } from '../types'
import { USER_TYPE_LABELS, USER_TYPE_VALUES } from '../types'

const USER_TYPE_OPTIONS: UserType[] = USER_TYPE_VALUES

function shopifyLifecycle(value: string | null | undefined): string {
  switch (value) {
    case 'ACTIVE':
    case 'TRIAL':
    case 'FROZEN':
    case 'CANCELED':
    case 'CANCELLATION_SCHEDULED':
      return value
    default:
      return 'NONE'
  }
}

function recastStatusForUserType(customer: CrmCustomer, userType: UserType): ClientStatus {
  if (userType === 'agency_client') return 'agency_client'
  if (customer.client_status !== 'agency_client') return customer.client_status

  const revenue = Number(customer.total_revenue_override ?? customer.calculated_total_revenue ?? 0)
  if (customer.billing_channel === 'stripe') {
    const live =
      customer.stripe_subscription_status === 'active' || customer.stripe_subscription_status === 'past_due'
    if (live && revenue > 0) return 'active_customer'
    if (live) return 'in_trial'
    if (customer.stripe_subscription_status === 'trialing') return 'in_trial'
    if (customer.cancellation_date || customer.stripe_canceled_at || customer.stripe_subscription_status === 'canceled') {
      return 'canceled'
    }
    if (revenue > 0) return 'active_customer'
    return 'prospect'
  }

  if (customer.billing_channel === 'shopify') {
    const lifecycle = shopifyLifecycle(customer.shopify_subscription_status)
    if (lifecycle === 'FROZEN' || lifecycle === 'CANCELED' || lifecycle === 'CANCELLATION_SCHEDULED') return 'canceled'
    if (lifecycle === 'ACTIVE' || lifecycle === 'TRIAL') return revenue > 0 ? 'active_customer' : 'in_trial'
    if (revenue > 0) return 'canceled'
    return 'prospect'
  }

  if (revenue > 0) return customer.cancellation_date ? 'canceled' : 'active_customer'
  return 'prospect'
}

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
  const [typeMenuOpen, setTypeMenuOpen] = useState(false)
  const [updatingType, setUpdatingType] = useState(false)

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
      'Client Status', 'Usage Charge Applied', 'Free Trial Started', 'Last Payment', 'Cancellation Date', 'MRR', 'Total Revenue', 'Source', 'Notes',
    ]
    const rows = selectedCustomers.map((c) => [
      c.name ?? '',
      c.email ?? '',
      c.signup_date ? new Date(c.signup_date).toISOString().split('T')[0] : '',
      c.store_url ?? '',
      c.user_type,
      c.billing_channel,
      c.client_status,
      c.usage_charge_applied ? 'Yes' : 'No',
      c.shopify_subscription_created_at
        ? new Date(c.shopify_subscription_created_at).toISOString().split('T')[0]
        : '',
      c.last_payment ? new Date(c.last_payment).toISOString().split('T')[0] : '',
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

  async function handleSetUserType(userType: UserType) {
    setTypeMenuOpen(false)
    setUpdatingType(true)
    try {
      const groups = new Map<string, { patch: Record<string, unknown>; ids: string[] }>()
      for (const customer of selectedCustomers) {
        const nextStatus = recastStatusForUserType(customer, userType)
        const patch: Record<string, unknown> = {
          user_type: userType,
          updated_by: 'crm_manual',
        }
        if (nextStatus !== customer.client_status) patch.client_status = nextStatus
        const key = JSON.stringify(patch)
        const group = groups.get(key) ?? { patch, ids: [] }
        group.ids.push(customer.id)
        groups.set(key, group)
      }

      if (groups.size === 0) {
        const patch: Record<string, unknown> = { user_type: userType, updated_by: 'crm_manual' }
        if (userType === 'agency_client') patch.client_status = 'agency_client'
        const { error } = await supabase.from('crm_customers').update(patch).in('id', Array.from(selectedIds))
        if (error) {
          alert(`Update failed: ${error.message}`)
          return
        }
      } else {
        for (const group of groups.values()) {
          const { error } = await supabase.from('crm_customers').update(group.patch).in('id', group.ids)
          if (error) {
            alert(`Update failed: ${error.message}`)
            return
          }
        }
      }

      onRefresh()
    } finally {
      setUpdatingType(false)
    }
  }

  if (count === 0) return null

  return (
    <>
      <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-4 py-2">
        <span className="text-sm font-medium text-primary">{count} selected</span>
        <div className="h-4 w-px bg-primary/20" />
        <div className="relative">
          <button
            type="button"
            onClick={() => setTypeMenuOpen((v) => !v)}
            disabled={updatingType}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary disabled:opacity-50 transition-colors"
          >
            <Users size={14} />
            {updatingType ? 'Updating…' : 'Set user type'}
            <ChevronDown size={14} />
          </button>
          {typeMenuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setTypeMenuOpen(false)} />
              <div className="absolute left-0 top-full mt-1 z-40 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
                {USER_TYPE_OPTIONS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => handleSetUserType(value)}
                  >
                    {USER_TYPE_LABELS[value]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
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
