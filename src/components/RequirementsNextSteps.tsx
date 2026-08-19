import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { CreditCard, Calendar, FileText } from 'lucide-react'
import CheckoutButton from './CheckoutButton'
import { PACKAGE_PRICE_LABEL } from '../config'

const steps = [
  {
    icon: CreditCard,
    title: 'Purchase the Package',
    description: `Complete the ${PACKAGE_PRICE_LABEL} checkout.`,
  },
  {
    icon: Calendar,
    title: 'Schedule Your Sessions',
    description: "We'll coordinate your requirements discovery sessions.",
  },
  {
    icon: FileText,
    title: 'Receive Your Requirements Document',
    description:
      "We'll organize what we've learned into a clear requirements document that can serve as the foundation for your project.",
  },
]

export default function RequirementsNextSteps() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section className="py-20 lg:py-28 bg-white" ref={ref}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            What Happens After You Get Started?
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-6 mb-12">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all text-center"
            >
              <div className="text-xs font-semibold tracking-widest text-primary uppercase mb-4">
                Step {index + 1}
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/5 flex items-center justify-center mb-4 mx-auto">
                <step.icon size={22} className="text-primary" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center"
        >
          <p className="text-gray-600 max-w-2xl mx-auto mb-8">
            If you decide to move forward, we'll use the requirements document to prepare a proposal
            for the full development project.
          </p>
          <CheckoutButton className="w-full sm:w-auto" />
        </motion.div>
      </div>
    </section>
  )
}
