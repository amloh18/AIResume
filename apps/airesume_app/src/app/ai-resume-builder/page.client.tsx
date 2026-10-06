'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  FileText, 
  BarChart3, 
  Zap, 
  Sliders, 
  Eye, 
  Target, 
  Briefcase, 
  Bot, 
  UserCheck, 
  Layout, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Award,
  Globe,
  Clock
} from 'lucide-react';
import CardNav from '@/components/landing/CardNav';
import Footer from '@/components/landing/Footer';
import { navLinks } from '@/data/navigation';

export default function AIResumeBuilderPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const steps = [
    {
      step: '01',
      title: 'Import or Draft Your Career History',
      description: 'Upload your existing PDF/Word resume or use our intuitive guided flow to enter your background, education, and milestone achievements in minutes.',
      icon: FileText
    },
    {
      step: '02',
      title: 'AI Enhances & Formats in Real Time',
      description: 'AI transforms rough notes into high-impact, metric-driven bullet points formatted precisely to pass Applicant Tracking Systems (ATS) with flying colors.',
      icon: Sparkles
    },
    {
      step: '03',
      title: 'Tailor for Specific Job Openings',
      description: 'Paste any job description to instantly align keywords, highlight relevant experience, and generate a perfectly coordinated tailored cover letter.',
      icon: Target
    },
    {
      step: '04',
      title: 'Choose Your Velocity: Review or Auto-Apply',
      description: 'Review and approve applications with 1-click apply, or activate your automated career agent to apply to matching roles within your explicit daily quota.',
      icon: Zap
    }
  ];

  const features = [
    {
      icon: Sliders,
      title: 'Balanced AI & Human Craftsmanship',
      description: 'You maintain 100% editorial authority over your career narrative. AI handles typography, action verbs, and keyword alignment without producing generic robotic text.'
    },
    {
      icon: Target,
      title: 'Live ATS Scoring & Keyword Scanner',
      description: 'Test your resume against real-world recruiter parsing algorithms. Identify missing keywords, formatting traps, and readability scores before applying.'
    },
    {
      icon: Zap,
      title: 'Tailored Job-Specific Variants',
      description: 'Create unlimited tailored resume versions derived from your Master CV. Optimize each variant for specific industries, seniorities, or specialized roles.'
    },
    {
      icon: Bot,
      title: 'Human-in-the-Loop Automation',
      description: 'Choose between manual 1-click submissions or intelligent automated applications configured with your exact compensation, location, and notice period thresholds.'
    },
    {
      icon: Layout,
      title: '15+ Modern ATS-Friendly Templates',
      description: 'Designer-crafted templates engineered for readability by both AI parsers and hiring managers. Switch layouts instantly without retyping data.'
    },
    {
      icon: ShieldCheck,
      title: 'Complete Data Privacy & Ownership',
      description: 'Your career records belong solely to you. We never sell candidate data to third parties or train public generative models on your personal documents.'
    }
  ];

  const comparisons = [
    {
      feature: 'Writing & Enhancement',
      traditional: 'Manual writing from blank page',
      spamBots: 'Fully artificial, hallucinated text',
      aiResume: 'Balanced: Your authentic career history enhanced by AI metrics'
    },
    {
      feature: 'ATS Compatibility',
      traditional: 'Unverified formatting risks rejection',
      spamBots: 'Basic text dumps with zero styling',
      aiResume: 'Real-time 100% ATS-verified layouts & keyword scanner'
    },
    {
      feature: 'Application Workflow',
      traditional: 'Slow, repetitive manual form filling',
      spamBots: 'Blind mass spamming harming your reputation',
      aiResume: 'Targeted velocity: Choose manual review or quota-capped auto-apply'
    },
    {
      feature: 'Job Discovery',
      traditional: 'Manual browsing across 10+ tabs',
      spamBots: 'Irrelevant, unvetted postings',
      aiResume: 'Unified matching from connected accounts & top employers'
    },
    {
      feature: 'Data Ownership & Safety',
      traditional: 'Scattered across local documents',
      spamBots: 'High privacy risks and account bans',
      aiResume: 'Bank-grade AES-256 encryption & full candidate control'
    }
  ];

  const faqs = [
    {
      question: 'How does the balance between manual control and AI assistance work?',
      answer: 'With AIResume, you are always in the driver’s seat. You input your real career achievements, role milestones, and voice. Our AI assists by suggesting high-impact action verbs, converting generic bullets into metric-driven outcomes, checking ATS readability, and formatting everything into pixel-perfect templates. You can edit, override, or rearrange every single word.'
    },
    {
      question: 'What is the difference between Manual Review Mode and Auto-Apply?',
      answer: 'Manual Review Mode is designed for candidates who prefer to personally inspect every single submission. AI finds matching jobs and drafts a tailored resume and cover letter, staging it for your 1-click review. Auto-Apply Mode lets our career agent submit matching applications directly on your behalf according to your strict filters (such as target titles, locations, minimum salary, and notice period) within your plan’s safe quota.'
    },
    {
      question: 'Will employers and Applicant Tracking Systems (ATS) accept these resumes?',
      answer: 'Yes, 100%. All AIResume templates are built from the ground up according to strict ATS industry standards (single-column hierarchies, standard section headers, clean typography, and parseable date formats). Our live ATS scanner tests your resume against recruiter parsing engines before you submit.'
    },
    {
      question: 'How do application quotas protect my candidate reputation?',
      answer: 'Blind mass spamming hurts candidate credibility and leads to portal account restrictions. AIResume enforces thoughtful rate limits (e.g. 10 applications/month on Starter, up to 50 daily automated applications on Focused) to ensure every application is tailored, high-quality, and completely relevant to your goals.'
    },
    {
      question: 'Is my personal data and resume information private?',
      answer: 'Absolutely. We do not sell your personal information or resume content to third-party data brokers. Your documents and connected job accounts are encrypted with AES-256 security, and your data is never used to train public generative AI foundation models.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#141810] text-white relative overflow-hidden flex flex-col justify-between selection:bg-lime-400 selection:text-black">
      {/* Background Ambient Glows */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1300px] h-[650px] bg-gradient-to-b from-lime-500/10 via-emerald-950/15 to-transparent rounded-full blur-[160px]" />
        <div className="absolute top-1/3 left-0 w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/3 right-0 w-[600px] h-[600px] bg-lime-600/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 flex-1">
        {/* Navigation Bar */}
        <CardNav
          logo="AIResume"
          links={navLinks}
        />

        {/* 1. HERO SECTION */}
        <section className="pt-32 sm:pt-40 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-lime-400/10 border border-lime-400/20 text-lime-400 text-xs sm:text-sm font-semibold uppercase tracking-wider mb-6">
              <Sparkles className="w-4 h-4" />
              <span>Balanced AI & Human Precision</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white max-w-5xl mx-auto leading-[1.1] mb-6">
              The Intelligent Resume Builder That Keeps You In <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 via-emerald-300 to-lime-500">Complete Control</span>
            </h1>

            {/* Subheading */}
            <p className="text-lg sm:text-xl text-white/75 max-w-3xl mx-auto leading-relaxed mb-10">
              Craft ATS-perfect resumes in minutes. A thoughtful partnership between your authentic career story and smart AI intelligence, with flexible workflows ranging from curated manual review to automated submission.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
              <Link
                href="/editor?mode=create"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-[#013f2e] hover:bg-[#025c43] text-white font-bold text-base transition-colors duration-200 hover:scale-[1.02] shadow-lg"
              >
                <span>Build Your Resume Free</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/explore"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-base transition-colors"
              >
                <span>Explore Templates</span>
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="mt-12 pt-8 border-t border-white/5 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs sm:text-sm text-white/60">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-lime-400" />
                <span>100% ATS Verified</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-lime-400" />
                <span>Live Keyword Scoring</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-lime-400" />
                <span>No Robot Hallucinations</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-lime-400" />
                <span>Instant PDF & Word Export</span>
              </div>
            </div>
          </motion.div>
        </section>

        {/* 2. THE CORE PHILOSOPHY: BALANCED CRAFTSMANSHIP */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Why Balanced AI Beats Pure Automation
            </h2>
            <p className="text-white/70 text-base sm:text-lg">
              Generic AI generators produce generic, robotic resumes that recruiters instantly discard. AIResume pairs your real-world achievements with precision AI formatting for genuine recruiter impact.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Left Box: Human Storytelling */}
            <div className="bg-[#101712]/90 border border-white/10 rounded-3xl p-8 sm:p-10 relative overflow-hidden backdrop-blur-xl">
              <div className="inline-flex p-3 rounded-2xl bg-white/5 border border-white/10 text-lime-400 mb-6">
                <UserCheck className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">1. Your Authentic Career Narrative</h3>
              <p className="text-white/70 leading-relaxed mb-6">
                No algorithm knows your triumphs, projects, and leadership moments better than you do. You control your Master CV, your career highlights, and the trajectory of your journey.
              </p>
              <ul className="space-y-3 text-sm text-white/80">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-lime-400 shrink-0" />
                  <span>Real milestones, authentic metrics, and verified experience</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-lime-400 shrink-0" />
                  <span>Interactive WYSIWYG editor with live drag-and-drop section reordering</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-lime-400 shrink-0" />
                  <span>Personal tone and storytelling tailored to your exact industry</span>
                </li>
              </ul>
            </div>

            {/* Right Box: AI Intelligence */}
            <div className="bg-[#101712]/90 border border-lime-500/20 rounded-3xl p-8 sm:p-10 relative overflow-hidden backdrop-blur-xl shadow-[0_0_40px_rgba(132,204,22,0.05)]">
              <div className="inline-flex p-3 rounded-2xl bg-lime-500/10 border border-lime-500/30 text-lime-400 mb-6">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">2. Intelligent AI Optimization</h3>
              <p className="text-white/70 leading-relaxed mb-6">
                AI analyzes target job descriptions to eliminate ATS formatting traps, inject impactful action verbs, suggest missing keywords, and quantify accomplishments.
              </p>
              <ul className="space-y-3 text-sm text-white/80">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-lime-400 shrink-0" />
                  <span>Google XYZ formula bullet points (Accomplished [X], measured by [Y], by doing [Z])</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-lime-400 shrink-0" />
                  <span>Live ATS match percentage scoring against specific role requirements</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-lime-400 shrink-0" />
                  <span>Instant tailored cover letter generation matching your resume style</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* 3. APPLICATION WORKFLOW: REVIEW VS AUTO-APPLY */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto bg-white/[0.01] border-y border-white/5">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-lime-400 text-xs font-semibold uppercase tracking-wider mb-4">
              <Zap className="w-3.5 h-3.5" />
              <span>Velocity on Your Terms</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              From Curated Review to Intelligent Auto-Apply
            </h2>
            <p className="text-white/70 text-base sm:text-lg">
              Choose the exact level of automation that fits your job search strategy. Never lose control over where your resume lands.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="bg-[#101712]/80 border border-white/10 rounded-2xl p-7 flex flex-col justify-between backdrop-blur-xl">
              <div>
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-lime-400 mb-5">
                  <Eye className="w-5 h-5" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">1. Manual Review Mode</h4>
                <p className="text-sm text-white/70 leading-relaxed">
                  Best for selective dream roles. AI discovers relevant openings and prepares customized resumes and cover letters for your personal preview and 1-click sign-off.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/5 text-xs text-lime-400 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>100% human review before dispatch</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-[#101712]/80 border border-white/10 rounded-2xl p-7 flex flex-col justify-between backdrop-blur-xl">
              <div>
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-lime-400 mb-5">
                  <Sliders className="w-5 h-5" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">2. Guardrailed Auto-Apply</h4>
                <p className="text-sm text-white/70 leading-relaxed">
                  Configure strict parameters: minimum salary (e.g. ₹18 LPA / $120k), workplace type (Remote/Hybrid), and maximum notice period. AI applies only when criteria are 100% met.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/5 text-xs text-lime-400 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Filtered by salary, location & notice period</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-[#101712]/80 border border-white/10 rounded-2xl p-7 flex flex-col justify-between backdrop-blur-xl">
              <div>
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-lime-400 mb-5">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">3. Safe Plan Entitlements</h4>
                <p className="text-sm text-white/70 leading-relaxed">
                  Strict application quotas prevent reckless spamming, protecting your candidate reputation with top hiring systems and preventing employer duplicate flags.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/5 text-xs text-lime-400 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Safe velocity protects candidate profile</span>
              </div>
            </div>
          </div>
        </section>

        {/* 4. HOW IT WORKS IN 4 SIMPLE STEPS */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              How It Works
            </h2>
            <p className="text-white/70 text-base sm:text-lg">
              From your first draft to submitted applications in four seamless steps.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s) => {
              const Icon = s.icon;
              return (
                <div 
                  key={s.step} 
                  className="bg-[#101712]/80 border border-white/10 rounded-2xl p-6 sm:p-7 flex flex-col justify-between relative backdrop-blur-xl"
                >
                  <div>
                    <span className="text-3xl font-black text-lime-400/30 mb-4 block font-mono">{s.step}</span>
                    <h4 className="text-lg font-bold text-white mb-2.5">{s.title}</h4>
                    <p className="text-xs sm:text-sm text-white/70 leading-relaxed">{s.description}</p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-white/5 flex items-center text-lime-400">
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 5. FEATURE HIGHLIGHTS GRID */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto bg-white/[0.01] border-t border-white/5">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Engineered for Modern Job Seekers
            </h2>
            <p className="text-white/70 text-base sm:text-lg">
              Everything you need to stand out in competitive job markets.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="bg-[#101712]/80 border border-white/10 rounded-2xl p-7 backdrop-blur-xl">
                  <div className="w-10 h-10 rounded-xl bg-lime-500/10 border border-lime-500/20 flex items-center justify-center text-lime-400 mb-5">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">{f.title}</h4>
                  <p className="text-sm text-white/70 leading-relaxed">{f.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* 6. COMPARISON TABLE */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              How AIResume Compares
            </h2>
            <p className="text-white/70 text-base sm:text-lg">
              See why balanced AI intelligence consistently wins more interviews.
            </p>
          </div>

          <div className="bg-[#101712]/90 border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-xs font-bold uppercase tracking-wider text-white/60">
                    <th className="py-4 px-6">Capability</th>
                    <th className="py-4 px-6 text-white/40">Traditional Builders</th>
                    <th className="py-4 px-6 text-white/40">Generic Spam Bots</th>
                    <th className="py-4 px-6 text-lime-400 bg-lime-500/10">AIResume Platform</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {comparisons.map((row, i) => (
                    <tr key={i} className="hover:bg-white/[0.01] transition-colors">
                      <td className="py-4 px-6 font-semibold text-white">{row.feature}</td>
                      <td className="py-4 px-6 text-white/60">{row.traditional}</td>
                      <td className="py-4 px-6 text-white/60">{row.spamBots}</td>
                      <td className="py-4 px-6 text-lime-300 font-medium bg-lime-500/[0.04]">{row.aiResume}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 7. FREQUENTLY ASKED QUESTIONS */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
              Frequently Asked Questions
            </h2>
            <p className="text-white/70 text-base">
              Clear answers to help you navigate resume building and job application automation.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div 
                  key={index} 
                  className="bg-[#101712]/90 border border-white/10 rounded-2xl overflow-hidden transition-all duration-200 backdrop-blur-xl"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full p-6 text-left flex items-center justify-between gap-4"
                  >
                    <span className="font-semibold text-base sm:text-lg text-white">{faq.question}</span>
                    {isOpen ? (
                      <ChevronUp className="w-5 h-5 text-lime-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-white/50 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-6 text-sm sm:text-base text-white/75 leading-relaxed border-t border-white/5 pt-4">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 8. BOTTOM CTA BANNER */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-16">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#142316] via-[#101c12] to-[#0c140e] border border-lime-500/30 p-10 sm:p-16 text-center shadow-2xl">
            <div className="absolute top-0 right-0 w-80 h-80 bg-lime-500/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="relative z-10 max-w-3xl mx-auto">
              <h3 className="text-3xl sm:text-5xl font-bold text-white mb-4">
                Ready to Accelerate Your Career?
              </h3>
              <p className="text-base sm:text-lg text-white/75 mb-8">
                Build your ATS-optimized master resume, tailor it to your dream roles, and manage your applications with complete confidence.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/editor?mode=create"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#013f2e] hover:bg-[#025c43] text-white font-bold text-base transition-colors duration-200 hover:scale-105 shadow-lg"
                >
                  <span>Get Started Free</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/explore"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-base transition-colors"
                >
                  <span>View ATS Templates</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
