'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Code2, Database, Zap, Shield, CheckCircle2, ChevronRight, BarChart, Layout, CheckCircle, FileText, Globe } from 'lucide-react';
import CardNav from '@/components/landing/CardNav';
import Footer from '@/components/landing/Footer';

// Note: metadata cannot be used with 'use client', moved to layout or removed for simplicity
// export const metadata = { ... };

export default function BusinessPage() {
  const navLinks = [
    { 
      label: 'API Docs', 
      href: '#docs',
      submenu: [
        { label: 'CV Parsing API', description: 'Extract JSON from PDF/DOCX', href: '#docs', icon: <FileText className="w-5 h-5 text-blue-400" />, snapshot: 'bg-gradient-to-br from-blue-500/20 to-cyan-600/20 border-blue-500/30' },
        { label: 'ATS Engine API', description: 'Score resumes against JDs', href: '#docs', icon: <CheckCircle className="w-5 h-5 text-green-400" />, snapshot: 'bg-gradient-to-br from-green-500/20 to-lime-600/20 border-green-500/30' }
      ]
    },
    { 
      label: 'Features', 
      href: '#features',
      submenu: [
        { label: 'Multilingual Parsing', description: 'Supports 90+ languages natively', href: '#features', icon: <Globe className="w-5 h-5 text-purple-400" /> },
        { label: 'Webhooks', description: 'Real-time processing events', href: '#features', icon: <Zap className="w-5 h-5 text-yellow-400" /> }
      ]
    },
    { label: 'Pricing', href: '#pricing' },
  ];

  return (
    <div className="min-h-screen bg-[#11140e] text-white selection:bg-[#80FF00] selection:text-black">
      <CardNav 
        logo="CVCircle"
        links={navLinks}
        onCtaClick={() => window.location.href = '/sign-in'}
      />
      
      <main className="pt-32">
        {/* Hero Section */}
        <section className="relative px-6 py-20 md:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#80FF0015_0%,transparent_70%)]" />
          
          <div className="max-w-6xl mx-auto relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-[#80FF00] mb-8">
              <Zap className="w-4 h-4" />
              CVCircle Enterprise API & SDK
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8">
              Empower your platform with
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#80FF00] to-green-400">
                AI Resume Intelligence
              </span>
            </h1>
            
            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12">
              Integrate world-class CV parsing, ATS scoring, and data extraction into your HR tech, job board, or recruitment agency in minutes.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                href="mailto:enterprise@cvcircle.io?subject=API Access Request"
                className="px-8 py-4 bg-[#80FF00] text-black font-bold rounded-xl hover:bg-[#8aff1a] transition-all hover:scale-105 flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                Get API Keys <ArrowRight className="w-5 h-5" />
              </Link>
              <Link 
                href="#docs"
                className="px-8 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-all flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                Read the Docs
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="px-6 py-24 bg-black/30 border-y border-white/5">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Built for scale and accuracy</h2>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                Our infrastructure processes millions of resumes with unmatched precision, delivering structured data you can rely on.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Feature 1 */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-colors">
                <div className="w-14 h-14 bg-[#80FF00]/10 rounded-xl flex items-center justify-center mb-6 border border-[#80FF00]/20">
                  <Database className="w-7 h-7 text-[#80FF00]" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Universal CV Parsing API</h3>
                <p className="text-gray-400 mb-6">
                  Extract highly structured JSON data from any PDF, DOCX, or text resume. Our proprietary models accurately identify work experience, education, skills, and contact details regardless of the layout.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-sm text-gray-300">
                    <CheckCircle2 className="w-5 h-5 text-[#80FF00]" /> JSON, Raw Text, and cvData formats
                  </li>
                  <li className="flex items-center gap-3 text-sm text-gray-300">
                    <CheckCircle2 className="w-5 h-5 text-[#80FF00]" /> Multilingual support (90+ languages)
                  </li>
                  <li className="flex items-center gap-3 text-sm text-gray-300">
                    <CheckCircle2 className="w-5 h-5 text-[#80FF00]" /> High-fidelity data extraction
                  </li>
                </ul>
              </div>

              {/* Feature 2 */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-colors">
                <div className="w-14 h-14 bg-[#80FF00]/10 rounded-xl flex items-center justify-center mb-6 border border-[#80FF00]/20">
                  <BarChart className="w-7 h-7 text-[#80FF00]" />
                </div>
                <h3 className="text-2xl font-bold mb-4">ATS Scoring & Metrics SDK</h3>
                <p className="text-gray-400 mb-6">
                  Provide instant feedback to your users with our industry-leading ATS scoring engine. Cross-reference resumes against job descriptions in real-time.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-sm text-gray-300">
                    <CheckCircle2 className="w-5 h-5 text-[#80FF00]" /> Real-time keyword matching
                  </li>
                  <li className="flex items-center gap-3 text-sm text-gray-300">
                    <CheckCircle2 className="w-5 h-5 text-[#80FF00]" /> Readability and impact analysis
                  </li>
                  <li className="flex items-center gap-3 text-sm text-gray-300">
                    <CheckCircle2 className="w-5 h-5 text-[#80FF00]" /> Custom scoring algorithms
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Code Snippet Example */}
        <section className="px-6 py-24 relative overflow-hidden">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl md:text-5xl font-bold mb-6">Developer first, always.</h2>
                <p className="text-gray-400 text-lg mb-8">
                  We provide robust SDKs for Node.js, Python, and Go. Our REST API is documented extensively, making integration a breeze for your engineering team.
                </p>
                <Link href="#docs" className="inline-flex items-center gap-2 text-[#80FF00] font-semibold hover:underline">
                  View Documentation <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="bg-[#0d1109] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="ml-2 text-xs text-gray-400 font-mono">parse-resume.js</span>
                </div>
                <div className="p-6 overflow-x-auto">
                  <pre className="text-sm font-mono text-gray-300">
                    <code>
<span className="text-purple-400">import</span> {'{'} CVCircle {'}'} <span className="text-purple-400">from</span> <span className="text-green-400">'@cvcircle/sdk'</span>;{'\n\n'}
<span className="text-purple-400">const</span> cvcircle = <span className="text-purple-400">new</span> <span className="text-yellow-200">CVCircle</span>(process.env.CVCIRCLE_API_KEY);{'\n\n'}
<span className="text-gray-500">// Parse a resume document</span>{'\n'}
<span className="text-purple-400">const</span> response = <span className="text-purple-400">await</span> cvcircle.parser.<span className="text-blue-400">extract</span>({'{'}{'\n'}
{'  '}fileUrl: <span className="text-green-400">'https://example.com/resume.pdf'</span>,{'\n'}
{'  '}format: <span className="text-green-400">'cvData'</span>, <span className="text-gray-500">// 'json' | 'text' | 'cvData'</span>{'\n'}
{'}'});{'\n\n'}
<span className="text-blue-400">console</span>.<span className="text-blue-400">log</span>(response.data.skills);{'\n'}
<span className="text-gray-500">// {">"} ['React', 'Node.js', 'Python']</span>
                    </code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="px-6 py-24 bg-black/30 border-t border-white/5" id="pricing">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Simple, transparent pricing</h2>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                Pay only for what you use. Scale seamlessly as your platform grows.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Plan 1 */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col">
                <h3 className="text-xl font-medium text-gray-300 mb-2">Startup</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold">$99</span>
                  <span className="text-gray-500">/mo</span>
                </div>
                <p className="text-sm text-gray-400 mb-8 border-b border-white/10 pb-8">
                  Perfect for early-stage startups and small projects.
                </p>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-3 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-[#80FF00]" /> 10,000 parses / month
                  </li>
                  <li className="flex items-center gap-3 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-[#80FF00]" /> ATS Scoring API
                  </li>
                  <li className="flex items-center gap-3 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-[#80FF00]" /> Standard Support
                  </li>
                </ul>
                <Link href="mailto:enterprise@cvcircle.io?subject=Startup Plan" className="w-full py-3 rounded-lg border border-white/20 text-center font-medium hover:bg-white/5 transition-colors">
                  Get Started
                </Link>
              </div>

              {/* Plan 2 */}
              <div className="bg-[#1a230f] border-2 border-[#80FF00] rounded-2xl p-8 flex flex-col relative transform md:-translate-y-4 shadow-[0_0_40px_rgba(128,255,0,0.1)]">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#80FF00] text-black text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Most Popular
                </div>
                <h3 className="text-xl font-medium text-gray-300 mb-2">Growth</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold">$299</span>
                  <span className="text-gray-500">/mo</span>
                </div>
                <p className="text-sm text-gray-400 mb-8 border-b border-white/10 pb-8">
                  For scaling platforms needing high-volume processing.
                </p>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-3 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-[#80FF00]" /> 50,000 parses / month
                  </li>
                  <li className="flex items-center gap-3 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-[#80FF00]" /> Advanced ATS Scoring Engine
                  </li>
                  <li className="flex items-center gap-3 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-[#80FF00]" /> Webhooks & Batch Processing
                  </li>
                  <li className="flex items-center gap-3 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-[#80FF00]" /> Priority Support
                  </li>
                </ul>
                <Link href="mailto:enterprise@cvcircle.io?subject=Growth Plan" className="w-full py-3 rounded-lg bg-[#80FF00] text-black text-center font-bold hover:bg-[#8aff1a] transition-colors">
                  Get Started
                </Link>
              </div>

              {/* Plan 3 */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col">
                <h3 className="text-xl font-medium text-gray-300 mb-2">Enterprise</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold">Custom</span>
                </div>
                <p className="text-sm text-gray-400 mb-8 border-b border-white/10 pb-8">
                  Tailored solutions for large-scale operations.
                </p>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-3 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-[#80FF00]" /> Unlimited API requests
                  </li>
                  <li className="flex items-center gap-3 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-[#80FF00]" /> Custom AI Model Training
                  </li>
                  <li className="flex items-center gap-3 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-[#80FF00]" /> Dedicated Account Manager
                  </li>
                  <li className="flex items-center gap-3 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-[#80FF00]" /> SLA & Uptime Guarantee
                  </li>
                </ul>
                <Link href="mailto:enterprise@cvcircle.io?subject=Enterprise Plan" className="w-full py-3 rounded-lg border border-white/20 text-center font-medium hover:bg-white/5 transition-colors">
                  Contact Sales
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
