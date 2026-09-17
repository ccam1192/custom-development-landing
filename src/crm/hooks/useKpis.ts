import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { CrmKpis } from '../types'

const EMPTY_KPIS: CrmKpis = {
  totalActiveCustomers: 0,
  totalInTrial: 0,
  totalActiveUsers: 0,
  lifetimePayingCustomers: 0,
  totalRevenue: 0,
  aclv: 0,
  mrr: 0,
  totalCancellations: 0,
  customerCancellations: 0,
  totalSignups: 0,
}

export function useKpis() {
  const [kpis, setKpis] = useState<CrmKpis>(EMPTY_KPIS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchKpis = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch all customers for KPI calculations
      // For large datasets, this should move to a database function/view
      const { data, error: err } = await supabase
        .from('crm_customers')
        .select('client_status, effective_mrr, effective_total_revenue, calculated_total_revenue, total_revenue_override')

      if (err) {
        setError(err.message)
        return
      }

      const customers = data ?? []

      const totalActiveCustomers = customers.filter((c) => c.client_status === 'active_customer').length
      const totalInTrial = customers.filter((c) => c.client_status === 'in_trial').length
      const totalActiveUsers = totalActiveCustomers + totalInTrial
      const totalCancellations = customers.filter((c) => c.client_status === 'canceled').length

      let totalRevenue = 0
      let lifetimePayingCustomers = 0
      let customerCancellations = 0
      let mrr = 0

      for (const c of customers) {
        const rev = c.effective_total_revenue ?? 0
        totalRevenue += rev
        if (rev > 0) lifetimePayingCustomers++
        if (c.client_status === 'canceled' && rev > 0) customerCancellations++
        if (c.client_status === 'active_customer') {
          mrr += c.effective_mrr ?? 0
        }
      }

      const aclv = lifetimePayingCustomers > 0 ? totalRevenue / lifetimePayingCustomers : 0
      const totalSignups = totalActiveUsers + totalCancellations

      setKpis({
        totalActiveCustomers,
        totalInTrial,
        totalActiveUsers,
        lifetimePayingCustomers,
        totalRevenue,
        aclv,
        mrr,
        totalCancellations,
        customerCancellations,
        totalSignups,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to calculate KPIs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchKpis()
  }, [fetchKpis])

  return { kpis, loading, error, refresh: fetchKpis }
}
