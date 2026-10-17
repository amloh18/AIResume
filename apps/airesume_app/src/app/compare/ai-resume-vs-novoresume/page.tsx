import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { Check, X, ArrowRight, Target, Zap, Shield } from 'lucide-react';
import CardNav from '@/components/landing/CardNav';
import Footer from '@/components/landing/Footer';
import { MotionDiv, MotionH1, MotionP } from '@/components/ui/motion-wrapper';
import { navLinks } from '@/data/navigation';

export const metadata: Metadata = {
  title: 'AIResume vs Novoresume | Novoresume Alternative 2026',
  description:
    'Compare AIResume vs Novoresume: discover why job seekers are switching for per-job AI tailoring, a built-in application tracker, and interview coaching.',
  keywords: ['ai resume vs novoresume', 'novoresume alternative', 'best ai resume builder', 'ats resume checker comparison', 'ai cv builder 2026'],
  alternates: { canonical: 'https://buildairesume.com/compare/ai-resume-vs-novoresume' },
};

const comparisonFeatures = [
  { name: 'AI Resume Builder', aiResume: true, competitor: true, note: 'Both draft resume content with AI' },
  { name: 'ATS scoring against a specific job description', aiResume: true, competitor: true, note: 'AIResume rescores as you tailor each application' },
  { name: 'AI tailoring per job', aiResume: true, competitor: true, note: 'AIResume keeps scoring and tailoring in one loop' },
  { name: 'Job application tracker built in', aiResume: true, competitor: false, note: 'AIResume tracks every application end-to-end' },
  { name: 'Interview coach', aiResume: true, competitor: false, note: 'Tailored AI interview practice in AIResume' },
  { name: 'Cover letter generator', aiResume: true, competitor: true, note: 'Both generate matching cover letters' },
  { name: 'Free tier without forced download-to-view', aiResume: true, competitor: true, note: 'Both let you work without a download paywall' },
  { name: 'Professional template library', aiResume: true, competitor: true, note: 'Both offer polished, ATS-conscious templates' },
];

const faqs = [
  {
    question: 'Is AIResume a good alternative to Novoresume?',
    answer:
      'Yes. Novoresume is a strong template builder with a genuinely useful free ATS checker, while AIResume adds a job application tracker, a per-job tailoring loop and an interview coach on top of resume writing and ATS scoring — with a free tier and paid plans from a low monthly price.',
  },
  {
    question: 'Does Novoresume score your resume against a job description?',
    answer:
      'Yes. Novoresume offers a free ATS checker and job matcher that take a job description, which is a fair starting point. AIResume scores against the same kind of posting and keeps scoring, tailoring and tracking inside one application workflow.',
  },
  {
    question: 'Does AIResume have a free tier?',
    answer:
      'Yes. AIResume’s free tier covers building, scoring and tailoring resumes in the browser, and paid plans start at a low monthly price.',
  },
];

export default function ComparisonPage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'AIResume',
    description: 'Comparison of AIResume vs Novoresume showing AI tailoring, a built-in application tracker, and an interview coach.',
    brand: {
      '@type': 'Brand',
      name: 'AIResume',
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div className="min-h-screen bg-[#0d1209]">
        <CardNav logo="AIResume" links={navLinks} />

        {/* Hero */}
        <section className="pt-32 pb-16 px-4">
          <div className="max-w-5xl mx-auto text-center">
            <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <span className="px-4 py-2 bg-[#013f2e]/10 border border-[#013f2e]/20 rounded-full text-[#013f2e] text-sm font-medium mb-6 inline-block">
                AIResume vs Competitors
              </span>
            </MotionDiv>
            <MotionH1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-6xl font-bold text-white mb-6"
            >
              AIResume vs <span className="text-gray-500">Novoresume</span>
            </MotionH1>
            <MotionP
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-gray-400 max-w-3xl mx-auto"
            >
              Why job seekers switch to AIResume for their 2026 job search: score against the real job description, tailor every
              application, and track every outcome without leaving the platform.
            </MotionP>
          </div>
        </section>

        {/* Feature Table */}
        <section className="py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-10 text-center">Feature-by-Feature Comparison</h2>
            <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#111611]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-[#0d1209]">
                    <th className="p-6 text-white font-bold">Feature</th>
                    <th className="p-6 text-center text-gray-400 font-bold">Novoresume</th>
                    <th className="p-6 text-center text-[#013f2e] font-bold">AIResume</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((feature, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-6">
                        <p className="text-white font-semibold">{feature.name}</p>
                        <p className="text-gray-500 text-xs mt-1">{feature.note}</p>
                      </td>
                      <td className="p-6 text-center">
                        {feature.competitor ? (
                          <Check className="w-6 h-6 text-green-500 mx-auto" />
                        ) : (
                          <X className="w-6 h-6 text-red-500 mx-auto" />
                        )}
                      </td>
                      <td className="p-6 text-center bg-[#013f2e]/5">
                        <Check className="w-6 h-6 text-[#013f2e] mx-auto" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Value Prop Cards */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-[#1a1f1a] border border-white/5">
              <Target className="w-12 h-12 text-[#013f2e] mb-6" />
              <h3 className="text-xl font-bold text-white mb-4">From Score to Submission</h3>
              <p className="text-gray-400 leading-relaxed">
                AIResume does not stop at a score. Fix the issues, tailor for the posting, rescore, and record the application —
                all in the same place you wrote the resume.
              </p>
            </div>
            <div className="p-8 rounded-2xl bg-[#1a1f1a] border border-white/5">
              <Zap className="w-12 h-12 text-[#013f2e] mb-6" />
              <h3 className="text-xl font-bold text-white mb-4">Per-Job Tailoring Loop</h3>
              <p className="text-gray-400 leading-relaxed">
                Every application gets its own tailored resume and a fresh score against that job description, instead of one
                generic document sent everywhere.
              </p>
            </div>
            <div className="p-8 rounded-2xl bg-[#1a1f1a] border border-white/5">
              <Shield className="w-12 h-12 text-[#013f2e] mb-6" />
              <h3 className="text-xl font-bold text-white mb-4">Interview Coach Included</h3>
              <p className="text-gray-400 leading-relaxed">
                Once you land the interview, AIResume keeps going with tailored AI practice based on your resume and the role you
                applied to — not a generic question list.
              </p>
            </div>
          </div>
        </section>

        {/* Honest acknowledgement */}
        <section className="py-16 px-4 bg-white/5">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">What Novoresume Does Well</h2>
            <p className="text-gray-400 leading-relaxed mb-4">
              Credit where it is due: Novoresume is a genuinely well-built template builder. The layouts are carefully designed
              and ATS-conscious, the editor gives real-time feedback as you write, and its free ATS checker and job matcher —
              which take the job description you are targeting — are a credible starting point, with no sign-up required just to
              see a score.
            </p>
            <p className="text-gray-400 leading-relaxed">
              If your entire need is producing one strong, good-looking resume, Novoresume will serve you well. What it does not
              cover is the rest of the search: there is no application tracker to manage a pipeline of submissions, and no
              interview coach for the stage after the application succeeds.
            </p>
          </div>
        </section>

        {/* Pricing Comparison */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-4">The Smart Investment</h2>
            <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
              We do not quote competitor prices here — plans and promotions change often, so check Novoresume’s website for
              current rates. What matters is what you actually get for your money.
            </p>
            <div className="grid md:grid-cols-2 gap-8 mt-12">
              <div className="p-8 rounded-2xl border border-white/5 bg-[#0d1209]">
                <h3 className="text-gray-500 font-bold mb-4 uppercase">Novoresume</h3>
                <p className="text-3xl text-white font-bold mb-6">Free + premium</p>
                <ul className="text-left space-y-3 text-gray-500 text-sm">
                  <li>• Free ATS checker and job matcher</li>
                  <li>• Free tier plus premium plans</li>
                  <li>• Check novoresume.com for current pricing</li>
                  <li>• No job tracker or interview coach</li>
                </ul>
              </div>
              <div className="p-8 rounded-2xl border border-[#013f2e]/30 bg-[#111611] relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-[#013f2e] text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase">
                  Best Value
                </div>
                <h3 className="text-[#013f2e] font-bold mb-4 uppercase">AIResume</h3>
                <p className="text-4xl text-white font-bold mb-6">Free tier</p>
                <ul className="text-left space-y-3 text-gray-300 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#013f2e]" /> Build, score and tailor for free
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#013f2e]" /> Paid plans from a low monthly price
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#013f2e]" /> ATS scoring, tracker, cover letters and interview coach
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#013f2e]" /> One plan, no extra tools to buy
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ — same questions and answers as the FAQPage schema above */}
        <section className="py-16 px-4 bg-white/5">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-10 text-center">Frequently Asked Questions</h2>
            <div className="space-y-6">
              {faqs.map((faq, i) => (
                <div key={i} className="p-6 rounded-2xl bg-[#0d1209] border border-white/5">
                  <h3 className="text-white font-semibold mb-3">{faq.question}</h3>
                  <p className="text-gray-400 leading-relaxed text-sm">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Related comparisons & resources */}
        <section className="py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">Keep Comparing</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link
                href="/compare/resume-builders"
                className="p-5 rounded-2xl bg-[#111611] border border-white/5 hover:border-[#013f2e]/40 transition-colors group"
              >
                <p className="text-white font-semibold mb-1 group-hover:text-[#013f2e]">Best Resume Builders in 2026</p>
                <p className="text-gray-500 text-sm">See how AIResume compares across the whole category.</p>
              </Link>
              <Link
                href="/compare/ai-resume-vs-cakeresume"
                className="p-5 rounded-2xl bg-[#111611] border border-white/5 hover:border-[#013f2e]/40 transition-colors group"
              >
                <p className="text-white font-semibold mb-1 group-hover:text-[#013f2e]">AIResume vs CakeResume</p>
                <p className="text-gray-500 text-sm">Another detailed head-to-head comparison.</p>
              </Link>
              <Link
                href="/ats-resume-checker"
                className="p-5 rounded-2xl bg-[#111611] border border-white/5 hover:border-[#013f2e]/40 transition-colors group"
              >
                <p className="text-white font-semibold mb-1 group-hover:text-[#013f2e]">Free ATS Resume Checker</p>
                <p className="text-gray-500 text-sm">Score your resume against a real job description.</p>
              </Link>
              <Link
                href="/resume-score"
                className="p-5 rounded-2xl bg-[#111611] border border-white/5 hover:border-[#013f2e]/40 transition-colors group"
              >
                <p className="text-white font-semibold mb-1 group-hover:text-[#013f2e]">Resume Score</p>
                <p className="text-gray-500 text-sm">Get an instant score with a prioritized fix list.</p>
              </Link>
              <Link
                href="/blog"
                className="p-5 rounded-2xl bg-[#111611] border border-white/5 hover:border-[#013f2e]/40 transition-colors group"
              >
                <p className="text-white font-semibold mb-1 group-hover:text-[#013f2e]">Career Blog</p>
                <p className="text-gray-500 text-sm">Guides on tailoring, ATS scoring and getting interviews.</p>
              </Link>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl font-bold text-white mb-6">Ready to make the switch?</h2>
            <p className="text-gray-400 mb-10 text-lg">
              Build, tailor, score and track your applications on one platform — start free, no credit card required.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/sign-up"
                className="px-10 py-5 bg-[#013f2e] hover:bg-[#025c43] text-white font-bold rounded-full transition-colors duration-200 shadow-lg"
              >
                Start Building Free
              </Link>
              <Link
                href="/ai-resume-builder"
                className="px-10 py-5 bg-white/10 text-white border border-white/20 rounded-full font-bold hover:bg-white/20 transition-all inline-flex items-center gap-2"
              >
                Try the AI Resume Builder <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
