import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import {
  ClipboardList, Palette, Hammer, TestTubes, Rocket, HeadphonesIcon
} from 'lucide-react'

const steps = [
  {
    icon: ClipboardList,
    title: '1. Requirements Gathering',
    description: "We work closely with stakeholders to understand your business processes, workflows, pain points, users, and success criteria. This phase establishes the project scope and ensures we're solving the right problems before development begins.",
    color: 'bg-blue-500',
  },
  {
    icon: Palette,
    title: '2. Design',
    description: "We create wireframes, user flows, and modern interface designs that prioritize usability, efficiency, and scalability. You'll have an opportunity to review and refine the experience before development starts.",
    color: 'bg-indigo-500',
  },
  {
    icon: Hammer,
    title: '3. Build',
    description: 'Using modern development frameworks and AI-assisted engineering, we rapidly develop your application while maintaining high standards for code quality, maintainability, and performance.',
    color: 'bg-purple-500',
  },
  {
    icon: TestTubes,
    title: '4. QA & Client Acceptance Testing',
    description: "Before launch, we thoroughly test the application across devices and workflows. You'll also have dedicated time to validate functionality, provide feedback, and confirm everything meets your expectations.",
    color: 'bg-pink-500',
  },
  {
    icon: Rocket,
    title: '5. Deployment',
    description: 'Once approved, we deploy your application to a secure production environment with minimal disruption to your business operations.',
    color: 'bg-orange-500',
  },
  {
    icon: HeadphonesIcon,
    title: '6. Go-Live Support',
    description: "We're available during launch to monitor the rollout, address any issues quickly, and ensure your team is comfortable using the new system.",
    color: 'bg-green-500',
  },
]

export default function Methodology() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="methodology" className="py-20 lg:py-28 bg-gray-50/50" ref={ref}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Our Proven Project Methodology
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Every successful software project begins with understanding the business problem—not writing code.
            Our structured process keeps projects organized, collaborative, and predictable from kickoff through launch.
          </p>
        </motion.div>

        <div className="relative">
          <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-gradient-to-b from-blue-500 via-purple-500 to-green-500 hidden sm:block" />

          <div className="space-y-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                className="relative flex gap-6"
              >
                <div className={`w-12 h-12 rounded-xl ${step.color} flex items-center justify-center flex-shrink-0 shadow-lg relative z-10`}>
                  <step.icon size={20} className="text-white" />
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex-1 hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-gray-900 text-lg mb-2">{step.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
