import {
  Users,
  UserCheck,
  UserPlus,
  DollarSign,
  TrendingUp,
  Repeat,
  UserX,
  UserMinus,
  BarChart3,
} from 'lucide-react'
import type { CrmKpis } from '../types'

function fmt(n: number, style: 'currency' | 'number' = 'number'): string {
  if (style === 'currency') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n)
  }
  return new Intl.NumberFormat('en-US').format(n)
}

interface CardProps {
  label: string
  value: string
  icon: React.ReactNode
  color: string
}

function Card({ label, value, icon, color }: CardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 truncate">{label}</p>
        <p className="text-lg font-bold text-gray-900 truncate">{value}</p>
      </div>
    </div>
  )
}

interface KpiCardsProps {
  kpis: CrmKpis
  loading: boolean
}

export default function KpiCards({ kpis, loading }: KpiCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 h-[76px] animate-pulse">
            <div className="h-3 bg-gray-200 rounded w-24 mb-2" />
            <div className="h-5 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </div>
    )
  }

  const cards: CardProps[] = [
    {
      label: 'Active Customers',
      value: fmt(kpis.totalActiveCustomers),
      icon: <UserCheck size={20} />,
      color: 'bg-green-100 text-green-700',
    },
    {
      label: 'In Free Trial',
      value: fmt(kpis.totalInTrial),
      icon: <UserPlus size={20} />,
      color: 'bg-amber-100 text-amber-700',
    },
    {
      label: 'Active Users',
      value: fmt(kpis.totalActiveUsers),
      icon: <Users size={20} />,
      color: 'bg-blue-100 text-blue-700',
    },
    {
      label: 'Lifetime Paying',
      value: fmt(kpis.lifetimePayingCustomers),
      icon: <UserCheck size={20} />,
      color: 'bg-indigo-100 text-indigo-700',
    },
    {
      label: 'Total Revenue',
      value: fmt(kpis.totalRevenue, 'currency'),
      icon: <DollarSign size={20} />,
      color: 'bg-emerald-100 text-emerald-700',
    },
    {
      label: 'ACLV',
      value: fmt(kpis.aclv, 'currency'),
      icon: <TrendingUp size={20} />,
      color: 'bg-cyan-100 text-cyan-700',
    },
    {
      label: 'MRR',
      value: fmt(kpis.mrr, 'currency'),
      icon: <Repeat size={20} />,
      color: 'bg-violet-100 text-violet-700',
    },
    {
      label: 'Cancellations',
      value: fmt(kpis.totalCancellations),
      icon: <UserX size={20} />,
      color: 'bg-red-100 text-red-700',
    },
    {
      label: 'Customer Cancels',
      value: fmt(kpis.customerCancellations),
      icon: <UserMinus size={20} />,
      color: 'bg-orange-100 text-orange-700',
    },
    {
      label: 'Total Signups',
      value: fmt(kpis.totalSignups),
      icon: <BarChart3 size={20} />,
      color: 'bg-gray-100 text-gray-700',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((c) => (
        <Card key={c.label} {...c} />
      ))}
    </div>
  )
}
