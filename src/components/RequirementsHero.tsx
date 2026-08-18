import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { BOOK_A_CALL_URL } from '../config'
import CheckoutButton from './CheckoutButton'

const inclusions = [
  'Up to 2 discovery sessions',
  'Detailed requirements document',
  'Clear project scope',
  'Foundation for development pricing',
]

function PricingCard() {
  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
        <div className="p-8 sm:p-10 text-center">
          <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-3">
            Fixed Price
          </p>
          <div className="text-5xl sm:text-6xl font-bold text-gray-900 tracking-tight mb-2">
            $500
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Requirements Gathering Package
          </h2>
          <ul className="space-y-3 mb-8 text-left max-w-xs mx-auto">
            {inclusions.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <Check size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 font-medium text-sm">{item}</span>
              </li>
            ))}
          </ul>
          <CheckoutButton variant="card" />
        </div>
      </div>
    </div>
  )
}

export default function RequirementsHero() {
  return (
    <section className="relative pt-28 pb-16 lg:pt-36 lg:pb-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/50" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-100/40 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="inline-block text-xs font-semibold tracking-widest text-primary uppercase mb-4">
              Requirements Gathering
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-bold text-gray-900 leading-tight mb-6">
              Know Exactly What You're Building Before You Build It.
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed mb-6 max-w-xl">
              Turn your software idea into a clear, documented plan before development begins. Our
              fixed-price $500 Requirements Gathering Package gives you the clarity you need to
              understand what to build, what it will take, and what the full project is likely to cost.
            </p>
            <p className="text-base text-gray-500 leading-relaxed mb-8 max-w-xl">
              Before we build your software, let's make sure we're building the right thing.
            </p>
            <div className="hidden lg:flex flex-col sm:flex-row gap-4">
              <CheckoutButton />
              <a
                href={BOOK_A_CALL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:border-primary hover:text-primary transition-all"
              >
                Have Questions? Book a Call
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <PricingCard />
            <div className="lg:hidden mt-6 flex flex-col gap-3">
              <a
                href={BOOK_A_CALL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-full px-6 py-3.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:border-primary hover:text-primary transition-all"
              >
                Have Questions? Book a Call
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
