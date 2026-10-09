'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle, Target, Zap, Palette, FileText, Lightbulb, Star } from 'lucide-react'
import { FaqSection } from '@/components/seo/StructuredData'
import { RESUME_SCORE_FAQ } from '@/data/seo'

const SCORE_INTRO =
  'A resume score answers one question: if a recruiter gave this document eight seconds, how much of your case would land? It is not a measure of your experience or your worth. It measures how well that experience is communicated — whether the achievements carry numbers, whether the keywords a role needs are present, whether the layout survives conversion to plain text, and whether the sections a reader expects are where they expect them.'

const SUBSCORE_DETAIL = [
  {
    icon: <Zap className="w-8 h-8" />,
    title: 'Impact Score',
    desc: 'Quantified achievements, metrics, and results.',
    detail:
      'Counts how many bullets carry a number, a scale or a time frame. "Managed the reporting pipeline" and "Cut reporting from three days to twenty minutes" describe the same job; only one survives a skim.',
  },
  {
    icon: <Target className="w-8 h-8" />,
    title: 'Keyword Score',
    desc: 'Industry-specific keywords and skills.',
    detail:
      'Compares your language with the vocabulary of your target role — the tools, methods and responsibilities that appear repeatedly in those postings. Gaps here are the single most common cause of an automated rejection.',
  },
  {
    icon: <Palette className="w-8 h-8" />,
    title: 'Format Score',
    desc: 'Layout, spacing, fonts, ATS compatibility.',
    detail:
      'Checks the things that break parsing: columns, tables, text boxes, headers and footers, image-only files, and non-standard section headings. Formatting issues are invisible to you and fatal to the parser.',
  },
  {
    icon: <FileText className="w-8 h-8" />,
    title: 'Content Score',
    desc: 'Summary, experience, education quality.',
    detail:
      'Judges whether your summary states a direction rather than a wish, whether experience entries follow a consistent shape, and whether your education section is doing work proportional to your seniority.',
  },
  {
    icon: <Lightbulb className="w-8 h-8" />,
    title: 'Skills Score',
    desc: 'Technical and soft skills presentation.',
    detail:
      'Looks at whether skills are grouped meaningfully, named the way employers name them, and backed up somewhere in your experience. An unsupported skills list reads as padding.',
  },
  {
    icon: <Star className="w-8 h-8" />,
    title: 'Overall Score',
    desc: 'Combined score for complete picture.',
    detail:
      'A weighted roll-up of the five sub-scores. It is useful for comparing versions of your resume against each other, and close to useless on its own — always read the sub-score that is lowest.',
  },
]

const SCORE_BANDS = [
  { score: '80-100', level: 'Excellent', desc: 'Well-optimised, ready to submit.', tone: 'bg-emerald-900/30 border-emerald-800', rangeTone: 'text-emerald-400' },
  { score: '60-79', level: 'Good', desc: 'Solid, with identifiable room for improvement.', tone: 'bg-sky-900/30 border-sky-800', rangeTone: 'text-sky-400' },
  { score: '40-59', level: 'Average', desc: 'Needs work on achievements and keywords.', tone: 'bg-amber-900/30 border-amber-800', rangeTone: 'text-amber-400' },
  { score: 'Below 40', level: 'Needs Work', desc: 'Fix structure and keywords before you apply.', tone: 'bg-rose-900/30 border-rose-800', rangeTone: 'text-rose-400' },
]

const IMPROVE_COPY =
  'Improvement is sequential: fix what breaks the parser before you touch a single word, because content improvements are wasted on a document the software cannot read. Work down this list in order and re-score after each step — the first two usually move the number more than everything after them combined.'

const IMPROVE_STEPS = [
  {
    title: 'Fix the format first',
    body: 'Collapse columns and tables into a single readable flow, move anything out of headers and footers, replace skill meters and icons with plain text, and export a text-based PDF. If the file cannot be parsed, no amount of good writing will rescue it.',
  },
  {
    title: 'Add numbers to your achievements',
    body: 'Rewrite the top five bullets so each one carries a magnitude, a percentage or a time saved. Start with your most recent role, because that is where a reader looks first and where an unquantified bullet costs the most.',
  },
  {
    title: 'Close the keyword gaps honestly',
    body: 'Compare your resume against the job description and add the terms you genuinely hold but have written differently. Never add a term you cannot defend in an interview — a keyword that wins the interview and loses it five minutes later has cost you the job.',
  },
  {
    title: 'Tighten the summary',
    body: 'Three lines maximum: the role you are targeting, the scale you have worked at, and the strongest result you own. Objective statements that say you are "seeking a challenging role" consume prime space to say nothing.',
  },
  {
    title: 'Cut the rest',
    body: 'Remove duties, job descriptions lifted from the posting, and anything older than fifteen years that does not support the role you want. Density beats length in both the parser and the skim.',
  },
]

const RELATED_LINKS = [
  { href: '/ats-resume-checker', label: 'ATS resume checker' },
  { href: '/ai-resume-builder', label: 'AI resume builder' },
  { href: '/templates', label: 'ATS resume templates' },
  { href: '/features', label: 'All resume features' },
  { href: '/blog/ats-score-optimization', label: 'ATS score optimisation' },
  { href: '/blog/how-ats-resume-scoring-works', label: 'How ATS scoring works' },
  { href: '/blog/what-is-a-good-resume-match-score', label: 'What is a good match score' },
  { href: '/compare/resume-builders', label: 'Compare resume builders' },
]

export default function ResumeScorePage() {
  return (
    <div className="min-h-screen bg-[#0d1209]">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0d1209]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#013f2e] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CV</span>
              </div>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <Link href="/#features" className="text-gray-400 hover:text-white text-sm">Features</Link>
              <Link href="/templates" className="text-gray-400 hover:text-white text-sm">Templates</Link>
              <Link href="/blog" className="text-gray-400 hover:text-white text-sm">Blog</Link>
              <Link href="/sign-up" className="bg-[#013f2e] text-white px-4 py-2 rounded-full font-bold text-sm">Start Free</Link>
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
            <Link href="/sign-up?callbackUrl=/editor" className="inline-flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-8 py-4 rounded-full font-bold text-lg transition-all hover:scale-105">
              Check My Score <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/ai-resume-builder" className="inline-flex items-center gap-2 border-2 border-white/20 text-white px-8 py-4 rounded-full font-bold hover:bg-white/10 transition-all">
              Improve My Resume
            </Link>
          </motion.div>
        </div>
      </section>

      {/* What the score measures */}
      <section className="py-20 px-4 bg-[#141810]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-6">What the Score Actually Measures</h2>
          <p className="text-gray-400 leading-relaxed mb-10 max-w-3xl">{SCORE_INTRO}</p>
          <div className="grid md:grid-cols-3 gap-6">
            {SUBSCORE_DETAIL.map((item, i) => (
              <motion.div key={item.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} viewport={{ once: true }} className="bg-[#1a1f1a] rounded-2xl p-8 border border-white/5">
                <div className="text-4xl mb-4 text-purple-400">{item.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
                <p className="text-gray-400 mb-3">{item.desc}</p>
                <p className="text-gray-500 text-sm leading-relaxed">{item.detail}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Score bands */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Understanding Your Scores</h2>
          <div className="space-y-4">
            {SCORE_BANDS.map((item, i) => (
              <motion.div key={item.score} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                className={`rounded-xl p-6 flex flex-col sm:flex-row sm:gap-6 gap-2 border ${item.tone}`}>
                <span className={`text-2xl font-bold sm:w-44 shrink-0 ${item.rangeTone}`}>{item.score}</span>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-1">{item.level}</h3>
                  <p className="text-gray-400 text-sm">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How to improve */}
      <section className="py-20 px-4 bg-[#141810]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-6">How to Raise Your Score</h2>
          <p className="text-gray-400 leading-relaxed mb-8 max-w-3xl">{IMPROVE_COPY}</p>
          <div className="space-y-4">
            {IMPROVE_STEPS.map((step, i) => (
              <div key={step.title} className="bg-[#1a1f1a] rounded-xl p-6 border border-white/5 flex gap-5">
                <div className="w-9 h-9 shrink-0 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 font-bold text-sm">{i + 1}</div>
                <div>
                  <h3 className="text-white font-semibold mb-2">{step.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <FaqSection
            items={RESUME_SCORE_FAQ}
            link={{ href: '/blog/ats-score-optimization', label: 'Read the full guide to ATS scores' }}
          />
        </div>
      </section>

      {/* Related guides */}
      <section className="py-16 px-4 bg-[#141810]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6">Related Guides</h2>
          <div className="flex flex-wrap gap-3">
            {RELATED_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="px-4 py-2 bg-[#1a1f1a] border border-white/10 rounded-full text-sm text-gray-300 hover:text-white hover:border-purple-500/40 transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-gradient-to-r from-purple-600 to-pink-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Check Your Resume Score Now</h2>
          <p className="text-purple-100 mb-8">Get instant feedback and personalized tips.</p>
          <Link href="/sign-up?callbackUrl=/editor" className="inline-block px-10 py-5 bg-white text-purple-700 font-bold rounded-full hover:bg-gray-100 transition-all hover:scale-105 text-lg">
            Get My Score
          </Link>
        </div>
      </section>

      <footer className="py-8 px-4 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2"><div className="w-6 h-6 bg-[#013f2e] rounded flex items-center justify-center"><span className="text-white font-bold text-xs">CV</span></div><span className="text-gray-500 text-sm">© 2026 AIResume by Morigrid Labs</span></div>
          <div className="flex gap-6"><Link href="/privacy-policy" className="text-gray-500 text-sm">Privacy</Link><Link href="/terms" className="text-gray-500 text-sm">Terms</Link></div>
        </div>
      </footer>
    </div>
  )
}
