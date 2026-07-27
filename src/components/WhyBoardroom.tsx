import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Shield, Cpu, Zap, MessageSquare, Server, Handshake } from 'lucide-react'

const features = [
  {
    icon: Shield,
    title: 'Enterprise Project Experience',
    description: 'Over a decade of implementing complex software for large organizations, applied to projects of any size.',
  },
  {
    icon: Cpu,
    title: 'Modern AI Development',
    description: 'We leverage AI-assisted development tools to build faster and deliver higher quality at lower cost.',
  },
  {
    icon: Zap,
    title: 'Rapid Delivery',
    description: 'Our streamlined methodology and modern tooling mean your project ships weeks faster than traditional firms.',
  },
  {
    icon: MessageSquare,
    title: 'Transparent Communication',
    description: 'Regular updates, clear timelines, and no surprises. You always know where your project stands.',
  },
  {
    icon: Server,
    title: 'Scalable Architecture',
    description: 'We build with growth in mind—your software is architected to scale with your business.',
  },
  {
    icon: Handshake,
    title: 'Long-Term Partnership',
    description: "We don't disappear after launch. We're here for ongoing support, iterations, and new features.",
  },
]

export default function WhyBoardroom() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="why-boardroom" className="py-20 lg:py-28 bg-white" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Why Businesses Choose Boardroom
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
              className="p-6 rounded-xl border border-gray-100 hover:border-primary/20 hover:shadow-lg transition-all group bg-white"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/5 group-hover:bg-primary/10 flex items-center justify-center mb-4 transition-colors">
                <feature.icon size={22} className="text-primary" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
