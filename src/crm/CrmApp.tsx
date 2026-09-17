import { AuthProvider, useAuth } from './context/AuthContext'
import CrmLoginPage from './pages/CrmLoginPage'
import CrmDashboardPage from './pages/CrmDashboardPage'
import { usePageMeta } from '../hooks/usePageMeta'

function CrmRouter() {
  const { user, loading } = useAuth()

  usePageMeta({
    title: 'Boardroom CRM',
    description: 'Internal customer relationship management',
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading CRM…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <CrmLoginPage />
  }

  return <CrmDashboardPage />
}

export default function CrmApp() {
  return (
    <AuthProvider>
      <CrmRouter />
    </AuthProvider>
  )
}
