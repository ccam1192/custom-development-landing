import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { CustomerFilters } from '../types'
import { applyCustomerFilters } from '../grid/applyFilters'
import * as XLSX from 'xlsx'

interface ExportButtonProps {
  filters: CustomerFilters
  search?: string
  mode: 'filtered' | 'all'
}

export default function ExportButton({ filters, search, mode }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false)

  async function handleExport(format: 'csv' | 'xlsx') {
    setExporting(true)

    try {
      let query = supabase.from('crm_customers').select('*')

      if (mode === 'filtered') {
        query = applyCustomerFilters(query, filters, search)
      }

      query = query.order('name')

      const { data, error } = await query
      if (error || !data) {
        alert('Export failed: ' + (error?.message ?? 'No data'))
        setExporting(false)
        return
      }

      const rows = data.map((c) => ({
        'Name': c.name ?? '',
        'Email': c.email ?? '',
        'Signup Date': c.signup_date ? new Date(c.signup_date).toISOString().split('T')[0] : '',
        'Store URL': c.store_url ?? '',
        'User Type': c.user_type,
        'Billing Channel': c.billing_channel,
        'Client Status': c.client_status,
        'Usage Charge Applied': c.usage_charge_applied ? 'Yes' : 'No',
        'Free Trial Started': c.shopify_subscription_created_at
          ? new Date(c.shopify_subscription_created_at).toISOString().split('T')[0]
          : '',
        'Last Payment': c.last_payment ? new Date(c.last_payment).toISOString().split('T')[0] : '',
        'Cancellation Date': c.cancellation_date ? new Date(c.cancellation_date).toISOString().split('T')[0] : '',
        'MRR': c.mrr_override ?? c.calculated_mrr,
        'Total Revenue': Math.max(
          Number(c.total_revenue_override ?? 0),
          Number(c.calculated_total_revenue ?? 0)
        ),
        'Source': c.source ?? '',
        'Notes': c.notes ?? '',
        'Boardroom User ID': c.boardroom_user_id ?? '',
        'Stripe Customer ID': c.stripe_customer_id ?? '',
        'Shopify Shop ID': c.shopify_shop_id ?? '',
      }))

      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'CRM Export')

      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `crm-export-${mode}-${timestamp}`

      if (format === 'csv') {
        XLSX.writeFile(wb, `${filename}.csv`, { bookType: 'csv' })
      } else {
        XLSX.writeFile(wb, `${filename}.xlsx`)
      }
    } finally {
      setExporting(false)
    }
  }

  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={exporting}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:border-primary hover:text-primary disabled:opacity-50 transition-colors bg-white"
      >
        {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
        Export {mode === 'filtered' ? 'Filtered' : 'All'}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white rounded-lg border border-gray-200 shadow-lg z-40 py-1 min-w-[120px]">
            <button
              onClick={() => { handleExport('csv'); setOpen(false) }}
              className="w-full px-3 py-1.5 text-sm text-left text-gray-700 hover:bg-gray-50"
            >
              Export CSV
            </button>
            <button
              onClick={() => { handleExport('xlsx'); setOpen(false) }}
              className="w-full px-3 py-1.5 text-sm text-left text-gray-700 hover:bg-gray-50"
            >
              Export XLSX
            </button>
          </div>
        </>
      )}
    </div>
  )
}
