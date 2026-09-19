import { useEffect, useRef, useState } from 'react'
import { Columns3 } from 'lucide-react'
import type { GridColumnId } from '../types'
import { COLUMN_BY_ID } from '../grid/columns'

interface ColumnSelectorProps {
  order: GridColumnId[]
  visible: GridColumnId[]
  onChange: (visible: GridColumnId[]) => void
}

export default function ColumnSelector({ order, visible, onChange }: ColumnSelectorProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const visibleSet = new Set(visible)
  const hiddenCount = order.filter((id) => !visibleSet.has(id)).length

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function toggle(id: GridColumnId) {
    if (visibleSet.has(id)) {
      if (visible.length <= 1) return
      onChange(visible.filter((col) => col !== id))
      return
    }
    onChange([...visible, id])
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:border-primary hover:text-primary bg-white"
        aria-expanded={open}
        aria-haspopup="true"
        title="Show or hide columns"
      >
        <Columns3 size={14} />
        Columns
        {hiddenCount > 0 && (
          <span className="text-[10px] text-gray-400">{hiddenCount} hidden</span>
        )}
        <span className="text-gray-400">▾</span>
      </button>
      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-40 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-1"
          role="menu"
          aria-label="Column visibility"
        >
          <p className="px-3 pt-2 pb-1 text-[11px] uppercase tracking-wider text-gray-400">Visible columns</p>
          {order.map((id) => {
            const col = COLUMN_BY_ID[id]
            if (!col) return null
            const checked = visibleSet.has(id)
            return (
              <label
                key={id}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={checked && visible.length <= 1}
                  onChange={() => toggle(id)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                {col.label}
              </label>
            )
          })}
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => onChange([...order])}
              className="w-full text-left px-3 py-1.5 mt-1 border-t border-gray-100 text-xs text-primary hover:bg-gray-50"
            >
              Show all columns
            </button>
          )}
        </div>
      )}
    </div>
  )
}
