import { Metadata } from 'next'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Resume Mistakes to Avoid in 2026 | CVCircle',
  description: 'Discover the most common resume mistakes that hurt your job search. Learn what to avoid and how to create a winning resume.',
  keywords: ['resume mistakes', 'resume errors', 'bad resume', 'resume tips'],
  alternates: { canonical: '/blog/resume-writing/resume-mistakes' },
}

export default function ResumeMistakesPage() {
  const criticalMistakes = [
    { title: 'Typos and Grammar Errors', desc: 'A single typo can get your resume rejected instantly. Proofread multiple times and use tools.', impact: 'High' },
    { title: 'Generic Objectives', desc: 'Avoid "Seeking a challenging position." Customize for each role.', impact: 'High' },
    { title: 'Listing Duties, Not Achievements', desc: 'Say "Led team of 5" not "Responsible for team management."', impact: 'High' },
    { title: 'Including Irrelevant Info', desc: 'Remove early jobs, hobbies that don\'t fit, or personal details.', impact: 'Medium' },
    { title: 'Using Passive Language', desc: 'Use action verbs: led, created, achieved, increased.', impact: 'Medium' },
    { title: 'Inconsistent Formatting', desc: 'Same font sizes, bullet styles, and spacing throughout.', impact: 'Medium' }
  ];

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

      <article className="max-w-4xl mx-auto px-4 py-32">
        <header className="mb-12 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-block px-4 py-2 bg-red-500/20 text-red-400 rounded-full text-sm font-medium mb-6">
            Avoid These Mistakes
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-5xl font-bold text-white mb-6">
            Resume Mistakes to Avoid in 2026
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-xl text-gray-400">
            These common errors could be costing you interviews
          </motion.p>
        </header>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Critical Mistakes That Kill Your Chances</h2>
          <div className="space-y-4">
            {criticalMistakes.map((mistake, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                className="bg-[#1a1f1a] rounded-xl p-6 border border-white/5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">{mistake.title}</h3>
                    <p className="text-gray-400">{mistake.desc}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${mistake.impact === 'High' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                    {mistake.impact} Impact
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Quick Dos and Don'ts</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-green-900/20 border border-green-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" /> Do This
              </h3>
              <ul className="space-y-2 text-gray-300">
                <li>• Use action verbs</li>
                <li>• Quantify achievements</li>
                <li>• Keep it 1-2 pages</li>
                <li>• Customise for each job</li>
                <li>• Include relevant keywords</li>
                <li>• Use consistent formatting</li>
              </ul>
            </div>
            <div className="bg-red-900/20 border border-red-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
                <XCircle className="w-5 h-5" /> Avoid This
              </h3>
              <ul className="space-y-2 text-gray-300">
                <li>• Typos and grammar errors</li>
                <li>• Generic objective statements</li>
                <li>• Listing job duties</li>
                <li>• Using passive language</li>
                <li>• Including personal photos</li>
                <li>• Lying about experience</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">The Resume Red Flags Recruiters Hate</h2>
          <div className="bg-red-900/10 border border-red-800/50 rounded-xl p-6">
            <ul className="space-y-3">
              {['Spelling errors', 'Wrong contact information', 'Inconsistent dates', 'Unprofessional email address', 'Gaps without explanation', 'Too many buzzwords', 'Old or irrelevant experience', 'No quantifiable results'].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-gray-300">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" /> {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mt-16 bg-gradient-to-r from-red-600 to-rose-600 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Create a Perfect Resume</h2>
          <p className="text-red-100 mb-6">Avoid these mistakes with our AI-powered resume builder.</p>
          <Link href="/sign-up?callbackUrl=/resume-enhancer" className="inline-flex items-center gap-2 bg-white text-red-700 px-8 py-4 rounded-full font-bold hover:bg-gray-100 transition">
            Build Perfect Resume Free <ArrowRight className="w-5 h-5" />
          </Link>
        </section>

        <section className="mt-12">
          <h3 className="text-xl font-bold text-white mb-4">Related Pages</h3>
          <div className="flex flex-wrap gap-3">
            <Link href="/ai-resume-builder" className="px-4 py-2 bg-[#1a1f1a] text-gray-300 rounded-lg hover:bg-[#2a2f2a] transition">AI Resume Builder</Link>
            <Link href="/ats-resume-checker" className="px-4 py-2 bg-[#1a1f1a] text-gray-300 rounded-lg hover:bg-[#2a2f2a] transition">ATS Checker</Link>
            <Link href="/blog/resume-writing/fresher-resume-guide" className="px-4 py-2 bg-[#1a1f1a] text-gray-300 rounded-lg hover:bg-[#2a2f2a] transition">Fresher Resume Guide</Link>
          </div>
        </section>
      </article>

      <footer className="py-8 px-4 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2"><div className="w-6 h-6 bg-[#81ff00] rounded"><span className="text-black font-bold text-xs">CV</span></div><span className="text-gray-500 text-sm">© 2026 CVCircle</span></div>
          <div className="flex gap-6"><Link href="/privacy-policy" className="text-gray-500 text-sm">Privacy</Link><Link href="/terms" className="text-gray-500 text-sm">Terms</Link></div>
        </div>
      </footer>
    </div>
  )
}
