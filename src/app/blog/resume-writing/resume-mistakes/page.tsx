import Link from 'next/link';
import { Metadata } from 'next';
import { ArrowRight, AlertTriangle, CheckCircle, XCircle, BookOpen, Sparkles, Briefcase, Chrome, Globe, LayoutDashboard, FileText } from 'lucide-react';
import { MotionDiv } from '@/components/ui/motion-wrapper';
import CardNav from '@/components/landing/CardNav';

export const metadata: Metadata = {
  title: 'Resume Mistakes to Avoid in 2026 | CVCircle',
  description: 'Discover the most common resume mistakes that hurt your job search. Learn what to avoid and how to create a winning resume.',
  keywords: ['resume mistakes', 'resume errors', 'bad resume', 'resume tips'],
  alternates: { canonical: '/blog/resume-writing/resume-mistakes' },
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

export default function ResumeMistakesPage() {
  const criticalMistakes = [
    { title: 'Typos and Grammar Errors', desc: 'A single typo can get your resume rejected instantly. Proofread multiple times and use tools.', impact: 'High' },
    { title: 'Generic Objectives', desc: 'Avoid "Seeking a challenging position." Customize for each role.', impact: 'High' },
    { title: 'Listing Duties, Not Achievements', desc: 'Say "Led team of 5" not "Responsible for team management."', impact: 'High' },
    { title: 'Including Irrelevant Info', desc: 'Remove early jobs, hobbies that don\'t fit, or personal details.', impact: 'Medium' },
    { title: 'Using Passive Language', desc: 'Use action verbs: led, created, achieved, increased.', impact: 'Medium' },
    { title: 'Inconsistent Formatting', desc: 'Same font sizes, bullet styles, and spacing throughout.', impact: 'Medium' },
  ];

  return (
    <div className="min-h-screen bg-[#0d1209]">
      <div className="relative z-10">
        <CardNav
          logo="CVCircle"
          links={navLinks}
        />

        <article className="max-w-4xl mx-auto px-4 pt-32 pb-16">
          <header className="mb-12 text-center">
            <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-block px-4 py-2 bg-red-500/20 text-red-400 rounded-full text-sm font-medium mb-6">
              Avoid These Mistakes
            </MotionDiv>
            <MotionDiv initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-5xl font-bold text-white mb-6">
              Resume Mistakes to Avoid in 2026
            </MotionDiv>
            <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-xl text-gray-400">
              These common errors could be costing you interviews
            </MotionDiv>
          </header>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Critical Mistakes That Kill Your Chances</h2>
            <div className="space-y-4">
              {criticalMistakes.map((mistake, i) => (
                <MotionDiv key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                  className="bg-[#1a1f1a] rounded-xl p-6 border border-white/5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">{mistake.title}</h3>
                      <p className="text-gray-400">{mistake.desc}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 ${mistake.impact === 'High' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {mistake.impact} Impact
                    </span>
                  </div>
                </MotionDiv>
              ))}
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Quick Dos and Don&apos;ts</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-green-900/20 border border-green-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" /> Do This
                </h3>
                <ul className="space-y-2 text-gray-300">
                  <li>Use action verbs</li>
                  <li>Quantify achievements</li>
                  <li>Keep it 1-2 pages</li>
                  <li>Customise for each job</li>
                  <li>Include relevant keywords</li>
                  <li>Use consistent formatting</li>
                </ul>
              </div>
              <div className="bg-red-900/20 border border-red-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
                  <XCircle className="w-5 h-5" /> Avoid This
                </h3>
                <ul className="space-y-2 text-gray-300">
                  <li>Typos and grammar errors</li>
                  <li>Generic objective statements</li>
                  <li>Listing job duties</li>
                  <li>Using passive language</li>
                  <li>Including personal photos</li>
                  <li>Lying about experience</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">The Resume Red Flags Recruiters Hate</h2>
            <div className="bg-red-900/10 border border-red-800/50 rounded-xl p-6">
              <ul className="space-y-3 text-gray-300">
                {['Spelling errors', 'Wrong contact information', 'Inconsistent dates', 'Unprofessional email address', 'Gaps without explanation', 'Too many buzzwords', 'Old or irrelevant experience', 'No quantifiable results'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-300">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" /> {item}
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
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#81ff00] rounded flex items-center justify-center">
              <span className="text-black font-bold text-xs">CV</span>
            </div>
            <span className="text-gray-500 text-sm">© 2026 CVCircle</span>
          </div>
          <div className="flex gap-6">
            <Link href="/privacy-policy" className="text-gray-500 text-sm">Privacy</Link>
            <Link href="/terms" className="text-gray-500 text-sm">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  </div>
  );
}
