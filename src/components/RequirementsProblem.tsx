import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Lightbulb, ClipboardList, Target, Map, AppWindow, ArrowDown, ArrowRight } from 'lucide-react'

const stages = [
  { icon: Lightbulb, label: 'Business Idea' },
  { icon: ClipboardList, label: 'Requirements' },
  { icon: Target, label: 'Clear Scope' },
  { icon: Map, label: 'Development Plan' },
  { icon: AppWindow, label: 'Custom Software' },
]

export default function RequirementsProblem() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section className="py-20 lg:py-28 bg-white" ref={ref}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
            The Most Expensive Mistake Is Building the Wrong Thing.
          </h2>
          <div className="space-y-4 text-gray-600 leading-relaxed max-w-3xl mx-auto">
            <p className="text-lg font-medium text-gray-800">
              A great software project starts with clarity.
            </p>
            <p>
              Before writing code, we need to understand how your business works, who will use the
              software, what problems it needs to solve, what it needs to integrate with, and what
              success looks like.
            </p>
            <p>
              Without that clarity, projects can quickly become more expensive and complicated than
              expected.
            </p>
            <p>
              Requirements gathering gives everyone a shared understanding of the project before
              development begins.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-center gap-3 lg:gap-1.5">
            {stages.map((stage, index) => (
              <div key={stage.label} className="flex flex-col lg:flex-row items-center gap-3 lg:gap-1.5">
                <div className="flex items-center gap-2.5 bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-3 w-full lg:w-auto justify-center">
                  <div className="w-9 h-9 rounded-lg bg-primary/5 flex items-center justify-center flex-shrink-0">
                    <stage.icon size={16} className="text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">{stage.label}</span>
                </div>
                {index < stages.length - 1 && (
                  <>
                    <ArrowDown size={16} className="text-gray-300 lg:hidden" />
                    <ArrowRight size={16} className="text-gray-300 hidden lg:block" />
                  </>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
