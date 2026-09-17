import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import type {
  CrmCustomer,
  CustomerFilters,
  SortField,
  SortDirection,
  PaginationState,
} from '../types'
import { DEFAULT_FILTERS, hasActiveFilters } from '../types'

export interface FilteredTotals {
  mrr: number
  revenue: number
  filtered: boolean
}

interface UseCustomersReturn {
  customers: CrmCustomer[]
  loading: boolean
  error: string | null
  pagination: PaginationState
  filters: CustomerFilters
  sortField: SortField
  sortDirection: SortDirection
  selectedIds: Set<string>
  filteredTotals: FilteredTotals
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
  const [filteredTotals, setFilteredTotals] = useState<FilteredTotals>({ mrr: 0, revenue: 0, filtered: false })
  const fetchIdRef = useRef(0)

  function applyCustomerFilters(query: any, f: CustomerFilters) {
    if (f.search) {
      const term = `%${f.search}%`
      query = query.or(`name.ilike.${term},email.ilike.${term},store_url.ilike.${term},notes.ilike.${term}`)
    }
    if (f.client_status.length > 0) query = query.in('client_status', f.client_status)
    if (f.billing_channel.length > 0) query = query.in('billing_channel', f.billing_channel)
    if (f.user_type.length > 0) query = query.in('user_type', f.user_type)
    if (f.source.length > 0) query = query.in('source', f.source)
    if (f.signup_date_from) query = query.gte('signup_date', f.signup_date_from)
    if (f.signup_date_to) query = query.lte('signup_date', f.signup_date_to)
    if (f.cancellation_date_from) query = query.gte('cancellation_date', f.cancellation_date_from)
    if (f.cancellation_date_to) query = query.lte('cancellation_date', f.cancellation_date_to)
    if (f.mrr_min != null) query = query.gte('effective_mrr', f.mrr_min)
    if (f.mrr_max != null) query = query.lte('effective_mrr', f.mrr_max)
    if (f.revenue_min != null) query = query.gte('effective_total_revenue', f.revenue_min)
    if (f.revenue_max != null) query = query.lte('effective_total_revenue', f.revenue_max)
    return query
  }

  const fetchCustomers = useCallback(async () => {
    const fetchId = ++fetchIdRef.current
    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('crm_customers')
        .select('*', { count: 'exact' })

      query = applyCustomerFilters(query, filters)

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

      // Sum MRR/revenue across the full filtered set.
      // Avoid PostgREST .sum() — generated columns often aren't in the API
      // schema cache, which was leaving the footer at $0 with no error shown.
      const PAGE = 1000
      let mrr = 0
      let revenue = 0
      let fromIdx = 0
      let useGenerated = true

      for (;;) {
        const columns = useGenerated
          ? 'mrr_override, calculated_mrr, total_revenue_override, calculated_total_revenue, effective_mrr, effective_total_revenue'
          : 'mrr_override, calculated_mrr, total_revenue_override, calculated_total_revenue'
        let totQuery = supabase.from('crm_customers').select(columns)
        totQuery = applyCustomerFilters(totQuery, filters)
        const { data: totRows, error: totErr } = await totQuery.range(fromIdx, fromIdx + PAGE - 1)
        if (fetchId !== fetchIdRef.current) return

        if (totErr && useGenerated) {
          useGenerated = false
          continue
        }
        if (totErr) break

        for (const c of totRows ?? []) {
          mrr += Number(
            (useGenerated ? c.effective_mrr : null) ?? c.mrr_override ?? c.calculated_mrr ?? 0
          )
          revenue += Number(
            (useGenerated ? c.effective_total_revenue : null) ??
              c.total_revenue_override ??
              c.calculated_total_revenue ??
              0
          )
        }
        if (!totRows || totRows.length < PAGE) break
        fromIdx += PAGE
      }
      if (fetchId !== fetchIdRef.current) return
      setFilteredTotals({
        mrr,
        revenue,
        filtered: hasActiveFilters(filters),
      })
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

  const applyFilters = useCallback((f: CustomerFilters) => {
    setFilters(f)
    setPagination((prev) => ({ ...prev, page: 1 }))
    setSelectedIds(new Set())
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
    filteredTotals,
    setFilters: applyFilters,
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
