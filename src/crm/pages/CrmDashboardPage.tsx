import { useState, useCallback } from 'react'
import { LogOut, FileSpreadsheet, Activity, AlertTriangle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCustomers } from '../hooks/useCustomers'
import { useKpis } from '../hooks/useKpis'
import { useSyncStatus } from '../hooks/useSyncStatus'
import KpiCards from '../components/KpiCards'
import FilterBar from '../components/FilterBar'
import CustomerTable from '../components/CustomerTable'
import CustomerDetail from '../components/CustomerDetail'
import EditCustomerModal from '../components/EditCustomerModal'
import SyncControls from '../components/SyncControls'
import BulkActions from '../components/BulkActions'
import ExportButton from '../components/ExportButton'
import ImportWizard from '../components/ImportWizard'
import DataHealthPanel from '../components/DataHealthPanel'
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
    sortField,
    sortDirection,
    selectedIds,
    filteredTotals,
    setFilters,
    setSort,
    setPage,
    setPageSize,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    refresh,
  } = useCustomers()
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
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900">Boardroom CRM</h1>
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

      <div className="flex">
        {/* Main content */}
        <main className={`flex-1 max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6 transition-all ${
          showSidebar ? 'mr-[360px]' : ''
        }`}>
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
            <FilterBar filters={filters} onChange={setFilters} />

            <div className="flex items-center gap-2 flex-wrap">
              <BulkActions
                selectedIds={selectedIds}
                customers={customers}
                onClearSelection={clearSelection}
                onRefresh={handleRefresh}
              />
              <div className="flex-1" />
              <ExportButton filters={filters} mode="filtered" />
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
            onSort={setSort}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onView={setViewCustomer}
            onEdit={setEditCustomer}
          />
        </main>

        {/* Right sidebar */}
        {showSidebar && (
          <aside className="fixed right-0 top-[57px] bottom-0 w-[360px] bg-white border-l border-gray-200 overflow-y-auto p-4 z-20">
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
