import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { Check, X, ArrowRight, Sparkles, Target, Zap, Shield, BarChart3, Clock } from 'lucide-react';
import CardNav from '@/components/landing/CardNav';
import Footer from '@/components/landing/Footer';
import { MotionDiv, MotionH1, MotionP } from '@/components/ui/motion-wrapper';
import { navLinks } from '@/data/navigation';

export const metadata: Metadata = {
  title: 'AIResume vs CakeResume Comparison | Best AI Resume Builder 2026',
  description: 'Detailed comparison between AIResume and CakeResume (CakeCV). See why job seekers switch to AIResume for better AI resume generation, ATS scoring, and transparent pricing.',
  keywords: ['ai resume vs cakeresume', 'best ai resume builder', 'ats resume checker comparison', 'cakeresume alternative', 'ai cv builder 2026'],
  alternates: { canonical: 'https://buildairesume.com/compare/ai-resume-vs-cakeresume' },
};

const comparisonFeatures = [
  { name: 'AI Resume Builder', aiResume: true, cakeresume: true, note: 'AIResume uses role-specific models' },
  { name: 'ATS Scoring Engine', aiResume: true, cakeresume: false, note: 'AIResume has native real-time scoring' },
  { name: 'Job Application Tracker', aiResume: true, cakeresume: false, note: 'AIResume includes full application CRM' },
  { name: 'Cover Letter Generator', aiResume: true, cakeresume: false, note: 'Included in AIResume Pro' },
  { name: 'LinkedIn Profile Enhancer', aiResume: true, cakeresume: false, note: 'AIResume exclusive feature' },
  { name: 'Interview Coach', aiResume: true, cakeresume: false, note: 'Tailored AI interview prep' },
  { name: 'Chrome/Edge Extension', aiResume: true, cakeresume: true, note: 'AIResume extension is more comprehensive' },
  { name: 'Transparent Pricing', aiResume: true, cakeresume: false, note: 'AIResume has no hidden regional markups' },
];

export default function ComparisonPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "AI Resume Builder",
    "description": "Comparison of AIResume vs CakeResume showing superior AI features and value.",
    "brand": {
      "@type": "Brand",
      "name": "AIResume"
    },
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Why is AIResume better than CakeResume for ATS?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "AIResume includes a native ATS scoring engine that analyzes your resume against job descriptions in real-time, whereas CakeResume lacks built-in ATS optimization tools."
        }
      },
      {
        "@type": "Question",
        "name": "Does AIResume have a free tier?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, AIResume offers a comprehensive free tier that includes resume building, basic ATS scanning, and job tracking."
        }
      }
    ]
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
              <span className="px-4 py-2 bg-[#81ff00]/10 border border-[#81ff00]/20 rounded-full text-[#81ff00] text-sm font-medium mb-6 inline-block">
                AIResume vs Competitors
              </span>
            </MotionDiv>
            <MotionH1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-4xl md:text-6xl font-bold text-white mb-6">
              AIResume vs <span className="text-gray-500">CakeResume</span>
            </MotionH1>
            <MotionP initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-xl text-gray-400 max-w-3xl mx-auto">
              Why professional job seekers are switching to AIResume for their 2026 job search. Better AI, native ATS optimization, and a complete career suite.
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
                    <th className="p-6 text-center text-gray-400 font-bold">CakeResume</th>
                    <th className="p-6 text-center text-[#81ff00] font-bold">AIResume</th>
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
                        {feature.cakeresume ? <Check className="w-6 h-6 text-green-500 mx-auto" /> : <X className="w-6 h-6 text-red-500 mx-auto" />}
                      </td>
                      <td className="p-6 text-center bg-[#81ff00]/5">
                        <Check className="w-6 h-6 text-[#81ff00] mx-auto" />
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
              <Target className="w-12 h-12 text-[#81ff00] mb-6" />
              <h3 className="text-xl font-bold text-white mb-4">Native ATS Optimization</h3>
              <p className="text-gray-400 leading-relaxed">Stop guessing. Our built-in engine scores your resume against real job descriptions, saving you £300+/year on external tools.</p>
            </div>
            <div className="p-8 rounded-2xl bg-[#1a1f1a] border border-white/5">
              <Zap className="w-12 h-12 text-[#81ff00] mb-6" />
              <h3 className="text-xl font-bold text-white mb-4">Role-Specific AI</h3>
              <p className="text-gray-400 leading-relaxed">Generic AI produces generic results. AIResume uses models trained specifically for Software Engineering, Data, and Product roles.</p>
            </div>
            <div className="p-8 rounded-2xl bg-[#1a1f1a] border border-white/5">
              <Shield className="w-12 h-12 text-[#81ff00] mb-6" />
              <h3 className="text-xl font-bold text-white mb-4">Transparent Pricing</h3>
              <p className="text-gray-400 leading-relaxed">No hidden regional markups or "token" confusion. One clear price for unlimited access to the entire platform.</p>
            </div>
          </div>
        </section>

        {/* Pricing Comparison */}
        <section className="py-16 px-4 bg-white/5">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-8">The Smart Investment</h2>
            <div className="grid md:grid-cols-2 gap-8 mt-12">
              <div className="p-8 rounded-2xl border border-white/5 bg-[#0d1209]">
                <h3 className="text-gray-500 font-bold mb-4 uppercase">CakeResume Bundle</h3>
                <p className="text-3xl text-white font-bold mb-6">~£760 / year</p>
                <ul className="text-left space-y-3 text-gray-500 text-sm">
                  <li>• Subscription: ~£199</li>
                  <li>• Jobscan (ATS): ~£348</li>
                  <li>• Cover Letter Tool: ~£120</li>
                  <li>• Job Tracker: ~£96</li>
                </ul>
              </div>
              <div className="p-8 rounded-2xl border border-[#81ff00]/30 bg-[#111611] relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-[#81ff00] text-black text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase">Best Value</div>
                <h3 className="text-[#81ff00] font-bold mb-4 uppercase">AIResume All-in-One</h3>
                <p className="text-4xl text-white font-bold mb-6">£149 / year</p>
                <ul className="text-left space-y-3 text-gray-300 text-sm">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#81ff00]" /> Subscription: £149</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#81ff00]" /> ATS Optimization: Included</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#81ff00]" /> Cover Letter Generator: Included</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#81ff00]" /> Job Application Tracker: Included</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl font-bold text-white mb-6">Ready to make the switch?</h2>
            <p className="text-gray-400 mb-10 text-lg">Join 120,000+ professionals using the most advanced career platform of 2026.</p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/sign-up" className="px-10 py-5 bg-[#81ff00] text-black font-bold rounded-full hover:bg-lime-400 transition-all shadow-[0_0_30px_rgba(129,255,0,0.3)]">
                Start Building Free
              </Link>
              <Link href="/features" className="px-10 py-5 bg-white/10 text-white border border-white/20 rounded-full font-bold hover:bg-white/20 transition-all">
                Explore All Features
              </Link>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
