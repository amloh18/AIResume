'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Download, Eye, Sparkles, Code, Terminal, GitBranch } from 'lucide-react'
import CardNav from '@/components/landing/CardNav'
import Footer from '@/components/landing/Footer'
import { navLinks } from '@/data/navigation'

export default function SoftwareEngineerExamplePage() {
  return (
    <div className="min-h-screen bg-[#0d1209]">
      {/*
        Navigation — the same floating CardNav the landing page renders. This page
        used to carry its own <nav> (CV badge, Features / Templates / Blog / Start
        Free), so the header changed shape as soon as a visitor arrived from the
        landing page or from the Products megamenu.
      */}
      <CardNav logo="AIResume" links={navLinks} />

      <section className="relative pt-32 pb-20 px-4">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-[600px] h-[400px] bg-gradient-to-r from-blue-600/20 to-transparent rounded-full blur-[100px]" />
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-block px-4 py-2 bg-blue-500/20 text-blue-400 rounded-full text-sm font-medium mb-6">
            💻 Resume Example
          </motion.div>
          
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-5xl md:text-6xl font-bold text-white mb-6">
            Software Engineer <span className="text-blue-400">Resume</span>
          </motion.h1>
          
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-xl text-gray-400 mb-10">
            Professional resume example for software developers
          </motion.p>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/sign-up?callbackUrl=/editor" className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-full font-bold text-lg transition-all hover:scale-105">
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
          <h2 className="text-3xl font-bold text-white text-center mb-12">What&apos;s Included</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[{ icon: <Code className="w-8 h-8" />, title: 'Tech Stack', desc: 'React, Node, Python, AWS, Docker' },
              { icon: <GitBranch className="w-8 h-8" />, title: 'Projects', desc: 'GitHub links, live demos, impact' },
              { icon: <Terminal className="w-8 h-8" />, title: 'Experience', desc: 'Full-stack development experience' }
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }} 
                className="bg-[#1a1f1a] rounded-2xl p-8 border border-white/5">
                <div className="text-4xl mb-4 text-blue-400">{item.icon}</div>
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
              <h3 className="text-2xl font-bold text-gray-900">Michael Chen</h3>
              <p className="text-gray-600">Full Stack Software Engineer</p>
              <div className="text-sm text-gray-500 mt-2">San Jose, CA • (555) 987-6543 • mchen.dev@email.com • github.com/mchen</div>
            </div>
            
            <div className="mb-6">
              <h4 className="text-lg font-bold text-gray-900 mb-2">Technical Skills</h4>
              <div className="flex flex-wrap gap-2">
                {['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'AWS', 'Docker', 'PostgreSQL', 'GraphQL'].map(skill => (
                  <span key={skill} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">{skill}</span>
                ))}
              </div>
            </div>
            
            <div className="mb-6">
              <h4 className="text-lg font-bold text-gray-900 mb-2">Professional Summary</h4>
              <p className="text-gray-700">Full Stack Engineer with 4 years of experience building scalable web applications. Reduced API response time by 60% through optimization. Passionate about clean code and mentoring junior developers.</p>
            </div>
            
            <div className="mb-6">
              <h4 className="text-lg font-bold text-gray-900 mb-2">Professional Experience</h4>
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <h5 className="font-semibold text-gray-900">Senior Software Engineer</h5>
                  <span className="text-gray-500 text-sm">2022 - Present</span>
                </div>
                <p className="text-gray-600 italic">TechStartup Inc., San Jose</p>
                <ul className="text-gray-700 mt-2 space-y-1">
                  <li>• Built microservices architecture serving 1M+ users</li>
                  <li>• Reduced deployment time by 70% with CI/CD pipeline</li>
                  <li>• Mentored team of 3 junior developers</li>
                </ul>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <h5 className="font-semibold text-gray-900">Software Engineer</h5>
                  <span className="text-gray-500 text-sm">2020 - 2022</span>
                </div>
                <p className="text-gray-600 italic">WebCorp LLC, San Francisco</p>
                <ul className="text-gray-700 mt-2 space-y-1">
                  <li>• Developed React dashboard used by 500+ clients</li>
                  <li>• Optimized database queries reducing load time by 40%</li>
                </ul>
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">Projects</h4>
              <p className="text-gray-700"><strong>E-commerce API</strong> - Built RESTful API handling 10K requests/day (github.com/mchen/ecommerce-api)</p>
              <p className="text-gray-700"><strong>TaskMaster App</strong> - React Native task management app with 5K+ downloads</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Create Your Software Engineer Resume</h2>
          <p className="text-blue-100 mb-8">Stand out to top tech companies.</p>
          <Link href="/sign-up?callbackUrl=/editor" className="inline-block px-10 py-5 bg-white text-blue-700 font-bold rounded-full hover:bg-gray-100 transition-all hover:scale-105 text-lg">
            Build Resume with AI
          </Link>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-xl font-bold text-white mb-6">More Resume Examples</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <Link href="/resume/data-analyst-example" className="bg-[#1a1f1a] p-4 rounded-xl border border-white/5 hover:border-blue-500/50 transition">
              <h4 className="font-semibold text-white">Data Analyst</h4>
              <p className="text-gray-400 text-sm">View example →</p>
            </Link>
            <Link href="/resume/frontend-developer-example" className="bg-[#1a1f1a] p-4 rounded-xl border border-white/5 hover:border-blue-500/50 transition">
              <h4 className="font-semibold text-white">Frontend Developer</h4>
              <p className="text-gray-400 text-sm">View example →</p>
            </Link>
            <Link href="/resume/product-manager-example" className="bg-[#1a1f1a] p-4 rounded-xl border border-white/5 hover:border-blue-500/50 transition">
              <h4 className="font-semibold text-white">Product Manager</h4>
              <p className="text-gray-400 text-sm">View example →</p>
            </Link>
          </div>
        </div>
      </section>

      {/*
        Footer — the landing page's Footer, not a local copyright strip. See the
        note on /ats-resume-checker: the strip carried no navigation, so this page
        silently dropped the site's internal-linking hub.
      */}
      <Footer />
    </div>
  )
}
