import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { ArrowRight } from 'lucide-react'
import { BOOK_A_CALL_URL } from '../config'
import CheckoutButton from './CheckoutButton'

export default function RequirementsFinalCTA() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section className="py-20 lg:py-28 relative overflow-hidden" ref={ref}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-blue-700 to-indigo-800" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.1)_0%,_transparent_60%)]" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Have an Idea for Custom Software?
          </h2>
          <p className="text-2xl sm:text-3xl font-semibold text-blue-100 mb-6">
            Let's turn it into a plan.
          </p>
          <p className="text-blue-100/80 text-lg max-w-2xl mx-auto mb-10">
            Start with clarity. For $500, we'll help you define what you're building and create the
            requirements document that can serve as the foundation for development.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <CheckoutButton variant="light" className="w-full sm:w-auto" />
            <a
              href={BOOK_A_CALL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1 px-8 py-4 rounded-xl border-2 border-white/30 text-white font-medium hover:bg-white/10 transition-all w-full sm:w-auto"
            >
              Questions? Book a Call
              <ArrowRight size={16} />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
