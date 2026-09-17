import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import type {
  CrmCustomer,
  CustomerFilters,
  SortField,
  SortDirection,
  PaginationState,
} from '../types'
import { DEFAULT_FILTERS } from '../types'

interface UseCustomersReturn {
  customers: CrmCustomer[]
  loading: boolean
  error: string | null
  pagination: PaginationState
  filters: CustomerFilters
  sortField: SortField
  sortDirection: SortDirection
  selectedIds: Set<string>
  setFilters: (f: CustomerFilters) => void
  setSort: (field: SortField, dir?: SortDirection) => void
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  toggleSelect: (id: string) => void
  toggleSelectAll: () => void
  clearSelection: () => void
  selectAll: () => void
  refresh: () => void
}

export function useCustomers(): UseCustomersReturn {
  const [customers, setCustomers] = useState<CrmCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<CustomerFilters>(DEFAULT_FILTERS)
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 50,
    total: 0,
  })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const fetchIdRef = useRef(0)

  const fetchCustomers = useCallback(async () => {
    const fetchId = ++fetchIdRef.current
    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('crm_customers')
        .select('*', { count: 'exact' })

      // Text search
      if (filters.search) {
        const term = `%${filters.search}%`
        query = query.or(`name.ilike.${term},email.ilike.${term},store_url.ilike.${term},notes.ilike.${term}`)
      }

      // Enum filters
      if (filters.client_status.length > 0) {
        query = query.in('client_status', filters.client_status)
      }
      if (filters.billing_channel.length > 0) {
        query = query.in('billing_channel', filters.billing_channel)
      }
      if (filters.user_type.length > 0) {
        query = query.in('user_type', filters.user_type)
      }
      if (filters.source.length > 0) {
        query = query.in('source', filters.source)
      }

      // Date range filters
      if (filters.signup_date_from) {
        query = query.gte('signup_date', filters.signup_date_from)
      }
      if (filters.signup_date_to) {
        query = query.lte('signup_date', filters.signup_date_to)
      }
      if (filters.cancellation_date_from) {
        query = query.gte('cancellation_date', filters.cancellation_date_from)
      }
      if (filters.cancellation_date_to) {
        query = query.lte('cancellation_date', filters.cancellation_date_to)
      }

      // Numeric range filters (using generated columns that COALESCE override + calculated)
      if (filters.mrr_min != null) {
        query = query.gte('effective_mrr', filters.mrr_min)
      }
      if (filters.mrr_max != null) {
        query = query.lte('effective_mrr', filters.mrr_max)
      }
      if (filters.revenue_min != null) {
        query = query.gte('effective_total_revenue', filters.revenue_min)
      }
      if (filters.revenue_max != null) {
        query = query.lte('effective_total_revenue', filters.revenue_max)
      }

      // Sorting
      query = query.order(sortField, { ascending: sortDirection === 'asc' })

      // Pagination
      const from = (pagination.page - 1) * pagination.pageSize
      const to = from + pagination.pageSize - 1
      query = query.range(from, to)

      const { data, error: err, count } = await query

      if (fetchId !== fetchIdRef.current) return

      if (err) {
        setError(err.message)
        return
      }

      setCustomers((data ?? []) as CrmCustomer[])
      setPagination((prev) => ({ ...prev, total: count ?? 0 }))
    } catch (e) {
      if (fetchId === fetchIdRef.current) {
        setError(e instanceof Error ? e.message : 'Failed to fetch customers')
      }
    } finally {
      if (fetchId === fetchIdRef.current) {
        setLoading(false)
      }
    }
  }, [filters, sortField, sortDirection, pagination.page, pagination.pageSize])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  const setSort = useCallback((field: SortField, dir?: SortDirection) => {
    if (dir) {
      setSortField(field)
      setSortDirection(dir)
    } else {
      setSortField((prev) => {
        if (prev === field) {
          setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
          return field
        }
        setSortDirection('asc')
        return field
      })
    }
    setPagination((prev) => ({ ...prev, page: 1 }))
  }, [])

  const setPage = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, page }))
    setSelectedIds(new Set())
  }, [])

  const setPageSize = useCallback((pageSize: number) => {
    setPagination((prev) => ({ ...prev, pageSize, page: 1 }))
    setSelectedIds(new Set())
  }, [])

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === customers.length) return new Set()
      return new Set(customers.map((c) => c.id))
    })
  }, [customers])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])
  const selectAll = useCallback(() => {
    setSelectedIds(new Set(customers.map((c) => c.id)))
  }, [customers])

  return {
    customers,
    loading,
    error,
    pagination,
    filters,
    sortField,
    sortDirection,
    selectedIds,
    setFilters,
    setSort,
    setPage,
    setPageSize,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    selectAll,
    refresh: fetchCustomers,
  }
}
