import type { CustomerFilters, ColumnFilter, GridColumnId } from '../types'
import { isColumnFilterActive } from '../types'

function escapeIlike(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

function nextDay(dateValue: string): string {
  const d = new Date(`${dateValue}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

function applyText(query: any, column: string, filter: Extract<ColumnFilter, { kind: 'text' }>) {
  const raw = filter.value ?? ''
  const escaped = escapeIlike(raw)
  switch (filter.op) {
    case 'contains':
      return query.ilike(column, `%${escaped}%`)
    case 'not_contains':
      return query.not(column, 'ilike', `%${escaped}%`)
    case 'starts_with':
      return query.ilike(column, `${escaped}%`)
    case 'ends_with':
      return query.ilike(column, `%${escaped}`)
    case 'is':
      return query.eq(column, raw)
    case 'is_not':
      return query.neq(column, raw)
    case 'empty':
      return query.or(`${column}.is.null,${column}.eq.`)
    case 'not_empty':
      return query.not(column, 'is', null).neq(column, '')
    default:
      return query
  }
}

function applyDate(query: any, column: string, filter: Extract<ColumnFilter, { kind: 'date' }>) {
  const value = filter.value
  const valueTo = filter.valueTo
  switch (filter.op) {
    case 'empty':
      return query.is(column, null)
    case 'not_empty':
      return query.not(column, 'is', null)
    case 'is':
      return value ? query.gte(column, value).lt(column, nextDay(value)) : query
    case 'before':
      return value ? query.lt(column, value) : query
    case 'after':
      return value ? query.gte(column, nextDay(value)) : query
    case 'on_or_before':
      return value ? query.lt(column, nextDay(value)) : query
    case 'on_or_after':
      return value ? query.gte(column, value) : query
    case 'between':
      if (!value || !valueTo) return query
      return query.gte(column, value).lt(column, nextDay(valueTo))
    case 'older_than_days': {
      const days = Number(value)
      if (!Number.isFinite(days) || days < 0) return query
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      return query.lte(column, cutoff)
    }
    default:
      return query
  }
}

function applyNumber(query: any, column: string, filter: Extract<ColumnFilter, { kind: 'number' }>) {
  const value = filter.value
  const valueTo = filter.valueTo
  switch (filter.op) {
    case 'empty':
      return query.is(column, null)
    case 'not_empty':
      return query.not(column, 'is', null)
    case 'eq':
      return value != null ? query.eq(column, value) : query
    case 'neq':
      return value != null ? query.neq(column, value) : query
    case 'gt':
      return value != null ? query.gt(column, value) : query
    case 'gte':
      return value != null ? query.gte(column, value) : query
    case 'lt':
      return value != null ? query.lt(column, value) : query
    case 'lte':
      return value != null ? query.lte(column, value) : query
    case 'between':
      if (value == null || valueTo == null) return query
      return query.gte(column, value).lte(column, valueTo)
    default:
      return query
  }
}

export function applyKeywordSearch(query: any, search: string | undefined) {
  const term = search?.trim()
  if (!term) return query
  const escaped = escapeIlike(term).replace(/,/g, ' ').replace(/"/g, '')
  const pattern = `"%${escaped}%"`
  return query.or(
    `name.ilike.${pattern},email.ilike.${pattern},store_url.ilike.${pattern},shopify_shop_domain.ilike.${pattern}`
  )
}

export function applyCustomerFilters(query: any, filters: CustomerFilters, search?: string) {
  query = applyKeywordSearch(query, search)
  for (const key of Object.keys(filters) as GridColumnId[]) {
    const filter = filters[key]
    if (!isColumnFilterActive(filter) || !filter) continue
    if (filter.kind === 'enum') {
      if (key === 'usage_charge_applied') {
        const bools = filter.values
          .map((v) => (v === 'true' ? true : v === 'false' ? false : null))
          .filter((v): v is boolean => v !== null)
        if (bools.length) query = query.in(key, bools)
        continue
      }
      query = query.in(key, filter.values)
      continue
    }
    if (filter.kind === 'text') {
      query = applyText(query, key, filter)
      continue
    }
    if (filter.kind === 'date') {
      query = applyDate(query, key, filter)
      continue
    }
    query = applyNumber(query, key, filter)
  }
  return query
}
