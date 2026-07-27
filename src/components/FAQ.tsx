import { useState } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { useRef } from 'react'
import { ChevronDown } from 'lucide-react'

const faqs = [
  {
    question: 'How much does custom software cost?',
    answer: "Every project is different, which is why we don't publish fixed pricing. After our discovery call, we'll provide a detailed proposal with a clear investment range based on your specific requirements, scope, and timeline. We work with businesses across a wide range of budgets and can often find creative ways to phase delivery.",
  },
  {
    question: 'How long do projects take?',
    answer: 'Timelines depend on complexity, but many projects can be delivered in 4–12 weeks thanks to modern AI-assisted development. Larger platforms may take longer, but we always provide a clear timeline during the proposal phase and keep you updated throughout.',
  },
  {
    question: 'Can you improve software we already have?',
    answer: 'Absolutely. We regularly help businesses modernize, extend, or fix existing software. Whether you need a better UI, improved performance, new features, or a complete rebuild, we can assess what you have and recommend the best path forward.',
  },
  {
    question: 'Can you integrate with our existing systems?',
    answer: "Yes. We build software that connects with your existing tools\u2014whether that's your CRM, ERP, accounting software, payment processor, or any system with an API. Integration architecture is a core part of our planning process.",
  },
  {
    question: 'Who owns the source code?',
    answer: 'You do. Once the project is complete and final payment is received, you own 100% of the source code and intellectual property. We can also help you set up hosting and deployment infrastructure that you control.',
  },
  {
    question: 'Do you provide ongoing support?',
    answer: 'Yes. After launch, we offer ongoing support and maintenance arrangements to keep your application running smoothly, handle updates, and build new features as your business evolves.',
  },
  {
    question: 'Can you build AI-powered applications?',
    answer: 'Yes—this is one of our core strengths. We build AI-powered features including chatbots, document processing, intelligent search, workflow automation, recommendation engines, and custom AI agents tailored to your business processes.',
  },
]

function FAQItem({ faq, isOpen, toggle }: { faq: typeof faqs[0]; isOpen: boolean; toggle: () => void }) {
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden hover:border-gray-200 transition-colors">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <span className="font-medium text-gray-900 pr-4">{faq.question}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0"
        >
          <ChevronDown size={20} className="text-gray-400" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="px-5 pb-5 text-sm text-gray-600 leading-relaxed">
              {faq.answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="faq" className="py-20 lg:py-28 bg-white" ref={ref}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-3"
        >
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              faq={faq}
              isOpen={openIndex === index}
              toggle={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
