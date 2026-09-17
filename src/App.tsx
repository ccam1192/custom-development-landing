import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import HomePage from './pages/HomePage'
import BookACallPage from './pages/BookACallPage'
import RequirementsGatheringPage from './pages/RequirementsGatheringPage'
import TechnologyPartnersPage from './pages/TechnologyPartnersPage'

const CrmApp = lazy(() => import('./crm/CrmApp'))

function ScrollToHash() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, left: 0 })
      return
    }

    const id = hash.slice(1)
    const timeout = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)

    return () => window.clearTimeout(timeout)
  }, [pathname, hash])

  return null
}

function AppRoutes() {
  return (
    <>
      <ScrollToHash />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/custom-development" element={<HomePage />} />
        <Route path="/book-a-call" element={<BookACallPage />} />
        <Route path="/requirements-gathering" element={<RequirementsGatheringPage />} />
        <Route path="/technology-partners" element={<TechnologyPartnersPage />} />
        <Route
          path="/crm/*"
          element={
            <Suspense fallback={
              <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            }>
              <CrmApp />
            </Suspense>
          }
        />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
