import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Zap, DollarSign, Bot, TrendingUp } from 'lucide-react'

const cards = [
  { icon: Zap, title: 'Faster Development', description: 'Projects delivered in weeks, not months', color: 'text-yellow-500 bg-yellow-50' },
  { icon: DollarSign, title: 'Lower Cost', description: 'Dramatically reduced budgets without sacrificing quality', color: 'text-green-500 bg-green-50' },
  { icon: Bot, title: 'AI-Native', description: 'Built with modern AI-assisted development tools', color: 'text-primary bg-blue-50' },
  { icon: TrendingUp, title: 'Built Around Your Business', description: 'Software that adapts to you, not the other way around', color: 'text-purple-500 bg-purple-50' },
]

export default function WhyNow() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section className="py-20 lg:py-28 bg-gray-50/50" ref={ref}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
            There Has Never Been a Better Time to Build Custom Software.
          </h2>
          <div className="space-y-4 text-gray-600 leading-relaxed max-w-3xl mx-auto mb-6">
            <p>
              Only a few years ago, custom software projects often required six-figure budgets
              and took many months—or even years—to complete.
            </p>
            <p>
              Modern AI-assisted development has fundamentally changed what's possible.
            </p>
            <p>
              Businesses are now replacing spreadsheets, manual processes, disconnected software,
              and repetitive administrative work with custom applications that can often be
              delivered in weeks rather than months.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-6 text-sm font-medium text-gray-700 mb-12">
            <span>The technology is better.</span>
            <span className="hidden sm:block text-gray-300">|</span>
            <span>Development is faster.</span>
            <span className="hidden sm:block text-gray-300">|</span>
            <span>Costs are lower.</span>
          </div>
          <p className="text-gray-500 mb-14 max-w-2xl mx-auto">
            The result is a level of custom software that was previously only available to large enterprises.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all group"
            >
              <div className={`w-12 h-12 rounded-lg ${card.color} flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform`}>
                <card.icon size={22} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{card.title}</h3>
              <p className="text-sm text-gray-500">{card.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
