import { useState, useCallback } from 'react'
import { LogOut, FileSpreadsheet, Activity, AlertTriangle, FilterX, Search } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCustomers } from '../hooks/useCustomers'
import { useKpis } from '../hooks/useKpis'
import { useSyncStatus } from '../hooks/useSyncStatus'
import KpiCards from '../components/KpiCards'
import CustomerTable from '../components/CustomerTable'
import { hasActiveFilters } from '../types'
import CustomerDetail from '../components/CustomerDetail'
import EditCustomerModal from '../components/EditCustomerModal'
import SyncControls from '../components/SyncControls'
import BulkActions from '../components/BulkActions'
import ExportButton from '../components/ExportButton'
import ImportWizard from '../components/ImportWizard'
import DataHealthPanel from '../components/DataHealthPanel'
import SavedViewsMenu from '../components/SavedViewsMenu'
import SyncLogsPanel from '../components/SyncLogsPanel'
import type { CrmCustomer } from '../types'

export default function CrmDashboardPage() {
  const { user, signOut } = useAuth()
  const {
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
    columnWidths,
    setColumnFilter,
    setSearch,
    clearFilters,
    setSort,
    setPage,
    setPageSize,
    setColumnOrder,
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
    refresh,
  } = useCustomers(user?.id)
  const { kpis, loading: kpisLoading, refresh: refreshKpis } = useKpis()

  const handleRefresh = useCallback(() => {
    refresh()
    refreshKpis()
  }, [refresh, refreshKpis])

  const { states, syncing, error: syncError, triggerSync, triggerShopifySync, lastShopifyLog, shopifyProgress } = useSyncStatus(handleRefresh)

  const [viewCustomer, setViewCustomer] = useState<CrmCustomer | null>(null)
  const [editCustomer, setEditCustomer] = useState<CrmCustomer | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [showSidebar, setShowSidebar] = useState<'health' | 'logs' | null>(null)

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 shrink-0 z-30">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 shrink-0">CRM</h1>
            <SyncControls
              states={states}
              syncing={syncing}
              lastShopifyLog={lastShopifyLog}
              shopifyProgress={shopifyProgress}
              onSync={triggerSync}
              onShopifySync={triggerShopifySync}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSidebar(showSidebar === 'health' ? null : 'health')}
              className={`p-2 rounded-lg border text-sm transition-colors ${
                showSidebar === 'health' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-300 text-gray-500 hover:text-gray-700'
              }`}
              title="Data Health"
            >
              <AlertTriangle size={16} />
            </button>
            <button
              onClick={() => setShowSidebar(showSidebar === 'logs' ? null : 'logs')}
              className={`p-2 rounded-lg border text-sm transition-colors ${
                showSidebar === 'logs' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-300 text-gray-500 hover:text-gray-700'
              }`}
              title="Sync Logs"
            >
              <Activity size={16} />
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:border-primary hover:text-primary transition-colors"
            >
              <FileSpreadsheet size={14} />
              Import
            </button>
            <span className="text-xs text-gray-400 hidden sm:inline">{user?.email}</span>
            <button
              onClick={signOut}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Main content */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
          <div className="max-w-[1600px] mx-auto space-y-6">
          {/* KPI cards */}
          <KpiCards kpis={kpis} loading={kpisLoading} />

          {/* Error banners */}
          {syncError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              <strong>Sync error:</strong> {syncError}
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {/* Filters + actions row */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, email, or URL"
                  className="w-64 max-w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white"
                  aria-label="Search name, email, or URL"
                />
              </div>
              <SavedViewsMenu
                views={views}
                activeViewId={activeViewId}
                defaultViewId={defaultViewId}
                viewDirty={viewDirty}
                onSelect={selectView}
                onSave={saveCurrentView}
                onSaveAs={saveViewAs}
                onSetDefault={setDefaultView}
                onDelete={deleteView}
              />
              <button
                type="button"
                onClick={clearFilters}
                disabled={!hasActiveFilters(filters, search)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed bg-white"
                title="Clear search and column filters"
              >
                <FilterX size={14} />
                Clear Filters
              </button>
              <BulkActions
                selectedIds={selectedIds}
                customers={customers}
                onClearSelection={clearSelection}
                onRefresh={handleRefresh}
              />
              <div className="flex-1" />
              <ExportButton filters={filters} search={search} mode="filtered" />
              <ExportButton filters={filters} mode="all" />
            </div>
          </div>

          {/* Customer table */}
          <CustomerTable
            customers={customers}
            loading={loading}
            sortField={sortField}
            sortDirection={sortDirection}
            pagination={pagination}
            selectedIds={selectedIds}
            filteredTotals={filteredTotals}
            columnOrder={columnOrder}
            columnWidths={columnWidths}
            filters={filters}
            onSort={setSort}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onView={setViewCustomer}
            onEdit={setEditCustomer}
            onColumnOrderChange={setColumnOrder}
            onColumnWidthChange={setColumnWidth}
            onFilterChange={setColumnFilter}
          />
          </div>
        </main>

        {/* Right sidebar sits in the layout below the header so its actions stay clickable */}
        {showSidebar && (
          <aside className="w-[360px] shrink-0 bg-white border-l border-gray-200 overflow-y-auto p-4">
            {showSidebar === 'health' && (
              <>
                <h2 className="text-sm font-bold text-gray-900 mb-4">Data Health</h2>
                <DataHealthPanel />
              </>
            )}
            {showSidebar === 'logs' && (
              <>
                <h2 className="text-sm font-bold text-gray-900 mb-4">Sync Activity</h2>
                <SyncLogsPanel />
              </>
            )}
          </aside>
        )}
      </div>

      {/* Customer detail slide-over */}
      {viewCustomer && (
        <>
          <div className="fixed inset-0 bg-black/20 z-30" onClick={() => setViewCustomer(null)} />
          <CustomerDetail
            customer={viewCustomer}
            onClose={() => setViewCustomer(null)}
            onEdit={() => {
              setEditCustomer(viewCustomer)
            }}
            onRefresh={handleRefresh}
          />
        </>
      )}

      {/* Edit modal */}
      {editCustomer && (
        <EditCustomerModal
          customer={editCustomer}
          onClose={() => setEditCustomer(null)}
          onSaved={() => {
            setEditCustomer(null)
            handleRefresh()
          }}
        />
      )}

      {/* Import wizard */}
      {showImport && (
        <ImportWizard
          onClose={() => setShowImport(false)}
          onComplete={handleRefresh}
        />
      )}
    </div>
  )
}
