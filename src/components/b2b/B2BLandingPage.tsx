'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  ArrowRight, Code2, Database, Zap, Shield, CheckCircle2, 
  ChevronRight, BarChart, Layout, CheckCircle, FileText, 
  Globe, Sparkles, Building2, Terminal, Users, Cpu, Check
} from 'lucide-react';
import CardNav from '@/components/landing/CardNav';
import Footer from '@/components/landing/Footer';
import { useRouter } from 'next/navigation';
import { navLinks } from '@/data/navigation';

export default function B2BLandingPage() {
  const router = useRouter();

  // B2B specific links for the CardNav
  const b2bLinks = [
    { 
      label: 'Solutions', 
      href: '#solutions',
      submenu: [
        { label: 'Universal CV Parsing', description: 'Extract JSON from any PDF/DOCX', href: '#solutions', icon: <FileText className="w-5 h-5 text-blue-400" /> },
        { label: 'AI Score Engine', description: 'Real-time candidate matching', href: '#solutions', icon: <CheckCircle className="w-5 h-5 text-[#80FF00]" /> },
        { label: 'Enterprise SDK', description: 'Node.js, Python, & Go support', href: '#docs', icon: <Terminal className="w-5 h-5 text-purple-400" /> }
      ]
    },
    { 
      label: 'Products', 
      href: '#products',
      submenu: [
        { label: 'White-label Portal', description: 'Your brand, our intelligence', href: '#products', icon: <Layout className="w-5 h-5 text-emerald-400" /> },
        { label: 'Team Collaboration', description: 'Seamless hiring workflows', href: '#products', icon: <Users className="w-5 h-5 text-orange-400" /> }
      ]
    },
    { label: 'Pricing', href: '#pricing' },
    { label: 'API Docs', href: '/docs', isExternal: true },
  ];

  return (
    <div className="min-h-screen bg-[#0d1209] text-white selection:bg-[#80FF00] selection:text-black font-sans">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#80FF00]/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[120px]" />
      </div>

      <CardNav 
        logo="CVCircle"
        links={b2bLinks}
      />
      
      <main className="relative z-10 pt-32">
        {/* Hero Section */}
        <section className="px-6 py-20 md:py-40">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col items-center text-center">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-[#80FF00] mb-12 backdrop-blur-md"
              >
                <Cpu className="w-4 h-4" />
                <span className="tracking-widest uppercase text-[10px]">Next-Gen Recruitment Intelligence</span>
              </motion.div>
              
              <motion.h1 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="text-6xl md:text-8xl lg:text-[100px] font-black tracking-tighter mb-12 leading-[0.9]"
              >
                THE FUTURE OF <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#80FF00] via-green-400 to-[#80FF00] bg-[length:200%_auto] animate-gradient">
                  HIRED TALENT
                </span>
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-16 leading-relaxed"
              >
                Infrastructure-grade CV parsing, ATS scoring, and AI screening. 
                Built for high-scale platforms and modern recruitment agencies.
              </motion.p>
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-6"
              >
                <Link 
                  href="/b2b/login"
                  className="group relative px-10 py-5 bg-[#80FF00] text-black font-black rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95"
                >
                  <span className="relative z-10 flex items-center gap-2 text-lg">
                    ENTERPRISE ACCESS <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
                <Link 
                  href="#docs"
                  className="px-10 py-5 bg-white/5 border border-white/10 text-white font-bold rounded-full backdrop-blur-xl hover:bg-white/10 transition-all flex items-center gap-2 text-lg"
                >
                  VIEW DOCUMENTATION
                </Link>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Logo Cloud - Trusted By */}
        <section className="py-20 border-y border-white/5 bg-black/20">
          <div className="max-w-7xl mx-auto px-6">
            <p className="text-center text-[10px] font-black tracking-[0.3em] text-gray-500 uppercase mb-12">
              Powering the next generation of HR Tech
            </p>
            <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-700">
              <div className="text-3xl font-black tracking-tighter">TECHSTAR</div>
              <div className="text-3xl font-black tracking-tighter italic">VANTAGE</div>
              <div className="text-3xl font-black tracking-tighter">GLOBAL.IO</div>
              <div className="text-3xl font-black tracking-tighter underline underline-offset-8 decoration-[#80FF00]">TALENT</div>
              <div className="text-3xl font-black tracking-tighter opacity-50">NEXUS</div>
            </div>
          </div>
        </section>

        {/* Features / Solutions Grid */}
        <section id="solutions" className="px-6 py-32">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-32 items-center mb-40">
              <div>
                <span className="text-[#80FF00] font-black tracking-widest text-xs uppercase mb-6 block">01. UNIVERSAL PARSING</span>
                <h2 className="text-5xl md:text-7xl font-bold mb-8 tracking-tighter leading-tight">
                  Structured data from <br /> 
                  <span className="opacity-50 italic">unstructured chaos.</span>
                </h2>
                <p className="text-xl text-gray-400 mb-12 leading-relaxed">
                  Our proprietary deep-learning models extract 100+ data points from resumes in any format. Experience, education, skills, and projects—perfectly categorized in real-time.
                </p>
                <div className="space-y-6">
                  {[
                    "Multilingual support for 90+ languages",
                    "99.9% extraction accuracy on complex layouts",
                    "Direct PDF/DOCX to JSON conversion"
                  ].map((text, i) => (
                    <div key={i} className="flex items-center gap-4 group">
                      <div className="w-6 h-6 rounded-full bg-[#80FF00]/10 flex items-center justify-center border border-[#80FF00]/20 group-hover:bg-[#80FF00] group-hover:text-black transition-all">
                        <Check className="w-3 h-3" />
                      </div>
                      <span className="text-lg font-medium">{text}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-[#80FF00]/20 blur-[100px] rounded-full" />
                <div className="relative bg-[#141810] border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden group hover:border-[#80FF00]/30 transition-all">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-3 h-3 rounded-full bg-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                    <div className="w-3 h-3 rounded-full bg-green-500/50" />
                    <span className="ml-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest">response.json</span>
                  </div>
                  <pre className="font-mono text-sm text-[#80FF00]/80">
                    <code>{`{
  "name": "Jane Cooper",
  "email": "jane@example.com",
  "experience": [
    {
      "company": "TechCorp",
      "role": "Lead Engineer",
      "duration": "4 years",
      "skills": ["React", "Node.js", "AI"]
    }
  ],
  "score": 98.5
}`}</code>
                  </pre>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {[
                {
                  icon: <Zap className="w-8 h-8" />,
                  title: "Real-time Scoring",
                  desc: "Instantly match candidates against job descriptions with our proprietary matching algorithm."
                },
                {
                  icon: <Shield className="w-8 h-8" />,
                  title: "Enterprise Security",
                  desc: "SOC2 compliant infrastructure with end-to-end encryption for all candidate data."
                },
                {
                  icon: <Globe className="w-8 h-8" />,
                  title: "Global Scale",
                  desc: "Processing millions of parses monthly with 99.99% uptime guarantee."
                }
              ].map((item, i) => (
                <div key={i} className="group p-10 bg-white/5 border border-white/10 rounded-[40px] hover:bg-white/[0.08] transition-all duration-500">
                  <div className="text-[#80FF00] mb-8 group-hover:scale-110 transition-transform origin-left">{item.icon}</div>
                  <h3 className="text-2xl font-bold mb-4 tracking-tight">{item.title}</h3>
                  <p className="text-gray-500 leading-relaxed group-hover:text-gray-400 transition-colors">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* High-Impact CTA */}
        <section className="px-6 py-40 bg-[#80FF00] text-black overflow-hidden relative">
          <div className="absolute top-0 right-0 w-[1000px] h-[1000px] bg-white/20 rounded-full blur-[150px] translate-x-1/2 -translate-y-1/2" />
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-12">
              <h2 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.8]">
                READY TO <br />
                SCALE YOUR <br />
                <span className="opacity-40 italic">PLATFORM?</span>
              </h2>
              <div className="flex flex-col gap-6 w-full md:w-auto">
                <Link 
                  href="/b2b/login"
                  className="px-12 py-8 bg-black text-white font-black rounded-full text-center hover:scale-105 transition-transform"
                >
                  GET STARTED NOW
                </Link>
                <Link 
                  href="mailto:enterprise@cvcircle.io"
                  className="px-12 py-8 border-2 border-black font-black rounded-full text-center hover:bg-black hover:text-white transition-all"
                >
                  TALK TO EXPERTS
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="px-6 py-32 bg-black">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-24">
              <h2 className="text-5xl md:text-7xl font-bold mb-8 tracking-tighter">Simple Scaling.</h2>
              <p className="text-xl text-gray-500 max-w-2xl mx-auto">Pay for what you use. Scale as you grow.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-12">
              {[
                { name: "STARTUP", price: "99", features: ["10k parses / mo", "Standard Support", "Basic API"] },
                { name: "GROWTH", price: "299", popular: true, features: ["50k parses / mo", "Priority Support", "Full SDK Access", "Webhooks"] },
                { name: "ENTERPRISE", price: "Custom", features: ["Unlimited parses", "24/7 Support", "Dedicated Account", "SLA"] }
              ].map((plan, i) => (
                <div key={i} className={`relative p-12 rounded-[50px] border ${plan.popular ? 'border-[#80FF00] bg-[#1a230f]/50' : 'border-white/10 bg-white/5'} transition-all hover:translate-y-[-10px]`}>
                  {plan.popular && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#80FF00] text-black text-[10px] font-black px-4 py-1.5 rounded-full tracking-widest uppercase">
                      Most Popular
                    </div>
                  )}
                  <h3 className="text-sm font-black tracking-[0.2em] text-gray-500 mb-8 uppercase">{plan.name}</h3>
                  <div className="flex items-baseline gap-2 mb-12">
                    <span className="text-5xl font-black tracking-tighter">
                      {plan.price !== "Custom" ? `$${plan.price}` : plan.price}
                    </span>
                    {plan.price !== "Custom" && <span className="text-gray-500 font-bold">/MO</span>}
                  </div>
                  <ul className="space-y-6 mb-12">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-3 text-gray-400">
                        <CheckCircle className="w-4 h-4 text-[#80FF00]" />
                        <span className="font-medium">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link 
                    href={plan.price === "Custom" ? "mailto:enterprise@cvcircle.io" : "/b2b/login"}
                    className={`block w-full py-6 rounded-full text-center font-black tracking-widest text-xs transition-all ${
                      plan.popular 
                      ? 'bg-[#80FF00] text-black hover:bg-white' 
                      : 'bg-white/10 text-white hover:bg-white hover:text-black'
                    }`}
                  >
                    {plan.price === "Custom" ? "CONTACT SALES" : "GET STARTED"}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />

      <style jsx global>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 3s linear infinite;
        }
      `}</style>
    </div>
  );
}
