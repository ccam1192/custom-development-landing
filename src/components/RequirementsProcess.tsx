import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowDown } from 'lucide-react'
import { methodologySteps } from '../data/methodology'
import { PATHS } from '../config'

const flowLabels = [
  'Requirements Gathering',
  'Design',
  'Build',
  'QA',
  'Deployment',
  'Go Live',
]

export default function RequirementsProcess() {
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
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            The First Step in Our Proven Development Process
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Requirements gathering is where every Boardroom software project begins. We take the time
            to understand the business and define the product before moving into design and
            development.
          </p>
        </motion.div>

        <div className="relative mb-12">
          <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-gradient-to-b from-blue-500 via-purple-500 to-green-500 hidden sm:block" />
          <div className="space-y-6">
            {methodologySteps.map((step, index) => {
              const isCurrent = index === 0
              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.15 + index * 0.08 }}
                  className="relative flex gap-6"
                >
                  <div
                    className={`w-12 h-12 rounded-xl ${step.color} flex items-center justify-center flex-shrink-0 shadow-lg relative z-10 ${
                      isCurrent ? 'ring-4 ring-primary/20' : ''
                    }`}
                  >
                    <step.icon size={20} className="text-white" />
                  </div>
                  <div
                    className={`rounded-xl p-5 flex-1 transition-shadow ${
                      isCurrent
                        ? 'bg-blue-50/60 border border-primary/20 shadow-sm'
                        : 'bg-white border border-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{step.title}</h3>
                      {isCurrent && (
                        <span className="text-[10px] font-semibold tracking-wide uppercase text-primary bg-primary/10 rounded-full px-2 py-0.5">
                          Current step
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 text-sm leading-relaxed">{step.description}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-col items-center"
        >
          <div className="flex flex-col lg:flex-row items-center justify-center gap-2 mb-8">
            {flowLabels.map((label, index) => (
              <div key={label} className="flex flex-col lg:flex-row items-center gap-2">
                <span
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                    index === 0
                      ? 'bg-primary text-white'
                      : 'bg-gray-50 text-gray-500 border border-gray-100'
                  }`}
                >
                  {label}
                </span>
                {index < flowLabels.length - 1 && (
                  <>
                    <ArrowDown size={12} className="text-gray-300 lg:hidden" />
                    <ArrowRight size={12} className="text-gray-300 hidden lg:block" />
                  </>
                )}
              </div>
            ))}
          </div>

          <Link
            to={`${PATHS.customDevelopment}#methodology`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-dark transition-colors"
          >
            See Our Full Development Methodology
            <ArrowRight size={14} />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
