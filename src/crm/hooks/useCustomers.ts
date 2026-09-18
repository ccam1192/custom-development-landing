import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import type {
  ColumnFilter,
  CrmCustomer,
  CustomerFilters,
  GridColumnId,
  SortDirection,
  SortField,
  PaginationState,
} from '../types'
import { DEFAULT_FILTERS, hasActiveFilters } from '../types'
import { applyCustomerFilters } from '../grid/applyFilters'
import { loadGridPrefs, saveGridPrefs, type GridPrefs } from '../grid/prefs'

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
  columnOrder: GridColumnId[]
  columnWidths: Partial<Record<GridColumnId, number>>
  setFilters: (f: CustomerFilters) => void
  setColumnFilter: (id: GridColumnId, filter: ColumnFilter | undefined) => void
  clearFilters: () => void
  setSort: (field: SortField, dir?: SortDirection) => void
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  setColumnOrder: (order: GridColumnId[]) => void
  setColumnWidth: (id: GridColumnId, width: number) => void
  toggleSelect: (id: string) => void
  toggleSelectAll: () => void
  clearSelection: () => void
  selectAll: () => void
  refresh: () => void
}

export function useCustomers(userId?: string | null): UseCustomersReturn {
  const initial = useRef<GridPrefs | null>(null)
  if (!initial.current) initial.current = loadGridPrefs(userId ?? undefined)

  const [customers, setCustomers] = useState<CrmCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFiltersState] = useState<CustomerFilters>(initial.current.filters)
  const [sortField, setSortField] = useState<SortField>(initial.current.sortField)
  const [sortDirection, setSortDirection] = useState<SortDirection>(initial.current.sortDirection)
  const [columnOrder, setColumnOrderState] = useState<GridColumnId[]>(initial.current.order)
  const [columnWidths, setColumnWidths] = useState<Partial<Record<GridColumnId, number>>>(initial.current.widths)
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 50,
    total: 0,
  })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filteredTotals, setFilteredTotals] = useState<FilteredTotals>({ mrr: 0, revenue: 0, filtered: false })
  const fetchIdRef = useRef(0)

  useEffect(() => {
    saveGridPrefs(userId ?? undefined, {
      order: columnOrder,
      widths: columnWidths,
      sortField,
      sortDirection,
      filters,
    })
  }, [userId, columnOrder, columnWidths, sortField, sortDirection, filters])

  const fetchCustomers = useCallback(async () => {
    const fetchId = ++fetchIdRef.current
    setLoading(true)
    setError(null)

    try {
      let query = supabase.from('crm_customers').select('*', { count: 'exact' })
      query = applyCustomerFilters(query, filters)
      query = query.order(sortField, { ascending: sortDirection === 'asc', nullsFirst: false })

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

      const PAGE = 1000
      let mrr = 0
      let revenue = 0
      let fromIdx = 0
      for (;;) {
        let totQuery = supabase
          .from('crm_customers')
          .select('mrr_override, calculated_mrr, total_revenue_override, calculated_total_revenue')
        totQuery = applyCustomerFilters(totQuery, filters)
        const { data: totRows, error: totErr } = await totQuery.range(fromIdx, fromIdx + PAGE - 1)
        if (fetchId !== fetchIdRef.current) return
        if (totErr) break
        for (const c of totRows ?? []) {
          mrr += Number(c.mrr_override ?? c.calculated_mrr ?? 0)
          revenue += Number(c.total_revenue_override ?? c.calculated_total_revenue ?? 0)
        }
        if (!totRows || totRows.length < PAGE) break
        fromIdx += PAGE
      }
      if (fetchId !== fetchIdRef.current) return
      setFilteredTotals({ mrr, revenue, filtered: hasActiveFilters(filters) })
    } catch (e) {
      if (fetchId === fetchIdRef.current) {
        setError(e instanceof Error ? e.message : 'Failed to fetch customers')
      }
    } finally {
      if (fetchId === fetchIdRef.current) setLoading(false)
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
    setFiltersState(f)
    setPagination((prev) => ({ ...prev, page: 1 }))
    setSelectedIds(new Set())
  }, [])

  const setColumnFilter = useCallback((id: GridColumnId, filter: ColumnFilter | undefined) => {
    setFiltersState((prev) => {
      const next = { ...prev }
      if (!filter) delete next[id]
      else next[id] = filter
      return next
    })
    setPagination((prev) => ({ ...prev, page: 1 }))
    setSelectedIds(new Set())
  }, [])

  const clearFilters = useCallback(() => {
    applyFilters(DEFAULT_FILTERS)
  }, [applyFilters])

  const setPage = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, page }))
    setSelectedIds(new Set())
  }, [])

  const setPageSize = useCallback((pageSize: number) => {
    setPagination((prev) => ({ ...prev, pageSize, page: 1 }))
    setSelectedIds(new Set())
  }, [])

  const setColumnOrder = useCallback((order: GridColumnId[]) => {
    setColumnOrderState(order)
  }, [])

  const setColumnWidth = useCallback((id: GridColumnId, width: number) => {
    setColumnWidths((prev) => ({ ...prev, [id]: width }))
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
    columnOrder,
    columnWidths,
    setFilters: applyFilters,
    setColumnFilter,
    clearFilters,
    setSort,
    setPage,
    setPageSize,
    setColumnOrder,
    setColumnWidth,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    selectAll,
    refresh: fetchCustomers,
  }
}
