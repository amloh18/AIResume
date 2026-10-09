'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Bot, 
  Check, 
  CheckCircle2, 
  Send, 
  FileText, 
  ArrowRight, 
  Zap, 
  Palette, 
  Layout 
} from 'lucide-react';
import Link from 'next/link';

interface EditorMoriDeckProps {
  className?: string;
}

const CHAT_SEQUENCE = [
  {
    userPrompt: 'Rewrite this bullet point to highlight leadership & quantifiable metrics for a Staff role.',
    moriResponse: 'Updated with STAR metrics: Led team of 8 engineers migrating services to Next.js, reducing latency by 42% across 3.5M daily active users.',
    appliedBullet: '• Led cross-functional team of 8 engineers migrating services to Next.js, reducing p99 latency by 42% across 3.5M daily active users.',
    targetSection: 'Work Experience',
    statIncrease: '+14% ATS Match',
  },
  {
    userPrompt: 'Inject missing ATS keywords from the target job description into my technical skills.',
    moriResponse: 'Injected 5 high-priority keywords: Distributed Systems, GraphQL Federation, Kubernetes, CI/CD Pipelines, and Go.',
    appliedBullet: '• Architected distributed systems with GraphQL Federation & Kubernetes, achieving 99.99% availability.',
    targetSection: 'Skills & Architecture',
    statIncrease: '+22% Keyword Density',
  },
  {
    userPrompt: 'Tailor my executive summary for Stripe’s Principal Platform role.',
    moriResponse: 'Tailored summary with payment infrastructure focus, high-throughput scaling, and fintech reliability standards.',
    appliedBullet: '• Principal Platform Engineer with 10+ yrs driving resilient financial infrastructure processing $100M+ volume.',
    targetSection: 'Professional Summary',
    statIncrease: '99% Role Alignment',
  },
];

const PROMPT_CHIPS = [
  '✨ Optimize my CV',
  '🎯 Tailor CV to JD',
  '🚀 Enhance STAR Bullet Points',
  '🛠️ Inject Missing ATS Keywords',
];

export const EditorMoriDeck: React.FC<EditorMoriDeckProps> = ({ className = '' }) => {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isApplying, setIsApplying] = useState(false);
  const [activeChip, setActiveChip] = useState(0);

  // Auto-cycle through the Mori assistant conversation steps
  useEffect(() => {
    const timer = setInterval(() => {
      setIsApplying(true);
      setTimeout(() => {
        setIsApplying(false);
        setActiveStepIndex((prev) => (prev + 1) % CHAT_SEQUENCE.length);
        setActiveChip((prev) => (prev + 1) % PROMPT_CHIPS.length);
      }, 700);
    }, 6000);

    return () => clearInterval(timer);
  }, []);

  const currentChat = CHAT_SEQUENCE[activeStepIndex];

  return (
    <div
      className={`rounded-3xl bg-[#111317]/80 border border-white/[0.08] hover:border-white/20 p-6 sm:p-8 lg:p-10 shadow-2xl backdrop-blur-md overflow-hidden relative transition-all duration-300 hover:shadow-[0_0_40px_rgba(1,63,46,0.25)] ${className}`}
    >
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#36D39B]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-80 h-80 bg-teal-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="flex flex-col lg:flex-row items-center justify-between gap-10 relative z-10">
        
        {/* ================= LEFT SIDE: COPY & CAPABILITIES ================= */}
        <div className="flex-1 w-full text-left">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Native In-Editor AI
            </span>
            <span className="text-xs text-gray-400 font-mono hidden sm:inline-block">
              Step 3 Studio
            </span>
          </div>

          <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#F5F7F7] tracking-tight mb-4 leading-tight">
            AI built in the Editor to get the{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#36D39B] via-[#4DDCB0] to-[#86E8D1]">
              perfect CV
            </span>
          </h3>

          <p className="text-sm sm:text-base text-gray-300 leading-relaxed mb-6 max-w-xl">
            Chat directly with Mori inside the Step 3 CV canvas. Rewrite bullet points with STAR metrics, fine-tune ATS keyword density, and apply targeted AI suggestions with a single click.
          </p>

          {/* Quick-Prompt Interactive Chips */}
          <div className="flex flex-wrap gap-2 mb-6">
            {PROMPT_CHIPS.map((chip, idx) => (
              <button
                key={chip}
                type="button"
                onClick={() => {
                  setActiveChip(idx);
                  setActiveStepIndex(idx % CHAT_SEQUENCE.length);
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
                  activeChip === idx
                    ? 'bg-[#013f2e] border-emerald-400/50 text-white shadow-[0_0_15px_rgba(1,63,46,0.4)]'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                }`}
              >
                <span>{chip}</span>
              </button>
            ))}
          </div>

          {/* Key Feature Benefits */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-white/[0.08] mb-6">
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Target any section or bullet point</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Floating in-editor Mori chat dock</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>100% Truthful — verified evidence only</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Instant ATS keyword injection</span>
            </div>
          </div>

          <Link
            href="/templates"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 text-gray-950 font-bold text-xs hover:brightness-110 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95"
          >
            Try In-Editor Mori Chat <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* ================= RIGHT SIDE: STEP 3 CANVAS WITH FLOATING MORI AI CHAT ================= */}
        <div className="w-full lg:w-[540px] xl:w-[580px] shrink-0">
          <div className="rounded-2xl bg-[#0b0d13] border border-white/[0.14] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] overflow-hidden relative flex flex-col">
            
            {/* Step 3 Studio Header Bar */}
            <div className="px-3.5 py-2 bg-[#12151e] border-b border-white/[0.08] flex items-center justify-between">
              {/* Window Controls & Tabs */}
              <div className="flex items-center gap-3">
                <div className="flex items-center space-x-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                </div>
                
                {/* Document switch tabs (CV ⇄ Cover Letter) */}
                <div className="flex items-center gap-1 pl-2">
                  <div className="px-2.5 py-1 rounded-md bg-[#191d29] border border-white/10 text-[10px] text-white font-medium flex items-center gap-1.5 shadow-xs">
                    <FileText className="w-3 h-3 text-emerald-400" />
                    <span>Alex_Morgan_CV.pdf</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="px-2 py-1 rounded-md text-[10px] text-gray-400 hover:text-gray-300 hidden sm:flex items-center gap-1">
                    <span>Cover_Letter.pdf</span>
                  </div>
                </div>
              </div>

              {/* Header Right: ATS Score & Status */}
              <div className="flex items-center gap-2">
                <div className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5" /> 98% ATS
                </div>
                <span className="text-[10px] text-gray-400 font-mono hidden sm:inline-block">Auto-Saved</span>
              </div>
            </div>

            {/* Step 3 Secondary Status Bar */}
            <div className="px-3 py-1.5 bg-[#0e1118] border-b border-white/[0.06] flex items-center justify-between text-[10px] text-gray-400">
              <div className="flex items-center gap-2 font-mono">
                <span className="text-gray-300 font-semibold">Step 3: CV Canvas</span>
                <span className="text-gray-600">•</span>
                <span className="text-emerald-400">Template: Modern Tech</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-400">Zoom: 100%</span>
                <span className="text-gray-500">|</span>
                <span className="text-gray-400 flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-400" /> All Edits Synced
                </span>
              </div>
            </div>

            {/* Studio Body: Canvas Sheet + Utility Rail + Floating Mori Chat */}
            <div className="relative bg-[#080a0f] flex min-h-[390px] sm:min-h-[420px]">
              
              {/* Center Canvas Area with Resume Sheet */}
              <div className="flex-1 p-3 sm:p-4 overflow-hidden relative flex justify-center">
                
                {/* Realistic White CV Document Sheet */}
                <div className="w-full max-w-[480px] bg-[#ffffff] text-gray-900 rounded-md shadow-2xl p-4 sm:p-5 text-[9.5px] sm:text-[10px] leading-relaxed relative select-none">
                  
                  {/* CV Header */}
                  <div className="border-b border-gray-200 pb-2 mb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm sm:text-base font-extrabold text-gray-950 tracking-tight leading-none mb-0.5">
                          Alex Morgan
                        </h4>
                        <div className="text-[9px] font-semibold text-emerald-700">
                          Staff Platform Engineer • Distributed Systems
                        </div>
                      </div>
                      <div className="text-[8px] text-gray-500 text-right font-mono leading-tight">
                        London, UK<br />
                        alex.morgan@email.com
                      </div>
                    </div>
                  </div>

                  {/* Professional Summary */}
                  <div className="mb-2">
                    <div className="text-[8px] font-black uppercase tracking-wider text-gray-500 mb-0.5">
                      Professional Summary
                    </div>
                    <p className="text-[9px] text-gray-700 leading-tight">
                      Platform architect with 10+ years engineering high-concurrency microservices, Next.js runtimes, and distributed payment systems.
                    </p>
                  </div>

                  {/* Work Experience */}
                  <div className="mb-2">
                    <div className="text-[8px] font-black uppercase tracking-wider text-gray-500 mb-1">
                      Professional Experience
                    </div>

                    <div className="mb-1">
                      <div className="flex items-center justify-between text-[9px] font-bold text-gray-900">
                        <span>Lead Platform Engineer • Stripe</span>
                        <span className="text-[8px] font-mono text-gray-500">2022 – Present</span>
                      </div>
                      <div className="text-[8.5px] text-gray-600 mt-0.5 space-y-1">
                        <p>• Scaled event-driven microservices architecture handling 15,000+ RPS with 99.999% SLA.</p>
                        
                        {/* Target Bullet: Actively highlighted with Mori focus ring */}
                        <div className={`p-1.5 rounded transition-all duration-300 relative ${
                          isApplying
                            ? 'bg-emerald-100/90 border border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                            : 'bg-emerald-50/70 border border-emerald-400 shadow-[0_0_0_1.5px_rgba(16,185,129,0.35)]'
                        }`}>
                          <div className="flex items-center justify-between text-[7.5px] text-emerald-800 font-bold mb-0.5">
                            <span className="flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                              Mori Focused Target ({currentChat.targetSection})
                            </span>
                            <span className="font-mono text-emerald-700">{currentChat.statIncrease}</span>
                          </div>
                          <AnimatePresence mode="wait">
                            <motion.p
                              key={currentChat.appliedBullet}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.25 }}
                              className="text-gray-900 font-medium leading-snug"
                            >
                              {currentChat.appliedBullet}
                            </motion.p>
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Technical Skills with injected keywords */}
                  <div>
                    <div className="text-[8px] font-black uppercase tracking-wider text-gray-500 mb-0.5">
                      Core Competencies &amp; ATS Keywords
                    </div>
                    <div className="flex flex-wrap gap-1 text-[8px]">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-semibold">Distributed Systems</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-semibold">Next.js &amp; Go</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-semibold">Kubernetes</span>
                      <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-800">GraphQL Federation</span>
                      <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-800">CI/CD Pipelines</span>
                    </div>
                  </div>

                </div>

              </div>

              {/* Step 3 Utility Panel Rail (Right side strip) */}
              <div className="w-8 sm:w-9 shrink-0 border-l border-white/[0.08] bg-[#0c0f16] flex flex-col items-center py-3 gap-3 text-gray-400 z-10">
                <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-xs" title="CV Document">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <div className="w-6 h-6 rounded-md hover:bg-white/5 flex items-center justify-center text-gray-500 hover:text-gray-300" title="AI Assistant">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="w-6 h-6 rounded-md hover:bg-white/5 flex items-center justify-center text-gray-500 hover:text-gray-300" title="Design & Typography">
                  <Palette className="w-3.5 h-3.5" />
                </div>
                <div className="w-6 h-6 rounded-md hover:bg-white/5 flex items-center justify-center text-gray-500 hover:text-gray-300" title="Template Switcher">
                  <Layout className="w-3.5 h-3.5" />
                </div>
                <div className="w-6 h-6 rounded-md hover:bg-white/5 flex items-center justify-center text-gray-500 hover:text-gray-300" title="ATS Scoring">
                  <Zap className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* ================= FLOATING MORI AI CHAT (Step 3 Floating Overlay) ================= */}
              <div className="absolute bottom-2.5 right-10 sm:right-11 w-[270px] sm:w-[315px] z-20">
                <div className="rounded-xl border border-emerald-500/40 bg-[#0e121a]/95 backdrop-blur-xl shadow-[0_20px_45px_rgba(0,0,0,0.7)] p-3 text-white flex flex-col gap-2">
                  
                  {/* Floating Dock Header */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.08]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-sm">
                        <Bot className="w-3 h-3 text-white" />
                      </div>
                      <div className="text-[11px] font-bold text-white flex items-center gap-1">
                        Mori AI Assistant
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <span className="text-[8px] font-mono uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1 py-0.2 rounded">
                        Step 3 Floating
                      </span>
                    </div>
                  </div>

                  {/* Chat Conversation Thread */}
                  <div className="space-y-1.5 max-h-[140px] overflow-hidden">
                    {/* User Prompt */}
                    <div className="flex justify-end">
                      <div className="max-w-[90%] rounded-xl rounded-tr-xs bg-emerald-600/25 border border-emerald-500/30 px-2.5 py-1 text-[10px] text-emerald-100 leading-snug">
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={currentChat.userPrompt}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.2 }}
                          >
                            {currentChat.userPrompt}
                          </motion.span>
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Mori Response */}
                    <div className="flex justify-start items-start gap-1">
                      <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="w-2 h-2" />
                      </div>
                      <div className="max-w-[90%] rounded-xl rounded-tl-xs bg-[#161a24] border border-white/10 px-2.5 py-1 text-[10px] text-gray-200 leading-snug shadow-sm">
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={currentChat.moriResponse}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.25 }}
                          >
                            {currentChat.moriResponse}
                          </motion.span>
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  {/* Apply Status Bar */}
                  <div className="flex items-center justify-between pt-1 border-t border-white/[0.06] text-[9px]">
                    <div className="flex items-center gap-1 text-emerald-400 font-medium">
                      <Check className="w-2.5 h-2.5" />
                      <span>{isApplying ? 'Applying to Canvas...' : 'Applied to CV Canvas'}</span>
                    </div>
                    <span className="text-gray-400 font-mono text-[8.5px]">Auto-Targeted</span>
                  </div>

                  {/* Prompt Composer Bar */}
                  <div className="flex items-center gap-1.5 bg-[#080a0f] border border-white/10 rounded-md px-2 py-1 text-[9.5px]">
                    <span className="text-gray-400 flex-1 truncate">
                      Ask Mori to rewrite or optimize...
                    </span>
                    <div className="w-4 h-4 rounded bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Send className="w-2 h-2" />
                    </div>
                  </div>

                </div>
              </div>

            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default EditorMoriDeck;
