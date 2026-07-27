import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { Briefcase, Layers, Code2 } from 'lucide-react'

const timelineSteps = [
  {
    icon: Briefcase,
    title: 'Enterprise Consulting',
    description: 'Over a decade implementing workflow software for Fortune 500 organizations',
    color: 'bg-blue-100 text-primary',
  },
  {
    icon: Layers,
    title: 'Boardroom Platform',
    description: 'Built a business intelligence platform used by 1,300+ businesses',
    color: 'bg-indigo-100 text-indigo-600',
  },
  {
    icon: Code2,
    title: 'Custom Software Studio',
    description: 'Applying enterprise methodology to build custom software faster than ever',
    color: 'bg-purple-100 text-purple-600',
  },
]

export default function Trust() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section className="py-20 lg:py-28 bg-white" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
              Enterprise Experience Meets Modern AI Development
            </h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                Before founding Boardroom, Charles Camisasca spent over a decade implementing
                enterprise workflow software for Fortune 500 organizations.
              </p>
              <p>
                After that experience, he founded Boardroom—a business intelligence platform
                used by more than 1,300 businesses to manage dashboards, analytics, reporting,
                AI workflows, and operational insights.
              </p>
              <p>
                Today, we're applying that same disciplined enterprise implementation methodology
                to help businesses build custom software dramatically faster than traditional
                development firms.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative"
          >
            <div className="space-y-0">
              {timelineSteps.map((step, index) => (
                <div key={step.title} className="relative flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-12 h-12 rounded-xl ${step.color} flex items-center justify-center flex-shrink-0`}>
                      <step.icon size={22} />
                    </div>
                    {index < timelineSteps.length - 1 && (
                      <div className="w-0.5 h-full bg-gradient-to-b from-gray-300 to-gray-100 my-2" />
                    )}
                  </div>
                  <div className="pb-10">
                    <h3 className="font-semibold text-gray-900 text-lg">{step.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
