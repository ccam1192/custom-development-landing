import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Eye, Calculator, ShieldCheck } from 'lucide-react'

const pillars = [
  {
    icon: Eye,
    title: 'Clarity',
    description: "Know exactly what you're trying to build before development begins.",
  },
  {
    icon: Calculator,
    title: 'Better Estimates',
    description:
      'A well-defined project allows us to provide a much more accurate development scope, timeline, and price.',
  },
  {
    icon: ShieldCheck,
    title: 'Less Risk',
    description:
      'Identify gaps, conflicting requirements, and unanswered questions before they become expensive development changes.',
  },
]

export default function RequirementsConfidence() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section className="py-20 lg:py-28 bg-gray-50/50" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Build With Confidence.
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {pillars.map((pillar, index) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
              className="p-6 rounded-xl border border-gray-100 hover:border-primary/20 hover:shadow-lg transition-all group bg-white text-center sm:text-left"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/5 group-hover:bg-primary/10 flex items-center justify-center mb-4 transition-colors mx-auto sm:mx-0">
                <pillar.icon size={22} className="text-primary" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{pillar.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{pillar.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
