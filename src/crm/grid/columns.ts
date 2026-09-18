import type {
  BillingChannel,
  ClientStatus,
  GridColumnId,
  SortField,
  UserType,
} from '../types'
import { BILLING_CHANNEL_LABELS, CLIENT_STATUS_LABELS, USER_TYPE_LABELS } from '../types'

export type ColumnFilterKind = 'text' | 'enum' | 'date' | 'number'

export interface GridColumnDef {
  id: GridColumnId
  label: string
  sortField: SortField
  filterKind: ColumnFilterKind
  defaultWidth: number
  minWidth: number
  align?: 'left' | 'right'
  enumOptions?: Array<{ value: string; label: string }>
}

export const GRID_COLUMNS: GridColumnDef[] = [
  { id: 'name', label: 'Name', sortField: 'name', filterKind: 'text', defaultWidth: 160, minWidth: 80 },
  { id: 'email', label: 'Email', sortField: 'email', filterKind: 'text', defaultWidth: 240, minWidth: 120 },
  {
    id: 'signup_date',
    label: 'Signup Date',
    sortField: 'signup_date',
    filterKind: 'date',
    defaultWidth: 130,
    minWidth: 96,
  },
  { id: 'store_url', label: 'Store URL', sortField: 'store_url', filterKind: 'text', defaultWidth: 220, minWidth: 120 },
  {
    id: 'user_type',
    label: 'User Type',
    sortField: 'user_type',
    filterKind: 'enum',
    defaultWidth: 120,
    minWidth: 90,
    enumOptions: (['agency', 'agency_client', 'standard'] as UserType[]).map((value) => ({
      value,
      label: USER_TYPE_LABELS[value],
    })),
  },
  {
    id: 'billing_channel',
    label: 'Billing',
    sortField: 'billing_channel',
    filterKind: 'enum',
    defaultWidth: 110,
    minWidth: 80,
    enumOptions: (['stripe', 'shopify', 'other', 'none'] as BillingChannel[]).map((value) => ({
      value,
      label: BILLING_CHANNEL_LABELS[value],
    })),
  },
  {
    id: 'client_status',
    label: 'Status',
    sortField: 'client_status',
    filterKind: 'enum',
    defaultWidth: 150,
    minWidth: 110,
    enumOptions: (
      ['prospect', 'in_trial', 'active_customer', 'canceled', 'agency_client'] as ClientStatus[]
    ).map((value) => ({
      value,
      label: CLIENT_STATUS_LABELS[value],
    })),
  },
  {
    id: 'cancellation_date',
    label: 'Cancel Date',
    sortField: 'cancellation_date',
    filterKind: 'date',
    defaultWidth: 130,
    minWidth: 96,
  },
  {
    id: 'effective_mrr',
    label: 'MRR',
    sortField: 'effective_mrr',
    filterKind: 'number',
    defaultWidth: 100,
    minWidth: 72,
    align: 'right',
  },
  {
    id: 'effective_total_revenue',
    label: 'Revenue',
    sortField: 'effective_total_revenue',
    filterKind: 'number',
    defaultWidth: 110,
    minWidth: 80,
    align: 'right',
  },
  { id: 'notes', label: 'Notes', sortField: 'notes', filterKind: 'text', defaultWidth: 260, minWidth: 120 },
]

export const DEFAULT_COLUMN_ORDER: GridColumnId[] = GRID_COLUMNS.map((c) => c.id)

export const COLUMN_BY_ID = Object.fromEntries(GRID_COLUMNS.map((c) => [c.id, c])) as Record<
  GridColumnId,
  GridColumnDef
>

export const CHECKBOX_COL_WIDTH = 40
export const ACTIONS_COL_WIDTH = 44
