import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { MessageSquare, CalendarDays, FileText, Compass } from 'lucide-react'
import { PACKAGE_PRICE_LABEL } from '../config'

const items = [
  {
    icon: MessageSquare,
    title: 'Requirements Discovery',
    description:
      'We meet with you to understand your business, workflows, users, pain points, goals, and the software you envision.',
  },
  {
    icon: CalendarDays,
    title: 'Up to Two Discovery Sessions',
    description:
      'The package includes up to two focused requirements gathering sessions so we have enough time to explore the project properly and resolve important questions.',
  },
  {
    icon: FileText,
    title: 'Requirements Document',
    description:
      'We turn what we\'ve learned into a clear, organized requirements document outlining what the proposed software needs to do.',
  },
  {
    icon: Compass,
    title: 'Development Scope Foundation',
    description:
      'The requirements document gives us the information needed to develop a much more accurate scope, timeline, and price for the full implementation project.',
  },
]

export default function RequirementsIncluded() {
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
            What's Included for {PACKAGE_PRICE_LABEL}
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Our {PACKAGE_PRICE_LABEL} Requirements Gathering Package turns your business idea into a clear, documented
            software specification—so you know what you're building, we understand exactly what to
            build, and you can make an informed decision about the full development project.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {items.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
              className="p-6 rounded-xl border border-gray-100 hover:border-primary/20 hover:shadow-lg transition-all group bg-white"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/5 group-hover:bg-primary/10 flex items-center justify-center mb-4 transition-colors">
                <item.icon size={22} className="text-primary" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
