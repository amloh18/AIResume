'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle, Zap, Shield, FileText, BarChart3, Sparkles, Users } from 'lucide-react'

export default function AIResumeBuilderPage() {
  return (
    <div className="min-h-screen bg-[#0d1209]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0d1209]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 tablet:px-6 desktop:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#81ff00] rounded-lg flex items-center justify-center">
                <span className="text-black font-bold text-sm">CV</span>
              </div>
              <span className="text-white font-bold text-lg">AIResume</span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <Link href="/#features" className="text-gray-400 hover:text-white transition-colors text-sm">Features</Link>
              <Link href="/templates" className="text-gray-400 hover:text-white transition-colors text-sm">Templates</Link>
              <Link href="/blog" className="text-gray-400 hover:text-white transition-colors text-sm">Blog</Link>
              <Link href="/sign-up" className="bg-[#81ff00] hover:bg-[#6dd600] text-black px-4 py-2 rounded-full font-bold text-sm transition-all hover:scale-105">
                Start Free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-green-600/20 to-transparent rounded-full blur-[100px]" />
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-block px-4 py-2 bg-green-500/20 text-green-400 rounded-full text-sm font-medium mb-6"
          >
            ✨ AI-Powered Resume Builder
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight"
          >
            Create Your Resume in <span className="text-[#81ff00]">2 Minutes</span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto"
          >
            Our AI analyzes millions of successful resumes to create yours. 
            Pre-filled with relevant skills, keywords, and examples.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              href="/sign-up?callbackUrl=/editor"
              className="inline-flex items-center gap-2 bg-[#81ff00] hover:bg-[#6dd600] text-black px-8 py-4 rounded-full font-bold text-lg transition-all hover:scale-105"
            >
              Create Resume Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/templates"
              className="inline-flex items-center gap-2 border-2 border-white/20 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-white/10 transition-all"
            >
              View Templates
            </Link>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-wrap justify-center gap-8 mt-8 text-gray-500"
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-sm">Free to start</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-sm">ATS-optimized</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-sm">20+ templates</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-[#141810]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-16">
            How It Works
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: <Users className="w-8 h-8" />, title: 'Choose a Role', desc: 'Select your target job. AI pre-fills relevant skills and keywords.' },
              { icon: <Sparkles className="w-8 h-8" />, title: 'AI Generates Content', desc: 'Our AI writes your summary and bullet points automatically.' },
              { icon: <FileText className="w-8 h-8" />, title: 'Download & Apply', desc: 'Export to ATS-friendly PDF and start applying with confidence.' },
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.2 }}
                viewport={{ once: true }}
                className="bg-[#1a1f1a] rounded-2xl p-8 border border-white/5"
              >
                <div className="w-12 h-12 bg-[#81ff00]/20 rounded-full flex items-center justify-center text-[#81ff00] font-bold text-xl mb-6">
                  {i + 1}
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                <p className="text-gray-400">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-16">
            Why Choose Our AI Resume Builder
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: '🎯', title: 'Role-Specific Content', desc: 'AI pre-fills skills, keywords, and examples for your target job.' },
              { icon: '📋', title: 'ATS Optimization', desc: 'Every resume is automatically optimized for Applicant Tracking Systems.' },
              { icon: '✨', title: 'Professional Templates', desc: 'Choose from 20+ ATS-friendly templates designed by professionals.' },
              { icon: '📊', title: 'Real-time Scoring', desc: 'Get instant feedback on your resume ATS score and improvements.' },
              { icon: '📝', title: 'Cover Letter Generator', desc: 'Generate matching cover letters with one click.' },
              { icon: '🔄', title: 'Easy Updates', desc: 'Update once, apply everywhere. Your Profile keeps you ready.' },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-[#1a1f1a]/50 rounded-xl p-6 border border-white/5 hover:border-[#81ff00]/30 transition-colors"
              >
                <div className="flex gap-4">
                  <div className="text-3xl">{feature.icon}</div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                    <p className="text-gray-400 text-sm">{feature.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-r from-green-600 to-emerald-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Create Your Resume?
          </h2>
          <p className="text-green-100 mb-8">
            Join thousands who landed their dream jobs with AIResume.
          </p>
          <Link
            href="/sign-up?callbackUrl=/editor"
            className="inline-block px-10 py-5 bg-white text-green-700 font-bold rounded-full hover:bg-gray-100 transition-all hover:scale-105 text-lg"
          >
            Start Building for Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#81ff00] rounded flex items-center justify-center">
              <span className="text-black font-bold text-xs">CV</span>
            </div>
            <span className="text-gray-500 text-sm">© 2026 AIResume. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/privacy-policy" className="text-gray-500 hover:text-white text-sm">Privacy</Link>
            <Link href="/terms" className="text-gray-500 hover:text-white text-sm">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
