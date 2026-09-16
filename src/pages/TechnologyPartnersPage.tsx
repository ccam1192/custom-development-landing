import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, ArrowDown,
  Workflow, FileSpreadsheet, Unplug, BarChart3,
  Puzzle, Bot, Users, Factory,
  Handshake, Lightbulb, Target, Rocket,
  UserCheck, Network, Gift, Shield,
  ClipboardList, Palette, Hammer, TestTubes,
  Send, HeadphonesIcon, CheckCircle2,
  Building2, TrendingUp, Cpu,
  Briefcase, Calculator, Settings, Landmark,
} from 'lucide-react'
import Navigation from '../components/Navigation'
import Footer from '../components/Footer'
import { usePageMeta } from '../hooks/usePageMeta'
import { BOOK_A_CALL_URL, PATHS } from '../config'

/* ------------------------------------------------------------------ */
/*  Section wrapper with scroll-triggered animation                    */
/* ------------------------------------------------------------------ */
function AnimatedSection({
  id,
  className = '',
  children,
}: {
  id?: string
  className?: string
  children: React.ReactNode
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

/* ------------------------------------------------------------------ */
/*  HERO VISUAL — Partnership Flow Diagram                             */
/* ------------------------------------------------------------------ */
function PartnershipFlowVisual() {
  const nodes = [
    { label: 'CLIENT', sub: 'Business Problem', color: 'from-orange-500 to-amber-500', icon: Building2 },
    { label: 'ADVISOR', sub: 'Identifies Opportunity', color: 'from-indigo-500 to-purple-500', icon: Lightbulb },
    { label: 'BOARDROOM', sub: 'Technology Delivery', color: 'from-blue-600 to-primary', icon: Cpu },
    { label: 'CLIENT', sub: 'Working Solution', color: 'from-green-500 to-emerald-500', icon: CheckCircle2 },
  ]

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-indigo-500/5 rounded-3xl" />
      <div className="relative bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/60 shadow-xl p-6 sm:p-8">
        <div className="space-y-3">
          {nodes.map((node, i) => (
            <div key={`${node.label}-${i}`}>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + i * 0.15 }}
                className="flex items-center gap-4"
              >
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${node.color} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                  <node.icon size={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold tracking-widest text-gray-400 uppercase">{node.label}</div>
                  <div className="text-sm font-semibold text-gray-800">{node.sub}</div>
                </div>
                {i < nodes.length - 1 && (
                  <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <ArrowDown size={12} className="text-gray-400" />
                  </div>
                )}
                {i === nodes.length - 1 && (
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 size={12} className="text-green-500" />
                  </div>
                )}
              </motion.div>
              {i < nodes.length - 1 && (
                <div className="ml-[21px] w-0.5 h-3 bg-gradient-to-b from-gray-200 to-gray-100" />
              )}
            </div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 1 }}
          className="mt-6 pt-5 border-t border-gray-100"
        >
          <div className="flex items-center justify-center gap-3 text-sm">
            <span className="font-semibold text-indigo-600">Advisor</span>
            <span className="text-gray-400">+</span>
            <span className="font-semibold text-primary">Boardroom</span>
            <span className="text-gray-400">=</span>
            <span className="font-semibold text-green-600">Complete Solution</span>
          </div>
        </motion.div>
      </div>

      {/* Floating badges */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-3 -right-3 bg-white rounded-xl shadow-lg border border-gray-100 px-3 py-2 flex items-center gap-2"
      >
        <Handshake size={14} className="text-primary" />
        <span className="text-xs font-medium text-gray-700">Partner</span>
      </motion.div>

      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute -bottom-3 -left-3 bg-white rounded-xl shadow-lg border border-gray-100 px-3 py-2 flex items-center gap-2"
      >
        <Rocket size={14} className="text-green-500" />
        <span className="text-xs font-medium text-gray-700">Delivered</span>
      </motion.div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  SECTION 1 — HERO                                                   */
/* ------------------------------------------------------------------ */
function HeroSection() {
  return (
    <section className="relative pt-28 pb-20 lg:pt-36 lg:pb-28 overflow-hidden">
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
            <span className="inline-block text-xs font-semibold tracking-widest text-primary uppercase mb-4">
              Boardroom Technology Partner Program
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] xl:text-6xl font-bold text-gray-900 leading-tight mb-6">
              Your Client Has a Technology Problem.{' '}
              <span className="text-primary">We Build the Solution.</span>
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed mb-4 max-w-xl">
              You identify the opportunity. We handle the technology.
            </p>
            <p className="text-base text-gray-500 leading-relaxed mb-8 max-w-xl">
              Boardroom partners with consultants, fractional executives, and advisors to turn
              business problems into custom software, automation, integrations, and AI-powered solutions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href={BOOK_A_CALL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
              >
                Talk About a Partnership
              </a>
              <a
                href="#partnership-flow"
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:border-primary hover:text-primary transition-all"
              >
                See How It Works
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="hidden lg:block"
          >
            <PartnershipFlowVisual />
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  SECTION 2 — THE PROBLEM                                            */
/* ------------------------------------------------------------------ */
function ProblemSection() {
  const needs = [
    'A custom internal application',
    'An automated workflow',
    'A customer or employee portal',
    'A custom dashboard',
    'An integration between systems',
    'An AI-powered workflow',
    'A reporting application',
    'A replacement for a spreadsheet-driven process',
    'A custom business tool that doesn\'t exist off the shelf',
  ]

  return (
    <AnimatedSection className="py-20 lg:py-28 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6 text-center">
          Your Clients Don't Always Need More Advice.{' '}
          <span className="text-primary">Sometimes They Need Software.</span>
        </h2>
        <div className="space-y-4 text-gray-600 leading-relaxed max-w-3xl mx-auto mb-10">
          <p className="text-lg font-medium text-gray-700">
            You can identify the process that needs to change. You can recommend the better
            workflow. You can show your client where they're losing time and money.
          </p>
          <p>But eventually someone has to build the thing.</p>
          <p className="font-medium text-gray-800">That's where Boardroom comes in.</p>
          <p>Your client might need:</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 max-w-3xl mx-auto mb-10">
          {needs.map((need) => (
            <div key={need} className="flex items-start gap-3 p-3 rounded-lg">
              <CheckCircle2 size={18} className="text-primary flex-shrink-0 mt-0.5" />
              <span className="text-gray-700 text-sm">{need}</span>
            </div>
          ))}
        </div>

        <p className="text-center text-lg font-semibold text-gray-800">
          You don't need to build it yourself.
        </p>
      </div>
    </AnimatedSection>
  )
}

/* ------------------------------------------------------------------ */
/*  SECTION 3 — OPPORTUNITY CARDS                                      */
/* ------------------------------------------------------------------ */
const opportunities = [
  { icon: Workflow, title: 'Manual Workflows', description: 'Employees spending hours performing repetitive processes that could be automated.' },
  { icon: FileSpreadsheet, title: 'Spreadsheet Dependency', description: 'Critical business processes living across spreadsheets, email, and shared drives.' },
  { icon: Unplug, title: 'Disconnected Systems', description: "Teams manually moving information between systems because their software doesn't communicate." },
  { icon: BarChart3, title: 'Reporting Problems', description: "Leaders don't have the information they need without manually compiling it." },
  { icon: Puzzle, title: 'Software Gaps', description: "Existing SaaS, ERP, or CRM platforms don't quite support the client's workflow." },
  { icon: Bot, title: 'AI Opportunities', description: 'Processes where AI could reduce manual work, improve decision-making, or create a better customer experience.' },
  { icon: Users, title: 'Client / Employee Portals', description: 'Businesses need a custom interface for customers, employees, vendors, or partners.' },
  { icon: Factory, title: 'Industry-Specific Workflows', description: "Specialized processes where generic software simply doesn't fit." },
]

function OpportunitiesSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section className="py-20 lg:py-28 bg-gray-50/50 scroll-mt-20" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            The Opportunities Are Already Inside Your Clients' Businesses.
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {opportunities.map((opp, index) => (
            <motion.div
              key={opp.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + index * 0.08 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:border-primary/20 hover:shadow-lg transition-all group"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/5 group-hover:bg-primary/10 flex items-center justify-center mb-4 transition-colors">
                <opp.icon size={22} className="text-primary" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{opp.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{opp.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  SECTION 4 — WHAT BOARDROOM DOES (Two-Column)                       */
/* ------------------------------------------------------------------ */
function WhatWeDoSection() {
  const advisorBrings = [
    'Client relationship',
    'Industry expertise',
    'Business context',
    'Process expertise',
    'Strategic recommendations',
    'Understanding of the client\'s goals',
  ]

  const boardroomBrings = [
    'Requirements gathering',
    'Solution design',
    'Software development',
    'Custom integrations',
    'Workflow automation',
    'AI implementation',
    'Hosting / deployment',
    'QA and acceptance testing',
    'Go-live support',
    'Ongoing maintenance',
  ]

  return (
    <AnimatedSection className="py-20 lg:py-28 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-14 text-center">
          You Identify the Opportunity.{' '}
          <span className="text-primary">We Deliver the Technology.</span>
        </h2>

        <div className="grid md:grid-cols-2 gap-8 relative">
          {/* Connector line (desktop) */}
          <div className="hidden md:block absolute top-0 bottom-0 left-1/2 w-px bg-gradient-to-b from-indigo-200 via-primary/30 to-indigo-200 -translate-x-1/2" />

          <div className="bg-indigo-50/50 rounded-2xl p-8 border border-indigo-100/60">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-indigo-500 flex items-center justify-center">
                <Lightbulb size={20} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">You Bring</h3>
            </div>
            <ul className="space-y-3">
              {advisorBrings.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <CheckCircle2 size={16} className="text-indigo-500 flex-shrink-0" />
                  <span className="text-gray-700 text-sm font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-blue-50/50 rounded-2xl p-8 border border-blue-100/60">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <Hammer size={20} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Boardroom Brings</h3>
            </div>
            <ul className="space-y-3">
              {boardroomBrings.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <CheckCircle2 size={16} className="text-primary flex-shrink-0" />
                  <span className="text-gray-700 text-sm font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </AnimatedSection>
  )
}

/* ------------------------------------------------------------------ */
/*  SECTION 5 — WHY BOARDROOM (Credibility)                            */
/* ------------------------------------------------------------------ */
function CredibilitySection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  const stats = [
    { value: '10+ Years', label: 'Enterprise software implementation experience', icon: Shield },
    { value: '1,300+ Businesses', label: 'Served through Boardroom', icon: TrendingUp },
    { value: 'Modern AI-Assisted Development', label: 'Faster, more accessible custom software development', icon: Cpu },
  ]

  return (
    <section className="py-20 lg:py-28 bg-gray-50/50 scroll-mt-20" ref={ref}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6 text-center">
            Enterprise Software Experience.{' '}
            <span className="text-primary">Now Available to SMBs.</span>
          </h2>

          <div className="space-y-4 text-gray-600 leading-relaxed max-w-3xl mx-auto mb-14 text-center">
            <p>
              Boardroom's founder spent a decade working with enterprise organizations including
              Nissan, JPMorgan Chase, and Procter & Gamble, helping implement workflow and
              business-process technology.
            </p>
            <p>
              He then built Boardroom, a software platform serving e-commerce brands and service
              providers that has been used by more than 1,300 businesses.
            </p>
            <p className="font-medium text-gray-800">
              Today, we're bringing that combination of business-process expertise and modern
              AI-assisted development to custom software projects for small and mid-sized businesses.
            </p>
          </div>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.value}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center hover:shadow-md transition-all"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/5 flex items-center justify-center mb-4 mx-auto">
                <stat.icon size={22} className="text-primary" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2 text-lg">{stat.value}</h3>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  SECTION 6 — DELIVERY MODEL (Methodology)                           */
/* ------------------------------------------------------------------ */
const deliverySteps = [
  { icon: ClipboardList, title: '01 — Requirements Gathering', description: "Understand the client's business, workflows, users, goals, and requirements.", color: 'bg-blue-500' },
  { icon: Palette, title: '02 — Design', description: 'Translate requirements into user flows, wireframes, and a clear product experience.', color: 'bg-indigo-500' },
  { icon: Hammer, title: '03 — Build', description: 'Develop the application using modern technology and AI-assisted development workflows.', color: 'bg-purple-500' },
  { icon: TestTubes, title: '04 — QA & Acceptance', description: 'Test the application internally, then work with the client to validate the finished product.', color: 'bg-pink-500' },
  { icon: Send, title: '05 — Deployment', description: 'Move the approved application into its production environment.', color: 'bg-orange-500' },
  { icon: HeadphonesIcon, title: '06 — Go-Live Support', description: 'Help the client launch and transition into using the new system.', color: 'bg-green-500' },
]

function DeliveryModelSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section className="py-20 lg:py-28 bg-white scroll-mt-20" ref={ref}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            We Bring a Proven Process to Every Project.
          </h2>
        </motion.div>

        <div className="relative">
          <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-gradient-to-b from-blue-500 via-purple-500 to-green-500 hidden sm:block" />

          <div className="space-y-8">
            {deliverySteps.map((step, index) => (
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

        <div className="text-center mt-10">
          <Link
            to={`${PATHS.customDevelopment}#methodology`}
            className="inline-flex items-center gap-2 text-primary font-medium hover:text-primary-dark transition-colors"
          >
            See Our Full Development Methodology
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  SECTION 7 — REQUIREMENTS GATHERING                                 */
/* ------------------------------------------------------------------ */
function RequirementsSection() {
  const understand = [
    'What they\'re trying to accomplish',
    'How the business works today',
    'Who will use the software',
    'What workflows need to change',
    'What systems need to connect',
    'What the application needs to do',
    'What questions still need to be answered',
  ]

  return (
    <AnimatedSection className="py-20 lg:py-28 bg-gray-50/50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6 text-center">
          We Don't Start With Code.{' '}
          <span className="text-primary">We Start With Understanding.</span>
        </h2>

        <div className="space-y-4 text-gray-600 leading-relaxed max-w-3xl mx-auto mb-10 text-center">
          <p className="text-lg font-medium text-gray-700">
            One of the biggest risks in custom software is building something before everyone
            agrees on what "something" actually means.
          </p>
          <p>That's why requirements gathering comes first.</p>
          <p>We work with the client to understand:</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 max-w-2xl mx-auto mb-12">
          {understand.map((item) => (
            <div key={item} className="flex items-start gap-3 p-2">
              <CheckCircle2 size={16} className="text-primary flex-shrink-0 mt-0.5" />
              <span className="text-gray-700 text-sm">{item}</span>
            </div>
          ))}
        </div>

        <p className="text-center text-gray-600 mb-10">
          Then we document the requirements before significant development begins.
        </p>

        <p className="text-center text-sm text-gray-500 italic mb-8">
          "We don't need to know exactly how to build it. Boardroom can help us figure that out."
        </p>

        <div className="text-center">
          <Link
            to={PATHS.requirementsGathering}
            className="inline-flex items-center gap-2 text-primary font-medium hover:text-primary-dark transition-colors"
          >
            Learn About Requirements Gathering
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </AnimatedSection>
  )
}

/* ------------------------------------------------------------------ */
/*  SECTION 8 — PARTNERSHIP FLOW                                       */
/* ------------------------------------------------------------------ */
const partnershipSteps = [
  { num: '01', title: 'You Identify the Opportunity', description: 'You discover a technology problem during your advisory work.' },
  { num: '02', title: 'We Talk', description: 'You bring Boardroom into the conversation to understand the opportunity.' },
  { num: '03', title: 'We Define the Solution', description: 'We conduct requirements discovery and determine what should be built.' },
  { num: '04', title: 'We Build', description: 'Boardroom handles design, development, testing, and deployment.' },
  { num: '05', title: 'Your Client Gets the Solution', description: 'The client gets working technology that solves the business problem.' },
]

function PartnershipFlowSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="partnership-flow" className="py-20 lg:py-28 bg-white scroll-mt-20" ref={ref}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            A Simple Extension of Your Existing Advisory Model.
          </h2>
        </motion.div>

        <div className="relative max-w-2xl mx-auto">
          {/* Vertical connector */}
          <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-primary via-indigo-400 to-green-500 hidden sm:block" />

          <div className="space-y-6">
            {partnershipSteps.map((step, index) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.12 }}
                className="relative flex gap-6"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg relative z-10">
                  <span className="text-white text-sm font-bold">{step.num}</span>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex-1 hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-gray-900 mb-1">{step.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.9 }}
          className="text-center mt-12 text-lg font-semibold text-gray-800"
        >
          You remain the trusted advisor. We provide the technical delivery capacity.
        </motion.p>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  SECTION 9 — EXAMPLE SCENARIOS                                      */
/* ------------------------------------------------------------------ */
const scenarios = [
  {
    icon: Briefcase,
    role: 'Fractional COO',
    problem: "A client's operations team spends hours every week manually moving information between systems.",
    opportunity: 'Automate the workflow with a custom internal application and integrations.',
    boardroom: 'Requirements → workflow design → integrations → automation → deployment.',
  },
  {
    icon: Calculator,
    role: 'Fractional CFO',
    problem: 'Financial reporting requires manually consolidating data from multiple systems.',
    opportunity: 'Create a centralized reporting application or dashboard.',
    boardroom: 'Data integrations → reporting logic → dashboard → user access.',
  },
  {
    icon: Settings,
    role: 'ERP / CRM Consultant',
    problem: "The client's ERP or CRM handles 80% of the process but cannot support a critical specialized workflow.",
    opportunity: 'Build a custom application or integration around the existing system rather than replacing it.',
    boardroom: 'Requirements → API integration → custom workflow → deployment.',
  },
  {
    icon: Landmark,
    role: 'Exit / M&A Consultant',
    problem: 'A company has inefficient processes and fragmented systems that need to be improved before or after a transaction.',
    opportunity: 'Automate critical workflows, consolidate information, or build management reporting tools.',
    boardroom: 'Requirements → solution design → development → implementation.',
  },
]

function ScenariosSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section className="py-20 lg:py-28 bg-gray-50/50 scroll-mt-20" ref={ref}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            What This Can Look Like in the Real World
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {scenarios.map((scenario, index) => (
            <motion.div
              key={scenario.role}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center">
                  <scenario.icon size={20} className="text-primary" />
                </div>
                <h3 className="font-bold text-gray-900">{scenario.role}</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-semibold text-gray-700">Problem: </span>
                  <span className="text-gray-500">{scenario.problem}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Opportunity: </span>
                  <span className="text-gray-500">{scenario.opportunity}</span>
                </div>
                <div>
                  <span className="font-semibold text-primary">Boardroom: </span>
                  <span className="text-gray-500">{scenario.boardroom}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-sm text-gray-400 mt-8 italic">
          These are illustrative examples of the types of problems we help solve.
        </p>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  SECTION 10 — PARTNERSHIP MODELS                                    */
/* ------------------------------------------------------------------ */
const partnershipModels = [
  {
    icon: Gift,
    title: 'Referral',
    description: 'You identify an opportunity and introduce Boardroom. Boardroom handles the technology engagement.',
  },
  {
    icon: Network,
    title: 'Delivery Partner',
    description: 'Boardroom operates as an extension of your team, providing technology delivery while you remain involved in the broader client engagement.',
  },
  {
    icon: Shield,
    title: 'Embedded / White-Label',
    description: 'For select partners, Boardroom can potentially operate behind the scenes as the technology delivery team.',
  },
]

function PartnershipModelsSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section className="py-20 lg:py-28 bg-white scroll-mt-20" ref={ref}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Flexible Ways to Work Together
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            The exact commercial structure can be discussed based on the relationship and project.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-6 mb-10">
          {partnershipModels.map((model, index) => (
            <motion.div
              key={model.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:border-primary/20 hover:shadow-lg transition-all group text-center"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/5 group-hover:bg-primary/10 flex items-center justify-center mb-4 mx-auto transition-colors">
                <model.icon size={22} className="text-primary" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{model.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{model.description}</p>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center text-gray-600 font-medium"
        >
          We'll structure the relationship around what works best for your clients and your business.
        </motion.p>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  SECTION 11 — WHY PARTNERS WORK WITH US                             */
/* ------------------------------------------------------------------ */
const partnerBenefits = [
  { icon: Rocket, title: 'Expand Your Offering', description: 'Solve technology problems that would otherwise fall outside your core service.' },
  { icon: Target, title: 'Keep Your Focus', description: 'Stay focused on strategy, operations, finance, or your area of expertise.' },
  { icon: UserCheck, title: 'Give Clients a Complete Solution', description: 'Move from identifying the problem to actually implementing the solution.' },
  { icon: Handshake, title: 'Build a Long-Term Technology Resource', description: 'Have a trusted development partner you can bring into future client opportunities.' },
]

function WhyPartnersSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section className="py-20 lg:py-28 bg-gray-50/50 scroll-mt-20" ref={ref}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Add Technology Capability Without Building a Technology Team.
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-6">
          {partnerBenefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:border-primary/20 hover:shadow-lg transition-all group"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/5 group-hover:bg-primary/10 flex items-center justify-center mb-4 transition-colors">
                <benefit.icon size={22} className="text-primary" />
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
/*  SECTION 12 — TRUST QUOTE                                           */
/* ------------------------------------------------------------------ */
function TrustQuoteSection() {
  return (
    <AnimatedSection className="py-20 lg:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-blue-700 to-indigo-800" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.1)_0%,_transparent_60%)]" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <blockquote className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight mb-6">
          "You don't need to become a software development company. You just need a
          technology partner you trust."
        </blockquote>
        <p className="text-blue-100/80 text-lg max-w-2xl mx-auto">
          Boardroom is designed to complement your expertise—not compete with it.
        </p>
      </div>
    </AnimatedSection>
  )
}

/* ------------------------------------------------------------------ */
/*  SECTION 13 — FINAL CTA                                             */
/* ------------------------------------------------------------------ */
function FinalCTASection() {
  return (
    <AnimatedSection className="py-20 lg:py-28 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
          Have a Client With a Technology Problem?
        </h2>
        <p className="text-2xl sm:text-3xl font-semibold text-primary mb-6">
          Let's talk about it.
        </p>
        <p className="text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
          If you regularly identify manual processes, software gaps, reporting problems,
          disconnected systems, or AI opportunities inside your clients' businesses, we'd love
          to explore whether Boardroom could become your technology delivery partner.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href={BOOK_A_CALL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-primary text-white font-semibold text-lg hover:bg-primary-dark transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
          >
            Talk About a Partnership
            <ArrowRight size={20} />
          </a>
          <Link
            to={PATHS.customDevelopment}
            className="inline-flex items-center justify-center px-8 py-4 rounded-xl border-2 border-gray-300 text-gray-700 font-medium hover:border-primary hover:text-primary transition-all"
          >
            Explore Custom Development
          </Link>
        </div>
      </div>
    </AnimatedSection>
  )
}

/* ------------------------------------------------------------------ */
/*  PAGE COMPONENT                                                     */
/* ------------------------------------------------------------------ */
export default function TechnologyPartnersPage() {
  usePageMeta({
    title: 'Technology Partner Program | Boardroom Custom Software',
    description:
      'Boardroom partners with fractional executives, consultants, and advisors to deliver custom software, automation, integrations, and AI solutions for their clients.',
    ogTitle: 'Your Client Has a Technology Problem. We Build the Solution.',
    ogDescription:
      'A technology delivery partner for consultants, fractional executives, and business advisors.',
  })

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <HeroSection />
      <ProblemSection />
      <OpportunitiesSection />
      <WhatWeDoSection />
      <CredibilitySection />
      <DeliveryModelSection />
      <RequirementsSection />
      <PartnershipFlowSection />
      <ScenariosSection />
      <PartnershipModelsSection />
      <WhyPartnersSection />
      <TrustQuoteSection />
      <FinalCTASection />
      <Footer />
    </div>
  )
}
