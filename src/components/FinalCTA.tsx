import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { ArrowRight } from 'lucide-react'

export default function FinalCTA() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section className="py-20 lg:py-28 relative overflow-hidden" ref={ref}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-blue-700 to-indigo-800" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.1)_0%,_transparent_60%)]" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Your Business Is Unique.
          </h2>
          <p className="text-2xl sm:text-3xl font-semibold text-blue-100 mb-6">
            Your Software Should Be Too.
          </p>
          <p className="text-blue-100/80 text-lg max-w-2xl mx-auto mb-4">
            Let's explore what's possible.
          </p>
          <p className="text-blue-200/70 max-w-2xl mx-auto mb-10">
            Whether you're replacing spreadsheets, automating workflows, launching a new SaaS product,
            or building software your team actually enjoys using, we'd love to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://meetings-na2.hubspot.com/charles-camisasca"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-primary font-semibold text-lg hover:bg-gray-50 transition-all shadow-xl"
            >
              Book a Discovery Call
              <ArrowRight size={20} />
            </a>
            <a
              href="#contact"
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl border-2 border-white/30 text-white font-medium hover:bg-white/10 transition-all"
            >
              Contact Us
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
