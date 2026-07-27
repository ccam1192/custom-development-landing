import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Check, ArrowRight } from 'lucide-react'

const inclusions = [
  'Discovery Call',
  'Project Recommendations',
  'Scope Estimate',
  'Timeline',
  'Custom Proposal',
]

export default function Pricing() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="pricing" className="py-20 lg:py-28 bg-gray-50/50" ref={ref}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Every Project Is Different
          </h2>
          <div className="space-y-4 text-gray-600 max-w-2xl mx-auto">
            <p>
              No two businesses have the same requirements, which means every software project is unique.
            </p>
            <p>
              Rather than forcing projects into predefined packages, we start with a discovery conversation
              to understand your goals, desired functionality, integrations, timeline, and budget.
            </p>
            <p>
              Following that discussion, we'll provide a tailored proposal outlining scope,
              estimated timeline, and investment.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="bg-white rounded-2xl p-8 sm:p-10 shadow-lg border border-gray-100 text-center max-w-lg mx-auto"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-6">What's Included</h3>
          <ul className="space-y-3 mb-8 text-left inline-block">
            {inclusions.map((item) => (
              <li key={item} className="flex items-center gap-3">
                <Check size={18} className="text-green-500 flex-shrink-0" />
                <span className="text-gray-700 font-medium">{item}</span>
              </li>
            ))}
          </ul>
          <a
            href="https://meetings-na2.hubspot.com/charles-camisasca"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 w-full px-6 py-4 rounded-xl bg-primary text-white font-semibold text-lg hover:bg-primary-dark transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
          >
            Book Your Discovery Call
            <ArrowRight size={20} />
          </a>
        </motion.div>
      </div>
    </section>
  )
}
