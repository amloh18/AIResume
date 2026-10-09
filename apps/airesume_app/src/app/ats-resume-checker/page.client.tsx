'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle, Search, FileCheck, BarChart3, Shield } from 'lucide-react'
import { FaqSection } from '@/components/seo/StructuredData'
import { ATS_CHECKER_FAQ } from '@/data/seo'

const INTRO_COPY =
  'Most resumes are not rejected because the candidate is wrong for the job. They are rejected because an applicant tracking system could not read them, could not find the words the employer searched for, or scored them lower than the pile above yours. Screening software is not judging your career; it is converting your document to plain text, matching it against a set of terms, and ranking the result. Anything that survives that conversion intact keeps its full meaning in front of a recruiter. Anything that does not is simply never seen.'

const REJECTION_REASONS = [
  {
    title: 'The parser could not read the layout',
    body: 'Multi-column designs, tables, text boxes and sidebars are reassembled in whatever order the parser happens to walk them. Your experience can end up interleaved with your education, with no way for a recruiter to reconstruct it.',
  },
  {
    title: 'Contact details sat in a header',
    body: 'Headers and footers are routinely stripped during conversion. Putting your name, phone number or portfolio link there means a recruiter may have no way to reach you even when they want to.',
  },
  {
    title: 'The keywords did not match',
    body: 'Employers search for the language in their own posting. If the job asks for stakeholder management and your resume says client relations, you can describe identical work and still fail the match.',
  },
  {
    title: 'Nothing was quantified',
    body: 'Bullets that describe responsibility rather than outcome rank poorly and read worse. "Responsible for reporting" gives a system nothing to match and a recruiter nothing to remember.',
  },
  {
    title: 'The file was an image',
    body: 'A scanned or photographed PDF contains no selectable text. The parser extracts an empty document, and an empty document scores zero regardless of what is printed on the page.',
  },
  {
    title: 'Sections used invented headings',
    body: 'Creative labels such as "Where I Have Been" or "My Toolkit" do not map to the standard sections software expects. Unrecognised headings leave your content orphaned and unsearchable.',
  },
]

const SCORE_COPY =
  'The score is a composite of six checks, and the number matters far less than which sub-score is dragging it down. A 62 caused by missing keywords is a ten-minute fix. A 62 caused by formatting that scrambles every section is a rebuild. Read the bands below, then fix the lowest sub-score first.'

const SCORE_BANDS = [
  {
    range: '80 – 100',
    label: 'Well optimised',
    action: 'Parses cleanly, covers the language of the role, and quantifies its achievements. Send it. Re-check only when you change target role.',
    tone: 'bg-emerald-900/30 border-emerald-800',
    rangeTone: 'text-emerald-400',
  },
  {
    range: '60 – 79',
    label: 'Solid, with gaps',
    action: 'The structure is sound but a keyword cluster or two is missing. Compare against the specific job posting and add the terms you genuinely hold.',
    tone: 'bg-sky-900/30 border-sky-800',
    rangeTone: 'text-sky-400',
  },
  {
    range: '40 – 59',
    label: 'Needs work',
    action: 'Either keywords are thin or achievements are unquantified. Rewrite the experience bullets with numbers and mirror the posting wording before applying.',
    tone: 'bg-amber-900/30 border-amber-800',
    rangeTone: 'text-amber-400',
  },
  {
    range: 'Below 40',
    label: 'Likely filtered out',
    action: 'Something structural is failing — a parser-breaking layout, an image-only file, or far too few relevant terms. Fix the format first, then the content.',
    tone: 'bg-rose-900/30 border-rose-800',
    rangeTone: 'text-rose-400',
  },
]

const SCORE_NOTE =
  'There is no universal pass mark. Every employer configures its own thresholds, and many do not filter on score at all — they filter on exact keyword presence. Use the number to rank your own resumes against each other, not as a verdict on your candidacy.'

const FORMAT_COPY =
  'Formatting advice for resumes tends to be aesthetic. These rules are not: each one exists because a specific parsing step fails without it. They are also the fastest fixes on this page, because they change nothing about your experience.'

const FORMAT_RULES = [
  {
    title: 'Use a single column for the main body',
    body: 'Two-column resumes are read column by column, so your left-column job titles merge with your right-column skills. Keep multi-column only for small, non-critical blocks like a skills list.',
  },
  {
    title: 'Write standard section headings',
    body: 'Experience, Education, Skills, Certifications, Projects. Deviating from these means the parser cannot tell where one section ends and the next begins.',
  },
  {
    title: 'Export to real, text-based PDF',
    body: 'Export from your editor rather than scanning a printed copy. If the recruiter can select your name with a cursor, the parser can read it too.',
  },
  {
    title: 'Avoid tables, text boxes and graphics',
    body: 'Progress bars, rating stars, logos and skill meters carry no extractable text. Everything you communicate visually inside them is invisible to screening software.',
  },
  {
    title: 'Keep dates and titles in one line',
    body: 'Write "Product Manager, Acme Corp — 2021–2024" rather than splitting the employer and dates into separate visual blocks, which get separated again during conversion.',
  },
  {
    title: 'Use a readable, embedded font',
    body: 'Standard system fonts and embedded text render reliably. Decorative or non-Latin fonts can convert to garbled characters, which quietly destroys every keyword they contain.',
  },
]

const TAILOR_COPY =
  'A single generic resume will always underperform a tailored one, because the match is recalculated for every posting. Tailoring does not mean rewriting the document — it means aligning the language you already use with the language the employer used.'

const TAILOR_STEPS = [
  {
    title: 'Pull the terms out',
    body: 'Highlight the skills, tools and responsibilities that repeat in the posting. Those are the terms the search is run against, and the ones you must be sure appear.',
  },
  {
    title: 'Map them honestly',
    body: 'Match each term to real experience. Mirror the wording for skills you hold — "Kubernetes" rather than "container orchestration" — and drop the ones you do not.',
  },
  {
    title: 'Re-run the checker',
    body: 'Score the tailored version before you send it. The gap between your generic and tailored scores is usually large enough to change the outcome.',
  },
]

const RELATED_LINKS = [
  { href: '/resume-score', label: 'Resume score checker' },
  { href: '/ai-resume-builder', label: 'AI resume builder' },
  { href: '/templates', label: 'ATS resume templates' },
  { href: '/features', label: 'All resume features' },
  { href: '/blog/how-ats-resume-scoring-works', label: 'How ATS scoring works' },
  { href: '/blog/how-to-build-ats-friendly-resume', label: 'Build an ATS-friendly resume' },
  { href: '/blog/ats-optimization/ats-tips', label: 'ATS tips' },
  { href: '/compare/resume-builders', label: 'Compare resume builders' },
]

export default function ATSResumeCheckerPage() {
  return (
    <div className="min-h-screen bg-[#0d1209]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0d1209]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#013f2e] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CV</span>
              </div>
              <span className="text-white font-bold text-lg">AIResume</span>
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

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-blue-600/20 to-transparent rounded-full blur-[100px]" />
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto pl-0 text-left flex flex-col items-start">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-semibold uppercase tracking-wider mb-6">
            🔍 Free ATS Resume Checker
          </motion.div>
          
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-[2.5rem] sm:text-[3.25rem] lg:text-[4rem] font-extrabold text-[#F5F7F7] mb-6 leading-[1.05] tracking-tighter max-w-5xl text-left">
            Check If Your Resume <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#36D39B] via-[#4DDCB0] to-[#86E8D1]">Passes ATS</span>.
          </motion.h1>
          
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-base sm:text-lg lg:text-xl text-gray-400 font-normal max-w-2xl leading-relaxed text-left mb-10">
            Upload your resume and get an instant ATS score. Analyze keywords, formatting, and structural hierarchy.
          </motion.p>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-wrap gap-4 justify-start">
            <Link href="/sign-up?callbackUrl=/editor" className="inline-flex items-center gap-2 bg-[#013f2e] hover:bg-[#025c43] text-white px-8 py-4 rounded-full font-bold text-base transition-colors duration-200 hover:scale-105 shadow-lg">
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

      {/* Why resumes get rejected */}
      <section className="py-20 px-4 bg-[#141810]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-6">Why Resumes Get Rejected Before a Human Reads Them</h2>
          <p className="text-gray-400 leading-relaxed mb-6">
            {INTRO_COPY}
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {REJECTION_REASONS.map((item, i) => (
              <motion.div key={item.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} viewport={{ once: true }} className="bg-[#1a1f1a] rounded-xl p-6 border border-white/5">
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Score interpretation */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-6">How to Read Your ATS Score</h2>
          <p className="text-gray-400 leading-relaxed mb-8">{SCORE_COPY}</p>
          <div className="space-y-4">
            {SCORE_BANDS.map((band, i) => (
              <motion.div key={band.range} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} viewport={{ once: true }}
                className={`rounded-xl p-6 flex flex-col sm:flex-row sm:gap-6 gap-2 border ${band.tone}`}>
                <span className={`text-2xl font-bold sm:w-40 shrink-0 ${band.rangeTone}`}>{band.range}</span>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">{band.label}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{band.action}</p>
                </div>
              </motion.div>
            ))}
          </div>
          <p className="text-gray-500 text-sm mt-6">{SCORE_NOTE}</p>
        </div>
      </section>

      {/* Formatting rules */}
      <section className="py-20 px-4 bg-[#141810]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-6">ATS Formatting Rules That Actually Matter</h2>
          <p className="text-gray-400 leading-relaxed mb-8">{FORMAT_COPY}</p>
          <div className="grid md:grid-cols-2 gap-4">
            {FORMAT_RULES.map((rule) => (
              <div key={rule.title} className="flex gap-3 bg-[#1a1f1a]/50 rounded-xl p-5 border border-white/5">
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-white font-semibold text-sm mb-1">{rule.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{rule.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tailoring */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-6">Tailoring Keywords for Each Application</h2>
          <p className="text-gray-400 leading-relaxed mb-6">{TAILOR_COPY}</p>
          <div className="grid md:grid-cols-3 gap-6">
            {TAILOR_STEPS.map((step, i) => (
              <div key={step.title} className="bg-[#1a1f1a] rounded-xl p-6 border border-white/5">
                <div className="w-9 h-9 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 font-bold text-sm mb-4">{i + 1}</div>
                <h3 className="text-white font-semibold mb-2">{step.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 bg-[#141810]">
        <div className="max-w-4xl mx-auto">
          <FaqSection
            items={ATS_CHECKER_FAQ}
            link={{ href: '/blog/ats-optimization/ats-tips', label: 'Read the full ATS optimisation guide' }}
          />
        </div>
      </section>

      {/* Related guides */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6">Related Guides</h2>
          <div className="flex flex-wrap gap-3">
            {RELATED_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="px-4 py-2 bg-[#1a1f1a] border border-white/10 rounded-full text-sm text-gray-300 hover:text-white hover:border-emerald-500/40 transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Check Your Resume Now</h2>
          <p className="text-blue-100 mb-8">Get instant feedback and improve your chances.</p>
          <Link href="/sign-up?callbackUrl=/editor" className="inline-block px-10 py-5 bg-white text-blue-700 font-bold rounded-full hover:bg-gray-100 transition-all hover:scale-105 text-lg">
            Check Resume Free
          </Link>
        </div>
      </section>

      <footer className="py-8 px-4 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2"><div className="w-6 h-6 bg-[#013f2e] rounded flex items-center justify-center"><span className="text-white font-bold text-xs">CV</span></div><span className="text-gray-500 text-sm">© 2026 AIResume</span></div>
          <div className="flex gap-6"><Link href="/privacy-policy" className="text-gray-500 text-sm">Privacy</Link><Link href="/terms" className="text-gray-500 text-sm">Terms</Link></div>
        </div>
      </footer>
    </div>
  )
}
