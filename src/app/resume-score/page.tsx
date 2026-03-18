import { Metadata } from 'next'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle, Target, Zap, Palette, FileText, Lightbulb, Star } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Resume Score - Check Your Resume Strength | CVCircle',
  description: 'Get a comprehensive resume score analyzing impact, keywords, formatting, and more. Free resume evaluation with actionable tips.',
  keywords: ['resume score', 'resume evaluator', 'resume rating', 'free resume analysis'],
  alternates: { canonical: '/resume-score' },
}

export default function ResumeScorePage() {
  return (
    <div className="min-h-screen bg-[#0d1209]">
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

      <section className="relative pt-32 pb-20 px-4">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-purple-600/20 to-transparent rounded-full blur-[100px]" />
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-block px-4 py-2 bg-purple-500/20 text-purple-400 rounded-full text-sm font-medium mb-6">
            📊 Resume Score
          </motion.div>
          
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-5xl md:text-6xl font-bold text-white mb-6">
            Know Your Resume <span className="text-purple-400">Score</span>
          </motion.h1>
          
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-xl text-gray-400 mb-10">
            Comprehensive score evaluating impact, keywords, formatting, and more.
          </motion.p>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/sign-up?callbackUrl=/resume-enhancer" className="inline-flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-8 py-4 rounded-full font-bold text-lg transition-all hover:scale-105">
              Check My Score <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/ai-resume-builder" className="inline-flex items-center gap-2 border-2 border-white/20 text-white px-8 py-4 rounded-full font-bold hover:bg-white/10 transition-all">
              Improve My Resume
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="py-20 px-4 bg-[#141810]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-16">What We Score</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[{ icon: <Zap className="w-8 h-8" />, title: 'Impact Score', desc: 'Quantified achievements, metrics, and results.' },
              { icon: <Target className="w-8 h-8" />, title: 'Keyword Score', desc: 'Industry-specific keywords and skills.' },
              { icon: <Palette className="w-8 h-8" />, title: 'Format Score', desc: 'Layout, spacing, fonts, ATS compatibility.' },
              { icon: <FileText className="w-8 h-8" />, title: 'Content Score', desc: 'Summary, experience, education quality.' },
              { icon: <Lightbulb className="w-8 h-8" />, title: 'Skills Score', desc: 'Technical and soft skills presentation.' },
              { icon: <Star className="w-8 h-8" />, title: 'Overall Score', desc: 'Combined score for complete picture.' }
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }} className="bg-[#1a1f1a] rounded-2xl p-8 border border-white/5">
                <div className="text-4xl mb-4 text-purple-400">{item.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
                <p className="text-gray-400">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Understanding Your Scores</h2>
          <div className="space-y-4">
            {[{ score: '80-100', level: 'Excellent', color: 'green', desc: 'Well-optimized, ready to submit.' },
              { score: '60-79', level: 'Good', color: 'blue', desc: 'Solid with room for improvement.' },
              { score: '40-59', level: 'Average', color: 'yellow', desc: 'Needs work on achievements and keywords.' },
              { score: 'Below 40', level: 'Needs Work', color: 'red', desc: 'Use our AI builder for stronger resume.' }
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }} 
                className={`bg-${item.color}-900/30 border border-${item.color}-800 rounded-xl p-6 flex gap-4`}>
                <span className={`text-2xl font-bold text-${item.color}-400`}>{item.score}</span>
                <div><h3 className="text-xl font-semibold text-white mb-1">{item.level}</h3><p className="text-gray-400 text-sm">{item.desc}</p></div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-gradient-to-r from-purple-600 to-pink-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Check Your Resume Score Now</h2>
          <p className="text-purple-100 mb-8">Get instant feedback and personalized tips.</p>
          <Link href="/sign-up?callbackUrl=/resume-enhancer" className="inline-block px-10 py-5 bg-white text-purple-700 font-bold rounded-full hover:bg-gray-100 transition-all hover:scale-105 text-lg">
            Get My Score
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
