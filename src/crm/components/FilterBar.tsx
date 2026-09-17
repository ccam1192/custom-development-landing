import { useState } from 'react'
import { Search, Filter, X, ChevronDown } from 'lucide-react'
import type {
  CustomerFilters,
  ClientStatus,
  BillingChannel,
  UserType,
  Source,
} from '../types'
import {
  CLIENT_STATUS_LABELS,
  BILLING_CHANNEL_LABELS,
  USER_TYPE_LABELS,
  SOURCE_LABELS,
  DEFAULT_FILTERS,
} from '../types'

interface FilterBarProps {
  filters: CustomerFilters
  onChange: (filters: CustomerFilters) => void
}

function MultiSelect<T extends string>({
  label,
  options,
  labels,
  value,
  onChange,
}: {
  label: string
  options: T[]
  labels: Record<T, string>
  value: T[]
  onChange: (v: T[]) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
          value.length > 0
            ? 'border-primary bg-primary/5 text-primary font-medium'
            : 'border-gray-300 text-gray-600 hover:border-gray-400'
        }`}
      >
        {label}
        {value.length > 0 && (
          <span className="bg-primary text-white text-xs px-1.5 py-0.5 rounded-full">
            {value.length}
          </span>
        )}
        <ChevronDown size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-white rounded-lg border border-gray-200 shadow-lg z-40 min-w-[180px] py-1">
            {options.map((opt) => (
              <label
                key={opt}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm"
              >
                <input
                  type="checkbox"
                  checked={value.includes(opt)}
                  onChange={() => {
                    if (value.includes(opt)) {
                      onChange(value.filter((v) => v !== opt))
                    } else {
                      onChange([...value, opt])
                    }
                  }}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                {labels[opt]}
              </label>
            ))}
            {value.length > 0 && (
              <button
                onClick={() => onChange([])}
                className="w-full px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 text-left border-t border-gray-100 mt-1"
              >
                Clear all
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default function FilterBar({ filters, onChange }: FilterBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const hasActiveFilters =
    filters.client_status.length > 0 ||
    filters.billing_channel.length > 0 ||
    filters.user_type.length > 0 ||
    filters.source.length > 0 ||
    filters.signup_date_from ||
    filters.signup_date_to ||
    filters.cancellation_date_from ||
    filters.cancellation_date_to ||
    filters.mrr_min != null ||
    filters.mrr_max != null ||
    filters.revenue_min != null ||
    filters.revenue_max != null

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, store, notes…"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          {filters.search && (
            <button
              onClick={() => onChange({ ...filters, search: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Quick filters */}
        <MultiSelect
          label="Status"
          options={['prospect', 'in_trial', 'active_customer', 'canceled', 'agency_client'] as ClientStatus[]}
          labels={CLIENT_STATUS_LABELS}
          value={filters.client_status}
          onChange={(v) => onChange({ ...filters, client_status: v })}
        />
        <MultiSelect
          label="Billing"
          options={['stripe', 'shopify', 'other', 'none'] as BillingChannel[]}
          labels={BILLING_CHANNEL_LABELS}
          value={filters.billing_channel}
          onChange={(v) => onChange({ ...filters, billing_channel: v })}
        />
        <MultiSelect
          label="Type"
          options={['agency', 'agency_client', 'standard'] as UserType[]}
          labels={USER_TYPE_LABELS}
          value={filters.user_type}
          onChange={(v) => onChange({ ...filters, user_type: v })}
        />
        <MultiSelect
          label="Source"
          options={['stripe', 'shopify', 'agency', 'appsumo', 'custom', 'other'] as Source[]}
          labels={SOURCE_LABELS}
          value={filters.source}
          onChange={(v) => onChange({ ...filters, source: v })}
        />

        {/* Advanced toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
            showAdvanced ? 'border-primary bg-primary/5 text-primary' : 'border-gray-300 text-gray-600 hover:border-gray-400'
          }`}
        >
          <Filter size={14} />
          Advanced
        </button>

        {/* Clear all */}
        {hasActiveFilters && (
          <button
            onClick={() => onChange({ ...DEFAULT_FILTERS, search: filters.search })}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Signup from</label>
            <input
              type="date"
              value={filters.signup_date_from ?? ''}
              onChange={(e) => onChange({ ...filters, signup_date_from: e.target.value || null })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Signup to</label>
            <input
              type="date"
              value={filters.signup_date_to ?? ''}
              onChange={(e) => onChange({ ...filters, signup_date_to: e.target.value || null })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Cancel from</label>
            <input
              type="date"
              value={filters.cancellation_date_from ?? ''}
              onChange={(e) => onChange({ ...filters, cancellation_date_from: e.target.value || null })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Cancel to</label>
            <input
              type="date"
              value={filters.cancellation_date_to ?? ''}
              onChange={(e) => onChange({ ...filters, cancellation_date_to: e.target.value || null })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">MRR min</label>
            <input
              type="number"
              placeholder="0"
              value={filters.mrr_min ?? ''}
              onChange={(e) =>
                onChange({ ...filters, mrr_min: e.target.value ? Number(e.target.value) : null })
              }
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">MRR max</label>
            <input
              type="number"
              placeholder="∞"
              value={filters.mrr_max ?? ''}
              onChange={(e) =>
                onChange({ ...filters, mrr_max: e.target.value ? Number(e.target.value) : null })
              }
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      )}
    </div>
  )
}
