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
import {
  ALL_CUSTOMERS_VIEW_ID,
  DEFAULT_GRID_PREFS,
  loadGridWorkspace,
  prefsEqual,
  sanitizePrefs,
  saveGridWorkspace,
  snapshotPrefs,
  type GridPrefs,
  type SavedGridView,
} from '../grid/prefs'

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
  search: string
  sortField: SortField
  sortDirection: SortDirection
  selectedIds: Set<string>
  filteredTotals: FilteredTotals
  columnOrder: GridColumnId[]
  visibleColumns: GridColumnId[]
  columnWidths: Partial<Record<GridColumnId, number>>
  setFilters: (f: CustomerFilters) => void
  setColumnFilter: (id: GridColumnId, filter: ColumnFilter | undefined) => void
  setSearch: (value: string) => void
  clearFilters: () => void
  setSort: (field: SortField, dir?: SortDirection) => void
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  setColumnOrder: (order: GridColumnId[]) => void
  setVisibleColumns: (visible: GridColumnId[]) => void
  setColumnWidth: (id: GridColumnId, width: number) => void
  views: SavedGridView[]
  activeViewId: string
  defaultViewId: string
  viewDirty: boolean
  selectView: (id: string) => void
  saveCurrentView: () => void
  saveViewAs: (name: string) => void
  setDefaultView: (id: string) => void
  deleteView: (id: string) => void
  toggleSelect: (id: string) => void
  toggleSelectAll: () => void
  clearSelection: () => void
  selectAll: () => void
  refresh: () => void
}

export function useCustomers(userId?: string | null): UseCustomersReturn {
  const initial = useRef(loadGridWorkspace(userId ?? undefined))
  const uid = userId ?? undefined

  const [customers, setCustomers] = useState<CrmCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFiltersState] = useState<CustomerFilters>(initial.current.prefs.filters)
  const [search, setSearchState] = useState(initial.current.prefs.search ?? '')
  const [searchApplied, setSearchApplied] = useState((initial.current.prefs.search ?? '').trim())
  const [sortField, setSortField] = useState<SortField>(initial.current.prefs.sortField)
  const [sortDirection, setSortDirection] = useState<SortDirection>(initial.current.prefs.sortDirection)
  const [columnOrder, setColumnOrderState] = useState<GridColumnId[]>(initial.current.prefs.order)
  const [visibleColumns, setVisibleColumnsState] = useState<GridColumnId[]>(initial.current.prefs.visible)
  const [columnWidths, setColumnWidths] = useState<Partial<Record<GridColumnId, number>>>(initial.current.prefs.widths)
  const [views, setViews] = useState<SavedGridView[]>(initial.current.views)
  const [activeViewId, setActiveViewId] = useState<string>(initial.current.activeViewId ?? ALL_CUSTOMERS_VIEW_ID)
  const [defaultViewId, setDefaultViewId] = useState<string>(initial.current.defaultViewId ?? ALL_CUSTOMERS_VIEW_ID)
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 50,
    total: 0,
  })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filteredTotals, setFilteredTotals] = useState<FilteredTotals>({ mrr: 0, revenue: 0, filtered: false })
  const fetchIdRef = useRef(0)
  const hasLoadedRef = useRef(false)

  const currentPrefs = (): GridPrefs => ({
    order: columnOrder,
    visible: visibleColumns,
    widths: columnWidths,
    sortField,
    sortDirection,
    filters,
    search,
  })

  const activeSaved = views.find((v) => v.id === activeViewId)
  const baseline = activeViewId === ALL_CUSTOMERS_VIEW_ID ? DEFAULT_GRID_PREFS : activeSaved?.prefs
  const viewDirty = !baseline || !prefsEqual(currentPrefs(), baseline)

  useEffect(() => {
    saveGridWorkspace(uid, {
      prefs: currentPrefs(),
      views,
      defaultViewId,
      activeViewId,
    })
    // currentPrefs is derived each render; persist the snapshot we just built
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, columnOrder, visibleColumns, columnWidths, sortField, sortDirection, filters, search, views, defaultViewId, activeViewId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = search.trim()
      setSearchApplied((prev) => (prev === next ? prev : next))
    }, 300)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPagination((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }))
    setSelectedIds(new Set())
  }, [searchApplied])

  const fetchCustomers = useCallback(async () => {
    const fetchId = ++fetchIdRef.current
    if (!hasLoadedRef.current) setLoading(true)
    setError(null)

    try {
      let query = supabase.from('crm_customers').select('*', { count: 'exact' })
      query = applyCustomerFilters(query, filters, searchApplied)
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
        totQuery = applyCustomerFilters(totQuery, filters, searchApplied)
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
      setFilteredTotals({ mrr, revenue, filtered: hasActiveFilters(filters, searchApplied) })
    } catch (e) {
      if (fetchId === fetchIdRef.current) {
        setError(e instanceof Error ? e.message : 'Failed to fetch customers')
      }
    } finally {
      if (fetchId === fetchIdRef.current) {
        setLoading(false)
        hasLoadedRef.current = true
      }
    }
  }, [filters, searchApplied, sortField, sortDirection, pagination.page, pagination.pageSize])

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

  const setSearch = useCallback((value: string) => {
    setSearchState(value)
  }, [])

  const clearFilters = useCallback(() => {
    applyFilters(DEFAULT_FILTERS)
    setSearchState('')
    setSearchApplied('')
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

  const setVisibleColumns = useCallback((visible: GridColumnId[]) => {
    setVisibleColumnsState(visible)
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

  const applyLayout = useCallback((prefs: GridPrefs) => {
    const next = sanitizePrefs(prefs)
    setFiltersState(next.filters)
    setSearchState(next.search)
    setSearchApplied(next.search.trim())
    setSortField(next.sortField)
    setSortDirection(next.sortDirection)
    setColumnOrderState(next.order)
    setVisibleColumnsState(next.visible)
    setColumnWidths(next.widths)
    setPagination((prev) => ({ ...prev, page: 1 }))
    setSelectedIds(new Set())
  }, [])

  const selectView = useCallback(
    (id: string) => {
      const view = id === ALL_CUSTOMERS_VIEW_ID ? { prefs: DEFAULT_GRID_PREFS } : views.find((v) => v.id === id)
      if (!view) return
      setActiveViewId(id)
      applyLayout(snapshotPrefs(view.prefs))
    },
    [views, applyLayout],
  )

  const saveCurrentView = useCallback(() => {
    const prefs = snapshotPrefs(sanitizePrefs(currentPrefs()))
    if (activeViewId === ALL_CUSTOMERS_VIEW_ID) return
    setViews((prev) => prev.map((v) => (v.id === activeViewId ? { ...v, prefs } : v)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeViewId, columnOrder, visibleColumns, columnWidths, sortField, sortDirection, filters])

  const saveViewAs = useCallback(
    (name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return
      const id = `view_${Date.now().toString(36)}`
      const next: SavedGridView = { id, name: trimmed, prefs: snapshotPrefs(sanitizePrefs(currentPrefs())) }
      setViews((prev) => [...prev, next])
      setActiveViewId(id)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [columnOrder, visibleColumns, columnWidths, sortField, sortDirection, filters],
  )

  const setDefaultView = useCallback((id: string) => {
    setDefaultViewId(id)
  }, [])

  const deleteView = useCallback(
    (id: string) => {
      if (id === ALL_CUSTOMERS_VIEW_ID) return
      setViews((prev) => prev.filter((v) => v.id !== id))
      setDefaultViewId((prev) => (prev === id ? ALL_CUSTOMERS_VIEW_ID : prev))
      if (activeViewId === id) {
        setActiveViewId(ALL_CUSTOMERS_VIEW_ID)
        applyLayout(DEFAULT_GRID_PREFS)
      }
    },
    [activeViewId, applyLayout],
  )

  return {
    customers,
    loading,
    error,
    pagination,
    filters,
    search,
    sortField,
    sortDirection,
    selectedIds,
    filteredTotals,
    columnOrder,
    visibleColumns,
    columnWidths,
    setFilters: applyFilters,
    setColumnFilter,
    setSearch,
    clearFilters,
    setSort,
    setPage,
    setPageSize,
    setColumnOrder,
    setVisibleColumns,
    setColumnWidth,
    views,
    activeViewId,
    defaultViewId,
    viewDirty,
    selectView,
    saveCurrentView,
    saveViewAs,
    setDefaultView,
    deleteView,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    selectAll,
    refresh: fetchCustomers,
  }
}
