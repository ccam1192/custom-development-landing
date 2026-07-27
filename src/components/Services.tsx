import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import {
  AppWindow, Workflow, Bot, Users, UserCheck, Package,
  CalendarClock, Contact, BarChart3, FileText, Globe,
  ShieldCheck, Rocket, Plug, LayoutDashboard, Megaphone,
  FileCode, Smartphone, RefreshCw
} from 'lucide-react'

const services = [
  { icon: AppWindow, title: 'Internal Business Applications' },
  { icon: Workflow, title: 'Workflow Automation' },
  { icon: Bot, title: 'AI Agents & AI Integrations' },
  { icon: Users, title: 'Customer Portals' },
  { icon: UserCheck, title: 'Employee Portals' },
  { icon: Package, title: 'Inventory Systems' },
  { icon: CalendarClock, title: 'Scheduling Platforms' },
  { icon: Contact, title: 'CRM Systems' },
  { icon: BarChart3, title: 'Operations Dashboards' },
  { icon: FileText, title: 'Reporting Platforms' },
  { icon: ShieldCheck, title: 'Client Portals' },
  { icon: Globe, title: 'Membership Sites' },
  { icon: Rocket, title: 'Custom SaaS Products' },
  { icon: Plug, title: 'API Integrations' },
  { icon: LayoutDashboard, title: 'Business Intelligence Dashboards' },
  { icon: Megaphone, title: 'Marketing Websites' },
  { icon: FileCode, title: 'Landing Pages' },
  { icon: Smartphone, title: 'Mobile-Friendly Web Applications' },
  { icon: RefreshCw, title: 'Legacy Software Modernization' },
]

export default function Services() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="services" className="py-20 lg:py-28 bg-white" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            What We Can Build
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            From internal tools to customer-facing platforms, we build software that solves real business problems.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {services.map((service, index) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 15 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.8) }}
              className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 hover:border-primary/30 hover:bg-blue-50/30 transition-all group cursor-default"
            >
              <div className="w-10 h-10 rounded-lg bg-gray-50 group-hover:bg-primary/10 flex items-center justify-center flex-shrink-0 transition-colors">
                <service.icon size={18} className="text-gray-500 group-hover:text-primary transition-colors" />
              </div>
              <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                {service.title}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
