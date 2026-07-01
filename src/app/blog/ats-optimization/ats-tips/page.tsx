import Link from 'next/link';
import { Metadata } from 'next';
import { ArrowRight, CheckCircle, FileText, Shield, Zap, BookOpen, Sparkles, Briefcase, Chrome, Globe, LayoutDashboard } from 'lucide-react';
import { MotionDiv } from '@/components/ui/motion-wrapper';
import CardNav from '@/components/landing/CardNav';

export const metadata: Metadata = {
  title: 'ATS Resume Tips: Pass Every Application Tracking System | CVCircle',
  description: 'Learn ATS resume tips to pass every application tracking system. Optimize keywords, formatting, and structure to get your resume past ATS.',
  keywords: ['ATS resume tips', 'pass ATS', 'application tracking system', 'ATS optimization'],
  alternates: { canonical: '/blog/ats-optimization/ats-tips' },
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

export default function AtsTipsPage() {
  return (
    <div className="min-h-screen bg-[#0d1209]">
      <div className="relative z-10">
        <CardNav
          logo="CVCircle"
          links={navLinks}
        />

        <article className="max-w-4xl mx-auto px-4 pt-32 pb-16">
          <header className="mb-12 text-center">
            <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-block px-4 py-2 bg-amber-500/20 text-amber-400 rounded-full text-small font-medium mb-6">
              ATS Optimization
            </MotionDiv>
            <MotionDiv initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-display md:text-display font-bold text-white mb-6">
              ATS Resume Tips That Actually Work
            </MotionDiv>
            <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-h3 text-gray-400">
              Pass every application tracking system and get your resume seen by recruiters
            </MotionDiv>
          </header>

          <div className="prose prose-invert max-w-none">
            <section className="mb-12">
              <h2 className="text-h2 font-bold text-white mb-4">What is ATS?</h2>
              <p className="text-gray-300 mb-4">
                <strong className="text-white">Applicant Tracking Systems (ATS)</strong> are software used by 98% of Fortune 500 companies to filter resumes before they reach human eyes. Understanding how ATS works is crucial for job search success.
              </p>
              <div className="bg-amber-900/20 border border-amber-800 rounded-xl p-6 mt-6">
                <p className="text-amber-300"><strong>Fact:</strong> 70% of resumes are rejected by ATS before a human sees them. Optimizing for ATS is no longer optional—it&apos;s essential.</p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-h2 font-bold text-white mb-6">Top 10 ATS Tips</h2>
              <div className="space-y-6">
                {[{ num: '01', title: 'Use Standard Section Headers', desc: 'Use clear headers like Work Experience, Education, and Skills. Avoid creative names.' },
                  { num: '02', title: 'Optimize Keywords', desc: 'Include skills and keywords from the job description naturally throughout your resume.' },
                  { num: '03', title: 'Submit Word Documents', desc: 'While PDFs work, .docx format is more reliably parsed by older ATS systems.' },
                  { num: '04', title: 'Avoid Tables and Columns', desc: 'Complex layouts can break ATS parsing. Use simple, single-column formats.' },
                  { num: '05', title: 'Use Standard Fonts', desc: 'Stick to Arial, Calibri, or Times New Roman. Avoid decorative fonts.' },
                  { num: '06', title: 'No Images or Graphics', desc: 'ATS cannot read images, logos, or infographics. They either get ignored or cause parsing errors.' },
                  { num: '07', title: 'Match Job Title Keywords', desc: 'If the job says "Marketing Manager," don\'t use "Marketing Lead" or "Head of Marketing."' },
                  { num: '08', title: 'Include Skills Section', desc: 'Create a dedicated skills section with both hard and soft skills.' },
                  { num: '09', title: 'Don\'t Hide Information', desc: 'Put everything in the main document. ATS may not read text boxes, headers, or footers.' },
                  { num: '10', title: 'Use Full Degree Names', desc: 'Write "Bachelor of Science" instead of "BS" for better keyword matching.' }
                ].map((tip, i) => (
                  <MotionDiv key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} viewport={{ once: true }}
                    className="flex gap-4 p-4 bg-[#1a1f1a] rounded-lg border border-white/5">
                    <span className="text-h2 font-bold text-amber-400/50 min-w-[40px]">{tip.num}</span>
                    <div>
                      <h3 className="font-semibold text-white mb-1">{tip.title}</h3>
                      <p className="text-gray-400 text-small">{tip.desc}</p>
                    </div>
                  </MotionDiv>
                ))}
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-h2 font-bold text-white mb-4">How to Find the Right Keywords</h2>
              <div className="bg-[#1a1f1a] rounded-xl p-6 border border-white/5">
                <h3 className="text-h3 font-semibold text-white mb-3">Keyword Strategy</h3>
                <ol className="text-gray-300 space-y-2 list-decimal list-inside">
                  <li>Copy the entire job description</li>
                  <li>Highlight all skills, tools, and qualifications</li>
                  <li>Create a list of 10-15 key terms</li>
                  <li>Incorporate them naturally into your resume</li>
                  <li>Prioritize exact matches over synonyms</li>
                </ol>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-h2 font-bold text-white mb-4">Common ATS Mistakes</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
                  <h3 className="font-semibold text-red-400 mb-2">Wrong</h3>
                  <ul className="text-gray-300 text-small space-y-1">
                    <li>Using tables for layout</li>
                    <li>Headers with icons</li>
                    <li>Creative section names</li>
                    <li>Graphics or photos</li>
                    <li>Multiple columns</li>
                  </ul>
                </div>
                <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
                  <h3 className="font-semibold text-green-400 mb-2">Right</h3>
                  <ul className="text-gray-300 text-small space-y-1">
                    <li>Simple text layout</li>
                    <li>Standard headers</li>
                    <li>Clear section names</li>
                    <li>No images</li>
                    <li>Single column</li>
                  </ul>
                </div>
              </div>
            </section>
          </div>

          <section className="mt-16 bg-gradient-to-r from-amber-600 to-orange-600 rounded-2xl p-8 text-center">
            <h2 className="text-h2 font-bold text-white mb-4">Test Your ATS Score</h2>
            <p className="text-amber-100 mb-6">Check if your resume passes ATS before applying.</p>
            <Link href="/sign-up?callbackUrl=/ats-resume-checker" className="inline-flex items-center gap-2 bg-white text-amber-700 px-8 py-4 rounded-full font-bold hover:bg-gray-100 transition">
              Check ATS Score Free <ArrowRight className="w-5 h-5" />
            </Link>
          </section>

          <section className="mt-12">
            <h3 className="text-h3 font-bold text-white mb-4">Related Pages</h3>
            <div className="flex flex-wrap gap-3">
              <Link href="/ats-resume-checker" className="px-4 py-2 bg-[#1a1f1a] text-gray-300 rounded-lg hover:bg-[#2a2f2a] transition">ATS Resume Checker</Link>
              <Link href="/ai-resume-builder" className="px-4 py-2 bg-[#1a1f1a] text-gray-300 rounded-lg hover:bg-[#2a2f2a] transition">AI Resume Builder</Link>
              <Link href="/resume/software-engineer" className="px-4 py-2 bg-[#1a1f1a] text-gray-300 rounded-lg hover:bg-[#2a2f2a] transition">Software Engineer Resume</Link>
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
