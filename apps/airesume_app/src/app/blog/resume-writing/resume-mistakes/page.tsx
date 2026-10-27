import Link from 'next/link';
import { Metadata } from 'next';
import { ArrowRight, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { MotionDiv } from '@/components/ui/motion-wrapper';
import CardNav from '@/components/landing/CardNav';
import Footer from '@/components/landing/Footer';
import { navLinks } from '@/data/navigation';
import { CHIP_INLINE } from '@/components/ui/chip-styles';

export const metadata: Metadata = {
  title: 'Resume Mistakes to Avoid in 2026 | AIResume',
  description: 'Discover the most common resume mistakes that hurt your job search. Learn what to avoid and how to create a winning resume.',
  keywords: ['resume mistakes', 'resume errors', 'bad resume', 'resume tips'],
  alternates: { canonical: 'https://buildairesume.com/blog/resume-writing/resume-mistakes' },
};

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
          logo="AIResume"
          links={navLinks}
        />

        <article className="max-w-4xl mx-auto px-4 pt-32 pb-16">
          <header className="mb-12 text-center">
            <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`${CHIP_INLINE} border-red-500/30 bg-red-500/20 text-red-400 font-medium mb-6`}>
              Avoid These Mistakes
            </MotionDiv>
            <MotionDiv initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-display md:text-display font-bold text-white mb-6">
              Resume Mistakes to Avoid in 2026
            </MotionDiv>
            <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-h3 text-gray-400">
              These common errors could be costing you interviews
            </MotionDiv>
          </header>

          <section className="mb-12">
            <h2 className="text-h2 font-bold text-white mb-6">Critical Mistakes That Kill Your Chances</h2>
            <div className="space-y-4">
              {criticalMistakes.map((mistake, i) => (
                <MotionDiv key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                  className="bg-[#1a1f1a] rounded-xl p-6 border border-white/5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-h3 font-semibold text-white mb-2">{mistake.title}</h3>
                      <p className="text-gray-400">{mistake.desc}</p>
                    </div>
                    <span className={`${CHIP_INLINE} font-medium shrink-0 ${mistake.impact === 'High' ? 'border-red-500/30 bg-red-500/20 text-red-400' : 'border-yellow-500/30 bg-yellow-500/20 text-yellow-400'}`}>
                      {mistake.impact} Impact
                    </span>
                  </div>
                </MotionDiv>
              ))}
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-h2 font-bold text-white mb-6">Quick Dos and Don&apos;ts</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-green-900/20 border border-green-800 rounded-xl p-6">
                <h3 className="text-h3 font-semibold text-green-400 mb-4 flex items-center gap-2">
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
                <h3 className="text-h3 font-semibold text-red-400 mb-4 flex items-center gap-2">
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
            <h2 className="text-h2 font-bold text-white mb-4">The Resume Red Flags Recruiters Hate</h2>
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
            <h2 className="text-h2 font-bold text-white mb-4">Create a Perfect Resume</h2>
            <p className="text-red-100 mb-6">Avoid these mistakes with our AI-powered resume builder.</p>
            <Link href="/sign-up?callbackUrl=/editor" className="inline-flex items-center gap-2 bg-white text-red-700 px-8 py-4 rounded-full font-bold hover:bg-gray-100 transition">
              Build Perfect Resume Free <ArrowRight className="w-5 h-5" />
            </Link>
          </section>

          <section className="mt-12">
            <h3 className="text-h3 font-bold text-white mb-4">Related Pages</h3>
            <div className="flex flex-wrap gap-3">
              <Link href="/ai-resume-builder" className="px-4 py-2 bg-[#1a1f1a] text-gray-300 rounded-lg hover:bg-[#2a2f2a] transition">AI Resume Builder</Link>
              <Link href="/ats-resume-checker" className="px-4 py-2 bg-[#1a1f1a] text-gray-300 rounded-lg hover:bg-[#2a2f2a] transition">ATS Checker</Link>
              <Link href="/blog/resume-writing/fresher-resume-guide" className="px-4 py-2 bg-[#1a1f1a] text-gray-300 rounded-lg hover:bg-[#2a2f2a] transition">Fresher Resume Guide</Link>
            </div>
          </section>
        </article>

        <Footer />
    </div>
  </div>
  );
}
