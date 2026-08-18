import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { FileCheck } from 'lucide-react'

export default function RequirementsObjection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section className="py-20 lg:py-28 bg-gray-50/50" ref={ref}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
            Why Pay $500 Before Getting a Development Proposal?
          </h2>
          <div className="space-y-4 text-gray-600 leading-relaxed">
            <p className="text-lg font-medium text-gray-800">
              Because a meaningful development proposal requires more than a quick conversation.
            </p>
            <p>
              The requirements process gives both sides a clearer understanding of what needs to be
              built.
            </p>
            <p>You get a useful requirements document that clarifies your project.</p>
            <p>We get the information necessary to properly scope the implementation.</p>
          </div>

          <div className="mt-8 bg-white rounded-xl border border-primary/15 shadow-sm p-6 sm:p-8 text-left">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center flex-shrink-0">
                <FileCheck size={20} className="text-primary" />
              </div>
              <p className="text-gray-700 leading-relaxed">
                And if you decide not to move forward with the full development project, you still
                have the requirements document and the clarity it provides.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
