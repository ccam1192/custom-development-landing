import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { FileText, CheckCircle2 } from 'lucide-react'

const sections = [
  'Project Overview',
  'Business Objectives',
  'User Roles',
  'Core Features',
  'Workflows',
  'Integrations',
  'Data Requirements',
  'User Experience',
  'Technical Considerations',
  'Open Questions',
  'Recommended Next Steps',
]

function DocumentMockup() {
  return (
    <div className="relative w-full max-w-lg mx-auto">
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
          <div className="ml-3 flex items-center gap-2 min-w-0">
            <FileText size={14} className="text-primary flex-shrink-0" />
            <span className="text-xs font-medium text-gray-600 truncate">
              Requirements Document
            </span>
          </div>
        </div>

        <div className="grid grid-cols-5 min-h-[340px]">
          <div className="col-span-2 bg-gray-50/80 border-r border-gray-100 p-3 space-y-1">
            {sections.map((section, index) => (
              <div
                key={section}
                className={`px-2.5 py-1.5 rounded-md text-[11px] leading-snug ${
                  index === 3
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-gray-500'
                }`}
              >
                {section}
              </div>
            ))}
          </div>

          <div className="col-span-3 p-4 space-y-3">
            <div className="text-xs font-semibold text-gray-900">Core Features</div>
            <div className="space-y-2">
              <div className="h-2 bg-gray-100 rounded w-full" />
              <div className="h-2 bg-gray-100 rounded w-5/6" />
              <div className="h-2 bg-gray-100 rounded w-4/5" />
            </div>
            <div className="space-y-2 pt-2">
              {['Role-based access', 'Operations dashboard', 'Workflow automation'].map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded bg-primary/15 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-sm bg-primary" />
                  </div>
                  <span className="text-[11px] text-gray-600">{feature}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2 pt-3">
              <div className="h-2 bg-blue-50 rounded w-full" />
              <div className="h-2 bg-blue-50 rounded w-3/4" />
              <div className="h-2 bg-gray-100 rounded w-2/3" />
            </div>
          </div>
        </div>
      </div>

      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-4 -right-3 bg-white rounded-xl shadow-lg border border-gray-100 px-3 py-2 flex items-center gap-2"
      >
        <CheckCircle2 size={14} className="text-green-500" />
        <span className="text-xs font-medium text-gray-700">Documented</span>
      </motion.div>

      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute -bottom-3 -left-3 bg-white rounded-xl shadow-lg border border-gray-100 px-3 py-2 flex items-center gap-2"
      >
        <FileText size={14} className="text-primary" />
        <span className="text-xs font-medium text-gray-700">Tailored spec</span>
      </motion.div>
    </div>
  )
}

export default function RequirementsDeliverable() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section className="py-20 lg:py-28 bg-white" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
              You Leave With More Than a Conversation.
            </h2>
            <p className="text-gray-600 leading-relaxed mb-8">
              At the end of the process, you'll have a documented understanding of what you want to
              build—not just a list of ideas in your head.
            </p>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              Your requirements document is tailored to the project. Depending on what you're
              building, it may include sections such as:
            </p>
            <div className="flex flex-wrap gap-2">
              {sections.map((section) => (
                <span
                  key={section}
                  className="text-xs font-medium text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5"
                >
                  {section}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-5">
              Illustrative example. Not every project includes every section.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="px-4 sm:px-6"
          >
            <DocumentMockup />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
