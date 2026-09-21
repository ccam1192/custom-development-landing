import { useState, useEffect, useCallback } from 'react'
import { X, ExternalLink, Edit, Save, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { CrmCustomer, CrmRevenueTransaction } from '../types'
import {
  CLIENT_STATUS_LABELS,
  CLIENT_STATUS_COLORS,
  BILLING_CHANNEL_LABELS,
  USER_TYPE_LABELS,
  SOURCE_LABELS,
  getDisplayMrr,
  getDisplayRevenue,
  hasMrrOverride,
  hasRevenueOverride,
} from '../types'

interface CustomerDetailProps {
  customer: CrmCustomer
  onClose: () => void
  onEdit: () => void
  onRefresh: () => void
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(d))
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-gray-100 pb-4 mb-4 last:border-0 last:pb-0 last:mb-0">
      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</h4>
      {children}
    </div>
  )
}

function Field({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-start py-1">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-medium text-right max-w-[60%] break-all ${highlight ? 'text-amber-700' : 'text-gray-900'}`}>
        {value}
      </span>
    </div>
  )
}

export default function CustomerDetail({ customer, onClose, onEdit, onRefresh }: CustomerDetailProps) {
  const [transactions, setTransactions] = useState<CrmRevenueTransaction[]>([])
  const [txLoading, setTxLoading] = useState(true)
  const [notes, setNotes] = useState(customer.notes ?? '')
  const [notesSaving, setNotesSaving] = useState(false)
  const [notesDirty, setNotesDirty] = useState(false)

  const fetchTransactions = useCallback(async () => {
    setTxLoading(true)
    const { data } = await supabase
      .from('crm_revenue_transactions')
      .select('*')
      .eq('crm_customer_id', customer.id)
      .order('transaction_date', { ascending: false })
      .limit(100)

    setTransactions((data ?? []) as CrmRevenueTransaction[])
    setTxLoading(false)
  }, [customer.id])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  useEffect(() => {
    setNotes(customer.notes ?? '')
    setNotesDirty(false)
  }, [customer.notes])

  async function saveNotes() {
    setNotesSaving(true)
    await supabase
      .from('crm_customers')
      .update({ notes: notes || null, updated_by: 'crm_manual' })
      .eq('id', customer.id)
    setNotesSaving(false)
    setNotesDirty(false)
    onRefresh()
  }

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white border-l border-gray-200 shadow-2xl z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-gray-900 truncate">{customer.name ?? 'Unknown'}</h3>
          <p className="text-sm text-gray-500 truncate">{customer.email ?? 'No email'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="p-2 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
            title="Edit CRM fields"
          >
            <Edit size={18} />
          </button>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-0">
        <Section title="Customer">
          <Field label="Name" value={customer.name ?? '—'} />
          <Field
            label="Email"
            value={
              customer.email ? (
                <span className="select-text">{customer.email}</span>
              ) : '—'
            }
          />
          <Field
            label="Store URL"
            value={
              customer.store_url ? (
                <a
                  href={customer.store_url.startsWith('http') ? customer.store_url : `https://${customer.store_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  {customer.store_url.replace(/^https?:\/\//, '')}
                  <ExternalLink size={12} />
                </a>
              ) : '—'
            }
          />
          <Field label="Signup Date" value={formatDate(customer.signup_date)} />
          <Field label="Free Trial Started" value={formatDate(customer.shopify_subscription_created_at)} />
          <Field label="Last Payment" value={formatDate(customer.last_payment)} />
          <Field label="Usage Charge Applied" value={customer.usage_charge_applied ? 'Yes' : 'No'} />
          <Field label="User Type" value={USER_TYPE_LABELS[customer.user_type] ?? customer.user_type} />
          <Field label="Billing Channel" value={BILLING_CHANNEL_LABELS[customer.billing_channel]} />
          <Field label="Source" value={customer.source ? SOURCE_LABELS[customer.source] : '—'} />
        </Section>

        <Section title="Status">
          <Field
            label="Client Status"
            value={
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${CLIENT_STATUS_COLORS[customer.client_status]}`}>
                {CLIENT_STATUS_LABELS[customer.client_status]}
              </span>
            }
          />
          <Field label="Cancellation Date" value={formatDate(customer.cancellation_date)} />
          <Field
            label="MRR"
            value={
              <>
                {formatCurrency(getDisplayMrr(customer))}
                {hasMrrOverride(customer) && <span className="text-amber-500 ml-1 text-xs">⚡ override</span>}
              </>
            }
            highlight={hasMrrOverride(customer)}
          />
        </Section>

        <Section title="Revenue">
          <Field
            label="Total Revenue"
            value={
              <>
                {formatCurrency(getDisplayRevenue(customer))}
                {hasRevenueOverride(customer) && <span className="text-amber-500 ml-1 text-xs">⚡ override</span>}
              </>
            }
            highlight={hasRevenueOverride(customer)}
          />
          <Field label="Calculated Revenue" value={formatCurrency(customer.calculated_total_revenue)} />
          {hasRevenueOverride(customer) && (
            <Field label="Revenue Override" value={formatCurrency(customer.total_revenue_override!)} />
          )}
          <Field label="Lifetime Payments" value={transactions.filter((t) => t.status === 'succeeded' && t.amount > 0).length} />
        </Section>

        <Section title="External IDs">
          <Field label="Boardroom User ID" value={customer.boardroom_user_id ?? '—'} />
          <Field label="Stripe Customer ID" value={customer.stripe_customer_id ?? '—'} />
          <Field label="Stripe Subscription ID" value={customer.stripe_subscription_id ?? '—'} />
          <Field label="Shopify Shop ID" value={customer.shopify_shop_id ?? '—'} />
          <Field label="Shopify Domain" value={customer.shopify_shop_domain ?? '—'} />
          <Field label="Last Synced" value={formatDate(customer.last_synced_at)} />
        </Section>

        {/* Inline notes */}
        <Section title="Notes">
          <textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value)
              setNotesDirty(true)
            }}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y"
            placeholder="Internal notes…"
          />
          {notesDirty && (
            <button
              onClick={saveNotes}
              disabled={notesSaving}
              className="mt-2 flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              {notesSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Notes
            </button>
          )}
        </Section>

        {/* Revenue transactions */}
        <Section title="Revenue History">
          {txLoading ? (
            <p className="text-sm text-gray-400">Loading transactions…</p>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-gray-400">No revenue transactions recorded</p>
          ) : (
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-gray-50 text-sm"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium uppercase ${
                        tx.provider === 'stripe'
                          ? 'bg-indigo-100 text-indigo-700'
                          : tx.provider === 'shopify'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                      }`}>
                        {tx.provider}
                      </span>
                      <span className="text-gray-500 text-xs">{formatDate(tx.transaction_date)}</span>
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {tx.transaction_type} · {tx.provider_transaction_id}
                    </p>
                  </div>
                  <span className={`font-medium whitespace-nowrap ml-2 ${
                    tx.amount < 0 ? 'text-red-600' : 'text-gray-900'
                  }`}>
                    {tx.amount < 0 ? '−' : ''}{formatCurrency(Math.abs(tx.amount))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}
