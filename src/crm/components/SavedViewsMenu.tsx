import { useEffect, useRef, useState } from 'react'
import { Bookmark, Check, Star, Trash2 } from 'lucide-react'
import { ALL_CUSTOMERS_VIEW_ID, type SavedGridView } from '../grid/prefs'

interface SavedViewsMenuProps {
  views: SavedGridView[]
  activeViewId: string
  defaultViewId: string
  viewDirty: boolean
  onSelect: (id: string) => void
  onSave: () => void
  onSaveAs: (name: string) => void
  onSetDefault: (id: string) => void
  onDelete: (id: string) => void
}

export default function SavedViewsMenu({
  views,
  activeViewId,
  defaultViewId,
  viewDirty,
  onSelect,
  onSave,
  onSaveAs,
  onSetDefault,
  onDelete,
}: SavedViewsMenuProps) {
  const [open, setOpen] = useState(false)
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const activeName =
    activeViewId === ALL_CUSTOMERS_VIEW_ID
      ? 'All customers'
      : views.find((v) => v.id === activeViewId)?.name ?? 'All customers'

  useEffect(() => {
    if (naming) inputRef.current?.focus()
  }, [naming])

  function close() {
    setOpen(false)
    setNaming(false)
    setName('')
  }

  function submitName() {
    const trimmed = name.trim()
    if (!trimmed) return
    onSaveAs(trimmed)
    close()
  }

  const canSave = viewDirty && activeViewId !== ALL_CUSTOMERS_VIEW_ID
  const canDelete = activeViewId !== ALL_CUSTOMERS_VIEW_ID

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:border-primary hover:text-primary bg-white"
        title="Saved views: columns, filters, and sorting"
      >
        <Bookmark size={14} />
        <span className="max-w-[160px] truncate">{activeName}</span>
        {viewDirty && activeViewId !== ALL_CUSTOMERS_VIEW_ID && (
          <span className="text-[10px] text-amber-600">unsaved</span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={close} />
          <div className="absolute left-0 top-full mt-1 z-40 w-64 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
            <p className="px-3 pt-2 pb-1 text-[11px] uppercase tracking-wider text-gray-400">Views</p>
            <ViewRow
              label="All customers"
              selected={activeViewId === ALL_CUSTOMERS_VIEW_ID}
              isDefault={defaultViewId === ALL_CUSTOMERS_VIEW_ID}
              onClick={() => {
                onSelect(ALL_CUSTOMERS_VIEW_ID)
                close()
              }}
            />
            {views.map((view) => (
              <ViewRow
                key={view.id}
                label={view.name}
                selected={activeViewId === view.id}
                isDefault={defaultViewId === view.id}
                onClick={() => {
                  onSelect(view.id)
                  close()
                }}
              />
            ))}
            <div className="border-t border-gray-100 mt-1 pt-1">
              {naming ? (
                <form
                  className="px-2 pb-1"
                  onSubmit={(e) => {
                    e.preventDefault()
                    submitName()
                  }}
                >
                  <input
                    ref={inputRef}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="View name"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-primary"
                  />
                  <div className="flex justify-end gap-2 mt-1">
                    <button type="button" className="text-xs text-gray-500" onClick={() => setNaming(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="text-xs text-primary font-medium">
                      Save
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={!canSave}
                    className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    onClick={() => {
                      onSave()
                      close()
                    }}
                  >
                    Save view
                  </button>
                  <button
                    type="button"
                    className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setNaming(true)}
                  >
                    Save as new view…
                  </button>
                  <button
                    type="button"
                    className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => {
                      onSetDefault(activeViewId)
                      close()
                    }}
                  >
                    Set as default view
                  </button>
                  <button
                    type="button"
                    disabled={!canDelete}
                    className="w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                    onClick={() => {
                      onDelete(activeViewId)
                      close()
                    }}
                  >
                    <Trash2 size={12} />
                    Delete view
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ViewRow({
  label,
  selected,
  isDefault,
  onClick,
}: {
  label: string
  selected: boolean
  isDefault: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 hover:bg-gray-50 ${
        selected ? 'text-gray-900 font-medium' : 'text-gray-700'
      }`}
      onClick={onClick}
    >
      <span className="w-4 shrink-0">{selected ? <Check size={14} className="text-primary" /> : null}</span>
      <span className="flex-1 truncate">{label}</span>
      {isDefault && <Star size={12} className="text-amber-500 fill-amber-500 shrink-0" />}
    </button>
  )
}
