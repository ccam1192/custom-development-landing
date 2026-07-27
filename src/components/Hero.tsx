import { motion } from 'framer-motion'
import {
  BarChart3, Layout, Users, Bot, Calendar, Bell,
  TrendingUp, CheckCircle2
} from 'lucide-react'

function DashboardMockup() {
  return (
    <div className="relative w-full max-w-lg mx-auto">
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
          <div className="ml-4 h-4 w-48 bg-gray-200 rounded" />
        </div>

        <div className="p-4 grid grid-cols-3 gap-3">
          <div className="col-span-2 bg-blue-50 rounded-lg p-3 h-28 flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={14} className="text-primary" />
              <span className="text-xs font-medium text-gray-600">Revenue</span>
            </div>
            <div className="flex items-end gap-1">
              {[40, 65, 45, 80, 55, 90, 70, 95].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-primary/70 rounded-sm"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 h-28 flex flex-col justify-between">
            <TrendingUp size={14} className="text-green-600" />
            <div>
              <div className="text-lg font-bold text-gray-900">+24%</div>
              <div className="text-xs text-gray-500">Growth</div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-3 h-24">
            <div className="flex items-center gap-1 mb-2">
              <Layout size={12} className="text-purple-600" />
              <span className="text-xs font-medium text-gray-600">Tasks</span>
            </div>
            <div className="space-y-1.5">
              <div className="h-2.5 bg-purple-200 rounded w-full" />
              <div className="h-2.5 bg-purple-300 rounded w-3/4" />
              <div className="h-2.5 bg-purple-200 rounded w-1/2" />
            </div>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 h-24">
            <div className="flex items-center gap-1 mb-2">
              <Users size={12} className="text-orange-600" />
              <span className="text-xs font-medium text-gray-600">Clients</span>
            </div>
            <div className="text-lg font-bold text-gray-900">1,342</div>
            <div className="text-xs text-gray-500">Active</div>
          </div>
          <div className="bg-cyan-50 rounded-lg p-3 h-24">
            <div className="flex items-center gap-1 mb-2">
              <Bot size={12} className="text-cyan-600" />
              <span className="text-xs font-medium text-gray-600">AI</span>
            </div>
            <div className="space-y-1">
              <div className="h-2 bg-cyan-200 rounded w-full" />
              <div className="h-2 bg-cyan-300 rounded w-2/3" />
            </div>
          </div>

          <div className="col-span-2 bg-gray-50 rounded-lg p-3 h-20">
            <div className="flex items-center gap-1 mb-2">
              <Calendar size={12} className="text-gray-600" />
              <span className="text-xs font-medium text-gray-600">Schedule</span>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-6 bg-primary/10 rounded border border-primary/20" />
              ))}
            </div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 h-20 flex flex-col justify-between">
            <Bell size={12} className="text-red-500" />
            <div className="text-xs font-medium text-gray-600">3 new</div>
          </div>
        </div>
      </div>

      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-4 -right-4 bg-white rounded-xl shadow-lg border border-gray-100 px-3 py-2 flex items-center gap-2"
      >
        <CheckCircle2 size={14} className="text-green-500" />
        <span className="text-xs font-medium text-gray-700">Deployed</span>
      </motion.div>

      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute -bottom-3 -left-4 bg-white rounded-xl shadow-lg border border-gray-100 px-3 py-2 flex items-center gap-2"
      >
        <Bot size={14} className="text-primary" />
        <span className="text-xs font-medium text-gray-700">AI Ready</span>
      </motion.div>

      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute top-1/2 -right-6 bg-white rounded-xl shadow-lg border border-gray-100 px-3 py-2"
      >
        <span className="text-xs font-medium text-green-600">+12 users</span>
      </motion.div>
    </div>
  )
}

export default function Hero() {
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
              Custom Software Development
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
              Build the Software Your Business Actually Needs.
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed mb-8 max-w-xl">
              Stop forcing your business into someone else's software.
              Build software around the way you work.
            </p>
            <p className="text-base text-gray-500 leading-relaxed mb-8 max-w-xl">
              Whether you need an internal business application, customer portal, workflow automation, dashboard, AI-powered tool, website, or an entirely new SaaS platform, we design and build software tailored specifically to your business—faster and more affordably than ever before.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="#pricing"
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
              >
                Book a Discovery Call
              </a>
              <a
                href="#methodology"
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:border-primary hover:text-primary transition-all"
              >
                See Our Process
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="hidden lg:block"
          >
            <DashboardMockup />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto"
        >
          {[
            { value: '10+ Years', label: 'Enterprise Software Experience' },
            { value: '1,300+', label: 'Businesses Served' },
            { value: 'Hundreds', label: 'Projects Delivered' },
          ].map((stat) => (
            <div key={stat.value} className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
