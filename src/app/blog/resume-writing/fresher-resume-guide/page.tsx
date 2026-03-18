import { Metadata } from 'next'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle, BookOpen, GraduationCap, Lightbulb } from 'lucide-react'

export const metadata: Metadata = {
  title: 'How to Write a Resume for Freshers in 2026 | CVCircle',
  description: 'Complete guide on how to write a resume for freshers. Learn what to include, how to highlight skills, and tips to get your first job.',
  keywords: ['how to write a resume for freshers', 'fresher resume guide', 'first job resume'],
  alternates: { canonical: '/blog/resume-writing/fresher-resume-guide' },
}

export default function FresherResumeGuidePage() {
  const sections = [
    { title: 'Why Freshers Struggle', content: 'Every student has valuable experience. Present it right.' },
    { title: 'What to Include', items: ['Contact Info', 'Professional Summary', 'Education', 'Skills', 'Projects', 'Internships', 'Extracurricular'] },
    { title: 'Focus on Transferable Skills', items: ['Communication', 'Problem-solving', 'Teamwork', 'Time management', 'Technical skills'] },
    { title: 'Best Format', items: ['Summary', 'Skills', 'Education', 'Projects', 'Activities'] }
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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-block px-4 py-2 bg-green-500/20 text-green-400 rounded-full text-sm font-medium mb-6">
            Resume Writing Guide
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-5xl font-bold text-white mb-6">
            How to Write a Resume for Freshers in 2026
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-xl text-gray-400">
            Complete guide to creating a compelling resume without work experience
          </motion.p>
        </header>

        <div className="prose prose-invert max-w-none">
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-[#81ff00]/20 rounded-full flex items-center justify-center text-[#81ff00]">1</span>
              Why Freshers Struggle with Resumes
            </h2>
            <p className="text-gray-300 mb-4">
              As a fresher, you might think you have nothing to put on your resume. The truth is: <strong className="text-white">every student has valuable experience</strong>. You just need to know how to present it.
            </p>
            <p className="text-gray-300">
              Recruiters hire freshers for their potential, not their experience. Your resume needs to show you're trainable, eager to learn, and already have relevant skills.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-[#81ff00]/20 rounded-full flex items-center justify-center text-[#81ff00]">2</span>
              What to Include in Your Fresher Resume
            </h2>
            <div className="grid md:grid-cols-2 gap-4 mt-6">
              {[{ name: 'Contact Information', desc: 'Name, phone, email, LinkedIn' },
                { name: 'Professional Summary', desc: '2-3 sentences about your goals' },
                { name: 'Education', desc: 'University, degree, GPA if above 3.5' },
                { name: 'Skills', desc: 'Technical and soft skills' },
                { name: 'Projects', desc: 'Academic and personal projects' },
                { name: 'Internships', desc: 'Even short ones count' },
                { name: 'Extracurricular', desc: 'Clubs, volunteering, leadership' }
              ].map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} viewport={{ once: true }}
                  className="bg-[#1a1f1a] p-4 rounded-lg border border-white/5">
                  <h4 className="font-semibold text-white mb-1">{item.name}</h4>
                  <p className="text-gray-400 text-sm">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-[#81ff00]/20 rounded-full flex items-center justify-center text-[#81ff00]">3</span>
              How to Highlight Skills Without Experience
            </h2>
            <div className="bg-[#1a1f1a] rounded-xl p-6 border border-green-800/50">
              <h3 className="text-lg font-semibold text-white mb-3">🎯 Focus on Transferable Skills</h3>
              <p className="text-gray-300 mb-4">Even without a job, you've developed skills through coursework, projects, and daily activities:</p>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> <strong>Communication:</strong> Presentations, group projects</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> <strong>Problem-solving:</strong> Assignments, coding challenges</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> <strong>Teamwork:</strong> Group projects, clubs, sports</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> <strong>Technical:</strong> Programming languages, software tools</li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Pro Tips for Freshers</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
                <h3 className="font-semibold text-green-400 mb-2">✓ Do This</h3>
                <ul className="text-gray-300 text-sm space-y-1">
                  <li>• Use action verbs</li>
                  <li>• Quantify achievements</li>
                  <li>• Include relevant keywords</li>
                  <li>• Keep it one page</li>
                  <li>• Proofread multiple times</li>
                </ul>
              </div>
              <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
                <h3 className="font-semibold text-red-400 mb-2">✗ Avoid This</h3>
                <ul className="text-gray-300 text-sm space-y-1">
                  <li>• Generic objectives</li>
                  <li>• Listing every subject</li>
                  <li>• Unprofessional email</li>
                  <li>• Including photo (US)</li>
                  <li>• Lying about experience</li>
                </ul>
              </div>
            </div>
          </section>
        </div>

        <section className="mt-16 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Create Your Fresher Resume Now</h2>
          <p className="text-green-100 mb-6">Our AI helps you create a professional fresher resume.</p>
          <Link href="/sign-up?callbackUrl=/resume-enhancer" className="inline-flex items-center gap-2 bg-white text-green-700 px-8 py-4 rounded-full font-bold hover:bg-gray-100 transition">
            Build Fresher Resume Free <ArrowRight className="w-5 h-5" />
          </Link>
        </section>

        <section className="mt-12">
          <h3 className="text-xl font-bold text-white mb-4">Related Resume Pages</h3>
          <div className="flex flex-wrap gap-3">
            <Link href="/resume/data-analyst" className="px-4 py-2 bg-[#1a1f1a] text-gray-300 rounded-lg hover:bg-[#2a2f2a] transition">Data Analyst Resume</Link>
            <Link href="/resume/software-engineer" className="px-4 py-2 bg-[#1a1f1a] text-gray-300 rounded-lg hover:bg-[#2a2f2a] transition">Software Engineer Resume</Link>
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
