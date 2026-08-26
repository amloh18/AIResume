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
  Layers
} from 'lucide-react';

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ================= COLUMN 1 (LEFT) ================= */}
          <div className="flex flex-col gap-6">
            
            {/* Tile 1: ATS Resume Engine & Code Inspector (Tall) */}
            <motion.div 
              className="group relative rounded-3xl bg-[#111317]/80 border border-white/[0.08] hover:border-white/20 p-7 flex flex-col justify-between overflow-hidden shadow-2xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(1,63,46,0.2)]"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div>
                <h3 className="text-xl font-bold text-white mb-2 tracking-tight group-hover:text-emerald-400 transition-colors">
                  ATS-Optimized Parsing
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed mb-4">
                  Engineered to parse flawlessly through Taleo, Workday, and Greenhouse with clean structured hierarchy.
                </p>
                <Link 
                  href="/studio"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-300 group-hover:text-emerald-400 transition-colors mb-6"
                >
                  Explore Studio <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              {/* Code Visual Container with Animated Scanning Laser */}
              <div className="relative mt-2 rounded-2xl bg-[#090a0d] border border-white/[0.06] p-4 font-mono text-xs overflow-hidden shadow-inner">
                {/* Active scan beam */}
                <motion.div 
                  className="absolute inset-x-0 h-10 bg-gradient-to-b from-transparent via-emerald-500/20 to-transparent pointer-events-none z-10"
                  animate={{ y: [0, 180, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                />
                
                <div className="flex items-center space-x-1.5 mb-3 opacity-60">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                  <span className="ml-2 text-[10px] text-gray-500">resume.ats.json</span>
                </div>

                <div className="space-y-1.5 text-[11px] leading-relaxed select-none">
                  <div className="text-gray-500">&#47;&#47; ATS Validation: 100% Passed</div>
                  <div><span className="text-[#36D39B]">&quot;candidate&quot;</span>: &#123;</div>
                  <div className="pl-4"><span className="text-teal-300">&quot;headline&quot;</span>: <span className="text-amber-300">&quot;Senior Full-Stack Engineer&quot;</span>,</div>
                  <div className="pl-4"><span className="text-teal-300">&quot;match_score&quot;</span>: <span className="text-[#36D39B]">98.4</span>,</div>
                  <div className="pl-4"><span className="text-teal-300">&quot;keywords&quot;</span>: [</div>
                  <div className="pl-8 text-gray-400">&quot;React&quot;, &quot;Next.js&quot;, &quot;Distributed Systems&quot;, &quot;Go&quot;</div>
                  <div className="pl-4">]</div>
                  <div>&#125;</div>
                </div>

                {/* Score pill */}
                <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[11px]">
                  <span className="text-gray-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> ATS Verified
                  </span>
                  <span className="text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                    A+ Rating
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Tile 2: LinkedIn Profile Enhancer (Molecular Connected Nodes) */}
            <motion.div 
              className="group relative rounded-3xl bg-[#111317]/80 border border-white/[0.08] hover:border-white/20 p-7 flex flex-col justify-between overflow-hidden shadow-2xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(1,63,46,0.2)]"
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
              <div className="relative h-44 rounded-2xl bg-[#090a0d] border border-white/[0.06] flex items-center justify-center overflow-hidden">
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
          <div className="flex flex-col gap-6">

            {/* Tile 3: Global Visa & Jobs Search (Glowing Search Bar) */}
            <motion.div 
              className="group relative rounded-3xl bg-[#111317]/80 border border-white/[0.08] hover:border-white/20 p-7 flex flex-col justify-between overflow-hidden shadow-2xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(1,63,46,0.2)]"
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
              className="relative rounded-3xl overflow-hidden p-8 flex flex-col items-center justify-center text-center shadow-2xl border border-white/10 bg-gradient-to-br from-[#121a24] via-[#0d1318] to-[#09110d] group transition-all duration-300"
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

            {/* Tile 5: Career Audit & Scorecards (Tokens & Swatches) */}
            <motion.div 
              className="group relative rounded-3xl bg-[#111317]/80 border border-white/[0.08] hover:border-white/20 p-7 flex flex-col justify-between overflow-hidden shadow-2xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(1,63,46,0.2)]"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.25 }}
            >
              <div>
                <h3 className="text-xl font-bold text-white mb-2 tracking-tight group-hover:text-emerald-400 transition-colors">
                  Diagnostic Audits
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed mb-4">
                  Fix resume bottlenecks with deep structural scoring across impact, conciseness, and metrics.
                </p>
                <Link 
                  href="/ai-career-report"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-300 group-hover:text-emerald-400 transition-colors mb-6"
                >
                  Get Audit <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-[#090a0d] border border-white/[0.06] flex flex-col items-center justify-center text-center group-hover:border-emerald-500/30 transition-colors">
                  <span className="text-sm font-black text-emerald-400">98%</span>
                  <span className="text-[10px] text-gray-400 mt-0.5">ATS Match</span>
                </div>
                <div className="p-3 rounded-xl bg-[#090a0d] border border-white/[0.06] flex flex-col items-center justify-center text-center group-hover:border-teal-500/30 transition-colors">
                  <span className="text-sm font-black text-teal-300">STAR</span>
                  <span className="text-[10px] text-gray-400 mt-0.5">Method</span>
                </div>
                <div className="p-3 rounded-xl bg-[#090a0d] border border-white/[0.06] flex flex-col items-center justify-center text-center group-hover:border-blue-500/30 transition-colors">
                  <span className="text-sm font-black text-blue-400">0</span>
                  <span className="text-[10px] text-gray-400 mt-0.5">Red Flags</span>
                </div>
                <div className="p-3 rounded-xl bg-[#090a0d] border border-white/[0.06] flex flex-col items-center justify-center text-center group-hover:border-amber-500/30 transition-colors">
                  <span className="text-sm font-black text-amber-400">Top 5%</span>
                  <span className="text-[10px] text-gray-400 mt-0.5">Ranking</span>
                </div>
              </div>
            </motion.div>

          </div>

          {/* ================= COLUMN 3 (RIGHT) ================= */}
          <div className="flex flex-col gap-6">

            {/* Tile 6: Universal Ecosystem & Extension (Concentric Orbiting Hub) */}
            <motion.div 
              className="group relative rounded-3xl bg-[#111317]/80 border border-white/[0.08] hover:border-white/20 p-7 flex flex-col justify-between overflow-hidden shadow-2xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(1,63,46,0.2)]"
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
              className="group relative rounded-3xl bg-[#111317]/80 border border-white/[0.08] hover:border-white/20 p-7 flex flex-col justify-between overflow-hidden shadow-2xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(1,63,46,0.2)]"
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
                  href="/studio"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-300 group-hover:text-emerald-400 transition-colors mb-6"
                >
                  Open Studio <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              <div className="relative rounded-2xl bg-[#090a0d] border border-white/[0.06] p-3.5 flex flex-col gap-2 overflow-hidden shadow-inner">
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
      </div>
    </section>
  );
}
