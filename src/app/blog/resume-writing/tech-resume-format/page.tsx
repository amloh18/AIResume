import { Metadata } from 'next'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Code, Database, Globe, Terminal, Cpu } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Tech Resume Format Guide 2026 | CVCircle',
  description: 'Learn the best resume format for software engineers, developers, and tech professionals. Get tips for tech roles.',
  keywords: ['tech resume format', 'software engineer resume', 'developer resume', 'tech resume tips'],
  alternates: { canonical: '/blog/resume-writing/tech-resume-format' },
}

export default function TechResumeFormatPage() {
  const techSections = [
    { icon: <Code className="w-6 h-6" />, title: 'Technical Skills', items: ['Languages: Python, JavaScript, Java', 'Frameworks: React, Node, Django', 'Tools: Git, Docker, AWS'] },
    { icon: <Terminal className="w-6 h-6" />, title: 'Projects', items: ['GitHub portfolio links', 'Live demos', 'Technical challenges solved'] },
    { icon: <Database className="w-6 h-6" />, title: 'Experience', items: ['Internships matter a lot', 'Open source contributions', 'Freelance projects count'] },
    { icon: <Globe className="w-6 h-6" />, title: 'Certifications', items: ['AWS, GCP, Azure', 'Meta, Google, IBM', 'Bootcamp certificates'] }
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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-block px-4 py-2 bg-blue-500/20 text-blue-400 rounded-full text-sm font-medium mb-6">
            For Tech Professionals
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-5xl font-bold text-white mb-6">
            Tech Resume Format Guide 2026
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-xl text-gray-400">
            Create a resume that lands interviews at top tech companies
          </motion.p>
        </header>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">What Tech Recruiters Look For</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[{ name: 'Skills Match', desc: 'Keywords from job description' },
              { name: 'Project Portfolio', desc: 'GitHub, live demos' },
              { name: 'Impact Metrics', desc: 'Numbers and results' },
              { name: 'Growth Story', desc: 'Clear progression' },
              { name: 'Problem Solving', desc: 'Complex challenges tackled' },
              { name: 'Clean Code', desc: 'Well-formatted resume' }
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                className="bg-[#1a1f1a] p-5 rounded-xl border border-blue-800/30">
                <h3 className="font-semibold text-white mb-1">{item.name}</h3>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Recommended Section Order</h2>
          <div className="space-y-4">
            {techSections.map((section, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                className="bg-[#1a1f1a] rounded-xl p-6 border border-white/5 flex gap-4 items-start">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 flex-shrink-0">{section.icon}</div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">{section.title}</h3>
                  <ul className="text-gray-400 text-sm space-y-1">{section.items.map((item, j) => <li key={j}>• {item}</li>)}</ul>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">Pro Tips for Tech Resumes</h2>
          <div className="bg-blue-900/20 border border-blue-800/50 rounded-xl p-6">
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start gap-3"><span className="text-blue-400 font-bold">1.</span> <span>Include GitHub and LinkedIn links prominently</span></li>
              <li className="flex items-start gap-3"><span className="text-blue-400 font-bold">2.</span> <span>Use numbers: "Reduced API latency by 40%"</span></li>
              <li className="flex items-start gap-3"><span className="text-blue-400 font-bold">3.</span> <span>List technologies with proficiency levels</span></li>
              <li className="flex items-start gap-3"><span className="text-blue-400 font-bold">4.</span> <span>Include relevant certifications</span></li>
              <li className="flex items-start gap-3"><span className="text-blue-400 font-bold">5.</span> <span>Keep it to 1-2 pages max</span></li>
              <li className="flex items-start gap-3"><span className="text-blue-400 font-bold">6.</span> <span>Tailor skills section for each application</span></li>
            </ul>
          </div>
        </section>

        <section className="mt-16 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Build Your Tech Resume</h2>
          <p className="text-blue-100 mb-6">Create a professional tech resume that stands out.</p>
          <Link href="/sign-up?callbackUrl=/resume-enhancer" className="inline-flex items-center gap-2 bg-white text-blue-700 px-8 py-4 rounded-full font-bold hover:bg-gray-100 transition">
            Create Tech Resume Free <ArrowRight className="w-5 h-5" />
          </Link>
        </section>

        <section className="mt-12">
          <h3 className="text-xl font-bold text-white mb-4">Related Pages</h3>
          <div className="flex flex-wrap gap-3">
            <Link href="/resume/software-engineer" className="px-4 py-2 bg-[#1a1f1a] text-gray-300 rounded-lg hover:bg-[#2a2f2a] transition">Software Engineer Resume</Link>
            <Link href="/resume/frontend-developer" className="px-4 py-2 bg-[#1a1f1a] text-gray-300 rounded-lg hover:bg-[#2a2f2a] transition">Frontend Developer Resume</Link>
            <Link href="/ai-resume-builder" className="px-4 py-2 bg-[#1a1f1a] text-gray-300 rounded-lg hover:bg-[#2a2f2a] transition">AI Resume Builder</Link>
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
