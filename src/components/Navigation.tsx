import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import SiteHashLink from './SiteHashLink'
import { isCustomDevelopmentPath, PATHS, BOOK_A_CALL_URL } from '../config'

const navItems = [
  { label: 'Services', hash: '#services' },
  { label: 'Methodology', hash: '#methodology' },
  { label: 'Why Boardroom', hash: '#why-boardroom' },
  { label: 'Pricing', hash: '#pricing' },
  { label: 'FAQ', hash: '#faq' },
  { label: 'Contact', hash: '#contact' },
] as const

export default function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()
  const isPartnerPage = pathname === PATHS.technologyPartners
  const isAccountingPage = pathname === PATHS.accountingFirms
  const isWorkshopsPage = pathname === PATHS.aiSoftwareWorkshops
  const homeTo = isWorkshopsPage || isCustomDevelopmentPath(pathname) ? pathname : PATHS.customDevelopment
  const desktopNavClass = isWorkshopsPage ? 'hidden lg:flex' : 'hidden md:flex'
  const mobileNavClass = isWorkshopsPage ? 'lg:hidden' : 'md:hidden'

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50 glass border-b border-gray-200/50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link
            to={homeTo}
            onClick={() => {
              setMobileOpen(false)
              if (homeTo === pathname) {
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }
            }}
            className="text-xl font-bold text-gray-900 tracking-tight"
          >
            Boardroom
          </Link>

          <div className={`${desktopNavClass} items-center gap-6 xl:gap-8`}>
            {isWorkshopsPage ? (
              <>
                <a
                  href="#workshops"
                  className="text-sm font-medium text-gray-600 hover:text-primary transition-colors"
                >
                  Workshops
                </a>
                <a
                  href="#how-it-works"
                  className="text-sm font-medium text-gray-600 hover:text-primary transition-colors"
                >
                  How It Works
                </a>
                <a
                  href="#examples"
                  className="text-sm font-medium text-gray-600 hover:text-primary transition-colors"
                >
                  Examples
                </a>
                <Link
                  to={PATHS.home}
                  className="text-sm font-medium text-gray-600 hover:text-primary transition-colors"
                >
                  Custom Development
                </Link>
                <a
                  href={BOOK_A_CALL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors shadow-sm whitespace-nowrap"
                >
                  Book a Workshop
                </a>
              </>
            ) : isPartnerPage || isAccountingPage ? (
              <>
                <a
                  href={isAccountingPage ? '#partnership' : '#partnership-flow'}
                  className="text-sm font-medium text-gray-600 hover:text-primary transition-colors"
                >
                  How It Works
                </a>
                <Link
                  to={PATHS.customDevelopment}
                  className="text-sm font-medium text-gray-600 hover:text-primary transition-colors"
                >
                  Custom Development
                </Link>
                <a
                  href={BOOK_A_CALL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors shadow-sm"
                >
                  {isAccountingPage ? 'Book a Conversation' : 'Talk About a Partnership'}
                </a>
              </>
            ) : (
              <>
                {navItems.map((item) => (
                  <SiteHashLink
                    key={item.label}
                    hash={item.hash}
                    className="text-sm font-medium text-gray-600 hover:text-primary transition-colors"
                  >
                    {item.label}
                  </SiteHashLink>
                ))}
                <Link
                  to={PATHS.technologyPartners}
                  className="text-sm font-medium text-gray-600 hover:text-primary transition-colors"
                >
                  Partners
                </Link>
                <SiteHashLink
                  hash="#pricing"
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors shadow-sm"
                >
                  Book a Discovery Call
                </SiteHashLink>
              </>
            )}
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={`${mobileNavClass} p-2 text-gray-600 hover:text-gray-900`}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`${mobileNavClass} border-t border-gray-200/50 bg-white/95 backdrop-blur-lg`}
          >
            <div className="px-4 py-4 space-y-3">
              {isWorkshopsPage ? (
                <>
                  <a
                    href="#workshops"
                    onClick={() => setMobileOpen(false)}
                    className="block text-sm font-medium text-gray-600 hover:text-primary py-2"
                  >
                    Workshops
                  </a>
                  <a
                    href="#how-it-works"
                    onClick={() => setMobileOpen(false)}
                    className="block text-sm font-medium text-gray-600 hover:text-primary py-2"
                  >
                    How It Works
                  </a>
                  <a
                    href="#examples"
                    onClick={() => setMobileOpen(false)}
                    className="block text-sm font-medium text-gray-600 hover:text-primary py-2"
                  >
                    Examples
                  </a>
                  <Link
                    to={PATHS.home}
                    onClick={() => setMobileOpen(false)}
                    className="block text-sm font-medium text-gray-600 hover:text-primary py-2"
                  >
                    Custom Development
                  </Link>
                  <a
                    href={BOOK_A_CALL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMobileOpen(false)}
                    className="block w-full text-center px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
                  >
                    Book a Workshop
                  </a>
                </>
              ) : isPartnerPage || isAccountingPage ? (
                <>
                  <a
                    href={isAccountingPage ? '#partnership' : '#partnership-flow'}
                    onClick={() => setMobileOpen(false)}
                    className="block text-sm font-medium text-gray-600 hover:text-primary py-2"
                  >
                    How It Works
                  </a>
                  <Link
                    to={PATHS.customDevelopment}
                    onClick={() => setMobileOpen(false)}
                    className="block text-sm font-medium text-gray-600 hover:text-primary py-2"
                  >
                    Custom Development
                  </Link>
                  <a
                    href={BOOK_A_CALL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMobileOpen(false)}
                    className="block w-full text-center px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
                  >
                    {isAccountingPage ? 'Book a Conversation' : 'Talk About a Partnership'}
                  </a>
                </>
              ) : (
                <>
                  {navItems.map((item) => (
                    <SiteHashLink
                      key={item.label}
                      hash={item.hash}
                      onClick={() => setMobileOpen(false)}
                      className="block text-sm font-medium text-gray-600 hover:text-primary py-2"
                    >
                      {item.label}
                    </SiteHashLink>
                  ))}
                  <Link
                    to={PATHS.technologyPartners}
                    onClick={() => setMobileOpen(false)}
                    className="block text-sm font-medium text-gray-600 hover:text-primary py-2"
                  >
                    Partners
                  </Link>
                  <SiteHashLink
                    hash="#pricing"
                    onClick={() => setMobileOpen(false)}
                    className="block w-full text-center px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
                  >
                    Book a Discovery Call
                  </SiteHashLink>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}
