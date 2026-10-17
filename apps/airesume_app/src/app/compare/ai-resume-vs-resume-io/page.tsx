import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { Check, X, ArrowRight, Target, Zap, Shield } from 'lucide-react';
import CardNav from '@/components/landing/CardNav';
import Footer from '@/components/landing/Footer';
import { MotionDiv, MotionH1, MotionP } from '@/components/ui/motion-wrapper';
import { navLinks } from '@/data/navigation';

export const metadata: Metadata = {
  title: 'AIResume vs Resume.io | Resume.io Alternative 2026',
  description:
    'AIResume vs Resume.io compared: why job seekers switch for ATS scoring against each job description, a built-in application tracker, and a free tier.',
  keywords: ['ai resume vs resume.io', 'resume.io alternative', 'best ai resume builder', 'ats resume checker comparison', 'ai cv builder 2026'],
  alternates: { canonical: 'https://buildairesume.com/compare/ai-resume-vs-resume-io' },
};

const comparisonFeatures = [
  { name: 'AI Resume Builder', aiResume: true, competitor: true, note: 'Both draft resume content with AI' },
  { name: 'ATS scoring against a specific job description', aiResume: true, competitor: true, note: 'AIResume rescores as you tailor each application' },
  { name: 'AI tailoring per job', aiResume: true, competitor: true, note: 'AIResume keeps rewriting and rescoring in one loop' },
  { name: 'Job application tracker built in', aiResume: true, competitor: false, note: 'AIResume tracks every application end-to-end' },
  { name: 'Interview coach', aiResume: true, competitor: true, note: 'AIResume’s coach is part of the core suite' },
  { name: 'Cover letter generator', aiResume: true, competitor: true, note: 'Both generate matching cover letters' },
  { name: 'Free tier without forced download-to-view', aiResume: true, competitor: false, note: 'AIResume builds and scores free in the browser' },
  { name: 'Professional template library', aiResume: true, competitor: true, note: 'Both offer polished, ATS-conscious templates' },
];

const faqs = [
  {
    question: 'Is AIResume a good alternative to Resume.io?',
    answer:
      'Yes. Resume.io is a fast template-driven builder, while AIResume adds ATS scoring against a specific job description, a per-job tailoring loop, a job application tracker and an interview coach in one platform, with a free tier and paid plans from a low monthly price.',
  },
  {
    question: 'Does Resume.io score your resume against a job description?',
    answer:
      'Yes — Resume.io’s checker can take a job description and returns an ATS-style score. AIResume scores against the same kind of posting and connects that score to a per-job tailoring loop and your application tracker.',
  },
  {
    question: 'Does Resume.io have a free tier without a download paywall?',
    answer:
      'Resume.io’s free plan exports plain text only; formatted PDF downloads require a paid plan. AIResume lets you build, score and tailor resumes free in the browser, with paid plans from a low monthly price.',
  },
];

export default function ComparisonPage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'AIResume',
    description: 'Comparison of AIResume vs Resume.io showing AI tailoring, ATS scoring against job descriptions, and a built-in application tracker.',
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
              AIResume vs <span className="text-gray-500">Resume.io</span>
            </MotionH1>
            <MotionP
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-gray-400 max-w-3xl mx-auto"
            >
              Why job seekers switch to AIResume for their 2026 job search: score against the real job description, tailor every
              application, and track every outcome in one place.
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
                    <th className="p-6 text-center text-gray-400 font-bold">Resume.io</th>
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
              <h3 className="text-xl font-bold text-white mb-4">One Loop, Not Five Tabs</h3>
              <p className="text-gray-400 leading-relaxed">
                Score, tailor, write the cover letter and rescore for the same job — all inside AIResume, without stitching
                together separate tools for each step.
              </p>
            </div>
            <div className="p-8 rounded-2xl bg-[#1a1f1a] border border-white/5">
              <Zap className="w-12 h-12 text-[#013f2e] mb-6" />
              <h3 className="text-xl font-bold text-white mb-4">A Free Tier You Can Actually Use</h3>
              <p className="text-gray-400 leading-relaxed">
                Build, score and tailor resumes in the browser for free — no formatted-download paywall waiting at the end of your
                work, with paid plans from a low monthly price.
              </p>
            </div>
            <div className="p-8 rounded-2xl bg-[#1a1f1a] border border-white/5">
              <Shield className="w-12 h-12 text-[#013f2e] mb-6" />
              <h3 className="text-xl font-bold text-white mb-4">Applications, Tracked</h3>
              <p className="text-gray-400 leading-relaxed">
                The built-in tracker links every application to the exact resume, cover letter and score you sent, so you always
                know what happened and what to do next.
              </p>
            </div>
          </div>
        </section>

        {/* Honest acknowledgement */}
        <section className="py-16 px-4 bg-white/5">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">What Resume.io Does Well</h2>
            <p className="text-gray-400 leading-relaxed mb-4">
              Credit where it is due: Resume.io is fast. Its stepped onboarding gets you from a blank page to a finished draft in
              minutes, the templates are clean and mostly single-column, which is exactly the structure applicant tracking systems
              read most reliably, and the matching cover letter builder produces a visually consistent set.
            </p>
            <p className="text-gray-400 leading-relaxed">
              If speed and simplicity are your main priorities, it delivers. The gaps appear once your search gets serious: the
              free plan exports plain text only, there is no application tracker, and tailoring plus interview practice live
              behind paid tiers rather than being part of one continuous workflow.
            </p>
          </div>
        </section>

        {/* Pricing Comparison */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-4">The Smart Investment</h2>
            <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
              We do not quote competitor prices here — plans and promotions change often, so check Resume.io’s website for current
              rates. What matters is what you actually get for your money.
            </p>
            <div className="grid md:grid-cols-2 gap-8 mt-12">
              <div className="p-8 rounded-2xl border border-white/5 bg-[#0d1209]">
                <h3 className="text-gray-500 font-bold mb-4 uppercase">Resume.io</h3>
                <p className="text-3xl text-white font-bold mb-6">Free + paid</p>
                <ul className="text-left space-y-3 text-gray-500 text-sm">
                  <li>• Free plan exports plain text only</li>
                  <li>• Formatted PDF export on paid plans</li>
                  <li>• Advanced tailoring and AI behind paid tiers</li>
                  <li>• No job application tracker</li>
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
                href="/templates"
                className="p-5 rounded-2xl bg-[#111611] border border-white/5 hover:border-[#013f2e]/40 transition-colors group"
              >
                <p className="text-white font-semibold mb-1 group-hover:text-[#013f2e]">Resume Templates</p>
                <p className="text-gray-500 text-sm">ATS-friendly layouts you can edit and tailor.</p>
              </Link>
              <Link
                href="/ats-resume-checker"
                className="p-5 rounded-2xl bg-[#111611] border border-white/5 hover:border-[#013f2e]/40 transition-colors group"
              >
                <p className="text-white font-semibold mb-1 group-hover:text-[#013f2e]">Free ATS Resume Checker</p>
                <p className="text-gray-500 text-sm">Score your resume against a real job description.</p>
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
