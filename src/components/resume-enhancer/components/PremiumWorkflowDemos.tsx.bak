'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Palette, Briefcase, FileJson, LayoutTemplate,
  FileText, CheckCircle, ChevronRight, X, Loader2, MousePointer, 
  Settings, ShieldAlert, ArrowRight, Download
} from 'lucide-react';

// ─── A4 PAPER WRAPPER WITH REAL DETAILS ───

interface A4PaperProps {
  children: React.ReactNode;
  className?: string;
  marginStyle?: string;
  borderColorStyle?: string;
}

export const A4Paper: React.FC<A4PaperProps> = ({ children, className = '', marginStyle = 'p-4', borderColorStyle = 'border-white/10' }) => {
  return (
    <div className="relative w-36 aspect-[1/1.414] bg-[#15171d] rounded-lg shadow-2xl border flex flex-col justify-between overflow-hidden transition-all duration-500 ease-in-out border-white/10 shrink-0">
      <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.01] to-transparent pointer-events-none" />
      <div className={`w-full h-full flex flex-col justify-between ${marginStyle} ${className}`}>
        {children}
      </div>
    </div>
  );
};

// ─── STEP 3: HIGH-FIDELITY ANIMATION DEMOS ───

export const ProfilerDemo = () => {
  const [stage, setStage] = useState(0);
  const [zoomStyle, setZoomStyle] = useState({ transform: 'scale(1) translate(0px, 0px)' });

  useEffect(() => {
    const timer = setInterval(() => {
      setStage((prev) => (prev + 1) % 3);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (stage === 0) {
      setZoomStyle({ transform: 'scale(1) translate(0px, 0px)' });
    } else if (stage === 1) {
      setZoomStyle({ transform: 'scale(1.22) translate(14%, 5%)' }); // Focus on level select
    } else if (stage === 2) {
      setZoomStyle({ transform: 'scale(1.28) translate(-14%, -5%)' }); // Focus on grade circle
    }
  }, [stage]);

  const roles = ['Junior Developer', 'Senior Architect', 'Principal Cloud Architect'];
  const scores = [45, 88, 96];
  const colors = ['bg-red-500', 'bg-emerald-500', 'bg-[#80FF00]'];
  const textColors = ['text-red-400', 'text-emerald-400', 'text-[#80FF00]'];
  const skills = [
    ['HTML/CSS', 'JavaScript', 'React Basics'],
    ['React Core', 'Next.js', 'System Architecture', 'Node.js Cluster', 'AWS Cloud'],
    ['Cloud Native', 'Distributed Systems', 'Go/Rust', 'Staff Leadership']
  ];

  return (
    <div className="w-full h-full bg-[#0d0e12] overflow-hidden relative flex items-center justify-center">
      <div 
        className="w-full h-full flex items-center justify-between p-6 gap-5 transition-transform duration-700 ease-in-out origin-center"
        style={zoomStyle}
      >
        {/* Left: Job Profiler Control Panel */}
        <div className="w-1/2 bg-[#16181d] border border-white/10 rounded-2xl p-4 space-y-3.5 shadow-2xl h-[90%] flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-[#80FF00]" />
              <span className="text-[8px] font-black uppercase text-white/50 tracking-wider">Job Profiler</span>
            </div>
            <div className="w-full h-px bg-white/5" />
          </div>

          <div className="space-y-2 flex-grow pt-2">
            <div className="text-[7px] font-bold text-white/30 uppercase tracking-widest">Select Target Level</div>
            <div className="space-y-1.5">
              {['Junior Dev', 'Senior Architect', 'Principal Eng'].map((r, i) => (
                <div 
                  key={i} 
                  className={`p-2 rounded-xl border text-[9px] font-extrabold flex items-center justify-between transition-all duration-300 ${
                    stage === i 
                      ? 'border-[#80FF00] bg-[#80FF00]/10 text-white' 
                      : 'border-white/5 bg-black/30 text-white/30'
                  }`}
                >
                  <span>{r}</span>
                  {stage === i && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#80FF00] animate-ping" />
                      <MousePointer className="w-3.5 h-3.5 text-[#80FF00]" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: A4 CV Sync Output */}
        <div className="w-1/2 flex items-center justify-center relative h-full">
          <A4Paper marginStyle="p-3">
            {/* Header */}
            <div className="space-y-1">
              <div className="text-[9px] font-black text-white uppercase tracking-wider">JANE SMITH</div>
              <div className="text-[6.5px] font-bold text-[#80FF00] uppercase tracking-wider">{stage === 0 ? 'Junior Web Developer' : stage === 1 ? 'Senior Software Architect' : 'Principal Cloud Architect'}</div>
              <div className="w-full h-px bg-white/5" />
            </div>

            {/* Profile Info */}
            <div className="flex-1 flex flex-col justify-center space-y-3 py-2">
              <div className="space-y-1">
                <span className="text-[6px] font-black text-[#80FF00] uppercase tracking-widest">Competency Nodes</span>
                <div className="flex flex-wrap gap-1">
                  {skills[stage].map((sk, idx) => (
                    <span key={idx} className="text-[5.5px] bg-[#80FF00]/10 border border-[#80FF00]/20 text-white/80 px-1 py-0.5 rounded font-mono">
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* ATS circular ring in overlay */}
            <div className="absolute right-2 top-2 bg-black/60 border border-white/10 rounded-xl p-2 flex flex-col items-center justify-center">
              <div className="relative w-11 h-11 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="22" cy="22" r="18" stroke="currentColor" className="text-white/5" strokeWidth="3" fill="transparent" />
                  <motion.circle 
                    cx="22" cy="22" r="18" 
                    stroke="currentColor" 
                    className={textColors[stage]}
                    strokeWidth="3" 
                    fill="transparent" 
                    strokeDasharray={2 * Math.PI * 18}
                    animate={{ strokeDashoffset: 2 * Math.PI * 18 * (1 - scores[stage] / 100) }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </svg>
                <span className="absolute text-[8px] font-black text-white">{scores[stage]}%</span>
              </div>
              <span className="text-[5px] uppercase tracking-widest text-white/40 mt-1 font-bold">Score</span>
            </div>
          </A4Paper>
        </div>
      </div>
    </div>
  );
};

// ─── 2. MORI DEMO (Mori Assistant) ───

export const MoriDemo = () => {
  const [stage, setStage] = useState(0);
  const [zoomStyle, setZoomStyle] = useState({ transform: 'scale(1) translate(0px, 0px)' });

  useEffect(() => {
    const timer = setInterval(() => {
      setStage((prev) => (prev + 1) % 4);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (stage === 0) {
      setZoomStyle({ transform: 'scale(1) translate(0px, 0px)' });
    } else if (stage === 1) {
      setZoomStyle({ transform: 'scale(1.3) translate(-22%, -15%)' }); // Focus on bullet point click
    } else if (stage === 2) {
      setZoomStyle({ transform: 'scale(1.22) translate(22%, 0px)' }); // Focus on chat rewrite
    } else if (stage === 3) {
      setZoomStyle({ transform: 'scale(1.15) translate(-22%, -15%)' }); // Zoom on updated text
    }
  }, [stage]);

  return (
    <div className="w-full h-full bg-[#0d0e12] overflow-hidden relative flex items-center justify-center">
      <div 
        className="w-full h-full flex items-center justify-between p-5 gap-4 transition-transform duration-700 ease-in-out origin-center"
        style={zoomStyle}
      >
        {/* Left: Mori Chat UI */}
        <div className="w-[45%] bg-[#16181d] border border-white/10 rounded-2xl p-4 flex flex-col justify-between h-[95%] text-[8px] font-sans shadow-2xl">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#80FF00]" />
              <span className="font-black text-white uppercase tracking-widest">Mori AI</span>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          <div className="flex-1 flex flex-col justify-end space-y-2 py-3 overflow-hidden text-[7px]">
            {stage >= 1 && (
              <motion.div initial={{ opacity: 0, x: 5 }} animate={{ opacity: 1, x: 0 }} className="bg-white/5 rounded-xl p-2 max-w-[85%] self-end border border-white/5 text-white/60">
                Quantify accomplishments and rewrite executive style.
              </motion.div>
            )}
            {stage === 2 && (
              <div className="flex items-center gap-1 text-white/20 self-start">
                <Loader2 className="w-2.5 h-2.5 animate-spin text-[#80FF00]" />
                <span>Calibrating metrics...</span>
              </div>
            )}
            {stage >= 3 && (
              <motion.div initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} className="bg-[#80FF00]/10 border border-[#80FF00]/20 text-[#80FF00] rounded-xl p-2 max-w-[85%] self-start">
                <div className="font-black flex items-center gap-1 uppercase tracking-wider text-[6.5px]">
                  <CheckCircle className="w-2.5 h-2.5" />
                  Mori Optimized
                </div>
              </motion.div>
            )}
          </div>

          <div className="relative">
            <div className="w-full bg-black/40 border border-white/5 rounded-xl py-2 pl-3 pr-8 text-white/20 text-[7px] text-left">
              {stage === 1 ? 'Quantifying bullet points...' : 'Ask Mori to rewrite or edit...'}
            </div>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 bg-[#80FF00] text-black rounded-lg">
              <ChevronRight className="w-2.5 h-2.5" />
            </div>
          </div>
        </div>

        {/* Right: A4 CV Paper Layout */}
        <div className="w-[55%] flex justify-center h-full items-center">
          <A4Paper marginStyle="p-3">
            <div className="space-y-1">
              <div className="text-[9px] font-black text-white uppercase">JANE SMITH</div>
              <div className="text-[6.5px] font-bold text-white/40">Software Engineer</div>
              <div className="w-full h-px bg-white/5" />
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-3 py-2">
              <div className="space-y-1">
                <span className="text-[7px] font-black text-[#80FF00] uppercase tracking-widest">Experience</span>
                <div className={`p-2 rounded-lg border transition-all duration-500 relative ${
                  stage === 0 
                    ? 'border-orange-500/40 bg-orange-500/5' 
                    : stage >= 2 
                      ? 'border-emerald-500/40 bg-emerald-500/5' 
                      : 'border-white/5 bg-black/10'
                }`}>
                  <p className="text-[6.5px] font-black text-white/70">Lead Backend Engineer • Netflix</p>
                  
                  {stage < 2 ? (
                    <p className="text-[7.5px] text-orange-400 font-bold leading-normal animate-pulse mt-1">
                      • Responsible for coding web apps and APIs
                    </p>
                  ) : (
                    <motion.p 
                      initial={{ opacity: 0, y: 3 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[7.5px] text-emerald-400 font-bold leading-normal mt-1"
                    >
                      • Built microservice REST APIs, reducing latency by 42% and scaling to 1.2M req/sec
                    </motion.p>
                  )}

                  {stage === 0 && (
                    <div className="absolute right-2 bottom-2 bg-orange-500 text-black p-0.5 rounded-full animate-bounce shadow-lg">
                      <MousePointer className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </A4Paper>
        </div>
      </div>
    </div>
  );
};

// ─── 3. DESIGN DEMO (Design Engine) ───

export const DesignDemo = () => {
  const [stage, setStage] = useState(0);
  const [zoomStyle, setZoomStyle] = useState({ transform: 'scale(1) translate(0px, 0px)' });

  useEffect(() => {
    const timer = setInterval(() => {
      setStage((prev) => (prev + 1) % 3);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (stage === 0) {
      setZoomStyle({ transform: 'scale(1.22) translate(14%, 8%)' }); // Focus on margin sliders
    } else if (stage === 1) {
      setZoomStyle({ transform: 'scale(1.25) translate(14%, -12%)' }); // Focus on color swatches
    } else if (stage === 2) {
      setZoomStyle({ transform: 'scale(1) translate(0px, 0px)' }); // Zoom out
    }
  }, [stage]);

  const margins = ['p-5', 'p-2', 'p-4'];
  const colors = ['text-teal-400 border-teal-500 bg-teal-500/10', 'text-[#80FF00] border-[#80FF00] bg-[#80FF00]/10', 'text-blue-400 border-blue-500 bg-blue-500/10'];
  const borderColors = ['border-teal-500', 'border-[#80FF00]', 'border-blue-500'];
  const bulletColor = ['bg-teal-500', 'bg-[#80FF00]', 'bg-blue-500'];

  return (
    <div className="w-full h-full bg-[#0d0e12] overflow-hidden relative flex items-center justify-center">
      <div 
        className="w-full h-full flex items-center justify-between p-5 gap-4 transition-transform duration-700 ease-in-out origin-center"
        style={zoomStyle}
      >
        {/* Left: Design Controls Panel */}
        <div className="w-1/2 bg-[#16181d] border border-white/10 rounded-2xl p-4 space-y-4 shadow-2xl h-[95%] flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-[#80FF00]" />
              <span className="text-[8px] font-black uppercase text-white/50 tracking-wider">Design Engine</span>
            </div>
            <div className="w-full h-px bg-white/5" />
          </div>

          <div className="space-y-3 flex-grow pt-2">
            {/* Margin Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[7px] text-white/40 uppercase font-black tracking-wider">
                <span>Page Margins</span>
                <span className="text-[#80FF00]">{stage === 0 ? 'Compact' : stage === 1 ? 'Thin' : 'Relaxed'}</span>
              </div>
              <div className="h-1 bg-black/40 rounded-full relative">
                <motion.div 
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#80FF00] shadow-[0_0_10px_#80FF00]"
                  animate={{ left: stage === 0 ? '20%' : stage === 1 ? '60%' : '90%' }}
                  transition={{ type: 'spring', stiffness: 90 }}
                />
              </div>
            </div>

            {/* Accent Colors */}
            <div className="space-y-2 pt-1">
              <div className="text-[7px] text-white/40 uppercase font-black tracking-wider">Accent Swatch</div>
              <div className="flex gap-3">
                {['bg-teal-500', 'bg-[#80FF00]', 'bg-blue-500'].map((c, i) => (
                  <div 
                    key={i} 
                    className={`w-5 h-5 rounded-full ${c} cursor-pointer transition-all duration-300 relative ${
                      stage === i ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-black' : 'opacity-30'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: A4 CV Paper */}
        <div className="w-1/2 flex items-center justify-center h-full">
          <A4Paper marginStyle={margins[stage]}>
            {/* CV Title */}
            <div className="space-y-1">
              <div className="text-[9px] font-black text-white uppercase">JANE SMITH</div>
              <div className={`text-[6.5px] font-bold uppercase transition-colors duration-500 text-white/60`}>Senior Cloud Architect</div>
              <div className={`w-full h-0.5 transition-colors duration-500 ${bulletColor[stage]}`} />
            </div>

            {/* Content Details */}
            <div className="flex-1 flex flex-col justify-center space-y-3 py-2">
              <div className="space-y-1">
                <div className={`w-12 h-3.5 border rounded flex items-center justify-center font-bold text-[5.5px] uppercase tracking-wider transition-all duration-500 ${colors[stage]}`}>
                  Skill node
                </div>
                <div className="space-y-1 mt-1.5">
                  <div className="flex items-center gap-1">
                    <div className={`w-1 h-1 rounded-full ${bulletColor[stage]}`} />
                    <span className="text-[6px] text-white/40 font-mono">React Core Systems</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className={`w-1 h-1 rounded-full ${bulletColor[stage]}`} />
                    <span className="text-[6px] text-white/40 font-mono">System Scalability Architecture</span>
                  </div>
                </div>
              </div>
            </div>
          </A4Paper>
        </div>
      </div>
    </div>
  );
};

// ─── 4. LAYOUT DEMO (Template Library) ───

export const LayoutDemo = () => {
  const [stage, setStage] = useState(0);
  const [zoomStyle, setZoomStyle] = useState({ transform: 'scale(1) translate(0px, 0px)' });

  useEffect(() => {
    const timer = setInterval(() => {
      setStage((prev) => (prev + 1) % 3);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (stage === 0) {
      setZoomStyle({ transform: 'scale(1.22) translate(14%, 8%)' }); // Focus on layouts
    } else if (stage === 1) {
      setZoomStyle({ transform: 'scale(1) translate(0px, 0px)' }); // Focus out to see fully updated A4
    } else if (stage === 2) {
      setZoomStyle({ transform: 'scale(1.28) translate(-14%, 0px)' }); // Focus on CV layout structure
    }
  }, [stage]);

  return (
    <div className="w-full h-full bg-[#0d0e12] overflow-hidden relative flex items-center justify-center">
      <div 
        className="w-full h-full flex items-center justify-between p-5 gap-4 transition-transform duration-700 ease-in-out origin-center"
        style={zoomStyle}
      >
        {/* Left: Template Previews Panel */}
        <div className="w-1/2 bg-[#16181d] border border-white/10 rounded-2xl p-4 space-y-3.5 shadow-2xl h-[95%] flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <LayoutTemplate className="w-3.5 h-3.5 text-[#80FF00]" />
              <span className="text-[8px] font-black uppercase text-white/50 tracking-wider">Template Library</span>
            </div>
            <div className="w-full h-px bg-white/5" />
          </div>

          <div className="space-y-2 flex-grow pt-2">
            <div className="text-[7px] font-bold text-white/30 uppercase tracking-widest">Select CV Template</div>
            <div className="space-y-1.5">
              {['Classic Serif', 'Vibrant Column', 'Minimalist Tech'].map((layoutName, i) => (
                <div 
                  key={i} 
                  className={`p-2 rounded-xl border text-[9px] font-extrabold flex items-center justify-between transition-all duration-300 ${
                    stage === i 
                      ? 'border-[#80FF00] bg-[#80FF00]/10 text-white' 
                      : 'border-white/5 bg-black/30 text-white/30'
                  }`}
                >
                  <span>{layoutName}</span>
                  {stage === i && <MousePointer className="w-3.5 h-3.5 text-[#80FF00]" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: A4 CV Paper changing structure */}
        <div className="w-1/2 flex items-center justify-center h-full">
          <AnimatePresence mode="wait">
            {stage === 0 && (
              <motion.div key={0} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }} className="flex justify-center w-full">
                {/* Layout 0: Classic Centered Serif */}
                <A4Paper marginStyle="p-4 flex flex-col items-center">
                  <div className="text-center space-y-1">
                    <div className="text-[9px] font-serif font-black text-white uppercase">JANE SMITH</div>
                    <div className="text-[5.5px] font-serif italic text-[#80FF00] uppercase">Senior Software Architect</div>
                    <div className="w-20 h-px bg-white/10 mx-auto mt-1" />
                  </div>
                  <div className="w-full flex-grow pt-4 space-y-2 text-center">
                    <div className="text-[6.5px] font-serif text-[#80FF00] uppercase tracking-widest">Experience</div>
                    <div className="text-[6px] text-white/70 font-serif leading-relaxed mt-1">
                      • Lead Backend Systems • Netflix
                    </div>
                    <div className="text-[5.5px] text-white/50 font-serif leading-relaxed">
                      Designed secure microservices handling 1.2M RPS.
                    </div>
                  </div>
                </A4Paper>
              </motion.div>
            )}

            {stage === 1 && (
              <motion.div key={1} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }} className="flex justify-center w-full">
                {/* Layout 1: Vibrant Split Column */}
                <A4Paper marginStyle="p-3 flex flex-row gap-2">
                  {/* Left Column */}
                  <div className="w-[38%] border-r border-white/5 pr-1.5 space-y-3">
                    <div className="space-y-1">
                      <div className="text-[8px] font-black text-[#80FF00] leading-none uppercase">Jane S.</div>
                      <div className="text-[4px] text-white/40">Architect</div>
                    </div>
                    <div className="space-y-1 pt-1.5">
                      <div className="text-[5px] font-black uppercase text-white/50">Core Skills</div>
                      <div className="text-[5px] text-white/60">• React Systems</div>
                      <div className="text-[5px] text-white/60">• Next.js Engine</div>
                    </div>
                  </div>
                  {/* Right Column */}
                  <div className="w-[62%] space-y-3">
                    <div className="space-y-1">
                      <div className="text-[6.5px] font-black text-[#80FF00] uppercase">Experience</div>
                      <div className="text-[5.5px] font-black text-white">Netflix Architect</div>
                      <p className="text-[5px] text-white/50 leading-relaxed">Built low latency API architectures.</p>
                    </div>
                  </div>
                </A4Paper>
              </motion.div>
            )}

            {stage === 2 && (
              <motion.div key={2} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }} className="flex justify-center w-full">
                {/* Layout 2: Minimalist Tech Accent */}
                <A4Paper marginStyle="p-4">
                  <div className="space-y-1">
                    <div className="text-[9px] font-black text-white uppercase tracking-wider">JANE SMITH</div>
                    <div className="text-[5.5px] font-black text-white/30 uppercase tracking-widest">Senior Software Architect</div>
                    <div className="w-full h-px bg-white/5" />
                  </div>
                  <div className="flex-1 pt-4 space-y-2">
                    <div className="text-[6.5px] font-black uppercase text-[#80FF00] tracking-widest">Experience</div>
                    <div className="space-y-1.5">
                      <div className="text-[6.5px] font-black text-white">Netflix Systems (2024-Present)</div>
                      <div className="text-[5.5px] text-white/60 leading-normal">
                        • Spearheaded server cluster migrations saving $400K annually.
                      </div>
                    </div>
                  </div>
                </A4Paper>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

// ─── 5. JSON DEMO (Raw JSON Editor) ───

export const JsonDemo = () => {
  const [stage, setStage] = useState(0);
  const [zoomStyle, setZoomStyle] = useState({ transform: 'scale(1) translate(0px, 0px)' });

  useEffect(() => {
    const timer = setInterval(() => {
      setStage((prev) => (prev + 1) % 3);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (stage === 0) {
      setZoomStyle({ transform: 'scale(1.3) translate(22%, 5%)' }); // Focus on JSON tree editor (left side)
    } else if (stage === 1) {
      setZoomStyle({ transform: 'scale(1.35) translate(-22%, 15%)' }); // Focus on A4 CV name change (right side)
    } else if (stage === 2) {
      setZoomStyle({ transform: 'scale(1) translate(0px, 0px)' }); // Zoom out
    }
  }, [stage]);

  const names = ['Jane', 'Jane S.', 'Jane Smith'];

  return (
    <div className="w-full h-full bg-[#0d0e12] overflow-hidden relative flex items-center justify-center">
      <div 
        className="w-full h-full flex items-center justify-between p-5 gap-4 transition-transform duration-700 ease-in-out origin-center"
        style={zoomStyle}
      >
        {/* Left Side: VSCode JSON Editor Panel */}
        <div className="w-1/2 bg-[#14161a] border border-white/10 rounded-2xl p-4 h-[95%] flex flex-col font-mono text-[8px] text-blue-400 shadow-2xl">
          <div className="flex items-center justify-between pb-2.5 border-b border-white/5 text-[7px] font-black text-white/30 uppercase tracking-widest font-sans">
            <div className="flex items-center gap-1.5">
              <FileJson className="w-3.5 h-3.5 text-amber-400" />
              <span>schema-tree.json</span>
            </div>
            <span className="text-emerald-400 font-bold">JSON ACTIVE</span>
          </div>
          <div className="flex-grow flex flex-col justify-center space-y-1.5 py-4 text-[7.5px] leading-relaxed pl-2 border-l border-white/5 mt-2">
            <div>{'{'}</div>
            <div className="pl-3 text-purple-400">"basics": {'{'}</div>
            <div className="pl-6 flex items-center gap-1 text-emerald-400">
              <span>"name":</span>
              <span className="text-amber-300">"{names[stage]}"</span>
              <span className="w-0.5 h-3.5 bg-[#80FF00] animate-pulse" />
            </div>
            <div className="pl-3 text-purple-400">{'}'}</div>
            <div>{'}'}</div>
          </div>
        </div>

        {/* Right Side: A4 CV Output with updated name */}
        <div className="w-1/2 flex items-center justify-center h-full">
          <A4Paper marginStyle="p-3">
            <div className="space-y-1 text-center">
              <motion.h3 
                key={stage}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-[9px] font-black text-white uppercase tracking-wider"
              >
                {names[stage]}
              </motion.h3>
              <div className="text-[6px] font-bold text-[#80FF00] uppercase tracking-wider">Cloud Operations Architect</div>
              <div className="w-full h-px bg-white/5 mt-1" />
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-2 py-2">
              <div className="space-y-1">
                <span className="text-[6.5px] font-black text-[#80FF00] uppercase tracking-widest">Stack Summary</span>
                <p className="text-[6px] text-white/60">• Designed multi-region failover nodes on AWS EC2.</p>
                <p className="text-[6px] text-white/60">• Automated infrastructure scripts reducing setup times.</p>
              </div>
            </div>
          </A4Paper>
        </div>
      </div>
    </div>
  );
};

// ─── STEP 4: HIGH-FIDELITY ANIMATION DEMOS ───

export const Step4WriterDemo = () => {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setStage((prev) => (prev + 1) % 4);
    }, 2200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full h-full bg-[#0d0e12] flex items-center justify-center p-6 relative">
      <A4Paper marginStyle="p-4 relative">
        {stage < 3 && (
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-[#80FF00] animate-pulse" />
        )}

        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <div className="text-[8px] font-black text-white uppercase">JANE SMITH</div>
            <Sparkles className="w-3.5 h-3.5 text-[#80FF00] animate-spin" />
          </div>
          <div className="text-[5px] text-[#80FF00] font-mono">jane.smith@gmail.com • Seattle, WA</div>
          <div className="w-full h-px bg-white/5 my-1.5" />
        </div>

        {/* Dynamic Cover Letter paragraphs filling */}
        <div className="flex-1 flex flex-col justify-center space-y-2">
          {stage >= 1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
              <p className="text-[5.5px] font-bold text-white/60">Dear Hiring Manager,</p>
              <p className="text-[5px] text-white/40 leading-normal">
                I am thrilled to apply for the Senior Software Architect position. With over 8 years of experience building secure microservice REST APIs, I am confident in my ability to drive system architecture.
              </p>
            </motion.div>
          )}
          {stage >= 2 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
              <p className="text-[5px] text-white/40 leading-normal">
                At Netflix, I scaled data clusters to support 1.2M RPS while cutting monthly cloud bills by 18%.
              </p>
            </motion.div>
          )}
          {stage >= 3 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
              <p className="text-[5px] text-white/40 leading-normal">
                I look forward to discussing how my skills align with your tech stack. Thank you for your time.
              </p>
              <p className="text-[5.5px] font-bold text-[#80FF00] mt-1">Sincerely, Jane Smith</p>
            </motion.div>
          )}
        </div>
      </A4Paper>
    </div>
  );
};

export const Step4HeaderDemo = () => {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setStage((prev) => (prev + 1) % 3);
    }, 2200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full h-full bg-[#0d0e12] flex items-center justify-center p-6">
      <A4Paper marginStyle="p-4">
        {/* Dynamic Letter Headers */}
        <div className="min-h-[45px] flex items-center justify-center border-b border-white/5 pb-2.5">
          <AnimatePresence mode="wait">
            {stage === 0 && (
              <motion.div key={0} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="text-center space-y-1">
                <div className="text-[9px] font-black text-white uppercase tracking-wider">JANE SMITH</div>
                <div className="text-[5px] text-[#80FF00] font-mono">Seattle, WA • jane.smith@gmail.com</div>
              </motion.div>
            )}

            {stage === 1 && (
              <motion.div key={1} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="w-full flex justify-between items-center">
                <div className="text-left space-y-0.5">
                  <div className="text-[9px] font-black text-[#80FF00] uppercase tracking-wider">JANE SMITH</div>
                  <div className="text-[5px] text-white/40 font-mono">jane.smith@gmail.com</div>
                </div>
                <div className="w-8 h-4 bg-teal-500/10 border border-teal-500/35 rounded flex items-center justify-center text-[4px] font-mono text-teal-400">INFO</div>
              </motion.div>
            )}

            {stage === 2 && (
              <motion.div key={2} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="w-full text-center py-1.5 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-transparent rounded-lg border border-white/5">
                <div className="text-[9px] font-black text-white uppercase tracking-wider">JANE SMITH</div>
                <div className="text-[4.5px] text-white/40 mt-0.5">Seattle • Portfolio Link • Resume Attached</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Document lines */}
        <div className="flex-grow flex flex-col justify-center space-y-1.5 py-4 text-[5px] text-white/40">
          <p>Dear Recruiter,</p>
          <p className="leading-relaxed">I am writing to express my strong interest in the open Senior Architect role...</p>
        </div>
      </A4Paper>
    </div>
  );
};

export const Step4ToneDemo = () => {
  const [stage, setStage] = useState(0);
  const [zoomStyle, setZoomStyle] = useState({ transform: 'scale(1) translate(0px, 0px)' });

  useEffect(() => {
    const timer = setInterval(() => {
      setStage((prev) => (prev + 1) % 3);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (stage === 0) {
      setZoomStyle({ transform: 'scale(1.22) translate(16%, 0px)' }); // Focus on tone controls slider (left side)
    } else if (stage === 1) {
      setZoomStyle({ transform: 'scale(1.3) translate(-14%, 0px)' }); // Focus on letter layout size updates (right side)
    } else if (stage === 2) {
      setZoomStyle({ transform: 'scale(1) translate(0px, 0px)' }); // Focus out
    }
  }, [stage]);

  const paragraphs = [
    (
      <div className="space-y-1 text-[5px] text-white/40 leading-relaxed">
        <p className="font-bold text-white/60">Casual & Express Tone</p>
        <p>Hey, I'm Jane. I love building cloud software and React apps. I scaled APIs at Netflix and helped developers work faster. Let's chat soon!</p>
      </div>
    ),
    (
      <div className="space-y-1 text-[5px] text-white/40 leading-relaxed">
        <p className="font-bold text-white/60">Standard Professional Tone</p>
        <p>I am writing to express interest in your Senior Software Architect position. My background scaling database clusters at Netflix matches your requirements perfectly. I look forward to your response.</p>
      </div>
    ),
    (
      <div className="space-y-1 text-[5px] text-white/40 leading-relaxed">
        <p className="font-bold text-white/60">Executive Metric-Driven Tone</p>
        <p>As a Staff Architect at Netflix, I spearheaded cloud architecture restructuring for high-availability systems, cutting cluster latency by 42% and generating over $400K in annual AWS infrastructure cost savings. I am eager to apply this scale-competency to your engineering objectives.</p>
      </div>
    )
  ];
  const tones = ['Short / Casual', 'Medium / Professional', 'Detailed / Executive'];

  return (
    <div className="w-full h-full bg-[#0d0e12] overflow-hidden relative flex items-center justify-center">
      <div 
        className="w-full h-full flex items-center justify-between p-5 gap-4 transition-transform duration-700 ease-in-out origin-center"
        style={zoomStyle}
      >
        {/* Left Side: Tone Controls UI Skeleton */}
        <div className="w-1/2 bg-[#16181d] border border-white/10 rounded-2xl p-4 space-y-4 shadow-2xl h-[95%] flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-[#80FF00]" />
              <span className="text-[8px] font-black uppercase text-white/50 tracking-wider">Tone calibrator</span>
            </div>
            <div className="w-full h-px bg-white/5" />
          </div>

          <div className="space-y-3 flex-1 pt-2">
            {/* Tone Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[7px] text-[#80FF00] font-black uppercase tracking-wider">
                <span>Letter Length</span>
                <span>{tones[stage]}</span>
              </div>
              <div className="h-1.5 bg-black/40 rounded-full relative">
                <motion.div 
                  className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-[#80FF00] shadow-[0_0_10px_#80FF00] cursor-pointer"
                  animate={{ left: stage === 0 ? '10%' : stage === 1 ? '50%' : '88%' }}
                  transition={{ type: 'spring', stiffness: 100 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Document Content Blocks */}
        <div className="w-1/2 flex items-center justify-center h-full">
          <A4Paper marginStyle="p-3">
            <div className="space-y-1">
              <div className="w-12 h-2.5 bg-white/20 rounded-full" />
              <div className="w-full h-px bg-white/5 my-1" />
            </div>
            <div className="flex-1 flex flex-col justify-center space-y-1.5 py-2">
              <AnimatePresence mode="wait">
                <motion.div 
                  key={stage}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  {paragraphs[stage]}
                </motion.div>
              </AnimatePresence>
            </div>
          </A4Paper>
        </div>
      </div>
    </div>
  );
};

// ─── STEP 5: HIGH-FIDELITY ANIMATION DEMOS ───

export const Step5ScanDemo = () => {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setStage((prev) => (prev + 1) % 4);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full h-full bg-[#0d0e12] flex items-center justify-center p-5 relative overflow-hidden">
      {/* Scan Beam */}
      {stage === 0 && (
        <motion.div 
          className="absolute inset-x-0 h-1.5 bg-[#80FF00] shadow-[0_0_15px_#80FF00] z-20 pointer-events-none"
          initial={{ top: '10%' }}
          animate={{ top: '90%' }}
          transition={{ duration: 2.2, ease: 'easeInOut' }}
        />
      )}

      {/* Page view */}
      <A4Paper marginStyle="p-4 relative">
        <div className="space-y-1 shrink-0">
          <div className="text-[9px] font-black text-white">JANE SMITH</div>
          <div className="text-[5.5px] text-white/30">Senior Cloud Architect</div>
          <div className="w-full h-px bg-white/10 my-1.5" />
        </div>

        {/* Content line spacers */}
        <div className="flex-grow flex flex-col justify-center space-y-1.5 py-2">
          <div className="text-[5.5px] font-black text-[#80FF00]">SUMMARY</div>
          <div className="w-full h-1 bg-white/15 rounded-full" />
          <div className="w-[95%] h-1 bg-white/15 rounded-full" />
          <div className="w-[85%] h-1 bg-white/10 rounded-full animate-pulse" />
        </div>

        {/* Dynamic Alerts */}
        <AnimatePresence>
          {stage === 1 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 m-auto w-52 h-20 bg-red-950/80 border border-red-500/30 rounded-xl p-3.5 flex flex-col justify-between z-30 shadow-2xl backdrop-blur-md"
            >
              <div className="flex items-center gap-1.5 text-red-400 font-bold text-[8px] uppercase tracking-wider">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>Page-Fit Error</span>
              </div>
              <div className="text-[7.5px] text-white/50">Orphan words pushing CV into Page 2.</div>
            </motion.div>
          )}

          {stage === 2 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 m-auto w-44 h-11 bg-emerald-500 text-black rounded-xl flex items-center justify-center font-black text-[9.5px] uppercase tracking-widest z-30 shadow-lg cursor-pointer animate-bounce"
            >
              Auto-Fix Spacing
            </motion.div>
          )}

          {stage === 3 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 m-auto w-52 h-20 bg-emerald-950/80 border border-emerald-500/35 rounded-xl p-3.5 flex flex-col justify-between z-30 shadow-2xl backdrop-blur-md"
            >
              <div className="flex items-center gap-1.5 text-[#80FF00] font-bold text-[8px] uppercase tracking-wider">
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Page-Fit Perfect</span>
              </div>
              <div className="text-[7.5px] text-white/50">CV successfully compacted to fit on exactly 1 page.</div>
            </motion.div>
          )}
        </AnimatePresence>
      </A4Paper>
    </div>
  );
};

export const Step5ExportDemo = () => {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setStage((prev) => (prev + 1) % 3);
    }, 2200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full h-full bg-[#0d0e12] flex items-center justify-center gap-8 p-6">
      {/* PDF Card */}
      <div className="w-32 bg-[#16181d] border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-between h-36 relative overflow-hidden shadow-xl">
        <FileText className="w-12 h-12 text-red-400" />
        <div className="text-center">
          <p className="text-[9.5px] font-black text-white uppercase tracking-wider">Export PDF</p>
          <span className="text-[7px] text-white/30">Print-Ready Document</span>
        </div>
        {stage === 1 && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Loader2 className="w-7 h-7 animate-spin text-[#80FF00]" />
          </div>
        )}
        {stage === 2 && (
          <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle className="w-7 h-7 text-[#80FF00] animate-bounce" />
          </div>
        )}
      </div>

      {/* JSON Card */}
      <div className="w-32 bg-[#16181d] border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-between h-36 relative overflow-hidden shadow-xl">
        <FileJson className="w-12 h-12 text-teal-400" />
        <div className="text-center">
          <p className="text-[9.5px] font-black text-white uppercase tracking-wider">Backup JSON</p>
          <span className="text-[7px] text-white/30">Schema Profile Data</span>
        </div>
        {stage === 1 && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Loader2 className="w-7 h-7 animate-spin text-[#80FF00]" />
          </div>
        )}
        {stage === 2 && (
          <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle className="w-7 h-7 text-[#80FF00] animate-bounce" />
          </div>
        )}
      </div>
    </div>
  );
};
