import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import SiteHashLink from './SiteHashLink'
import { isCustomDevelopmentPath, PATHS } from '../config'

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
  const homeTo = isCustomDevelopmentPath(pathname) ? pathname : PATHS.customDevelopment

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
              if (isCustomDevelopmentPath(pathname)) {
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }
            }}
            className="text-xl font-bold text-gray-900 tracking-tight"
          >
            Boardroom
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <SiteHashLink
                key={item.label}
                hash={item.hash}
                className="text-sm font-medium text-gray-600 hover:text-primary transition-colors"
              >
                {item.label}
              </SiteHashLink>
            ))}
            <SiteHashLink
              hash="#pricing"
              className="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors shadow-sm"
            >
              Book a Discovery Call
            </SiteHashLink>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-gray-600 hover:text-gray-900"
            aria-label="Toggle menu"
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
            className="md:hidden border-t border-gray-200/50 bg-white/95 backdrop-blur-lg"
          >
            <div className="px-4 py-4 space-y-3">
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
              <SiteHashLink
                hash="#pricing"
                onClick={() => setMobileOpen(false)}
                className="block w-full text-center px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
              >
                Book a Discovery Call
              </SiteHashLink>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}
