import { useEffect, useRef } from 'react'
import type {
  ColumnFilter,
  DateFilterOp,
  NumberFilterOp,
  TextFilterOp,
} from '../types'
import type { GridColumnDef } from '../grid/columns'

const TEXT_OPS: Array<{ value: TextFilterOp; label: string }> = [
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does not contain' },
  { value: 'starts_with', label: 'Starts with' },
  { value: 'ends_with', label: 'Ends with' },
  { value: 'is', label: 'Is' },
  { value: 'is_not', label: 'Is not' },
  { value: 'empty', label: 'Is empty' },
  { value: 'not_empty', label: 'Is not empty' },
]

const DATE_OPS: Array<{ value: DateFilterOp; label: string }> = [
  { value: 'is', label: 'Is' },
  { value: 'before', label: 'Before' },
  { value: 'after', label: 'After' },
  { value: 'on_or_before', label: 'On or before' },
  { value: 'on_or_after', label: 'On or after' },
  { value: 'between', label: 'Is between' },
  { value: 'empty', label: 'Is empty' },
  { value: 'not_empty', label: 'Is not empty' },
]

const NUMBER_OPS: Array<{ value: NumberFilterOp; label: string }> = [
  { value: 'eq', label: 'Equals' },
  { value: 'neq', label: 'Does not equal' },
  { value: 'gt', label: 'Greater than' },
  { value: 'gte', label: 'Greater than or equal' },
  { value: 'lt', label: 'Less than' },
  { value: 'lte', label: 'Less than or equal' },
  { value: 'between', label: 'Between' },
  { value: 'empty', label: 'Is empty' },
  { value: 'not_empty', label: 'Is not empty' },
]

interface ColumnFilterMenuProps {
  column: GridColumnDef
  filter: ColumnFilter | undefined
  onChange: (filter: ColumnFilter | undefined) => void
  onClose: () => void
}

function defaultFilter(column: GridColumnDef): ColumnFilter {
  if (column.filterKind === 'enum') return { kind: 'enum', values: [] }
  if (column.filterKind === 'date') return { kind: 'date', op: 'on_or_after', value: null }
  if (column.filterKind === 'number') return { kind: 'number', op: 'gte', value: null }
  return { kind: 'text', op: 'contains', value: '' }
}

export default function ColumnFilterMenu({ column, filter, onChange, onClose }: ColumnFilterMenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const current = filter ?? defaultFilter(column)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={`Filter ${column.label}`}
      className="absolute top-full left-0 mt-1 z-50 w-[260px] bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-left normal-case tracking-normal font-normal"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {current.kind === 'text' && (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-500">
            Condition
            <select
              className="mt-1 w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
              value={current.op}
              onChange={(e) => onChange({ kind: 'text', op: e.target.value as TextFilterOp, value: current.value })}
            >
              {TEXT_OPS.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
          </label>
          {current.op !== 'empty' && current.op !== 'not_empty' && (
            <input
              autoFocus
              type="text"
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
              placeholder={column.label}
              value={current.value}
              onChange={(e) => onChange({ kind: 'text', op: current.op, value: e.target.value })}
            />
          )}
        </div>
      )}

      {current.kind === 'date' && (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-500">
            Condition
            <select
              className="mt-1 w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
              value={current.op}
              onChange={(e) =>
                onChange({ kind: 'date', op: e.target.value as DateFilterOp, value: current.value, valueTo: current.valueTo })
              }
            >
              {DATE_OPS.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
          </label>
          {current.op !== 'empty' && current.op !== 'not_empty' && (
            <label className="block text-xs font-medium text-gray-500">
              {current.op === 'between' ? 'From' : 'Date'}
              <input
                type="date"
                className="mt-1 w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                value={current.value ?? ''}
                onChange={(e) =>
                  onChange({
                    kind: 'date',
                    op: current.op,
                    value: e.target.value || null,
                    valueTo: current.valueTo,
                  })
                }
              />
            </label>
          )}
          {current.op === 'between' && (
            <label className="block text-xs font-medium text-gray-500">
              To
              <input
                type="date"
                className="mt-1 w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                value={current.valueTo ?? ''}
                onChange={(e) =>
                  onChange({
                    kind: 'date',
                    op: current.op,
                    value: current.value,
                    valueTo: e.target.value || null,
                  })
                }
              />
            </label>
          )}
        </div>
      )}

      {current.kind === 'number' && (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-500">
            Condition
            <select
              className="mt-1 w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
              value={current.op}
              onChange={(e) =>
                onChange({
                  kind: 'number',
                  op: e.target.value as NumberFilterOp,
                  value: current.value,
                  valueTo: current.valueTo,
                })
              }
            >
              {NUMBER_OPS.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
          </label>
          {current.op !== 'empty' && current.op !== 'not_empty' && (
            <input
              type="number"
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
              placeholder={current.op === 'between' ? 'From' : 'Amount'}
              value={current.value ?? ''}
              onChange={(e) =>
                onChange({
                  kind: 'number',
                  op: current.op,
                  value: e.target.value === '' ? null : Number(e.target.value),
                  valueTo: current.valueTo,
                })
              }
            />
          )}
          {current.op === 'between' && (
            <input
              type="number"
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
              placeholder="To"
              value={current.valueTo ?? ''}
              onChange={(e) =>
                onChange({
                  kind: 'number',
                  op: current.op,
                  value: current.value,
                  valueTo: e.target.value === '' ? null : Number(e.target.value),
                })
              }
            />
          )}
        </div>
      )}

      {current.kind === 'enum' && column.enumOptions && (
        <div className="space-y-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-500">Values</span>
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() =>
                onChange({
                  kind: 'enum',
                  values:
                    current.values.length === column.enumOptions!.length
                      ? []
                      : column.enumOptions!.map((o) => o.value),
                })
              }
            >
              {current.values.length === column.enumOptions.length ? 'Clear all' : 'Select all'}
            </button>
          </div>
          {column.enumOptions.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-700 py-0.5">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-primary focus:ring-primary"
                checked={current.values.includes(opt.value)}
                onChange={() => {
                  const values = current.values.includes(opt.value)
                    ? current.values.filter((v) => v !== opt.value)
                    : [...current.values, opt.value]
                  onChange({ kind: 'enum', values })
                }}
              />
              {opt.label}
            </label>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-gray-100">
        <button
          type="button"
          className="text-xs text-gray-500 hover:text-gray-800"
          onClick={() => {
            onChange(undefined)
            onClose()
          }}
        >
          Clear
        </button>
        <button type="button" className="text-xs text-primary font-medium" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  )
}
