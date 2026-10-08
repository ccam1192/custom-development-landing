import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  AppWindow,
  BarChart3,
  Boxes,
  Briefcase,
  Cable,
  Calculator,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Cpu,
  Database,
  Handshake,
  Layers,
  LayoutDashboard,
  ListChecks,
  Rocket,
  Shield,
  Sparkles,
  Workflow,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import Navigation from '../components/Navigation'
import Footer from '../components/Footer'
import ClientLogos from '../components/ClientLogos'
import { usePageMeta } from '../hooks/usePageMeta'
import { BOOK_A_CALL_URL, PATHS } from '../config'

const PAGE_URL = 'https://lp.ecommboardroom.com/ai-software-workshops'
const PAGE_TITLE = 'AI Software Workshops for Accounting Firms | Boardroom'
const PAGE_DESCRIPTION =
  'Learn how to use AI to build internal software and tools. Boardroom offers AI software training, hands-on development workshops, and custom software development for accounting and professional-services teams.'

const primaryCtaClass =
  'inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
const secondaryCtaClass =
  'inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:border-primary hover:text-primary transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
const bookCtaClass =
  'inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-white font-medium hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
const exploreCtaClass =
  'inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-800 hover:border-primary hover:text-primary transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

function BookWorkshopLink({ className, children }: { className: string; children: ReactNode }) {
  return (
    <a href={BOOK_A_CALL_URL} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  )
}

function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  return { ref, isInView }
}

function SectionHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string
  title: string
  children?: ReactNode
}) {
  return (
    <div className="text-center max-w-3xl mx-auto mb-14">
      {eyebrow && (
        <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-3">{eyebrow}</p>
      )}
      <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-balance mb-4">{title}</h2>
      {children && <div className="text-gray-600 leading-relaxed space-y-4">{children}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  HERO                                                               */
/* ------------------------------------------------------------------ */
function WorkflowMock() {
  const columns = [
    { label: 'On track', count: '12' },
    { label: 'Waiting', count: '4' },
    { label: 'Review', count: '3' },
  ]

  return (
    <div aria-hidden="true" className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-800">Client workflow</span>
        <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Example</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {columns.map((column) => (
          <div key={column.label} className="rounded-lg border border-gray-100 bg-white px-2 py-2">
            <p className="text-sm font-bold text-gray-900">{column.count}</p>
            <p className="text-[10px] leading-tight text-gray-500">{column.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProgressionVisual() {
  const stages = [
    {
      step: '01',
      title: 'Business process',
      detail: 'The spreadsheet, report, or client handoff your team already runs.',
    },
    {
      step: '02',
      title: 'AI-assisted development',
      detail: 'Define what the tool should do, then build it with modern development tools.',
    },
    {
      step: '03',
      title: 'Working software',
      detail: 'A working application your team can see, click through, and react to.',
    },
  ]

  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div className="relative rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xl sm:p-6">
        <p className="mb-5 text-[11px] font-bold uppercase tracking-widest text-gray-400">
          Business process → working software
        </p>
        <ol>
          {stages.map((stage, index) => (
            <li key={stage.step} className="relative flex gap-4 pb-6 last:pb-0">
              {index < stages.length - 1 && (
                <span className="absolute bottom-0 left-5 top-10 w-px bg-gray-200" aria-hidden="true" />
              )}
              <span className="relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                {stage.step}
              </span>
              <div className="min-w-0 pt-1">
                <p className="font-semibold text-gray-900">{stage.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-gray-500">{stage.detail}</p>
                {index === stages.length - 1 && <WorkflowMock />}
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-5 border-t border-gray-100 pt-4 text-[11px] leading-relaxed text-gray-400">
          Illustrative. Each session starts from a real business process.
        </p>
      </div>
    </div>
  )
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-28 pb-16 lg:pt-36 lg:pb-24">
      <div className="absolute inset-0 bg-gradient-to-b from-[#f3f6fb] to-white" />
      <div className="absolute top-0 right-0 h-[520px] w-[520px] -translate-y-1/3 translate-x-1/4 rounded-full bg-primary/5 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
              AI Software Workshops
            </p>
            <h1 className="mb-6 text-4xl font-bold leading-[1.1] text-gray-900 sm:text-5xl lg:text-[3.25rem] text-balance">
              Learn How to Build Custom Software With AI
            </h1>
            <p className="mb-8 max-w-xl text-lg leading-relaxed text-gray-600">
              AI has made software development dramatically more accessible. We show your team
              what's possible, how the technology actually works, and — in our hands-on workshop —
              help you build a real tool for your business.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <BookWorkshopLink className={primaryCtaClass}>
                Book a Workshop
                <ArrowRight size={18} aria-hidden="true" />
              </BookWorkshopLink>
              <a href="#workshops" className={secondaryCtaClass}>
                See the Options
              </a>
            </div>
            <p className="mt-5 text-sm text-gray-500">
              Built for accounting, bookkeeping, finance, and professional-services teams.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
          >
            <ProgressionVisual />
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  PROBLEM / OPPORTUNITY                                              */
/* ------------------------------------------------------------------ */
const problemParagraphs = [
  'Every growing business has them.',
  "A spreadsheet that everyone depends on. A manual reporting process. Data that gets copied between systems. A client workflow that lives in email. An internal tool you've always wished existed.",
  "Historically, turning those processes into software meant hiring developers, managing a long project, or settling for another SaaS subscription that doesn't quite fit.",
  'AI is changing that.',
  'Your team can now prototype software dramatically faster — if they know how to approach it.',
  'Boardroom can show you how.',
]

const useCases: { icon: LucideIcon; label: string }[] = [
  { icon: LayoutDashboard, label: 'Internal dashboards' },
  { icon: AppWindow, label: 'Client portals' },
  { icon: Workflow, label: 'Workflow management' },
  { icon: BarChart3, label: 'Reporting tools' },
  { icon: ClipboardList, label: 'Data collection systems' },
  { icon: Cable, label: 'QBO/accounting integrations' },
  { icon: Calculator, label: 'Internal calculators' },
  { icon: Zap, label: 'Automation tools' },
  { icon: Sparkles, label: 'Custom AI applications' },
  { icon: ListChecks, label: 'Operational tracking systems' },
]

function ProblemSection() {
  const { ref, isInView } = useReveal()
  const emphasis = new Set([
    'Every growing business has them.',
    'AI is changing that.',
    'Boardroom can show you how.',
  ])

  return (
    <section className="scroll-mt-24 bg-white py-20 lg:py-28" ref={ref}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <SectionHeading title="Your team probably has processes that should be software.">
            {problemParagraphs.map((paragraph) => (
              <p key={paragraph} className={emphasis.has(paragraph) ? 'font-medium text-gray-900' : undefined}>
                {paragraph}
              </p>
            ))}
          </SectionHeading>
        </motion.div>

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {useCases.map((item, index) => (
            <motion.li
              key={item.label}
              initial={{ opacity: 0, y: 16 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, delay: 0.05 + index * 0.04 }}
              className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3.5 shadow-sm transition-all hover:border-primary/20 hover:shadow-md"
            >
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/5 text-primary">
                <item.icon size={18} aria-hidden="true" />
              </span>
              <span className="text-sm font-medium leading-snug text-gray-800">{item.label}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  THREE LEVELS                                                       */
/* ------------------------------------------------------------------ */
type Offer = {
  level: string
  name: string
  price: string
  priceNote?: string
  extra?: string
  description: string
  includes: string[]
  highlight?: string
  cta: string
  ctaKind: 'book' | 'custom'
  note: string
  featured?: boolean
}

const offers: Offer[] = [
  {
    level: 'Level 1',
    name: 'AI Software Build Session',
    price: '$1,000',
    priceNote: 'Up to 5 participants',
    extra: '+$200/person',
    description:
      'A 90-minute introduction to AI-assisted software development — including a live build so your team can see the process in action.',
    includes: [
      '1.5-hour live session',
      'Up to 5 participants',
      'How AI-assisted development works',
      'How to prompt and communicate with coding AI',
      'Overview of application architecture',
      'Databases, APIs, integrations, and deployment',
      'Examples of internal business tools AI can help create',
      'Live software build during the session',
      'Q&A',
    ],
    cta: 'Book This Session',
    ctaKind: 'book',
    note: 'Best for teams that want to understand what AI-powered software development can actually do.',
  },
  {
    level: 'Level 2 · Most popular',
    name: 'AI Software Dev Workshop',
    price: '$3,000',
    priceNote: 'Half-day engagement · Up to 5 participants',
    extra: '+$200/person',
    description:
      "Bring us a real business process. We'll teach your team how AI-assisted development works and spend the session actually building it together.",
    includes: [
      'Half-day live workshop',
      'Up to 5 participants',
      'AI software development training',
      'Requirements and process definition',
      'Application architecture',
      'Database design',
      'AI-assisted coding with tools such as Cursor',
      'Live development of your business process',
      'Testing and iteration',
      'Discussion of deployment and production considerations',
      'Code files from the workshop',
    ],
    highlight: "You don't just watch a demo. You bring the problem and build the solution with us.",
    cta: 'Book a Dev Workshop',
    ctaKind: 'book',
    note: "Best for teams that have a specific internal process they'd like to turn into software.",
    featured: true,
  },
  {
    level: 'Level 3',
    name: 'Custom Software Development',
    price: "Let's Build It",
    description:
      'Have a bigger idea? Boardroom can take your application from requirements through design, development, testing, deployment, and ongoing support.',
    includes: [
      'Requirements definition',
      'UX/UI design',
      'Custom application development',
      'AI-powered features',
      'Database architecture',
      'API and third-party integrations',
      'QA and testing',
      'Deployment',
      'Ongoing support',
    ],
    cta: 'Explore Custom Development',
    ctaKind: 'custom',
    note: 'For businesses that need a production-ready application rather than a prototype.',
  },
]

function OfferCard({ offer }: { offer: Offer }) {
  return (
    <article
      className={`flex h-full flex-col rounded-2xl border-2 bg-white p-6 sm:p-7 ${
        offer.featured
          ? 'border-primary shadow-xl shadow-primary/10'
          : 'border-gray-200 shadow-sm'
      }`}
    >
      <p
        className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest ${
          offer.featured ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'
        }`}
      >
        {offer.level}
      </p>
      <h3 className="mt-4 text-xl font-bold text-gray-900">{offer.name}</h3>
      <p
        className={`mt-4 font-bold tracking-tight text-gray-900 ${
          offer.price.startsWith('$') ? 'text-4xl' : 'text-3xl'
        }`}
      >
        {offer.price}
      </p>
      {offer.priceNote && <p className="mt-2 text-sm text-gray-600">{offer.priceNote}</p>}
      {offer.extra && <p className="mt-1 text-sm font-medium text-gray-800">{offer.extra}</p>}
      <p className="mt-4 text-sm leading-relaxed text-gray-600">{offer.description}</p>

      <p className="mb-3 mt-6 text-[11px] font-bold uppercase tracking-widest text-gray-400">Includes</p>
      <ul className="space-y-2.5">
        {offer.includes.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-sm text-gray-700">
            <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Check size={12} strokeWidth={2.75} aria-hidden="true" />
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>

      {offer.highlight && (
        <p className="mt-5 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm font-semibold leading-relaxed text-gray-900">
          {offer.highlight}
        </p>
      )}

      <div className="mt-auto pt-6">
        {offer.ctaKind === 'book' ? (
          <BookWorkshopLink className={bookCtaClass}>
            {offer.cta}
            <ArrowRight size={18} aria-hidden="true" />
          </BookWorkshopLink>
        ) : (
          <Link to={PATHS.home} className={exploreCtaClass}>
            {offer.cta}
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        )}
        <p className="mt-3 text-xs leading-relaxed text-gray-500">{offer.note}</p>
      </div>
    </article>
  )
}

function OffersSection() {
  const { ref, isInView } = useReveal()

  return (
    <section id="workshops" className="scroll-mt-24 bg-gray-50/60 py-20 lg:py-28" ref={ref}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <SectionHeading
            eyebrow="Three ways to start"
            title="Choose How Far You Want to Go"
          >
            <p>
              Start by learning what's possible. Get hands-on with a real business process. Or
              bring us in to build the complete solution.
            </p>
          </SectionHeading>
        </motion.div>

        <div className="grid items-stretch gap-6 lg:grid-cols-3 lg:gap-5">
          {offers.map((offer, index) => (
            <motion.div
              key={offer.name}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.08 + index * 0.08 }}
              className="min-w-0"
            >
              <OfferCard offer={offer} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  DIFFERENCE                                                         */
/* ------------------------------------------------------------------ */
const differences = [
  {
    name: 'Build Session',
    mode: 'Learn + Watch',
    copy: 'You learn how AI-assisted software development works and see us build a simple application live.',
  },
  {
    name: 'Dev Workshop',
    mode: 'Learn + Build',
    copy: 'You bring a real business process and work with us to turn it into a working software prototype.',
    featured: true,
  },
  {
    name: 'Custom Development',
    mode: 'We Build',
    copy: 'We take responsibility for turning your idea into a production-ready application.',
  },
]

function DifferenceSection() {
  const { ref, isInView } = useReveal()

  return (
    <section id="how-it-works" className="scroll-mt-24 bg-white py-20 lg:py-28" ref={ref}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <SectionHeading title="What's the difference?" />
        </motion.div>

        <div className="grid gap-5 md:grid-cols-3">
          {differences.map((item, index) => (
            <motion.article
              key={item.name}
              initial={{ opacity: 0, y: 16 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, delay: 0.08 + index * 0.08 }}
              className={`rounded-2xl border bg-white p-6 ${
                item.featured ? 'border-primary/30 shadow-md' : 'border-gray-100 shadow-sm'
              }`}
            >
              <p className="text-xs font-bold uppercase tracking-widest text-primary">
                0{index + 1}
              </p>
              <h3 className="mt-3 text-base font-semibold text-gray-900">{item.name}</h3>
              <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">{item.mode}</p>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">{item.copy}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  WHAT WE'LL COVER                                                   */
/* ------------------------------------------------------------------ */
const topics: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Cpu,
    title: 'AI-Assisted Development',
    description: 'How tools like Cursor can dramatically accelerate software development.',
  },
  {
    icon: ClipboardCheck,
    title: 'Requirements',
    description: 'How to clearly define what a tool actually needs to do before writing code.',
  },
  {
    icon: Boxes,
    title: 'Architecture',
    description: 'How applications, databases, APIs, and integrations fit together.',
  },
  {
    icon: Database,
    title: 'Data & Databases',
    description: 'How business data is stored, structured, accessed, and protected.',
  },
  {
    icon: Cable,
    title: 'Integrations',
    description:
      'How software connects to systems like QuickBooks, CRMs, ecommerce platforms, and other APIs.',
  },
  {
    icon: Shield,
    title: 'Security',
    description: 'Why authentication, permissions, data protection, and secure development matter.',
  },
  {
    icon: CheckCircle2,
    title: 'Testing',
    description: 'How to determine whether the software actually works reliably.',
  },
  {
    icon: Rocket,
    title: 'Deployment',
    description: 'What happens when your prototype needs to become a real application your team depends on.',
  },
]

function TopicsSection() {
  const { ref, isInView } = useReveal()

  return (
    <section className="scroll-mt-24 bg-gray-50/60 py-20 lg:py-28" ref={ref}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <SectionHeading title="It's about more than prompting AI.">
            <p>AI can write code. But building useful software requires more than knowing what to type into a chatbot.</p>
            <p>Our workshops help your team understand the bigger picture.</p>
          </SectionHeading>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {topics.map((topic, index) => (
            <motion.article
              key={topic.title}
              initial={{ opacity: 0, y: 16 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, delay: 0.04 + index * 0.04 }}
              className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
            >
              <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/5 text-primary">
                <topic.icon size={20} aria-hidden="true" />
              </span>
              <h3 className="font-semibold text-gray-900">{topic.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">{topic.description}</p>
            </motion.article>
          ))}
        </div>

        <aside className="mx-auto mt-10 max-w-3xl rounded-r-xl border-l-4 border-primary bg-white px-5 py-4 shadow-sm sm:px-6">
          <p className="leading-relaxed text-gray-700">
            The goal isn't to turn your accounting team into software engineers. It's to help them
            understand what AI makes possible — and where experienced software development still
            matters.
          </p>
        </aside>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  LIVE BUILD                                                         */
/* ------------------------------------------------------------------ */
const buildSteps = [
  {
    num: '01',
    title: 'Define the Problem',
    description: 'What process are we trying to improve?',
  },
  {
    num: '02',
    title: 'Design the Solution',
    description: 'What should the application do, and how should the pieces fit together?',
  },
  {
    num: '03',
    title: 'Build With AI',
    description: 'Use tools such as Cursor to accelerate development.',
  },
  {
    num: '04',
    title: 'Test & Iterate',
    description: "See what works, identify what doesn't, and improve it.",
  },
]

function LiveBuildSection() {
  const { ref, isInView } = useReveal()

  return (
    <section className="scroll-mt-24 bg-white py-20 lg:py-28" ref={ref}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <SectionHeading title="See software go from idea to working application.">
            <p>One of the most valuable parts of our workshops is seeing the process happen in real time.</p>
            <p>
              We'll start with a business problem, define what the software needs to do, and use
              AI-assisted development tools to begin building the solution.
            </p>
          </SectionHeading>
        </motion.div>

        <ol className="relative grid gap-6 md:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          <div
            className="pointer-events-none absolute top-6 right-[12%] left-[12%] hidden h-px bg-primary/20 lg:block"
            aria-hidden="true"
          />
          {buildSteps.map((step, index) => (
            <motion.li
              key={step.num}
              initial={{ opacity: 0, y: 16 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, delay: 0.08 + index * 0.08 }}
              className="relative flex gap-4 lg:flex-col lg:gap-0"
            >
              <div className="flex lg:justify-center">
                <div className="relative z-10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow-lg shadow-primary/20">
                  {step.num}
                </div>
              </div>
              <div className="flex-1 rounded-xl border border-gray-100 bg-white p-5 shadow-sm lg:mt-5 lg:text-center">
                <h3 className="font-semibold text-gray-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{step.description}</p>
              </div>
            </motion.li>
          ))}
        </ol>

        <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-primary/15 bg-primary/[0.04] px-6 py-7 text-center sm:px-8">
          <p className="text-lg font-semibold leading-snug text-gray-900 sm:text-xl">
            You leave with a much clearer understanding of both the possibilities and the realities
            of AI-powered software development.
          </p>
        </div>
        <p className="mx-auto mt-5 max-w-2xl text-center text-sm leading-relaxed text-gray-600">
          In the Level 2 Dev Workshop, participants also receive the code files developed during
          the session.
        </p>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  EXAMPLES                                                           */
/* ------------------------------------------------------------------ */
const examples: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: LayoutDashboard,
    title: 'Client Workflow Dashboard',
    description:
      'Track client status, deadlines, assignments, missing information, and outstanding work.',
  },
  {
    icon: BarChart3,
    title: 'Reporting & Analytics Tool',
    description: 'Pull data from multiple systems into a single dashboard tailored to your business.',
  },
  {
    icon: ClipboardList,
    title: 'Client Intake Application',
    description: 'Collect information, documents, and requirements through a custom workflow.',
  },
  {
    icon: Layers,
    title: 'Internal Operations Portal',
    description:
      'Give your team one place to manage processes that currently live across spreadsheets, email, and multiple systems.',
  },
  {
    icon: Cable,
    title: 'Accounting Data Tool',
    description: 'Connect accounting data and turn it into custom reports, dashboards, or workflows.',
  },
  {
    icon: Sparkles,
    title: 'AI-Powered Internal Assistant',
    description:
      'Build an AI application that can answer questions, analyze company information, or assist with repetitive internal work.',
  },
]

function ExamplesSection() {
  const { ref, isInView } = useReveal()

  return (
    <section id="examples" className="scroll-mt-24 bg-gray-50/60 py-20 lg:py-28" ref={ref}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <SectionHeading
            eyebrow="Examples"
            title="What could your team build?"
          >
            <p>
              The possibilities depend on your business. Here are a few examples of the kinds of
              internal tools teams can explore.
            </p>
          </SectionHeading>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {examples.map((example, index) => (
            <motion.article
              key={example.title}
              initial={{ opacity: 0, y: 16 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, delay: 0.04 + index * 0.05 }}
              className="flex flex-col rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
            >
              <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/5 text-primary">
                <example.icon size={20} aria-hidden="true" />
              </span>
              <h3 className="text-lg font-semibold text-gray-900">{example.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">{example.description}</p>
            </motion.article>
          ))}

          <motion.article
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.45, delay: 0.34 }}
            className="flex flex-col justify-center rounded-xl border border-dashed border-primary/30 bg-primary/[0.04] p-6 md:col-span-2 lg:col-span-3 sm:flex-row sm:items-center sm:justify-between sm:gap-8"
          >
            <div>
              <h3 className="text-xl font-bold text-gray-900">Your Process</h3>
              <p className="mt-2 text-gray-600">Have something specific in mind?</p>
              <p className="mt-1 font-semibold text-gray-900">
                That's exactly what the Dev Workshop is for.
              </p>
            </div>
            <a
              href="#workshops"
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-dark sm:mt-0"
            >
              See the Dev Workshop
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          </motion.article>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  WHY BOARDROOM                                                      */
/* ------------------------------------------------------------------ */
const credibility = [
  {
    icon: Briefcase,
    title: '10+ Years of Technology & Implementation Experience',
    description: 'Experience implementing workflow and technology solutions for complex organizations.',
  },
  {
    icon: Cpu,
    title: 'AI-Assisted Development',
    description: 'We use modern AI development tools to accelerate the software development process.',
  },
  {
    icon: Handshake,
    title: 'Business-First Approach',
    description: 'We start with the business problem and requirements — not the technology.',
  },
]

function WhySection() {
  const { ref, isInView } = useReveal()

  return (
    <section className="scroll-mt-24 bg-white py-20 lg:py-28" ref={ref}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <SectionHeading title="AI makes development faster. Experience makes it better.">
            <p>
              Boardroom has spent years implementing technology and workflow solutions for complex
              organizations. Today, we're using modern AI-assisted development tools to build custom
              software dramatically faster.
            </p>
            <p>Our advantage isn't just knowing how to use AI.</p>
            <p>
              It's understanding how businesses actually work — and how to turn messy real-world
              processes into software that people can use.
            </p>
            <p>
              Before founding Boardroom, Charles Camisasca spent more than a decade implementing
              enterprise workflow software for Fortune 500 organizations.
            </p>
          </SectionHeading>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-3">
          {credibility.map((item, index) => (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, delay: 0.08 + index * 0.08 }}
              className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
            >
              <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/5 text-primary">
                <item.icon size={20} aria-hidden="true" />
              </span>
              <h3 className="font-semibold text-gray-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">{item.description}</p>
            </motion.article>
          ))}
        </div>

        <ClientLogos />
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  WHO                                                                */
/* ------------------------------------------------------------------ */
const audiences = [
  'Accounting firms',
  'Bookkeeping firms',
  'Fractional CFOs',
  'Finance consultants',
  'Professional-services firms',
  'Operations teams',
  'Agencies',
  'Businesses with manual internal workflows',
]

function AudienceSection() {
  const { ref, isInView } = useReveal()

  return (
    <section className="scroll-mt-24 bg-gray-50/60 py-20 lg:py-28" ref={ref}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <SectionHeading title="Built for teams that see the opportunity — but don't want to become a software company." />
        </motion.div>

        <ul className="mx-auto grid max-w-3xl gap-3 sm:grid-cols-2">
          {audiences.map((audience) => (
            <li
              key={audience}
              className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm font-medium text-gray-800 shadow-sm"
            >
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Check size={12} strokeWidth={2.75} aria-hidden="true" />
              </span>
              {audience}
            </li>
          ))}
        </ul>

        <div className="mx-auto mt-10 max-w-2xl space-y-4 text-center text-gray-600 leading-relaxed">
          <p>You don't need a full-time development team to explore what's possible with AI.</p>
          <p className="font-medium text-gray-900">
            You need a business problem, a willingness to experiment, and the right technical guidance.
          </p>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  FAQ                                                                */
/* ------------------------------------------------------------------ */
type FaqItem = {
  question: string
  answer: string
  linkLabel?: string
  linkHref?: string
}

const faqs: FaqItem[] = [
  {
    question: 'Do we need any coding experience?',
    answer:
      'No. The sessions are designed for business professionals and teams, not experienced software developers.',
  },
  {
    question: 'What AI tools do you use?',
    answer:
      'We use modern AI-assisted development tools, including tools such as Cursor, to accelerate the development process. The specific tools may evolve as the technology changes.',
  },
  {
    question: 'What should we bring to the Dev Workshop?',
    answer:
      "Bring one real business process you'd like to improve or turn into software. The more specific the problem, the better.",
  },
  {
    question: 'Will we actually build something?',
    answer:
      'For the Level 1 session, we demonstrate a live build. For the Level 2 Dev Workshop, we work directly on your business process and build as much of a working prototype as we can during the half-day session.',
  },
  {
    question: 'Do we get the software we build?',
    answer:
      'For the Level 2 Dev Workshop, you receive the code files developed during the workshop. The workshop does not include production hosting, ongoing support, or a finished application ready for day-to-day use.',
  },
  {
    question: 'Can Boardroom finish the software for us?',
    answer:
      'Yes. If your prototype needs additional development to become a production-ready application, Boardroom also provides full custom software development services.',
    linkLabel: 'full custom software development services',
    linkHref: PATHS.home,
  },
  {
    question: 'Can we have more than 5 participants?',
    answer: 'Yes. Additional participants are $200 per person.',
  },
  {
    question: 'Can the workshop be customized for our business?',
    answer:
      'Yes. Especially for the Dev Workshop, the session can be centered around a specific process or problem within your organization.',
  },
]

function FaqAnswer({ faq }: { faq: FaqItem }) {
  if (!faq.linkHref || !faq.linkLabel || !faq.answer.includes(faq.linkLabel)) {
    return <>{faq.answer}</>
  }

  const [before, after] = faq.answer.split(faq.linkLabel)
  return (
    <>
      {before}
      <Link
        to={faq.linkHref}
        className="font-medium text-primary underline underline-offset-2 hover:text-primary-dark"
      >
        {faq.linkLabel}
      </Link>
      {after}
    </>
  )
}

function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const { ref, isInView } = useReveal()
  const baseId = useId()

  return (
    <section id="faq" className="scroll-mt-24 bg-white py-20 lg:py-28" ref={ref}>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="mb-12 text-center"
        >
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Frequently Asked Questions</h2>
        </motion.div>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index
            const panelId = `${baseId}-panel-${index}`
            const buttonId = `${baseId}-button-${index}`

            return (
              <div
                key={faq.question}
                className="overflow-hidden rounded-xl border border-gray-100 transition-colors hover:border-gray-200"
              >
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="flex w-full items-center justify-between p-5 text-left"
                  >
                    <span className="pr-4 font-medium text-gray-900">{faq.question}</span>
                    <motion.span
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex-shrink-0"
                    >
                      <ChevronDown size={20} className="text-gray-400" aria-hidden="true" />
                    </motion.span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="px-5 pb-5 text-sm leading-relaxed text-gray-600">
                        <FaqAnswer faq={faq} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  FINAL CTA                                                          */
/* ------------------------------------------------------------------ */
function FinalCtaSection() {
  return (
    <section className="relative overflow-hidden py-20 lg:py-28">
      <div className="absolute inset-0 bg-[#0b316e]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.14)_0%,_transparent_55%)]" />

      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl text-balance">
          What could your team build?
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-blue-100">
          Bring us a process you've always wished was easier. We'll show you what AI-assisted
          software development can do.
        </p>
        <div className="mt-8">
          <BookWorkshopLink className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-lg font-semibold text-primary shadow-lg transition-colors hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            Book a Workshop
            <ArrowRight size={20} aria-hidden="true" />
          </BookWorkshopLink>
        </div>
        <p className="mt-6 text-sm leading-relaxed text-blue-100/90">
          Not sure which option is right for you?{' '}
          <a
            href={BOOK_A_CALL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-white underline underline-offset-4 hover:text-blue-50"
          >
            Book a call
          </a>{' '}
          and we'll help you figure it out.
        </p>
      </div>
    </section>
  )
}

export default function AiSoftwareWorkshopsPage() {
  usePageMeta({
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    ogTitle: 'Learn How to Build Custom Software With AI',
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

    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = 'ld-ai-software-workshops'
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          name: PAGE_TITLE,
          description: PAGE_DESCRIPTION,
          url: PAGE_URL,
          isPartOf: {
            '@type': 'WebSite',
            name: 'Boardroom',
            url: 'https://lp.ecommboardroom.com',
          },
        },
        {
          '@type': 'Service',
          name: 'AI Software Workshops',
          serviceType: 'AI software development workshop',
          description: PAGE_DESCRIPTION,
          url: PAGE_URL,
          provider: {
            '@type': 'Organization',
            name: 'Boardroom',
            url: 'https://lp.ecommboardroom.com',
          },
          audience: {
            '@type': 'BusinessAudience',
            audienceType:
              'Accounting firms, bookkeeping firms, fractional CFOs, and professional-services businesses',
          },
          hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: 'AI software workshops',
            itemListElement: [
              {
                '@type': 'Offer',
                name: 'AI Software Build Session',
                description:
                  'A 90-minute introduction to AI-assisted software development, including a live build. Up to 5 participants. Additional participants are $200 per person.',
                price: '1000',
                priceCurrency: 'USD',
                url: PAGE_URL,
              },
              {
                '@type': 'Offer',
                name: 'AI Software Dev Workshop',
                description:
                  'A half-day workshop to learn AI-assisted development and build a working prototype of a real business process. Up to 5 participants. Additional participants are $200 per person.',
                price: '3000',
                priceCurrency: 'USD',
                url: PAGE_URL,
              },
              {
                '@type': 'Offer',
                name: 'Custom Software Development',
                description:
                  'Full custom software development from requirements through design, development, testing, deployment, and ongoing support.',
                url: 'https://lp.ecommboardroom.com/',
              },
            ],
          },
        },
        {
          '@type': 'FAQPage',
          mainEntity: faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: faq.answer,
            },
          })),
        },
      ],
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
    <div className="workshops-page min-h-screen bg-white">
      <Navigation />
      <main>
        <HeroSection />
        <ProblemSection />
        <OffersSection />
        <DifferenceSection />
        <TopicsSection />
        <LiveBuildSection />
        <ExamplesSection />
        <WhySection />
        <AudienceSection />
        <FaqSection />
        <FinalCtaSection />
      </main>
      <Footer />
    </div>
  )
}
