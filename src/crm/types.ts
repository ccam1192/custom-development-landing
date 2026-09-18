/* ─── Enum value types ─────────────────────────────────────────────────────── */

export type UserType = 'agency' | 'agency_client' | 'standard' | 'custom'
export type BillingChannel = 'stripe' | 'shopify' | 'other' | 'none'
export type Source = 'stripe' | 'shopify' | 'agency' | 'appsumo' | 'custom' | 'other'
export type ClientStatus = 'prospect' | 'in_trial' | 'active_customer' | 'canceled' | 'agency_client'
export type TransactionProvider = 'stripe' | 'shopify' | 'manual'
export type TransactionStatus = 'succeeded' | 'failed' | 'pending' | 'refunded' | 'adjusted'
export type TransactionType =
  | 'payment' | 'refund' | 'credit' | 'adjustment'
  | 'app_usage_sale' | 'app_subscription_sale' | 'app_sale_adjustment' | 'app_sale_credit'
export type SyncProvider = 'boardroom' | 'stripe' | 'shopify' | 'spreadsheet'
export type SyncStatus = 'running' | 'completed' | 'failed'
export type DataIssueSeverity = 'warning' | 'error' | 'info'

/* ─── Display helpers ──────────────────────────────────────────────────────── */

export const USER_TYPE_LABELS: Record<UserType, string> = {
  standard: 'Standard',
  agency: 'Agency',
  agency_client: 'Agency Client',
  custom: 'Custom',
}

export const USER_TYPE_VALUES: UserType[] = ['standard', 'agency', 'agency_client', 'custom']

export const BILLING_CHANNEL_LABELS: Record<BillingChannel, string> = {
  stripe: 'Stripe',
  shopify: 'Shopify',
  other: 'Other',
  none: 'None',
}

export const SOURCE_LABELS: Record<Source, string> = {
  stripe: 'Stripe',
  shopify: 'Shopify',
  agency: 'Agency',
  appsumo: 'Appsumo',
  custom: 'Custom',
  other: 'Other',
}

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  prospect: 'Prospect',
  in_trial: 'In Trial',
  active_customer: 'Active Customer',
  canceled: 'Canceled',
  agency_client: 'Agency Client',
}

export const CLIENT_STATUS_COLORS: Record<ClientStatus, string> = {
  prospect: 'bg-gray-100 text-gray-700',
  in_trial: 'bg-amber-100 text-amber-800',
  active_customer: 'bg-green-100 text-green-800',
  canceled: 'bg-red-100 text-red-800',
  agency_client: 'bg-purple-100 text-purple-800',
}

/* ─── Row types ────────────────────────────────────────────────────────────── */

export interface CrmCustomer {
  id: string
  boardroom_user_id: string | null
  name: string | null
  email: string | null
  store_url: string | null
  signup_date: string | null
  user_type: UserType
  billing_channel: BillingChannel
  client_status: ClientStatus
  cancellation_date: string | null
  calculated_mrr: number
  mrr_override: number | null
  calculated_total_revenue: number
  total_revenue_override: number | null
  source: Source | null
  notes: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  shopify_shop_id: string | null
  shopify_shop_domain: string | null
  shopify_subscription_id: string | null
  shopify_subscription_status: string | null
  shopify_subscription_created_at: string | null
  shopify_trial_ends_at: string | null
  shopify_cancelled_at: string | null
  shopify_cancel_effective_on: string | null
  shopify_billing_interval: string | null
  shopify_subscription_amount: number | null
  shopify_cancel_at_end_of_cycle: boolean | null
  shopify_pending_update: Record<string, unknown> | null
  shopify_last_status_sync_at: string | null
  boardroom_subscription_id: string | null
  boardroom_subscription_status: string | null
  agency_parent_id: string | null
  stripe_subscription_status: string | null
  stripe_trial_end: string | null
  stripe_current_period_end: string | null
  stripe_plan_amount: number | null
  stripe_cancel_at: string | null
  stripe_canceled_at: string | null
  mailerlite_subscriber_id: string | null
  mailerlite_group: string | null
  mailerlite_sequence_status: string | null
  mailerlite_last_synced: string | null
  effective_mrr: number
  effective_total_revenue: number
  created_at: string
  updated_at: string
  updated_by: string | null
  last_synced_at: string | null
}

export interface CrmRevenueTransaction {
  id: string
  crm_customer_id: string | null
  provider: TransactionProvider
  provider_transaction_id: string
  provider_customer_id: string | null
  provider_subscription_id: string | null
  amount: number
  currency: string
  transaction_date: string
  status: TransactionStatus
  transaction_type: TransactionType
  shopify_charge_id: string | null
  shopify_shop_id: string | null
  shopify_shop_domain: string | null
  shopify_gross_amount: number | null
  shopify_net_amount: number | null
  shopify_fee: number | null
  shopify_processing_fee: number | null
  shopify_regulatory_fee: number | null
  description: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CrmSyncLog {
  id: string
  provider: SyncProvider
  sync_type: string
  started_at: string
  completed_at: string | null
  status: SyncStatus
  records_processed: number
  records_created: number
  records_updated: number
  records_skipped: number
  errors: number
  error_details: Array<{ message: string; record?: string }>
  metadata: Record<string, unknown>
  created_at: string
}

export interface CrmSyncState {
  provider: SyncProvider
  last_sync_at: string | null
  last_successful_at: string | null
  sync_cursor: string | null
  status: string
  error_message: string | null
  updated_at: string
}

export interface CrmDataHealthIssue {
  id: string
  issue_type: string
  severity: DataIssueSeverity
  description: string
  crm_customer_id: string | null
  details: Record<string, unknown>
  resolved: boolean
  resolved_at: string | null
  created_at: string
  updated_at: string
}

/* ─── KPI ──────────────────────────────────────────────────────────────────── */

export interface CrmKpis {
  totalActiveCustomers: number
  totalInTrial: number
  totalActiveUsers: number
  lifetimePayingCustomers: number
  totalRevenue: number
  aclv: number
  mrr: number
  totalCancellations: number
  customerCancellations: number
  totalSignups: number
}

/* ─── Filters / Pagination ─────────────────────────────────────────────────── */

export type TextFilterOp =
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'is'
  | 'is_not'
  | 'empty'
  | 'not_empty'

export type DateFilterOp =
  | 'is'
  | 'before'
  | 'after'
  | 'on_or_before'
  | 'on_or_after'
  | 'between'
  | 'empty'
  | 'not_empty'

export type NumberFilterOp =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'empty'
  | 'not_empty'

export type GridColumnId =
  | 'name'
  | 'email'
  | 'signup_date'
  | 'store_url'
  | 'user_type'
  | 'billing_channel'
  | 'client_status'
  | 'cancellation_date'
  | 'effective_mrr'
  | 'effective_total_revenue'
  | 'notes'

export type TextColumnFilter = { kind: 'text'; op: TextFilterOp; value: string }
export type EnumColumnFilter = { kind: 'enum'; values: string[] }
export type DateColumnFilter = {
  kind: 'date'
  op: DateFilterOp
  value: string | null
  valueTo?: string | null
}
export type NumberColumnFilter = {
  kind: 'number'
  op: NumberFilterOp
  value: number | null
  valueTo?: number | null
}
export type ColumnFilter = TextColumnFilter | EnumColumnFilter | DateColumnFilter | NumberColumnFilter

export type CustomerFilters = Partial<Record<GridColumnId, ColumnFilter>>

export type SortField = keyof CrmCustomer
export type SortDirection = 'asc' | 'desc'

export interface PaginationState {
  page: number
  pageSize: number
  total: number
}

export const DEFAULT_FILTERS: CustomerFilters = {}

export function isColumnFilterActive(filter: ColumnFilter | undefined): boolean {
  if (!filter) return false
  if (filter.kind === 'enum') return filter.values.length > 0
  if (filter.kind === 'text') {
    if (filter.op === 'empty' || filter.op === 'not_empty') return true
    return filter.value.trim().length > 0
  }
  if (filter.op === 'empty' || filter.op === 'not_empty') return true
  if (filter.op === 'between') {
    return filter.value != null && filter.value !== '' && filter.valueTo != null && filter.valueTo !== ''
  }
  return filter.value != null && filter.value !== ''
}

export function hasActiveFilters(f: CustomerFilters): boolean {
  return (Object.keys(f) as GridColumnId[]).some((key) => isColumnFilterActive(f[key]))
}

/* ─── Helper to get displayed MRR / Revenue ────────────────────────────────── */

export function getDisplayMrr(c: CrmCustomer): number {
  return c.mrr_override ?? c.calculated_mrr
}

export function getDisplayRevenue(c: CrmCustomer): number {
  return c.total_revenue_override ?? c.calculated_total_revenue
}

export function hasMrrOverride(c: CrmCustomer): boolean {
  return c.mrr_override !== null
}

export function hasRevenueOverride(c: CrmCustomer): boolean {
  return c.total_revenue_override !== null
}
