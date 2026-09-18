import { useMemo, useRef, useState } from 'react'
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Copy,
  Check,
  ExternalLink,
  ListFilter,
} from 'lucide-react'
import type { ColumnFilter, CrmCustomer, GridColumnId, PaginationState, SortDirection, SortField } from '../types'
import { isColumnFilterActive } from '../types'
import type { FilteredTotals } from '../hooks/useCustomers'
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
import ColumnFilterMenu from './ColumnFilterMenu'
import {
  ACTIONS_COL_WIDTH,
  CHECKBOX_COL_WIDTH,
  COLUMN_BY_ID,
  type GridColumnDef,
} from '../grid/columns'

interface CustomerTableProps {
  customers: CrmCustomer[]
  loading: boolean
  sortField: SortField
  sortDirection: SortDirection
  pagination: PaginationState
  selectedIds: Set<string>
  filteredTotals: FilteredTotals
  columnOrder: GridColumnId[]
  columnWidths: Partial<Record<GridColumnId, number>>
  filters: import('../types').CustomerFilters
  onSort: (field: SortField, dir?: SortDirection) => void
  onToggleSelect: (id: string) => void
  onToggleSelectAll: () => void
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onView: (customer: CrmCustomer) => void
  onEdit: (customer: CrmCustomer) => void
  onColumnOrderChange: (order: GridColumnId[]) => void
  onColumnWidthChange: (id: GridColumnId, width: number) => void
  onFilterChange: (id: GridColumnId, filter: ColumnFilter | undefined) => void
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

function widthFor(col: GridColumnDef, widths: Partial<Record<GridColumnId, number>>): number {
  return Math.max(col.minWidth, widths[col.id] ?? col.defaultWidth)
}

export default function CustomerTable({
  customers,
  loading,
  sortField,
  sortDirection,
  pagination,
  selectedIds,
  filteredTotals,
  columnOrder,
  columnWidths,
  filters,
  onSort,
  onToggleSelect,
  onToggleSelectAll,
  onPageChange,
  onPageSizeChange,
  onView,
  onEdit,
  onColumnOrderChange,
  onColumnWidthChange,
  onFilterChange,
}: CustomerTableProps) {
  const [openFilter, setOpenFilter] = useState<GridColumnId | null>(null)
  const [dragOverId, setDragOverId] = useState<GridColumnId | null>(null)
  const resizing = useRef<{ id: GridColumnId; startX: number; startW: number } | null>(null)
  const dragId = useRef<GridColumnId | null>(null)

  const columns = useMemo(
    () => columnOrder.map((id) => COLUMN_BY_ID[id]).filter(Boolean),
    [columnOrder]
  )

  const tableWidth =
    CHECKBOX_COL_WIDTH +
    ACTIONS_COL_WIDTH +
    columns.reduce((sum, col) => sum + widthFor(col, columnWidths), 0)

  const allSelected = useMemo(
    () => customers.length > 0 && customers.every((c) => selectedIds.has(c.id)),
    [customers, selectedIds]
  )

  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.pageSize))
  const from = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1
  const to = Math.min(pagination.page * pagination.pageSize, pagination.total)

  function handleResizeStart(e: React.PointerEvent, col: GridColumnDef) {
    e.preventDefault()
    e.stopPropagation()
    resizing.current = { id: col.id, startX: e.clientX, startW: widthFor(col, columnWidths) }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function handleResizeMove(e: React.PointerEvent, col: GridColumnDef) {
    if (!resizing.current || resizing.current.id !== col.id) return
    const next = resizing.current.startW + (e.clientX - resizing.current.startX)
    onColumnWidthChange(col.id, Math.max(col.minWidth, Math.min(720, next)))
  }

  function handleResizeKey(e: React.KeyboardEvent, col: GridColumnDef) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const current = widthFor(col, columnWidths)
    const delta = e.key === 'ArrowRight' ? 8 : -8
    onColumnWidthChange(col.id, current + delta)
  }

  function handleDrop(target: GridColumnId) {
    const source = dragId.current
    dragId.current = null
    setDragOverId(null)
    if (!source || source === target) return
    const next = columnOrder.filter((id) => id !== source)
    const idx = next.indexOf(target)
    next.splice(idx, 0, source)
    onColumnOrderChange(next)
  }

  function renderCell(col: GridColumnDef, c: CrmCustomer) {
    switch (col.id) {
      case 'name':
        return <span className="font-medium text-gray-900 truncate block">{c.name ?? '—'}</span>
      case 'email':
        return (
          <div className="flex items-center gap-1 min-w-0" onClick={(e) => e.stopPropagation()}>
            <span className="text-gray-600 truncate select-text">{c.email ?? '—'}</span>
            {c.email && <CopyEmailButton email={c.email} />}
          </div>
        )
      case 'signup_date':
        return <span className="text-gray-500 whitespace-nowrap">{formatDate(c.signup_date)}</span>
      case 'store_url':
        return c.store_url ? (
          <a
            href={c.store_url.startsWith('http') ? c.store_url : `https://${c.store_url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline flex items-center gap-1 min-w-0"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="truncate">{c.store_url.replace(/^https?:\/\//, '')}</span>
            <ExternalLink size={12} className="flex-shrink-0" />
          </a>
        ) : (
          <span className="text-gray-300">—</span>
        )
      case 'user_type':
        return <span className="text-gray-600 whitespace-nowrap">{USER_TYPE_LABELS[c.user_type] ?? c.user_type}</span>
      case 'billing_channel':
        return <span className="text-gray-600 whitespace-nowrap">{BILLING_CHANNEL_LABELS[c.billing_channel]}</span>
      case 'client_status':
        return (
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${CLIENT_STATUS_COLORS[c.client_status]}`}>
            {CLIENT_STATUS_LABELS[c.client_status]}
          </span>
        )
      case 'cancellation_date':
        return <span className="text-gray-500 whitespace-nowrap">{formatDate(c.cancellation_date)}</span>
      case 'effective_mrr':
        return (
          <span className={`whitespace-nowrap ${hasMrrOverride(c) ? 'text-amber-700' : 'text-gray-900'}`}>
            {formatCurrency(getDisplayMrr(c))}
            {hasMrrOverride(c) && <span className="text-amber-500 text-xs ml-0.5">*</span>}
          </span>
        )
      case 'effective_total_revenue':
        return (
          <span className={`whitespace-nowrap ${hasRevenueOverride(c) ? 'text-amber-700' : 'text-gray-900'}`}>
            {formatCurrency(getDisplayRevenue(c))}
            {hasRevenueOverride(c) && <span className="text-amber-500 text-xs ml-0.5">*</span>}
          </span>
        )
      case 'notes':
        return <span className="text-gray-500 truncate block">{c.notes ?? '—'}</span>
      default:
        return null
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
      <div className="overflow-auto min-h-[28rem] h-[calc(100vh-360px)] crm-scrollbar">
        <table className="text-sm table-fixed" style={{ width: tableWidth, minWidth: tableWidth }}>
          <colgroup>
            <col style={{ width: CHECKBOX_COL_WIDTH }} />
            {columns.map((col) => (
              <col key={col.id} style={{ width: widthFor(col, columnWidths) }} />
            ))}
            <col style={{ width: ACTIONS_COL_WIDTH }} />
          </colgroup>
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-3 py-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  disabled={customers.length === 0}
                  aria-label="Select all rows on this page"
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
              </th>
              {columns.map((col) => {
                const activeSort = sortField === col.sortField
                const filterActive = isColumnFilterActive(filters[col.id])
                return (
                  <th
                    key={col.id}
                    className={`relative px-2 py-2 text-left ${dragOverId === col.id ? 'bg-primary/10' : ''}`}
                    draggable
                    onDragStart={(e) => {
                      if (resizing.current) {
                        e.preventDefault()
                        return
                      }
                      dragId.current = col.id
                      e.dataTransfer.effectAllowed = 'move'
                      e.dataTransfer.setData('text/plain', col.id)
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDragOverId(col.id)
                    }}
                    onDragLeave={() => setDragOverId((id) => (id === col.id ? null : id))}
                    onDrop={(e) => {
                      e.preventDefault()
                      handleDrop(col.id)
                    }}
                  >
                    <div className={`flex items-center gap-0.5 min-w-0 ${col.align === 'right' ? 'justify-end' : ''}`}>
                      <button
                        type="button"
                        className="flex items-center gap-1 min-w-0 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700"
                        onClick={() => {
                          if (activeSort) onSort(col.sortField, sortDirection === 'asc' ? 'desc' : 'asc')
                          else onSort(col.sortField, col.filterKind === 'date' || col.filterKind === 'number' ? 'desc' : 'asc')
                        }}
                        aria-label={`Sort by ${col.label}${activeSort ? `, currently ${sortDirection === 'asc' ? 'ascending' : 'descending'}` : ''}`}
                        title={`Sort ${col.label}`}
                      >
                        <span className="truncate">{col.label}</span>
                        {activeSort ? (
                          sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        ) : (
                          <ChevronsUpDown size={14} className="opacity-40" />
                        )}
                      </button>
                      <button
                        type="button"
                        className={`p-0.5 rounded ${filterActive ? 'text-primary bg-primary/10' : 'text-gray-400 hover:text-gray-700'}`}
                        aria-label={filterActive ? `${col.label} filter active` : `Filter ${col.label}`}
                        aria-pressed={filterActive}
                        title={filterActive ? `${col.label} filter on` : `Filter ${col.label}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenFilter((id) => (id === col.id ? null : col.id))
                        }}
                      >
                        <ListFilter size={13} />
                        {filterActive && <span className="sr-only">Filter on</span>}
                      </button>
                    </div>
                    {openFilter === col.id && (
                      <ColumnFilterMenu
                        column={col}
                        filter={filters[col.id]}
                        onChange={(next) => onFilterChange(col.id, next)}
                        onClose={() => setOpenFilter(null)}
                      />
                    )}
                    <span
                      role="separator"
                      aria-orientation="vertical"
                      aria-label={`Resize ${col.label} column`}
                      tabIndex={0}
                      className="absolute top-0 right-0 h-full w-2 cursor-col-resize hover:bg-primary/30"
                      onPointerDown={(e) => handleResizeStart(e, col)}
                      onPointerMove={(e) => handleResizeMove(e, col)}
                      onPointerUp={() => {
                        resizing.current = null
                      }}
                      onDragStart={(e) => e.preventDefault()}
                      onKeyDown={(e) => handleResizeKey(e, col)}
                    />
                  </th>
                )
              })}
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={columns.length + 2} className="px-3 py-8 text-center text-sm text-gray-400">
                  Loading customers…
                </td>
              </tr>
            )}
            {!loading && customers.length === 0 && (
              <tr>
                <td colSpan={columns.length + 2} className="px-3 py-12 text-center">
                  <p className="text-gray-500 text-sm">No customers found</p>
                  <p className="text-gray-400 text-xs mt-1">Try adjusting column filters</p>
                </td>
              </tr>
            )}
            {!loading &&
              customers.map((c) => (
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
                      aria-label={`Select ${c.name ?? c.email ?? 'customer'}`}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </td>
                  {columns.map((col) => (
                    <td
                      key={col.id}
                      className={`px-2 py-2.5 overflow-hidden ${col.align === 'right' ? 'text-right' : ''}`}
                    >
                      {renderCell(col, c)}
                    </td>
                  ))}
                  <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
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

      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50/50">
        <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
          <span>
            {from}–{to} of {pagination.total.toLocaleString()}
          </span>
          <span className={filteredTotals.filtered ? 'text-primary font-medium' : 'text-gray-600'}>
            {filteredTotals.filtered ? 'Filtered totals' : 'Totals'}: MRR {formatCurrency(filteredTotals.mrr)} · Revenue{' '}
            {formatCurrency(filteredTotals.revenue)}
          </span>
          <select
            value={pagination.pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            aria-label="Rows per page"
          >
            {[25, 50, 100, 200].map((n) => (
              <option key={n} value={n}>
                {n} per page
              </option>
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
            if (totalPages <= 7) page = i + 1
            else if (pagination.page <= 4) page = i + 1
            else if (pagination.page >= totalPages - 3) page = totalPages - 6 + i
            else page = pagination.page - 3 + i
            return (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  page === pagination.page ? 'bg-primary text-white' : 'border border-gray-300 hover:bg-gray-100'
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
