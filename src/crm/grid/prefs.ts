import type { CustomerFilters, GridColumnId, SortDirection, SortField } from '../types'
import { DEFAULT_COLUMN_ORDER, COLUMN_BY_ID } from './columns'

export interface GridPrefs {
  order: GridColumnId[]
  widths: Partial<Record<GridColumnId, number>>
  sortField: SortField
  sortDirection: SortDirection
  filters: CustomerFilters
}

export interface SavedGridView {
  id: string
  name: string
  prefs: GridPrefs
}

export interface GridWorkspace {
  prefs: GridPrefs
  views: SavedGridView[]
  defaultViewId: string | null
  activeViewId: string | null
}

export const ALL_CUSTOMERS_VIEW_ID = '__all__'

export const DEFAULT_GRID_PREFS: GridPrefs = {
  order: [...DEFAULT_COLUMN_ORDER],
  widths: {},
  sortField: 'created_at',
  sortDirection: 'desc',
  filters: {},
}

export const DEFAULT_WORKSPACE: GridWorkspace = {
  prefs: DEFAULT_GRID_PREFS,
  views: [],
  defaultViewId: ALL_CUSTOMERS_VIEW_ID,
  activeViewId: ALL_CUSTOMERS_VIEW_ID,
}

function storageKey(userId: string | undefined): string {
  return `crm-grid-prefs:${userId || 'local'}`
}

export function sanitizeOrder(order: unknown): GridColumnId[] {
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

export function sanitizePrefs(parsed: Partial<GridPrefs> | undefined): GridPrefs {
  const widths: Partial<Record<GridColumnId, number>> = {}
  if (parsed?.widths && typeof parsed.widths === 'object') {
    for (const [id, width] of Object.entries(parsed.widths)) {
      const def = COLUMN_BY_ID[id as GridColumnId]
      if (def && typeof width === 'number' && Number.isFinite(width)) {
        widths[id as GridColumnId] = Math.max(def.minWidth, Math.min(720, Math.round(width)))
      }
    }
  }
  return {
    order: sanitizeOrder(parsed?.order),
    widths,
    sortField: typeof parsed?.sortField === 'string' ? (parsed.sortField as SortField) : DEFAULT_GRID_PREFS.sortField,
    sortDirection: parsed?.sortDirection === 'asc' || parsed?.sortDirection === 'desc' ? parsed.sortDirection : 'desc',
    filters: parsed?.filters && typeof parsed.filters === 'object' ? parsed.filters : {},
  }
}

export function snapshotPrefs(prefs: GridPrefs): GridPrefs {
  return JSON.parse(JSON.stringify(prefs)) as GridPrefs
}

export function prefsEqual(a: GridPrefs, b: GridPrefs): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function loadGridWorkspace(userId: string | undefined): GridWorkspace {
  if (typeof window === 'undefined') return DEFAULT_WORKSPACE
  try {
    const raw = window.localStorage.getItem(storageKey(userId))
    if (!raw) return DEFAULT_WORKSPACE
    const parsed = JSON.parse(raw) as Partial<GridWorkspace> & Partial<GridPrefs>
    const views = Array.isArray(parsed.views)
      ? parsed.views
          .filter((v) => v && typeof v.id === 'string' && typeof v.name === 'string' && v.prefs)
          .map((v) => ({ id: v.id, name: v.name, prefs: sanitizePrefs(v.prefs) }))
      : []
    const prefs = sanitizePrefs(parsed.prefs ?? parsed)
    const defaultViewId =
      parsed.defaultViewId === ALL_CUSTOMERS_VIEW_ID || views.some((v) => v.id === parsed.defaultViewId)
        ? parsed.defaultViewId ?? ALL_CUSTOMERS_VIEW_ID
        : ALL_CUSTOMERS_VIEW_ID
    const activeViewId =
      parsed.activeViewId === ALL_CUSTOMERS_VIEW_ID || views.some((v) => v.id === parsed.activeViewId)
        ? parsed.activeViewId ?? defaultViewId
        : defaultViewId
    const defaultSaved = views.find((v) => v.id === defaultViewId)
    return {
      prefs: defaultSaved ? snapshotPrefs(defaultSaved.prefs) : prefs,
      views,
      defaultViewId,
      activeViewId: defaultSaved ? defaultViewId : activeViewId,
    }
  } catch {
    return DEFAULT_WORKSPACE
  }
}

export function saveGridWorkspace(userId: string | undefined, workspace: GridWorkspace) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(workspace))
  } catch {
    /* quota / private mode */
  }
}

export function loadGridPrefs(userId: string | undefined): GridPrefs {
  return loadGridWorkspace(userId).prefs
}

export function saveGridPrefs(userId: string | undefined, prefs: GridPrefs) {
  const workspace = loadGridWorkspace(userId)
  saveGridWorkspace(userId, { ...workspace, prefs })
}
