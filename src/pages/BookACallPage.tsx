import { motion } from 'framer-motion'
import HubSpotForm from '../components/HubSpotForm'
import { usePageMeta } from '../hooks/usePageMeta'

/**
 * Headline copy — swap HEADLINE to A/B test positioning without touching layout.
 * Alt: "Custom Software Is Faster and More Affordable Than You Think."
 */
const HEADLINE = 'Software Built Around Your Business. Not the Other Way Around.'

const SUBHEADING =
  'Modern AI-assisted development makes custom software faster and more affordable than ever. We help you build the tools your business actually needs—without the traditional six-figure price tag or months of development.'

const REASSURANCE =
  "Not sure if custom software is right for you? That's exactly what the conversation is for. We'll talk through your idea, determine whether a custom solution makes sense, and give you an honest assessment of what's involved."

export default function BookACallPage() {
  usePageMeta({
    title: 'Custom Software Development | Boardroom',
    description:
      'Build software around your business—not the other way around. Modern AI-assisted development makes custom software faster and more affordable than ever.',
    ogTitle: 'Custom Software Development | Boardroom',
    ogDescription:
      'Build software around your business—not the other way around. Modern AI-assisted development makes custom software faster and more affordable than ever.',
  })

  return (
    <div className="book-a-call-page relative flex min-h-screen flex-col overflow-hidden bg-white">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/90 via-white to-indigo-50/60" />
        <div className="book-a-call-orb book-a-call-orb--primary absolute -top-32 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="book-a-call-orb book-a-call-orb--secondary absolute bottom-0 right-0 h-[380px] w-[380px] translate-x-1/4 translate-y-1/4 rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="book-a-call-orb book-a-call-orb--accent absolute top-1/3 -left-24 h-[280px] w-[280px] rounded-full bg-purple-200/30 blur-3xl" />
        <div className="book-a-call-grid absolute inset-0 opacity-[0.35]" />
      </div>

      {/* Main content — vertically centered on desktop */}
      <main className="relative z-10 flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="mx-auto w-full max-w-[780px]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="text-center"
          >
            <span className="inline-block text-xs font-semibold tracking-widest text-primary uppercase mb-4">
              Custom Software Development
            </span>

            <h1 className="text-[2.25rem] leading-[1.15] sm:text-4xl lg:text-[2.75rem] font-bold text-gray-900 tracking-tight mb-5">
              {HEADLINE}
            </h1>

            <p className="mx-auto max-w-2xl text-base sm:text-lg text-gray-600 leading-relaxed mb-10">
              {SUBHEADING}
            </p>
          </motion.div>

          <motion.div
            id="conversion-form-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.15, ease: 'easeOut' }}
            className="mx-auto w-full max-w-[640px]"
            data-conversion-section="primary"
          >
            <div className="glass rounded-2xl border border-gray-200/80 bg-white/90 p-6 shadow-lg shadow-gray-200/40 sm:p-8">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 text-center mb-6">
                Let's talk about what you want to build.
              </h2>
              <HubSpotForm />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="mx-auto mt-8 max-w-xl text-center"
          >
            <p className="text-sm text-gray-500 leading-relaxed">{REASSURANCE}</p>
            <p className="mt-5 text-xs text-gray-400 tracking-wide">
              10+ years of enterprise software implementation experience · 1,300+ businesses
              served
            </p>
          </motion.div>
        </div>
      </main>

      {/* Minimal footer */}
      <footer className="relative z-10 border-t border-gray-200/60 bg-white/40 backdrop-blur-sm py-6">
        <div className="mx-auto max-w-[780px] px-4 sm:px-6 text-center">
          <div className="text-sm font-semibold text-gray-900">Boardroom</div>
          <div className="text-xs text-gray-500 mt-0.5">Custom Software Development</div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-gray-400">
            <span>&copy; 2026 Boardroom. All rights reserved.</span>
            <span className="hidden sm:inline text-gray-300" aria-hidden="true">
              ·
            </span>
            <a
              href="https://www.ecommboardroom.com/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              Privacy Policy
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
