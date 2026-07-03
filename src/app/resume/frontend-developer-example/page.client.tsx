'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Download, Eye, Sparkles, Palette, Layout, Figma } from 'lucide-react'

export default function FrontendDeveloperExamplePage() {
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
          <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-gradient-to-l from-purple-600/20 to-transparent rounded-full blur-[100px]" />
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-block px-4 py-2 bg-purple-500/20 text-purple-400 rounded-full text-sm font-medium mb-6">
            🎨 Resume Example
          </motion.div>
          
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-5xl md:text-6xl font-bold text-white mb-6">
            Frontend Developer <span className="text-purple-400">Resume</span>
          </motion.h1>
          
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-xl text-gray-400 mb-10">
            Professional resume example for UI/UX developers
          </motion.p>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/sign-up?callbackUrl=/editor" className="inline-flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-8 py-4 rounded-full font-bold text-lg transition-all hover:scale-105">
              Build Like This <Sparkles className="w-5 h-5" />
            </Link>
            <button className="inline-flex items-center gap-2 border-2 border-white/20 text-white px-8 py-4 rounded-full font-bold hover:bg-white/10 transition-all">
              <Eye className="w-5 h-5" /> Preview
            </button>
          </motion.div>
        </div>
      </section>

      <section className="py-20 px-4 bg-[#141810]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">What's Included</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[{ icon: <Palette className="w-8 h-8" />, title: 'UI/UX Skills', desc: 'React, Vue, Tailwind, CSS3, Figma' },
              { icon: <Layout className="w-8 h-8" />, title: 'Projects', desc: 'Live websites, responsive designs' },
              { icon: <Figma className="w-8 h-8" />, title: 'Design Tools', desc: 'Figma, Adobe XD, Sketch' }
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }} 
                className="bg-[#1a1f1a] rounded-2xl p-8 border border-white/5">
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
          <h2 className="text-3xl font-bold text-white text-center mb-12">Resume Preview</h2>
          <div className="bg-white rounded-2xl p-8 md:p-12 text-gray-900 shadow-2xl">
            <div className="border-b-2 border-gray-200 pb-4 mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Emily Rodriguez</h3>
              <p className="text-gray-600">Senior Frontend Developer</p>
              <div className="text-sm text-gray-500 mt-2">Austin, TX • (555) 456-7890 • emily.dev@email.com • emily.design</div>
            </div>
            
            <div className="mb-6">
              <h4 className="text-lg font-bold text-gray-900 mb-2">Technical Skills</h4>
              <div className="flex flex-wrap gap-2">
                {['React', 'TypeScript', 'Next.js', 'Vue.js', 'Tailwind CSS', 'Figma', 'GraphQL', 'Jest', 'Webpack'].map(skill => (
                  <span key={skill} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">{skill}</span>
                ))}
              </div>
            </div>
            
            <div className="mb-6">
              <h4 className="text-lg font-bold text-gray-900 mb-2">Professional Summary</h4>
              <p className="text-gray-700">Creative Frontend Developer with 5 years crafting beautiful, accessible web experiences. Reduced page load time by 50% through optimization. Strong eye for design and user experience.</p>
            </div>
            
            <div className="mb-6">
              <h4 className="text-lg font-bold text-gray-900 mb-2">Professional Experience</h4>
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <h5 className="font-semibold text-gray-900">Senior Frontend Developer</h5>
                  <span className="text-gray-500 text-sm">2021 - Present</span>
                </div>
                <p className="text-gray-600 italic">DesignStudio Agency, Austin</p>
                <ul className="text-gray-700 mt-2 space-y-1">
                  <li>• Led frontend development for 20+ client websites</li>
                  <li>• Improved Core Web Vitals scores to 95+</li>
                  <li>• Mentored team of 4 junior developers</li>
                </ul>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <h5 className="font-semibold text-gray-900">Frontend Developer</h5>
                  <span className="text-gray-500 text-sm">2019 - 2021</span>
                </div>
                <p className="text-gray-600 italic">DigitalAgency Co., Dallas</p>
                <ul className="text-gray-700 mt-2 space-y-1">
                  <li>• Built responsive websites using React and Vue</li>
                  <li>• Collaborated with designers to implement Figma mockups</li>
                </ul>
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">Key Projects</h4>
              <p className="text-gray-700"><strong>E-commerce Redesign</strong> - Increased conversion rate by 25% (live site)</p>
              <p className="text-gray-700"><strong>D SaaS Dashboard</strong> - Built React admin panel with real-time analytics</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-gradient-to-r from-purple-600 to-pink-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Create Your Frontend Developer Resume</h2>
          <p className="text-purple-100 mb-8">Showcase your design and coding skills.</p>
          <Link href="/sign-up?callbackUrl=/editor" className="inline-block px-10 py-5 bg-white text-purple-700 font-bold rounded-full hover:bg-gray-100 transition-all hover:scale-105 text-lg">
            Build Resume with AI
          </Link>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-xl font-bold text-white mb-6">More Resume Examples</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <Link href="/resume/data-analyst-example" className="bg-[#1a1f1a] p-4 rounded-xl border border-white/5 hover:border-purple-500/50 transition">
              <h4 className="font-semibold text-white">Data Analyst</h4>
              <p className="text-gray-400 text-sm">View example →</p>
            </Link>
            <Link href="/resume/software-engineer-example" className="bg-[#1a1f1a] p-4 rounded-xl border border-white/5 hover:border-purple-500/50 transition">
              <h4 className="font-semibold text-white">Software Engineer</h4>
              <p className="text-gray-400 text-sm">View example →</p>
            </Link>
            <Link href="/resume/product-manager-example" className="bg-[#1a1f1a] p-4 rounded-xl border border-white/5 hover:border-purple-500/50 transition">
              <h4 className="font-semibold text-white">Product Manager</h4>
              <p className="text-gray-400 text-sm">View example →</p>
            </Link>
          </div>
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
