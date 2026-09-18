import type { CustomerFilters, GridColumnId, SortDirection, SortField } from '../types'
import { DEFAULT_COLUMN_ORDER, COLUMN_BY_ID } from './columns'

export interface GridPrefs {
  order: GridColumnId[]
  widths: Partial<Record<GridColumnId, number>>
  sortField: SortField
  sortDirection: SortDirection
  filters: CustomerFilters
}

export const DEFAULT_GRID_PREFS: GridPrefs = {
  order: [...DEFAULT_COLUMN_ORDER],
  widths: {},
  sortField: 'created_at',
  sortDirection: 'desc',
  filters: {},
}

function storageKey(userId: string | undefined): string {
  return `crm-grid-prefs:${userId || 'local'}`
}

function sanitizeOrder(order: unknown): GridColumnId[] {
  const known = new Set(DEFAULT_COLUMN_ORDER)
  const seen = new Set<GridColumnId>()
  const next: GridColumnId[] = []
  if (Array.isArray(order)) {
    for (const id of order) {
      if (typeof id === 'string' && known.has(id as GridColumnId) && !seen.has(id as GridColumnId)) {
        next.push(id as GridColumnId)
        seen.add(id as GridColumnId)
      }
    }
  }
  for (const id of DEFAULT_COLUMN_ORDER) {
    if (!seen.has(id)) next.push(id)
  }
  return next
}

export function loadGridPrefs(userId: string | undefined): GridPrefs {
  if (typeof window === 'undefined') return DEFAULT_GRID_PREFS
  try {
    const raw = window.localStorage.getItem(storageKey(userId))
    if (!raw) return DEFAULT_GRID_PREFS
    const parsed = JSON.parse(raw) as Partial<GridPrefs>
    const widths: Partial<Record<GridColumnId, number>> = {}
    if (parsed.widths && typeof parsed.widths === 'object') {
      for (const [id, width] of Object.entries(parsed.widths)) {
        const def = COLUMN_BY_ID[id as GridColumnId]
        if (def && typeof width === 'number' && Number.isFinite(width)) {
          widths[id as GridColumnId] = Math.max(def.minWidth, Math.min(720, Math.round(width)))
        }
      }
    }
    return {
      order: sanitizeOrder(parsed.order),
      widths,
      sortField: typeof parsed.sortField === 'string' ? (parsed.sortField as SortField) : DEFAULT_GRID_PREFS.sortField,
      sortDirection: parsed.sortDirection === 'asc' || parsed.sortDirection === 'desc' ? parsed.sortDirection : 'desc',
      filters: parsed.filters && typeof parsed.filters === 'object' ? parsed.filters : {},
    }
  } catch {
    return DEFAULT_GRID_PREFS
  }
}

export function saveGridPrefs(userId: string | undefined, prefs: GridPrefs) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(prefs))
  } catch {
    /* quota / private mode */
  }
}
