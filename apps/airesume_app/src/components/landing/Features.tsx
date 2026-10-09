'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { 
  ArrowRight, 
  Search, 
  Sparkles, 
  CheckCircle2, 
  Mic, 
  Sliders, 
  Bot,
  Layers,
  FileText,
  Check
} from 'lucide-react';
import EditorMoriDeck from '@/components/landing/EditorMoriDeck';

export default function Features() {
  const [typedText, setTypedText] = useState('');
  const fullText = 'Visa Sponsored • Senior Full-Stack';

  // Typing animation for search bar tile
  useEffect(() => {
    let index = 0;
    let isDeleting = false;
    const interval = setInterval(() => {
      if (!isDeleting) {
        setTypedText(fullText.slice(0, index + 1));
        index++;
        if (index === fullText.length) {
          setTimeout(() => { isDeleting = true; }, 1800);
        }
      } else {
        setTypedText(fullText.slice(0, index - 1));
        index--;
        if (index === 0) {
          isDeleting = false;
        }
      }
    }, 90);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="features" className="relative pt-28 pb-32 bg-[#0a0a0c] overflow-hidden">
      {/* Background Ambient Glows */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 60% 40% at 20% 15%, rgba(1, 63, 46, 0.25) 0%, transparent 65%),
            radial-gradient(ellipse 60% 50% at 80% 50%, rgba(20, 184, 166, 0.08) 0%, transparent 65%),
            radial-gradient(ellipse 70% 50% at 50% 85%, rgba(1, 63, 46, 0.2) 0%, transparent 65%),
            linear-gradient(180deg, #0e1013 0%, #0a0a0c 50%, #060708 100%)
          `
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 tablet:px-6 desktop:px-8">
        
        {/* Global Heading System: Left-Indented, Bold Modern Editorial Scale */}
        <motion.div 
          className="mb-16 lg:mb-20 pl-0 text-left flex flex-col items-start"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Decorative Squiggle */}
          <div className="mb-6 flex justify-start">
            <svg width="48" height="24" viewBox="0 0 48 24" fill="none" className="text-[#36D39B]">
              <path
                d="M2 12C8 4 12 20 18 12C24 4 28 20 34 12C40 4 46 12 46 12"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <h2 className="tablet:!text-[2.5rem] desktop:!text-[3rem] font-extrabold text-[#F5F7F7] tracking-tighter max-w-5xl mb-6 text-left text-4xl! tracking-normal!">
            Everyday <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#36D39B] via-[#4DDCB0] to-[#86E8D1]">superpowers</span>.
          </h2>

          <p className="text-lg sm:text-xl lg:text-2xl text-gray-300 font-normal max-w-3xl leading-relaxed text-left">
            Light enough for daily applications but powerful enough for landing your dream job.
          </p>
        </motion.div>

        {/* 3-Column Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">

          {/* ================= COLUMN 1 (LEFT) ================= */}
          <div className="flex flex-col gap-6 h-full">
            
            {/* Tile 1: 1-Click Tailored Docs (Tall) */}
            <motion.div 
              className="group relative rounded-3xl bg-[#111317]/80 border border-white/[0.08] hover:border-white/20 p-7 flex flex-col justify-between overflow-hidden shadow-2xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(1,63,46,0.2)] flex-1"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                  <Sparkles className="w-3 h-3" /> 1-Click Generation
                </div>
                <h3 className="text-xl font-bold text-white mb-2 tracking-tight group-hover:text-emerald-400 transition-colors">
                  1-Click Tailored Docs
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed mb-4">
                  Your CV and cover letter are automatically generated and tailored to any job in just 1 click with verified factual evidence.
                </p>
                <Link 
                  href="/templates"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-300 group-hover:text-emerald-400 transition-colors mb-6"
                >
                  Generate Tailored Docs <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              {/* Dual Document Visual with 1-Click Generation Animation */}
              <div className="relative mt-2 rounded-2xl bg-[#090a0d] border border-white/[0.06] p-3.5 font-sans text-xs overflow-hidden shadow-inner">
                {/* Active scan beam */}
                <motion.div 
                  className="absolute inset-x-0 h-10 bg-gradient-to-b from-transparent via-emerald-500/20 to-transparent pointer-events-none z-10"
                  animate={{ y: [0, 190, 0] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                />

                <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-white/5">
                  <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Target: Senior Software Engineer
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-400">
                    ⚡ 1-Click Ready
                  </span>
                </div>

                {/* Dual Document Cards */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Card 1: Tailored CV */}
                  <div className="rounded-xl bg-[#12161f] border border-white/10 p-2.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-white flex items-center gap-1">
                          <FileText className="w-3 h-3 text-emerald-400" /> Tailored CV
                        </span>
                        <span className="text-[9px] text-emerald-400 font-mono font-bold">98% ATS</span>
                      </div>
                      <div className="space-y-1 text-[9px] text-gray-400">
                        <div className="h-1.5 bg-white/10 rounded w-3/4" />
                        <div className="h-1 bg-emerald-500/30 rounded w-full" />
                        <div className="h-1 bg-white/5 rounded w-5/6" />
                      </div>
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between text-[9px]">
                      <span className="text-emerald-400 font-semibold">14 Keywords</span>
                      <span className="text-gray-400">PDF • DOCX</span>
                    </div>
                  </div>

                  {/* Card 2: Matching Cover Letter */}
                  <div className="rounded-xl bg-[#12161f] border border-white/10 p-2.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-white flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-teal-400" /> Cover Letter
                        </span>
                        <span className="text-[9px] text-teal-300 font-mono font-bold">Matched</span>
                      </div>
                      <div className="space-y-1 text-[9px] text-gray-400">
                        <div className="h-1.5 bg-white/10 rounded w-2/3" />
                        <div className="h-1 bg-teal-500/30 rounded w-full" />
                        <div className="h-1 bg-white/5 rounded w-4/5" />
                      </div>
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between text-[9px]">
                      <span className="text-teal-300 font-semibold">Custom Hook</span>
                      <span className="text-gray-400">Ready</span>
                    </div>
                  </div>
                </div>

                {/* Status footer */}
                <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px]">
                  <span className="text-gray-300 flex items-center gap-1 text-[10px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    CV + Cover Letter Synced
                  </span>
                  <span className="text-emerald-400 font-mono text-[10px]">
                    Generated in 1.8s
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Tile 2: LinkedIn Profile Enhancer (Molecular Connected Nodes) */}
            <motion.div 
              className="group relative rounded-3xl bg-[#111317]/80 border border-white/[0.08] hover:border-white/20 p-7 flex flex-col justify-between overflow-hidden shadow-2xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(1,63,46,0.2)] flex-1"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div>
                <h3 className="text-xl font-bold text-white mb-2 tracking-tight group-hover:text-emerald-400 transition-colors">
                  LinkedIn Enhancer
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed mb-4">
                  Transform profile bullet points into punchy narratives that 5x recruiter inbound interest.
                </p>
                <Link 
                  href="/linkedin-enhancer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-300 group-hover:text-emerald-400 transition-colors mb-6"
                >
                  Enhance Profile <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              {/* Glowing Connected Nodes Visual */}
              <div className="relative mt-auto h-44 rounded-2xl bg-[#090a0d] border border-white/[0.06] flex items-center justify-center overflow-hidden">
                <div className="absolute w-32 h-32 bg-blue-600/15 rounded-full blur-2xl" />
                
                <div className="relative flex items-center justify-center w-full px-6">
                  {/* Left Node */}
                  <motion.div 
                    className="w-12 h-12 rounded-full bg-[#121824] border border-blue-500/30 flex items-center justify-center shadow-lg text-blue-400 font-black text-sm z-10"
                    animate={{ scale: [1, 1.06, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    in
                  </motion.div>

                  {/* Connecting Gradient Line */}
                  <div className="flex-1 h-1.5 bg-gradient-to-r from-blue-500/40 via-emerald-400 to-teal-400/40 relative mx-2 rounded-full overflow-hidden">
                    <motion.div 
                      className="absolute inset-y-0 w-8 bg-white rounded-full blur-[2px]"
                      animate={{ x: [-20, 140, -20] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </div>

                  {/* Right Glowing Hub */}
                  <motion.div 
                    className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 flex flex-col items-center justify-center shadow-[0_0_25px_rgba(20,184,166,0.5)] z-10 text-white font-extrabold"
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  >
                    <span className="text-xs">5x</span>
                    <span className="text-[8px] font-medium tracking-tighter uppercase opacity-90">Reach</span>
                  </motion.div>
                </div>

                <div className="absolute bottom-2 left-4 text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-gray-300">
                  SEO Keywords: Active
                </div>
              </div>
            </motion.div>

          </div>

          {/* ================= COLUMN 2 (CENTER) ================= */}
          <div className="flex flex-col gap-6 h-full justify-between">

            {/* Tile 3: Global Visa & Jobs Search (Glowing Search Bar) */}
            <motion.div 
              className="group relative rounded-3xl bg-[#111317]/80 border border-white/[0.08] hover:border-white/20 p-7 flex flex-col justify-between overflow-hidden shadow-2xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(1,63,46,0.2)] flex-1"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div>
                <h3 className="text-xl font-bold text-white mb-2 tracking-tight group-hover:text-emerald-400 transition-colors">
                  Visa & Global Jobs
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed mb-4">
                  Access verified visa-sponsored roles across the UK, USA, and Europe from government sponsor lists.
                </p>
                <Link 
                  href="/dashboard/jobs"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-300 group-hover:text-emerald-400 transition-colors mb-6"
                >
                  Explore Jobs <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              {/* Glowing Search Bar UI */}
              <div className="relative rounded-2xl bg-[#090a0d] border border-white/[0.06] p-5 flex flex-col justify-center">
                <div className="relative flex items-center bg-[#13161c] border border-emerald-500/30 rounded-full px-4 py-3 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                  <Search className="w-4 h-4 text-emerald-400 shrink-0 mr-3" />
                  <span className="text-xs text-white font-medium flex-1 truncate">
                    {typedText}
                    <span className="inline-block w-1.5 h-3.5 bg-emerald-400 ml-0.5 animate-pulse" />
                  </span>
                  <div className="flex items-center gap-2 text-gray-400 ml-2">
                    <Mic className="w-3.5 h-3.5 hover:text-white transition-colors cursor-pointer" />
                    <Sliders className="w-3.5 h-3.5 hover:text-white transition-colors cursor-pointer" />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-3 justify-center">
                  <span className="text-[10px] bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 px-2.5 py-0.5 rounded-full font-medium">
                    ✓ UK Tier 2
                  </span>
                  <span className="text-[10px] bg-white/5 border border-white/10 text-gray-300 px-2.5 py-0.5 rounded-full font-medium">
                    ✓ US H-1B
                  </span>
                  <span className="text-[10px] bg-white/5 border border-white/10 text-gray-300 px-2.5 py-0.5 rounded-full font-medium">
                    ✓ Relocation
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Tile 4: Center Spotlight Glass Banner ("Everything in One Place") */}
            <motion.div 
              className="relative rounded-3xl overflow-hidden p-8 flex flex-col items-center justify-center text-center shadow-2xl border border-white/10 bg-gradient-to-br from-[#121a24] via-[#0d1318] to-[#09110d] group transition-all duration-300 flex-shrink-0"
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent pointer-events-none"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              />

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-4">
                <Sparkles className="w-3.5 h-3.5" /> All-In-One Platform
              </div>

              <h4 className="text-2xl tablet:text-3xl font-extrabold text-[#F5F7F7] tracking-tight mb-2">
                Everything in One Place
              </h4>
              <p className="text-xs tablet:text-sm text-gray-400 max-w-xs leading-relaxed">
                From AI resume drafting and LinkedIn audits to global applications and interview simulation.
              </p>
            </motion.div>

            {/* Tile 5: Automated Jobs Apply (Live Application Worker Queue) */}
            <motion.div 
              className="group relative rounded-3xl bg-[#111317]/80 border border-white/[0.08] hover:border-white/20 p-7 flex flex-col justify-between overflow-hidden shadow-2xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(1,63,46,0.2)] flex-1"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.25 }}
            >
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                  <Bot className="w-3 h-3" /> Auto-Apply Worker
                </div>
                <h3 className="text-xl font-bold text-white mb-2 tracking-tight group-hover:text-emerald-400 transition-colors">
                  Automated Jobs Apply
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed mb-4">
                  Put applications on autopilot. Our deterministic engine fills ATS fields, attaches tailored docs, and tracks submissions with zero manual hassle.
                </p>
                <Link 
                  href="/dashboard/jobs"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-300 group-hover:text-emerald-400 transition-colors mb-6"
                >
                  Explore Automation <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              {/* Animated Application Worker Queue Visual */}
              <div className="mt-auto rounded-2xl bg-[#090a0d] border border-white/[0.06] p-3 flex flex-col gap-2 overflow-hidden shadow-inner">
                <div className="flex items-center justify-between pb-2 border-b border-white/5 text-[10px]">
                  <span className="flex items-center gap-1.5 font-medium text-white">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Auto-Apply Queue
                  </span>
                  <span className="text-[9px] bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 px-1.5 py-0.5 rounded font-mono">
                    3 Active Dispatches
                  </span>
                </div>

                <div className="space-y-1.5">
                  {/* Job Item 1 - Submitted */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#13161c] border border-white/5 text-gray-300 text-[11px]">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-5 h-5 rounded-md bg-[#1d222e] border border-white/10 flex items-center justify-center text-[9px] font-bold text-emerald-400 shrink-0">
                        S
                      </div>
                      <div className="min-w-0 truncate">
                        <div className="font-semibold text-white truncate text-[11px]">Stripe • Staff Frontend</div>
                        <div className="text-[9px] text-gray-400">Greenhouse ATS</div>
                      </div>
                    </div>
                    <span className="shrink-0 text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Check className="w-2.5 h-2.5" /> Submitted
                    </span>
                  </div>

                  {/* Job Item 2 - In Progress with animated fill */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#13161c] border border-emerald-500/30 text-gray-300 text-[11px] relative overflow-hidden">
                    <motion.div 
                      className="absolute inset-y-0 left-0 bg-emerald-500/10 pointer-events-none"
                      animate={{ width: ['20%', '85%', '20%'] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <div className="flex items-center gap-2 min-w-0 relative z-10">
                      <div className="w-5 h-5 rounded-md bg-[#1d222e] border border-white/10 flex items-center justify-center text-[9px] font-bold text-teal-300 shrink-0">
                        A
                      </div>
                      <div className="min-w-0 truncate">
                        <div className="font-semibold text-white truncate text-[11px]">Airbnb • Full-Stack Lead</div>
                        <div className="text-[9px] text-gray-400">Auto-filling form fields...</div>
                      </div>
                    </div>
                    <span className="shrink-0 text-[9px] font-semibold text-teal-300 bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 rounded-full relative z-10 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-300 animate-ping" />
                      Applying
                    </span>
                  </div>

                  {/* Job Item 3 - Queued */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#13161c] border border-white/5 text-gray-300 text-[11px]">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-5 h-5 rounded-md bg-[#1d222e] border border-white/10 flex items-center justify-center text-[9px] font-bold text-gray-400 shrink-0">
                        L
                      </div>
                      <div className="min-w-0 truncate">
                        <div className="font-semibold text-gray-300 truncate text-[11px]">Linear • Product Engineer</div>
                        <div className="text-[9px] text-gray-400">Lever ATS</div>
                      </div>
                    </div>
                    <span className="shrink-0 text-[9px] text-gray-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                      Queued
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

          </div>

          {/* ================= COLUMN 3 (RIGHT) ================= */}
          <div className="flex flex-col gap-6 h-full justify-between">

            {/* Tile 6: Universal Ecosystem & Extension (Concentric Orbiting Hub) */}
            <motion.div 
              className="group relative rounded-3xl bg-[#111317]/80 border border-white/[0.08] hover:border-white/20 p-7 flex flex-col justify-between overflow-hidden shadow-2xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(1,63,46,0.2)] flex-1"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15 }}
            >
              <div>
                <h3 className="text-xl font-bold text-white mb-2 tracking-tight group-hover:text-emerald-400 transition-colors">
                  Universal Integrations
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed mb-4">
                  Connect seamlessly with LinkedIn, Indeed, Greenhouse, Ashby, and 100+ platforms in 1-click.
                </p>
                <a 
                  href="https://chromewebstore.google.com/detail/fphkljfgefkfemmlfbpnjdojnfeadaii"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-300 group-hover:text-emerald-400 transition-colors mb-6"
                >
                  Download Extension <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>

              <div className="relative h-48 rounded-2xl bg-[#090a0d] border border-white/[0.06] flex items-center justify-center overflow-hidden">
                <div className="relative z-20 w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-[0_0_25px_rgba(20,184,166,0.6)]">
                  <Bot className="w-6 h-6 text-white" />
                </div>

                <motion.div 
                  className="absolute w-28 h-28 rounded-full border border-white/[0.1] border-dashed"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                >
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#131722] border border-blue-500/40 flex items-center justify-center text-[9px] font-bold text-blue-400 shadow">
                    in
                  </div>
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#131722] border border-indigo-500/40 flex items-center justify-center text-[9px] font-bold text-indigo-400 shadow">
                    GH
                  </div>
                </motion.div>

                <motion.div 
                  className="absolute w-40 h-40 rounded-full border border-white/[0.06]"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
                >
                  <div className="absolute top-1/2 -left-3 -translate-y-1/2 w-6 h-6 rounded-full bg-[#131722] border border-emerald-500/40 flex items-center justify-center text-[8px] font-bold text-emerald-400 shadow">
                    Ash
                  </div>
                  <div className="absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 rounded-full bg-[#131722] border border-amber-500/40 flex items-center justify-center text-[8px] font-bold text-amber-400 shadow">
                    Ind
                  </div>
                </motion.div>
              </div>
            </motion.div>

            {/* Tile 7: AI Resume Studio & Editor (Workspace Canvas Preview) */}
            <motion.div 
              className="group relative rounded-3xl bg-[#111317]/80 border border-white/[0.08] hover:border-white/20 p-7 flex flex-col justify-between overflow-hidden shadow-2xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(1,63,46,0.2)] flex-1"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div>
                <h3 className="text-xl font-bold text-white mb-2 tracking-tight group-hover:text-emerald-400 transition-colors">
                  AI Resume Studio
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed mb-4">
                  Real-time interactive canvas with smart section reordering, modular typography, and instant PDF exports.
                </p>
                <Link 
                  href="/templates"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-300 group-hover:text-emerald-400 transition-colors mb-6"
                >
                  Open Studio <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              <div className="relative mt-auto rounded-2xl bg-[#090a0d] border border-white/[0.06] p-3.5 flex flex-col gap-2 overflow-hidden shadow-inner">
                <div className="flex items-center justify-between pb-2 border-b border-white/5 text-[10px] text-gray-400">
                  <span className="flex items-center gap-1 font-medium text-white">
                    <Layers className="w-3 h-3 text-emerald-400" /> Sections &amp; Layers
                  </span>
                  <span className="text-[9px] bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 px-1.5 py-0.5 rounded">
                    Auto-Save
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#13161c] border border-white/5 text-gray-300">
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Professional Summary
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">140 words</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#13161c] border border-white/5 text-gray-300">
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400" /> Work Experience
                    </span>
                    <span className="text-[10px] text-emerald-400 font-semibold">4 Roles</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#13161c] border border-white/5 text-gray-300">
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Skills &amp; Competencies
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">18 Tags</span>
                  </div>
                </div>
              </div>
            </motion.div>

          </div>

        </div>

        {/* Native In-Editor Mori AI Assistant Deck (Step 3 Mockup Animation) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-12 lg:mt-16"
        >
          <EditorMoriDeck />
        </motion.div>
      </div>
    </section>
  );
}
