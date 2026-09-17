import { useState, useMemo } from 'react'
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react'
import type { CrmCustomer, SortField, SortDirection, PaginationState } from '../types'
import {
  CLIENT_STATUS_LABELS,
  CLIENT_STATUS_COLORS,
  BILLING_CHANNEL_LABELS,
  USER_TYPE_LABELS,
  getDisplayMrr,
  getDisplayRevenue,
  hasMrrOverride,
  hasRevenueOverride,
} from '../types'
import ActionDropdown from './ActionDropdown'

interface CustomerTableProps {
  customers: CrmCustomer[]
  loading: boolean
  sortField: SortField
  sortDirection: SortDirection
  pagination: PaginationState
  selectedIds: Set<string>
  onSort: (field: SortField, dir?: SortDirection) => void
  onToggleSelect: (id: string) => void
  onToggleSelectAll: () => void
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onView: (customer: CrmCustomer) => void
  onEdit: (customer: CrmCustomer) => void
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(d))
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

function CopyEmailButton({ email }: { email: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        navigator.clipboard.writeText(email)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="ml-1 p-0.5 text-gray-400 hover:text-primary transition-colors"
      title="Copy email"
    >
      {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
    </button>
  )
}

interface SortHeaderProps {
  label: string
  field: SortField
  currentField: SortField
  currentDir: SortDirection
  onSort: (field: SortField, dir?: SortDirection) => void
}

function SortHeader({ label, field, currentField, currentDir, onSort }: SortHeaderProps) {
  const active = currentField === field
  return (
    <button
      onClick={() => {
        if (active) {
          onSort(field, currentDir === 'asc' ? 'desc' : 'asc')
        } else {
          onSort(field, 'asc')
        }
      }}
      className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors group"
    >
      {label}
      {active ? (
        currentDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
      ) : (
        <ChevronsUpDown size={14} className="opacity-0 group-hover:opacity-50" />
      )}
    </button>
  )
}

export default function CustomerTable({
  customers,
  loading,
  sortField,
  sortDirection,
  pagination,
  selectedIds,
  onSort,
  onToggleSelect,
  onToggleSelectAll,
  onPageChange,
  onPageSizeChange,
  onView,
  onEdit,
}: CustomerTableProps) {
  const allSelected = useMemo(
    () => customers.length > 0 && customers.every((c) => selectedIds.has(c.id)),
    [customers, selectedIds]
  )

  const totalPages = Math.ceil(pagination.total / pagination.pageSize)
  const from = (pagination.page - 1) * pagination.pageSize + 1
  const to = Math.min(pagination.page * pagination.pageSize, pagination.total)

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-8 text-center text-sm text-gray-400">Loading customers…</div>
      </div>
    )
  }

  if (customers.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-12 text-center">
          <p className="text-gray-500 text-sm">No customers found</p>
          <p className="text-gray-400 text-xs mt-1">Try adjusting your filters or importing data</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto max-h-[calc(100vh-320px)] crm-scrollbar">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
              </th>
              <th className="px-3 py-3 text-left">
                <SortHeader label="Name" field="name" currentField={sortField} currentDir={sortDirection} onSort={onSort} />
              </th>
              <th className="px-3 py-3 text-left">
                <SortHeader label="Email" field="email" currentField={sortField} currentDir={sortDirection} onSort={onSort} />
              </th>
              <th className="px-3 py-3 text-left">
                <SortHeader label="Signup" field="signup_date" currentField={sortField} currentDir={sortDirection} onSort={onSort} />
              </th>
              <th className="px-3 py-3 text-left hidden xl:table-cell">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Store</span>
              </th>
              <th className="px-3 py-3 text-left">
                <SortHeader label="Type" field="user_type" currentField={sortField} currentDir={sortDirection} onSort={onSort} />
              </th>
              <th className="px-3 py-3 text-left">
                <SortHeader label="Billing" field="billing_channel" currentField={sortField} currentDir={sortDirection} onSort={onSort} />
              </th>
              <th className="px-3 py-3 text-left">
                <SortHeader label="Status" field="client_status" currentField={sortField} currentDir={sortDirection} onSort={onSort} />
              </th>
              <th className="px-3 py-3 text-left hidden lg:table-cell">
                <SortHeader label="Cancel Date" field="cancellation_date" currentField={sortField} currentDir={sortDirection} onSort={onSort} />
              </th>
              <th className="px-3 py-3 text-right">
                <SortHeader label="MRR" field="effective_mrr" currentField={sortField} currentDir={sortDirection} onSort={onSort} />
              </th>
              <th className="px-3 py-3 text-right">
                <SortHeader label="Revenue" field="effective_total_revenue" currentField={sortField} currentDir={sortDirection} onSort={onSort} />
              </th>
              <th className="px-3 py-3 text-left hidden 2xl:table-cell">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes</span>
              </th>
              <th className="w-10 px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {customers.map((c) => (
              <tr
                key={c.id}
                className={`hover:bg-gray-50/70 transition-colors cursor-pointer ${
                  selectedIds.has(c.id) ? 'bg-primary/5' : ''
                }`}
                onClick={() => onView(c)}
              >
                <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(c.id)}
                    onChange={() => onToggleSelect(c.id)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </td>
                <td className="px-3 py-2.5 font-medium text-gray-900 max-w-[160px] truncate">
                  {c.name ?? '—'}
                </td>
                <td className="px-3 py-2.5 max-w-[200px]" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-600 truncate select-text">{c.email ?? '—'}</span>
                    {c.email && <CopyEmailButton email={c.email} />}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">
                  {formatDate(c.signup_date)}
                </td>
                <td className="px-3 py-2.5 hidden xl:table-cell max-w-[140px]" onClick={(e) => e.stopPropagation()}>
                  {c.store_url ? (
                    <a
                      href={c.store_url.startsWith('http') ? c.store_url : `https://${c.store_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline truncate flex items-center gap-1"
                    >
                      <span className="truncate">{c.store_url.replace(/^https?:\/\//, '')}</span>
                      <ExternalLink size={12} className="flex-shrink-0" />
                    </a>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                  {USER_TYPE_LABELS[c.user_type]}
                </td>
                <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                  {BILLING_CHANNEL_LABELS[c.billing_channel]}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${CLIENT_STATUS_COLORS[c.client_status]}`}>
                    {CLIENT_STATUS_LABELS[c.client_status]}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap hidden lg:table-cell">
                  {formatDate(c.cancellation_date)}
                </td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                  <span className={hasMrrOverride(c) ? 'text-amber-700' : 'text-gray-900'}>
                    {formatCurrency(getDisplayMrr(c))}
                  </span>
                  {hasMrrOverride(c) && <span className="text-amber-500 text-xs ml-0.5">⚡</span>}
                </td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                  <span className={hasRevenueOverride(c) ? 'text-amber-700' : 'text-gray-900'}>
                    {formatCurrency(getDisplayRevenue(c))}
                  </span>
                  {hasRevenueOverride(c) && <span className="text-amber-500 text-xs ml-0.5">⚡</span>}
                </td>
                <td className="px-3 py-2.5 hidden 2xl:table-cell max-w-[200px]">
                  <span className="text-gray-500 truncate block">{c.notes ?? '—'}</span>
                </td>
                <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <ActionDropdown
                    customer={c}
                    onView={() => onView(c)}
                    onEdit={() => onEdit(c)}
                    onCopyEmail={() => c.email && navigator.clipboard.writeText(c.email)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50/50">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>
            {from}–{to} of {pagination.total}
          </span>
          <select
            value={pagination.pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {[25, 50, 100, 200].map((n) => (
              <option key={n} value={n}>{n} per page</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-100 transition-colors"
          >
            Previous
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let page: number
            if (totalPages <= 7) {
              page = i + 1
            } else if (pagination.page <= 4) {
              page = i + 1
            } else if (pagination.page >= totalPages - 3) {
              page = totalPages - 6 + i
            } else {
              page = pagination.page - 3 + i
            }
            return (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  page === pagination.page
                    ? 'bg-primary text-white'
                    : 'border border-gray-300 hover:bg-gray-100'
                }`}
              >
                {page}
              </button>
            )
          })}
          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= totalPages}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-100 transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
