import Link from 'next/link';
import { Metadata } from 'next';
import { ArrowRight, CheckCircle, Code, Database, Globe, Terminal, Cpu, BookOpen, Sparkles, Briefcase, Chrome, LayoutDashboard, FileText } from 'lucide-react';
import { MotionDiv } from '@/components/ui/motion-wrapper';
import CardNav from '@/components/landing/CardNav';

export const metadata: Metadata = {
  title: 'Tech Resume Format Guide 2026 | AIResume',
  description: 'Learn the best resume format for software engineers, developers, and tech professionals. Get tips for tech roles.',
  keywords: ['tech resume format', 'software engineer resume', 'developer resume', 'tech resume tips'],
  alternates: { canonical: '/blog/resume-writing/tech-resume-format' },
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
        description: 'Research-backed career guides, ATS tips, and resume tutorials from AIResume.',
        href: '/blog',
        ariaLabel: 'Read the AIResume blog',
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

export default function TechResumeFormatPage() {
  const techSections = [
    { icon: <Code className="w-6 h-6" />, title: 'Technical Skills', items: ['Languages: Python, JavaScript, Java', 'Frameworks: React, Node, Django', 'Tools: Git, Docker, AWS'] },
    { icon: <Terminal className="w-6 h-6" />, title: 'Projects', items: ['GitHub portfolio links', 'Live demos', 'Technical challenges solved'] },
    { icon: <Database className="w-6 h-6" />, title: 'Experience', items: ['Internships matter a lot', 'Open source contributions', 'Freelance projects count'] },
    { icon: <Globe className="w-6 h-6" />, title: 'Certifications', items: ['AWS, GCP, Azure', 'Meta, Google, IBM', 'Bootcamp certificates'] }
  ];

  return (
    <div className="min-h-screen bg-[#0d1209]">
      <div className="relative z-10">
        <CardNav
          logo="AIResume"
          links={navLinks}
        />

        <article className="max-w-4xl mx-auto px-4 pt-32 pb-16">
          <header className="mb-12 text-center">
            <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-block px-4 py-2 bg-blue-500/20 text-blue-400 rounded-full text-small font-medium mb-6">
              For Tech Professionals
            </MotionDiv>
            <MotionDiv initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-display md:text-display font-bold text-white mb-6">
              Tech Resume Format Guide 2026
            </MotionDiv>
            <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-h3 text-gray-400">
              Create a resume that lands interviews at top tech companies
            </MotionDiv>
          </header>

          <section className="mb-12">
            <h2 className="text-h2 font-bold text-white mb-6">What Tech Recruiters Look For</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[{ name: 'Skills Match', desc: 'Keywords from job description' },
                { name: 'Project Portfolio', desc: 'GitHub, live demos' },
                { name: 'Impact Metrics', desc: 'Numbers and results' },
                { name: 'Growth Story', desc: 'Clear progression' },
                { name: 'Problem Solving', desc: 'Complex challenges tackled' },
                { name: 'Clean Code', desc: 'Well-formatted resume' }
              ].map((item, i) => (
                <MotionDiv key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                  className="bg-[#1a1f1a] p-5 rounded-xl border border-blue-800/30">
                  <h3 className="font-semibold text-white mb-1">{item.name}</h3>
                  <p className="text-gray-400 text-small">{item.desc}</p>
                </MotionDiv>
              ))}
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-h2 font-bold text-white mb-6">Recommended Section Order</h2>
            <div className="space-y-4">
              {techSections.map((section, i) => (
                <MotionDiv key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                  className="bg-[#1a1f1a] rounded-xl p-6 border border-white/5 flex gap-4 items-start">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 flex-shrink-0">{section.icon}</div>
                  <div>
                    <h3 className="text-h3 font-semibold text-white mb-2">{section.title}</h3>
                    <ul className="text-gray-400 text-small space-y-1">{section.items.map((item, j) => <li key={j}>• {item}</li>)}</ul>
                  </div>
                </MotionDiv>
              ))}
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-h2 font-bold text-white mb-4">Pro Tips for Tech Resumes</h2>
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
            <h2 className="text-h2 font-bold text-white mb-4">Build Your Tech Resume</h2>
            <p className="text-blue-100 mb-6">Create a professional tech resume that stands out.</p>
            <Link href="/sign-up?callbackUrl=/editor" className="inline-flex items-center gap-2 bg-white text-blue-700 px-8 py-4 rounded-full font-bold hover:bg-gray-100 transition">
              Create Tech Resume Free <ArrowRight className="w-5 h-5" />
            </Link>
          </section>

          <section className="mt-12">
            <h3 className="text-h3 font-bold text-white mb-4">Related Pages</h3>
            <div className="flex flex-wrap gap-3">
              <Link href="/resume/software-engineer" className="px-4 py-2 bg-[#1a1f1a] text-gray-300 rounded-lg hover:bg-[#2a2f2a] transition">Software Engineer Resume</Link>
              <Link href="/resume/frontend-developer" className="px-4 py-2 bg-[#1a1f1a] text-gray-300 rounded-lg hover:bg-[#2a2f2a] transition">Frontend Developer Resume</Link>
              <Link href="/ai-resume-builder" className="px-4 py-2 bg-[#1a1f1a] text-gray-300 rounded-lg hover:bg-[#2a2f2a] transition">AI Resume Builder</Link>
            </div>
          </section>
        </article>

        <footer className="py-8 px-4 border-t border-white/5">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-[#81ff00] rounded"><span className="text-black font-bold text-small">CV</span></div>
              <span className="text-gray-500 text-small">© 2026 AIResume</span>
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
