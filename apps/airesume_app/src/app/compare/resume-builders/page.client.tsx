'use client'
 
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react'
import CardNav from '@/components/landing/CardNav'
import Footer from '@/components/landing/Footer'
import { navLinks } from '@/data/navigation'

export default function CompareResumeBuildersPage() {
  return (
    <div className="min-h-screen bg-[#0d1209]">
      {/* Navigation */}
      <CardNav logo="AIResume" links={navLinks} />

      <section className="relative pt-32 pb-16 px-4">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-green-600/20 to-transparent rounded-full blur-[100px]" />
        </div>
        
        <div className="relative z-10 max-w-5xl mx-auto">
          <header className="pl-0 text-left flex flex-col items-start mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-semibold uppercase tracking-wider mb-6"
            >
              Comparison Report
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[2.5rem] sm:text-[3.25rem] lg:text-[4rem] font-extrabold text-[#F5F7F7] mb-6 leading-[1.05] tracking-tighter max-w-5xl text-left"
            >
              Best Resume Builders <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#36D39B] via-[#4DDCB0] to-[#86E8D1]">in 2026</span>.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-base sm:text-lg lg:text-xl text-gray-400 font-normal max-w-2xl leading-relaxed text-left"
            >
              Compare top resume builders to find the right tool for your job search.
            </motion.p>
          </header>

          {/* Comparison Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="overflow-x-auto"
          >
            <table className="w-full text-left bg-[#1a1f1a] rounded-xl overflow-hidden border border-white/5">
              <thead>
                <tr className="bg-[#141810]">
                  <th className="p-4 text-white font-bold">Feature</th>
                  <th className="p-4 text-[#013f2e] font-bold text-center">AIResume</th>
                  <th className="p-4 text-white font-bold text-center">Novoresume</th>
                  <th className="p-4 text-white font-bold text-center">Zety</th>
                  <th className="p-4 text-white font-bold text-center">Resume.io</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                {[
                  { feature: 'AI Resume Builder', aiResume: 'Advanced', others: ['Basic', '✓', '✗'] },
                  { feature: 'ATS Optimization', aiResume: 'Automatic', others: ['✓', '✓', '✓'] },
                  { feature: 'Free Tier', aiResume: 'Full access', others: ['Limited', 'Limited', 'Limited'] },
                  { feature: 'Job Tracker', aiResume: 'Included', others: ['✗', '✗', '✗'] },
                  { feature: 'Cover Letter AI', aiResume: '✓ AI-powered', others: ['✓', '✓', '✓'] },
                  { feature: 'Templates', aiResume: '20+', others: ['20+', '20+', '30+'] },
                  { feature: 'Role-Specific Pages', aiResume: '50+', others: ['✗', '✗', '✗'] },
                ].map((row, i) => (
                  <tr key={i} className="border-t border-white/5">
                    <td className="p-4 font-semibold">{row.feature}</td>
                    <td className="p-4 text-center text-[#013f2e] font-medium">{row.aiResume}</td>
                    <td className="p-4 text-center">{row.others[0]}</td>
                    <td className="p-4 text-center">{row.others[1]}</td>
                    <td className="p-4 text-center">{row.others[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>

          {/* Why AIResume */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-16 bg-gradient-to-r from-green-900/50 to-emerald-900/50 rounded-2xl p-8 border border-green-800/50"
          >
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Why Choose AIResume?</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: '🤖', title: 'AI-Powered', desc: 'Advanced AI generates role-specific content tailored to your target job' },
                { icon: '🎯', title: 'Job Tracker', desc: 'Track all your applications in one place - no extra tools needed' },
                { icon: '💰', title: 'Free to Start', desc: 'Get started for free with full access to core features' },
              ].map((item, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-gray-400 text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="mt-12 text-center">
            <Link href="/ai-resume-builder" className="inline-flex items-center gap-2 bg-[#013f2e] hover:bg-[#025c43] text-white px-8 py-4 rounded-full font-bold transition-colors duration-200 hover:scale-105 shadow-lg">
              Try AIResume Free <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  )
}
