'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle, Search, FileCheck, BarChart3, Shield } from 'lucide-react'

export default function ATSResumeCheckerPage() {
  return (
    <div className="min-h-screen bg-[#0d1209]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0d1209]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#81ff00] rounded-lg flex items-center justify-center">
                <span className="text-black font-bold text-sm">CV</span>
              </div>
              <span className="text-white font-bold text-lg">CVCircle</span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <Link href="/#features" className="text-gray-400 hover:text-white text-sm">Features</Link>
              <Link href="/templates" className="text-gray-400 hover:text-white text-sm">Templates</Link>
              <Link href="/blog" className="text-gray-400 hover:text-white text-sm">Blog</Link>
              <Link href="/sign-up" className="bg-[#81ff00] text-black px-4 py-2 rounded-full font-bold text-sm">Start Free</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-blue-600/20 to-transparent rounded-full blur-[100px]" />
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-block px-4 py-2 bg-blue-500/20 text-blue-400 rounded-full text-sm font-medium mb-6">
            🔍 Free ATS Resume Checker
          </motion.div>
          
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-5xl md:text-6xl font-bold text-white mb-6">
            Check If Your Resume <span className="text-blue-400">Passes ATS</span>
          </motion.h1>
          
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-xl text-gray-400 mb-10">
            Upload your resume and get an instant ATS score. Analyze keywords, formatting, and structure.
          </motion.p>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/sign-up?callbackUrl=/resume-enhancer" className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-full font-bold text-lg transition-all hover:scale-105">
              Check Resume Free <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/ai-resume-builder" className="inline-flex items-center gap-2 border-2 border-white/20 text-white px-8 py-4 rounded-full font-bold hover:bg-white/10 transition-all">
              Create ATS Resume
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex justify-center gap-8 mt-8 text-gray-500">
            <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-blue-400" /><span className="text-sm">100% Free</span></div>
            <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-blue-400" /><span className="text-sm">Instant Results</span></div>
            <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-blue-400" /><span className="text-sm">No Signup</span></div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-[#141810]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-16">How ATS Checking Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[{ icon: <Search className="w-8 h-8" />, title: 'Upload Resume', desc: 'Upload PDF or DOCX, or paste text directly.' },
              { icon: <BarChart3 className="w-8 h-8" />, title: 'AI Analysis', desc: 'We scan for keywords, formatting, and compatibility.' },
              { icon: <FileCheck className="w-8 h-8" />, title: 'Get Score & Tips', desc: 'Receive your ATS score with recommendations.' }
            ].map((step, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.2 }} viewport={{ once: true }} className="bg-[#1a1f1a] rounded-2xl p-8 border border-white/5">
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold text-xl mb-6">{i + 1}</div>
                <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                <p className="text-gray-400">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* What We Check */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-16">What Our ATS Checker Analyzes</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[{ icon: '🔑', title: 'Keyword Analysis', desc: 'Identifies missing keywords and suggests industry terms.' },
              { icon: '📐', title: 'Format Compatibility', desc: 'Checks for ATS-friendly formatting and tables.' },
              { icon: '📝', title: 'Content Structure', desc: 'Evaluates section organization and readability.' },
              { icon: '📊', title: 'Skills Matching', desc: 'Compares skills against job requirements.' },
              { icon: '🏢', title: 'Section Analysis', desc: 'Verifies essential sections are present.' },
              { icon: '📈', title: 'Impact Scoring', desc: 'Rates strength of achievements.' }
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }} className="bg-[#1a1f1a]/50 rounded-xl p-6 border border-white/5 hover:border-blue-500/30 transition-colors">
                <div className="flex gap-4"><div className="text-3xl">{item.icon}</div><div><h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3><p className="text-gray-400 text-sm">{item.desc}</p></div></div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Check Your Resume Now</h2>
          <p className="text-blue-100 mb-8">Get instant feedback and improve your chances.</p>
          <Link href="/sign-up?callbackUrl=/resume-enhancer" className="inline-block px-10 py-5 bg-white text-blue-700 font-bold rounded-full hover:bg-gray-100 transition-all hover:scale-105 text-lg">
            Check Resume Free
          </Link>
        </div>
      </section>

      <footer className="py-8 px-4 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2"><div className="w-6 h-6 bg-[#81ff00] rounded"><span className="text-black font-bold text-xs">CV</span></div><span className="text-gray-500 text-sm">© 2026 CVCircle</span></div>
          <div className="flex gap-6"><Link href="/privacy-policy" className="text-gray-500 text-sm">Privacy</Link><Link href="/terms" className="text-gray-500 text-sm">Terms</Link></div>
        </div>
      </footer>
    </div>
  )
}
