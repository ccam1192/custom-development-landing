import { useEffect } from 'react'
import { motion } from 'framer-motion'
import HubSpotForm from '../components/HubSpotForm'
import { usePageMeta } from '../hooks/usePageMeta'
import { Users, FileText, Rocket } from 'lucide-react'

const PAGE_URL = 'https://lp.ecommboardroom.com/accounting-firms/book-a-call'
const PAGE_TITLE = 'Book a Conversation | Accounting Firm Technology Partner | Boardroom'
const PAGE_DESCRIPTION =
  'Accounting firms and fractional CFOs can talk with Boardroom about a client software opportunity and whether custom software is the right solution.'

/** Campaign form — distinct from the general /book-a-call HubSpot form. */
const ACCOUNTING_FORM_ID = 'c34f4b59-48f5-4fa9-a966-280acecc18ac'

const HEADLINE =
  "Turn your clients' spreadsheet problems into a new service line. We build it, you keep the relationship."

const DESCRIPTION =
  'You see where their manual workflows are holding them back. Partner with us to deliver custom software solutions—without building a dev team.'

const REASSURANCE =
  "Not sure if custom software is right for your client? That's exactly what the conversation is for. We'll talk through the situation, determine whether a custom solution makes sense, and give you an honest assessment of what's involved."

const processSteps = [
  {
    icon: Users,
    title: 'You spot the problem',
    description: 'You notice where spreadsheets, manual workflows, or disconnected systems are limiting your client.',
  },
  {
    icon: FileText,
    title: 'We scope it together',
    description: 'You bring us into the conversation. We work with you and your client to understand the need.',
  },
  {
    icon: Rocket,
    title: 'We build & support it',
    description: 'We deliver the solution and provide ongoing support. You stay the trusted advisor.',
  },
]

export default function AccountingFirmsBookPage() {
  usePageMeta({
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    ogTitle: HEADLINE,
    ogDescription: PAGE_DESCRIPTION,
    ogUrl: PAGE_URL,
  })

  useEffect(() => {
    const existing = document.querySelector('link[rel="canonical"]')
    const link = (existing ?? document.createElement('link')) as HTMLLinkElement
    const created = !existing
    if (created) {
      link.setAttribute('rel', 'canonical')
      document.head.appendChild(link)
    }
    const previous = link.getAttribute('href')
    link.setAttribute('href', PAGE_URL)

    return () => {
      if (created) link.remove()
      else if (previous) link.setAttribute('href', previous)
      else link.removeAttribute('href')
    }
  }, [])

  return (
    <div className="book-a-call-page relative flex min-h-screen flex-col overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/90 via-white to-indigo-50/60" />
        <div className="book-a-call-orb book-a-call-orb--primary absolute -top-32 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="book-a-call-orb book-a-call-orb--secondary absolute bottom-0 right-0 h-[380px] w-[380px] translate-x-1/4 translate-y-1/4 rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="book-a-call-orb book-a-call-orb--accent absolute top-1/3 -left-24 h-[280px] w-[280px] rounded-full bg-purple-200/30 blur-3xl" />
        <div className="book-a-call-grid absolute inset-0 opacity-[0.35]" />
      </div>

      <main className="relative z-10 flex flex-1 flex-col px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="mx-auto w-full max-w-[780px]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="text-center"
          >
            <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-4">
              For fractional CFOs and accounting firms
            </p>

            <h1 className="text-[2.25rem] leading-[1.15] sm:text-4xl lg:text-[2.75rem] font-bold text-gray-900 tracking-tight mb-5">
              {HEADLINE}
            </h1>

            <p className="mx-auto max-w-2xl text-base sm:text-lg text-gray-600 leading-relaxed mb-10">
              {DESCRIPTION}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
            className="mx-auto w-full max-w-[640px] mb-8"
          >
            <div className="rounded-xl border border-gray-200/80 bg-white/95 p-5 sm:p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 text-center mb-5">
                How We Work
              </h3>
              <div className="grid gap-4 sm:grid-cols-3">
                {processSteps.map((step) => (
                  <div key={step.title} className="flex flex-col items-center text-center">
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <step.icon size={20} />
                    </div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-1.5">
                      {step.title}
                    </h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
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
                See if your client's problem is a fit (15-min call)
              </h2>
              <HubSpotForm formId={ACCOUNTING_FORM_ID} />
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

      <footer className="relative z-10 border-t border-gray-200/60 bg-white/40 backdrop-blur-sm py-6">
        <div className="mx-auto max-w-[780px] px-4 sm:px-6 text-center">
          <div className="text-sm font-semibold text-gray-900">Boardroom</div>
          <div className="text-xs text-gray-500 mt-0.5">Custom Software Development</div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-gray-400">
            <span>&copy; {new Date().getFullYear()} Boardroom. All rights reserved.</span>
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
