import Link from 'next/link';
import { Metadata } from 'next';
import { ArrowRight, CheckCircle, BookOpen, GraduationCap, Lightbulb, Sparkles, Briefcase, Chrome, Globe, LayoutDashboard, FileText } from 'lucide-react';
import { MotionDiv } from '@/components/ui/motion-wrapper';
import CardNav from '@/components/landing/CardNav';

export const metadata: Metadata = {
  title: 'How to Write a Resume for Freshers in 2026 | CVCircle',
  description: 'Complete guide on how to write a resume for freshers. Learn what to include, how to highlight skills, and tips to get your first job.',
  keywords: ['how to write a resume for freshers', 'fresher resume guide', 'first job resume'],
  alternates: { canonical: '/blog/resume-writing/fresher-resume-guide' },
};

const navLinks = [
  {
    label: 'Products',
    href: '#features',
    ariaLabel: 'View products section',
    submenu: [
      {
        label: 'AI Resume Builder',
        description: 'Create ATS-friendly resumes in minutes with AI assistance and mix-and-match layout blocks.',
        href: '#features',
        ariaLabel: 'AI-powered resume builder',
        icon: <Sparkles className="w-6 h-6 text-lime-400" />,
        snapshot: 'bg-gradient-to-br from-lime-500/20 to-green-600/20 border-lime-500/30',
      },
      {
        label: 'ATS Scanner',
        description: 'Test your resume against job descriptions for keyword matches and format compatibility.',
        href: '#features',
        ariaLabel: 'ATS compatibility check',
        icon: <CheckCircle className="w-6 h-6 text-blue-400" />,
        snapshot: 'bg-gradient-to-br from-blue-500/20 to-cyan-600/20 border-blue-500/30',
      },
      {
        label: 'Cover Letter Generator',
        description: 'Generate tailored, professional cover letters perfectly matching your target role.',
        href: '#features',
        ariaLabel: 'Cover letter generator',
        icon: <FileText className="w-6 h-6 text-purple-400" />,
      },
      {
        label: 'Smart Job Tracker',
        description: 'Organize and track all your applications and upcoming interviews in one place.',
        href: '#features',
        ariaLabel: 'Job tracker',
        icon: <Briefcase className="w-6 h-6 text-orange-400" />,
      },
    ],
  },
  {
    label: 'Extension',
    href: '#chrome-extension',
    ariaLabel: 'View browser extension section',
    submenu: [
      {
        label: 'Chrome Add-on',
        description: 'Analyze jobs, extract requirements, and sync data directly from Google Chrome.',
        href: '#chrome-extension',
        ariaLabel: 'Chrome extension',
        icon: <Chrome className="w-6 h-6 text-yellow-400" />,
      },
      {
        label: 'Edge Add-on',
        description: 'Native support for Microsoft Edge browser with full tracking capabilities.',
        href: '#chrome-extension',
        ariaLabel: 'Edge extension',
        icon: <Globe className="w-6 h-6 text-blue-400" />,
      },
      {
        label: 'One-Click Save',
        description: 'Save job descriptions from LinkedIn, Indeed, and more with a single click.',
        href: '#chrome-extension',
        ariaLabel: 'One-click save',
        icon: <LayoutDashboard className="w-6 h-6 text-emerald-400" />,
      },
    ],
  },
  {
    label: 'Resources',
    href: '#how-it-works',
    ariaLabel: 'View resources',
    submenu: [
      {
        label: 'How it Works',
        description: 'Step-by-step guide to building your master CV and landing your dream job.',
        href: '#how-it-works',
        ariaLabel: 'Learn how to create a resume',
        icon: <LayoutDashboard className="w-5 h-5 text-gray-400" />,
      },
      {
        label: 'Blog',
        description: 'Research-backed career guides, ATS tips, and resume tutorials from CVCircle.',
        href: '/blog',
        ariaLabel: 'Read the CVCircle blog',
        icon: <BookOpen className="w-5 h-5 text-gray-400" />,
      },
    ],
  },
  {
    label: 'Pricing',
    href: '/sign-up',
    ariaLabel: 'View pricing section',
  },
];

export default function FresherResumeGuidePage() {
  return (
    <div className="min-h-screen bg-[#0d1209]">
      <div className="relative z-10">
        <CardNav
          logo="CVCircle"
          links={navLinks}
        />

        <article className="max-w-4xl mx-auto px-4 pt-32 pb-16">
          <header className="mb-12 text-center">
            <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-block px-4 py-2 bg-green-500/20 text-green-400 rounded-full text-small font-medium mb-6">
              Resume Writing Guide
            </MotionDiv>
            <MotionDiv initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-display md:text-display font-bold text-white mb-6">
              How to Write a Resume for Freshers in 2026
            </MotionDiv>
            <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-h3 text-gray-400">
              Complete guide to creating a compelling resume without work experience
            </MotionDiv>
          </header>

          <div className="prose prose-invert max-w-none">
            <section className="mb-12">
              <h2 className="text-h2 font-bold text-white mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-[#81ff00]/20 rounded-full flex items-center justify-center text-[#81ff00]">1</span>
                Why Freshers Struggle with Resumes
              </h2>
              <p className="text-gray-300 mb-4">
                As a fresher, you might think you have nothing to put on your resume. The truth is: <strong className="text-white">every student has valuable experience</strong>. You just need to know how to present it.
              </p>
              <p className="text-gray-300">
                Recruiters hire freshers for their potential, not their experience. Your resume needs to show you&apos;re trainable, eager to learn, and already have relevant skills.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-h2 font-bold text-white mb-4 flex items-center gap-3">
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
                  <MotionDiv key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} viewport={{ once: true }}
                    className="bg-[#1a1f1a] p-4 rounded-lg border border-white/5">
                    <h4 className="font-semibold text-white mb-1">{item.name}</h4>
                    <p className="text-gray-400 text-small">{item.desc}</p>
                  </MotionDiv>
                ))}
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-h2 font-bold text-white mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-[#81ff00]/20 rounded-full flex items-center justify-center text-[#81ff00]">3</span>
                How to Highlight Skills Without Experience
              </h2>
              <div className="bg-[#1a1f1a] rounded-xl p-6 border border-green-800/50">
                <h3 className="text-h3 font-semibold text-white mb-3">Focus on Transferable Skills</h3>
                <p className="text-gray-300 mb-4">Even without a job, you&apos;ve developed skills through coursework, projects, and daily activities:</p>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> <strong>Communication:</strong> Presentations, group projects</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> <strong>Problem-solving:</strong> Assignments, coding challenges</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> <strong>Teamwork:</strong> Group projects, clubs, sports</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> <strong>Technical:</strong> Programming languages, software tools</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-h2 font-bold text-white mb-4">Pro Tips for Freshers</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
                  <h3 className="font-semibold text-green-400 mb-2">Do This</h3>
                  <ul className="text-gray-300 text-small space-y-1">
                    <li>Use action verbs</li>
                    <li>Quantify achievements</li>
                    <li>Include relevant keywords</li>
                    <li>Keep it one page</li>
                    <li>Proofread multiple times</li>
                  </ul>
                </div>
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
                  <h3 className="font-semibold text-red-400 mb-2">Avoid This</h3>
                  <ul className="text-gray-300 text-small space-y-1">
                    <li>Generic objectives</li>
                    <li>Listing every subject</li>
                    <li>Unprofessional email</li>
                    <li>Including photo (US)</li>
                    <li>Lying about experience</li>
                  </ul>
                </div>
              </div>
            </section>
          </div>

          <section className="mt-16 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-8 text-center">
            <h2 className="text-h2 font-bold text-white mb-4">Create Your Fresher Resume Now</h2>
            <p className="text-green-100 mb-6">Our AI helps you create a professional fresher resume.</p>
            <Link href="/sign-up?callbackUrl=/resume-enhancer" className="inline-flex items-center gap-2 bg-white text-green-700 px-8 py-4 rounded-full font-bold hover:bg-gray-100 transition">
              Build Fresher Resume Free <ArrowRight className="w-5 h-5" />
            </Link>
          </section>

          <section className="mt-12">
            <h3 className="text-h3 font-bold text-white mb-4">Related Resume Pages</h3>
            <div className="flex flex-wrap gap-3">
              <Link href="/resume/data-analyst" className="px-4 py-2 bg-[#1a1f1a] text-gray-300 rounded-lg hover:bg-[#2a2f2a] transition">Data Analyst Resume</Link>
              <Link href="/resume/software-engineer" className="px-4 py-2 bg-[#1a1f1a] text-gray-300 rounded-lg hover:bg-[#2a2f2a] transition">Software Engineer Resume</Link>
              <Link href="/ai-resume-builder" className="px-4 py-2 bg-[#1a1f1a] text-gray-300 rounded-lg hover:bg-[#2a2f2a] transition">AI Resume Builder</Link>
            </div>
          </section>
        </article>

        <footer className="py-8 px-4 border-t border-white/5">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-[#81ff00] rounded"><span className="text-black font-bold text-small">CV</span></div>
              <span className="text-gray-500 text-small">© 2026 CVCircle</span>
            </div>
            <div className="flex gap-6">
              <Link href="/privacy-policy" className="text-gray-500 text-small">Privacy</Link>
              <Link href="/terms" className="text-gray-500 text-small">Terms</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
