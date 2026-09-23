import { useEffect, useRef, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import {
  ArrowRight,
  AppWindow,
  LayoutDashboard,
  BarChart3,
  Workflow,
  Cable,
  ArrowLeftRight,
  FileCheck,
  Sparkles,
  Layers,
  FileSpreadsheet,
  Users,
  Handshake,
  Puzzle,
  HeartHandshake,
  Compass,
  Quote,
} from 'lucide-react'
import Navigation from '../components/Navigation'
import Footer from '../components/Footer'
import { usePageMeta } from '../hooks/usePageMeta'
import { BOOK_A_CALL_URL, PATHS } from '../config'

const PAGE_URL = 'https://lp.ecommboardroom.com/accounting-firms'
const PAGE_TITLE = 'Technology Partner for Accounting Firms & Fractional CFOs | Boardroom'
const PAGE_DESCRIPTION =
  'A technology partner for accounting firms and fractional CFOs. Turn client spreadsheets, manual workflows, and reporting gaps into custom software.'

const primaryCtaClass =
  'inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
const secondaryCtaClass =
  'inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:border-primary hover:text-primary transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

function BookConversationLink({ className, children }: { className: string; children: ReactNode }) {
  return (
    <a href={BOOK_A_CALL_URL} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  )
}

function AnimatedSection({
  id,
  className = '',
  children,
}: {
  id?: string
  className?: string
  children: ReactNode
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id={id} className={`${className} scroll-mt-20`} ref={ref}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7 }}
      >
        {children}
      </motion.div>
    </section>
  )
}

function SectionIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children?: ReactNode
}) {
  return (
    <div className="text-center max-w-3xl mx-auto mb-14">
      <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-3">{eyebrow}</p>
      <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{title}</h2>
      {children && <div className="text-gray-600 leading-relaxed space-y-4">{children}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  HERO VISUAL                                                        */
/* ------------------------------------------------------------------ */
function ProcessVisual() {
  const steps = [
    { label: 'Pull numbers from three systems', tag: 'Manual' },
    { label: 'Reconcile them in a spreadsheet', tag: 'Hours' },
    { label: 'Email a PDF pack to the owner', tag: 'Every month' },
  ]
  const outcomes = [
    { icon: AppWindow, label: 'Client portal' },
    { icon: LayoutDashboard, label: 'Live dashboard' },
    { icon: Workflow, label: 'Review workflow' },
  ]

  return (
    <div className="relative w-full max-w-md mx-auto lg:max-w-none">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-indigo-500/5 rounded-3xl" />
      <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/70 shadow-xl p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <span className="text-[11px] font-bold tracking-widest text-gray-400 uppercase">
            What you already see
          </span>
          <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">
            Recurring
          </span>
        </div>

        <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileSpreadsheet size={16} className="text-gray-500" aria-hidden="true" />
            <p className="text-sm font-semibold text-gray-900">Monthly client reporting</p>
          </div>
          <ul className="space-y-2.5">
            {steps.map((step) => (
              <li key={step.label} className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-600">{step.label}</span>
                <span className="text-[11px] font-medium text-gray-500 bg-white border border-gray-200 rounded-full px-2 py-0.5 flex-shrink-0">
                  {step.tag}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-3 my-4">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs font-semibold text-primary">Boardroom builds</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <div className="grid grid-cols-3 gap-2">
          {outcomes.map((item) => (
            <div
              key={item.label}
              className="rounded-xl bg-primary/5 border border-primary/10 px-2 py-3 text-center"
            >
              <item.icon size={18} className="text-primary mx-auto mb-1.5" aria-hidden="true" />
              <p className="text-[11px] sm:text-xs font-semibold text-gray-800 leading-snug">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
          <Handshake size={14} className="text-primary flex-shrink-0" aria-hidden="true" />
          <span className="text-xs font-medium text-gray-700">You stay the advisor</span>
        </div>
        <p className="mt-3 text-[11px] text-gray-400 leading-relaxed">
          Illustrative. Every engagement starts from the client’s actual workflow.
        </p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  1. HERO                                                            */
/* ------------------------------------------------------------------ */
function HeroSection() {
  return (
    <section className="relative pt-28 pb-16 lg:pt-36 lg:pb-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/50" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-100/40 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-4">
              For fractional CFOs and accounting firms
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-bold text-gray-900 leading-[1.1] mb-6">
              You See the Problem.
              <span className="block text-primary">We Build the Solution.</span>
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed mb-4 max-w-xl">
              Boardroom is a technology fulfillment partner for fractional CFOs, accounting firms,
              and CAS teams. You already sit close enough to a client’s operations to see the
              manual work. We design and build the software that replaces it.
            </p>
            <p className="text-base text-gray-500 leading-relaxed mb-8 max-w-xl">
              Bring us into the conversation when a client’s problem goes beyond spreadsheets and
              off-the-shelf software. You keep the relationship. We handle the technology.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <BookConversationLink className={primaryCtaClass}>
                Book a Conversation
                <ArrowRight size={18} aria-hidden="true" />
              </BookConversationLink>
              <a href="#partnership" className={secondaryCtaClass}>
                See How It Works
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="pt-4 lg:pt-0"
          >
            <ProcessVisual />
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  2. THE PROBLEM                                                     */
/* ------------------------------------------------------------------ */
const clientPhrases = [
  {
    quote: 'We’re still doing this in Excel.',
    detail: 'A close, a forecast, or an operational tracker that never left the workbook.',
  },
  {
    quote: 'Someone has to manually move this data every month.',
    detail: 'The same export, cleanup, and re-entry, on a calendar nobody questions anymore.',
  },
  {
    quote: 'We have three systems that don’t talk to each other.',
    detail: 'Finance, operations, and the client each hold a piece of the same picture.',
  },
  {
    quote: 'Our reporting takes days to produce.',
    detail: 'The insight is useful. Assembling it is the bottleneck.',
  },
  {
    quote: 'Our clients need a portal, but nothing fits.',
    detail: 'They want one place for status, documents, or numbers — not another generic login.',
  },
  {
    quote: 'We know exactly what we want, but no software does it.',
    detail: 'The workflow is clear. A product that actually matches it does not exist.',
  },
]

function ProblemSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section className="py-20 lg:py-28 bg-white scroll-mt-20" ref={ref}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <SectionIntro
            eyebrow="The problem"
            title="You probably see these problems every day."
          >
            <p>
              Accounting and finance professionals notice operational friction because they are
              inside the numbers, the close, and the client relationship. The business owner has
              often learned to live with the workaround. You have not.
            </p>
          </SectionIntro>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {clientPhrases.map((item, index) => (
            <motion.figure
              key={item.quote}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.08 + index * 0.06 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:border-primary/20 hover:shadow-lg transition-all flex flex-col"
            >
              <Quote size={18} className="text-primary/40 mb-3" aria-hidden="true" />
              <blockquote className="text-gray-900 font-semibold leading-snug mb-3">
                {item.quote}
              </blockquote>
              <figcaption className="text-sm text-gray-500 leading-relaxed mt-auto">{item.detail}</figcaption>
            </motion.figure>
          ))}
        </div>

        <p className="text-center text-gray-700 font-medium mt-12 max-w-2xl mx-auto">
          These are business problems you already understand. They can also be software.
        </p>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  3. THE OPPORTUNITY                                                 */
/* ------------------------------------------------------------------ */
const opportunities = [
  { icon: AppWindow, title: 'Client portals', description: 'A branded place for clients to see status, documents, or the numbers you prepare for them.' },
  { icon: LayoutDashboard, title: 'Custom dashboards', description: 'The view an owner or operator should have, built around the metrics you already track.' },
  { icon: BarChart3, title: 'Automated reporting', description: 'Recurring packs that are assembled by the system, then reviewed by you.' },
  { icon: Workflow, title: 'Workflow applications', description: 'Approvals, handoffs, and checklists that currently live in email and spreadsheets.' },
  { icon: Cable, title: 'Data integrations', description: 'A reliable path for information that someone is still moving between systems by hand.' },
  { icon: ArrowLeftRight, title: 'Reconciliation tools', description: 'Matching, exceptions, and review for a process that should not depend on a workbook.' },
  { icon: FileCheck, title: 'Document workflows', description: 'Collecting, reviewing, approving, and organizing the files an engagement depends on.' },
  { icon: Sparkles, title: 'AI-powered tools', description: 'An advisory or analysis step you already know how to do, made interactive for the client.' },
  { icon: Layers, title: 'Internal business applications', description: 'Software for the firm or the client’s own team, shaped around how the work actually runs.' },
]

function OpportunitySection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section className="py-20 lg:py-28 bg-gray-50/50 scroll-mt-20" ref={ref}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <SectionIntro
            eyebrow="The opportunity"
            title="Turn recurring problems into technology solutions."
          >
            <p>
              If a process happens over and over, takes real manual effort, or creates a poor
              experience for the client, there may be a reason to build software around it —
              instead of asking the business to bend into another product that almost fits.
            </p>
          </SectionIntro>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {opportunities.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.05 + index * 0.05 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:border-primary/20 hover:shadow-lg transition-all group"
            >
              <div className="w-11 h-11 rounded-lg bg-primary/5 group-hover:bg-primary/10 flex items-center justify-center mb-4 transition-colors">
                <item.icon size={20} className="text-primary" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  4. HOW THE PARTNERSHIP WORKS                                       */
/* ------------------------------------------------------------------ */
const partnershipSteps = [
  {
    num: '01',
    title: 'You identify the opportunity',
    description: 'You know the client, the business, and the process underneath the workaround.',
  },
  {
    num: '02',
    title: 'We map the solution',
    description: 'Boardroom works with you and the client to understand the workflow and decide what should be built.',
  },
  {
    num: '03',
    title: 'We build the technology',
    description: 'Our team designs, develops, tests, and deploys the software.',
  },
  {
    num: '04',
    title: 'You deliver more to your client',
    description: 'The client gets a solution tailored to their business. You stay focused on the advisory or accounting relationship.',
  },
]

function PartnershipSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="partnership" className="py-20 lg:py-28 bg-white scroll-mt-20" ref={ref}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <SectionIntro
            eyebrow="The partnership"
            title="How the partnership works"
          >
            <p>
              You do not need to hire developers, manage a build, or become a software company.
              You bring the problem and the client. We bring the technology.
            </p>
          </SectionIntro>
        </motion.div>

        <ol className="relative grid gap-6 lg:grid-cols-4 lg:gap-5">
          <div
            className="hidden lg:block absolute top-6 left-[12%] right-[12%] h-px bg-gradient-to-r from-primary/15 via-primary/40 to-primary/15"
            aria-hidden="true"
          />
          {partnershipSteps.map((step, index) => (
            <motion.li
              key={step.num}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
              className="relative flex lg:flex-col gap-4 lg:gap-0"
            >
              <div className="flex lg:justify-center">
                <div className="w-12 h-12 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center shadow-lg shadow-primary/20 relative z-10 flex-shrink-0">
                  {step.num}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex-1 lg:mt-5 lg:text-center">
                <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
              </div>
            </motion.li>
          ))}
        </ol>

        <div className="mt-12 text-center max-w-2xl mx-auto">
          <p className="text-lg font-semibold text-gray-900 mb-2">
            You bring the business problem and the client relationship.
          </p>
          <p className="text-gray-600 mb-6">
            We bring the technology expertise and the development capability. Together, the client
            gets a better solution.
          </p>
          <BookConversationLink className="inline-flex items-center gap-2 text-primary font-medium hover:text-primary-dark transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded">
            Talk through a client opportunity
            <ArrowRight size={16} aria-hidden="true" />
          </BookConversationLink>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  5. WHY PARTNER                                                     */
/* ------------------------------------------------------------------ */
const benefits = [
  {
    icon: Users,
    title: 'Expand what you can offer',
    description: 'Solve a client problem without hiring developers or standing up an internal technology team.',
  },
  {
    icon: Puzzle,
    title: 'Go beyond accounting software',
    description: 'Address operational gaps that general ledger, close, and practice tools were never built to cover.',
  },
  {
    icon: HeartHandshake,
    title: 'A stronger client experience',
    description: 'Replace a monthly scramble of files and emails with software shaped around how that client works.',
  },
  {
    icon: Compass,
    title: 'New ways to serve the relationship',
    description: 'A defined project, ongoing development support, or another structure you and the client decide together.',
  },
  {
    icon: Handshake,
    title: 'The relationship stays with you',
    description: 'You remain the firm or advisor the client trusts. Boardroom joins as the technology partner.',
  },
  {
    icon: Layers,
    title: 'Built around their workflow',
    description: 'The software follows the process you already understand, rather than forcing that process into another SaaS product.',
  },
]

function WhySection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section className="py-20 lg:py-28 bg-gray-50/50 scroll-mt-20" ref={ref}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <SectionIntro eyebrow="Why Boardroom" title="Why partner with Boardroom?">
            <p>
              The point is not to turn your practice into a development shop. It is to give you a
              technology team you can bring in when a client’s problem calls for one — and stay
              focused on the work you were hired to do.
            </p>
          </SectionIntro>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.05 + index * 0.06 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:border-primary/20 hover:shadow-lg transition-all group"
            >
              <div className="w-11 h-11 rounded-lg bg-primary/5 group-hover:bg-primary/10 flex items-center justify-center mb-4 transition-colors">
                <benefit.icon size={20} className="text-primary" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{benefit.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{benefit.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  6. OWNERSHIP & BUSINESS MODELS                                     */
/* ------------------------------------------------------------------ */
function FlexibilitySection() {
  return (
    <AnimatedSection className="py-20 lg:py-24 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-3">
          How it’s structured
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-5">Flexible by design.</h2>
        <p className="text-gray-600 leading-relaxed text-lg">
          Every opportunity is different. Depending on the project, the software can be a custom
          engagement for the client, technology the firm owns, a recurring offering, or another
          arrangement that makes sense for the people involved. The commercial model is part of
          the conversation — chosen for the value it creates, not prescribed in advance.
        </p>
      </div>
    </AnimatedSection>
  )
}

/* ------------------------------------------------------------------ */
/*  7. EXAMPLES                                                        */
/* ------------------------------------------------------------------ */
const examples = [
  {
    icon: AppWindow,
    title: 'Client Reporting Portal',
    before: 'Spreadsheets and emailed PDFs',
    after: 'A branded login for the client',
    description:
      'Replace the monthly pack of files with one place a client can see the numbers, commentary, and history you already prepare.',
  },
  {
    icon: ArrowLeftRight,
    title: 'Automated Reconciliation',
    before: 'Manual matching across systems',
    after: 'A recurring reconciliation workflow',
    description:
      'Connect the systems involved and automate the matching, exceptions, and review that currently depend on a spreadsheet.',
  },
  {
    icon: LayoutDashboard,
    title: 'Custom Financial Dashboard',
    before: 'KPIs assembled by hand',
    after: 'A live view for the owner',
    description:
      'Give the business owner a current view of the indicators their CFO already tracks, without waiting on the next reporting cycle.',
  },
  {
    icon: FileCheck,
    title: 'Document Workflow',
    before: 'Email, folders, and follow-ups',
    after: 'Collect, review, and approve',
    description:
      'Automate how documents are requested, submitted, reviewed, approved, and organized — for a client or an internal process.',
  },
  {
    icon: Sparkles,
    title: 'AI-Powered Client Tool',
    before: 'A manual analysis or advisory step',
    after: 'An interactive application',
    description:
      'Turn a review, a narrative, or a set of questions you already know how to run into software a client can use with you.',
  },
]

function ExamplesSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section className="py-20 lg:py-28 bg-gray-50/50 scroll-mt-20" ref={ref}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <SectionIntro eyebrow="Examples" title="Opportunities you might already have.">
            <p>
              These are the kinds of problems a fractional CFO or accounting firm might bring to
              Boardroom. They illustrate what can be built around a client’s workflow. They are
              not off-the-shelf products.
            </p>
          </SectionIntro>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-5">
          {examples.map((example, index) => (
            <motion.article
              key={example.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.05 + index * 0.06 }}
              className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:border-primary/20 hover:shadow-lg transition-all flex flex-col ${
                index < 2 ? 'lg:col-span-3' : 'lg:col-span-2'
              } ${index === examples.length - 1 ? 'md:col-span-2 lg:col-span-2' : ''}`}
            >
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="w-11 h-11 rounded-lg bg-primary/5 flex items-center justify-center">
                  <example.icon size={20} className="text-primary" aria-hidden="true" />
                </div>
                <span className="text-[11px] font-semibold tracking-widest uppercase text-gray-400">
                  Example
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 text-lg mb-3">{example.title}</h3>
              <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-3 mb-4 space-y-2">
                <p className="text-xs text-gray-500 leading-relaxed">
                  <span className="block text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-0.5">
                    Today
                  </span>
                  {example.before}
                </p>
                <p className="text-xs text-gray-800 font-medium leading-relaxed">
                  <span className="block text-[10px] font-semibold tracking-widest uppercase text-primary mb-0.5">
                    What gets built
                  </span>
                  {example.after}
                </p>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">{example.description}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  8. FINAL CTA                                                       */
/* ------------------------------------------------------------------ */
function FinalCTASection() {
  return (
    <section className="py-20 lg:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-blue-700 to-indigo-800" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.12)_0%,_transparent_55%)]" />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-5">
          Have a client who needs more than another SaaS subscription?
        </h2>
        <p className="text-blue-100 text-lg leading-relaxed mb-8">
          Let’s talk through the problem and see whether custom software is the right solution.
          Bring the client situation. We’ll help you think through what could be built.
        </p>
        <BookConversationLink className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-primary font-semibold text-lg hover:bg-blue-50 transition-all shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
          Book a Conversation
          <ArrowRight size={20} aria-hidden="true" />
        </BookConversationLink>
        <div className="mt-6">
          <Link
            to={PATHS.customDevelopment}
            className="text-sm text-blue-100/90 hover:text-white underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded"
          >
            See how custom development works
          </Link>
        </div>
      </div>
    </section>
  )
}

export default function AccountingFirmsPage() {
  usePageMeta({
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    ogTitle: 'You See the Problem. We Build the Solution.',
    ogDescription:
      'Boardroom helps accounting firms and fractional CFOs turn client operational problems into custom software — without building a development team.',
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

    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = 'ld-accounting-firms'
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
      url: PAGE_URL,
      isPartOf: {
        '@type': 'WebSite',
        name: 'Boardroom',
        url: 'https://lp.ecommboardroom.com',
      },
      about: {
        '@type': 'Service',
        name: 'Technology fulfillment partnership for accounting firms and fractional CFOs',
        serviceType: 'Custom software development for accounting firms',
        provider: {
          '@type': 'Organization',
          name: 'Boardroom',
          url: 'https://lp.ecommboardroom.com',
        },
        audience: {
          '@type': 'BusinessAudience',
          audienceType:
            'Accounting firms, fractional CFOs, CAS firms, and embedded financial consultants',
        },
      },
    })
    document.head.appendChild(script)

    return () => {
      script.remove()
      if (created) link.remove()
      else if (previous) link.setAttribute('href', previous)
      else link.removeAttribute('href')
    }
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <main>
        <HeroSection />
        <ProblemSection />
        <OpportunitySection />
        <PartnershipSection />
        <WhySection />
        <FlexibilitySection />
        <ExamplesSection />
        <FinalCTASection />
      </main>
      <Footer />
    </div>
  )
}
