import { useState, useRef, useEffect } from 'react'
import {
  MoreHorizontal,
  Eye,
  Edit,
  Copy,
  ExternalLink,
  User,
  LogIn,
  Trash2,
  CreditCard,
  RefreshCw,
} from 'lucide-react'
import type { CrmCustomer } from '../types'

interface ActionDropdownProps {
  customer: CrmCustomer
  onView: () => void
  onEdit: () => void
  onCopyEmail: () => void
}

interface ActionItem {
  label: string
  icon: React.ReactNode
  onClick?: () => void
  href?: string
  disabled?: boolean
  destructive?: boolean
  divider?: boolean
}

export default function ActionDropdown({ customer, onView, onEdit, onCopyEmail }: ActionDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const actions: ActionItem[] = [
    { label: 'View Details', icon: <Eye size={14} />, onClick: onView },
    { label: 'Edit CRM Fields', icon: <Edit size={14} />, onClick: onEdit },
    {
      label: 'Copy Email',
      icon: <Copy size={14} />,
      onClick: onCopyEmail,
      disabled: !customer.email,
    },
    {
      label: 'Open Store URL',
      icon: <ExternalLink size={14} />,
      href: customer.store_url ?? undefined,
      disabled: !customer.store_url,
    },
    {
      label: 'Open Boardroom User',
      icon: <User size={14} />,
      href: customer.boardroom_user_id
        ? `${import.meta.env.VITE_BOARDROOM_ADMIN_URL ?? '#'}/users/${customer.boardroom_user_id}`
        : undefined,
      disabled: !customer.boardroom_user_id,
    },
    { label: '', icon: null, divider: true },
    {
      label: 'Log In as User',
      icon: <LogIn size={14} />,
      disabled: true,
    },
    {
      label: 'Change Subscription',
      icon: <RefreshCw size={14} />,
      disabled: true,
    },
    {
      label: 'Remove Subscription',
      icon: <CreditCard size={14} />,
      disabled: true,
    },
    {
      label: 'Delete User',
      icon: <Trash2 size={14} />,
      disabled: true,
      destructive: true,
    },
  ]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-lg border border-gray-200 shadow-lg z-50 py-1">
          {actions.map((action, i) => {
            if (action.divider) {
              return <div key={i} className="border-t border-gray-100 my-1" />
            }

            const classes = `w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors ${
              action.disabled
                ? 'text-gray-400 cursor-not-allowed'
                : action.destructive
                  ? 'text-red-600 hover:bg-red-50'
                  : 'text-gray-700 hover:bg-gray-50'
            }`

            if (action.href && !action.disabled) {
              return (
                <a
                  key={action.label}
                  href={action.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={classes}
                  onClick={() => setOpen(false)}
                >
                  {action.icon}
                  {action.label}
                </a>
              )
            }

            return (
              <button
                key={action.label}
                onClick={() => {
                  if (!action.disabled && action.onClick) {
                    action.onClick()
                    setOpen(false)
                  }
                }}
                disabled={action.disabled}
                className={classes}
              >
                {action.icon}
                {action.label}
                {action.disabled && (
                  <span className="ml-auto text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Soon</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
