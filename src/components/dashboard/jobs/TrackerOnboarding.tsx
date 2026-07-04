'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ChevronRight, ChevronLeft, Briefcase, Mail, Columns3, 
  Sparkles, CheckCircle, Clock, Calendar, ArrowRight, MousePointer,
  Info, RefreshCw, FileText
} from 'lucide-react';

interface TrackerOnboardingProps {
  onClose?: () => void;
}

// ─── STAGE 1: EMAIL AUTO-TRACKING DEMO ───
const EmailSyncDemo = () => {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setStage((prev) => (prev + 1) % 3);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full h-full bg-[#0b0c10] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="w-full h-full flex gap-4 max-w-xl">
        {/* Left Side: Mock Email Client */}
        <div className="w-1/2 bg-[#12141c] border border-white/10 rounded-xl p-3 flex flex-col justify-between h-full shadow-2xl">
          <div className="space-y-1.5 shrink-0">
            <div className="flex items-center justify-between pb-1 border-b border-white/5">
              <div className="flex items-center gap-1">
                <Mail className="w-3 h-3 text-[#80FF00]" />
                <span className="text-[7.5px] font-black uppercase text-white/50 tracking-wider">Sync Inbox</span>
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center space-y-2 py-2">
            {/* Email item 1 */}
            <div className={`p-1.5 rounded-lg border transition-all duration-300 ${stage === 1 ? 'border-amber-500/40 bg-amber-500/5' : 'border-white/5 bg-black/20 opacity-60'}`}>
              <div className="flex justify-between text-[6px] text-white/40 font-bold">
                <span>Netflix Careers</span>
                <span>Just Now</span>
              </div>
              <div className="text-[7px] text-white font-extrabold mt-0.5">Let's schedule an interview</div>
              <div className="text-[5.5px] text-white/40 leading-relaxed mt-0.5 truncate">We loved your tailored resume...</div>
            </div>

            {/* Email item 2 */}
            <div className="p-1.5 rounded-lg border border-white/5 bg-black/20 opacity-40">
              <div className="flex justify-between text-[6px] text-white/40 font-bold">
                <span>Google Recruiting</span>
                <span>1d ago</span>
              </div>
              <div className="text-[7px] text-white font-extrabold mt-0.5">Application Received</div>
            </div>
          </div>

          {/* Sync notification banner */}
          <AnimatePresence>
            {stage === 1 && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="bg-emerald-950/80 border border-emerald-500/30 rounded-lg p-1.5 text-center flex items-center justify-center gap-1 shadow-lg absolute inset-x-8 bottom-8 z-30 backdrop-blur-md"
              >
                <Sparkles className="w-3 h-3 text-[#80FF00] shrink-0 animate-bounce" />
                <span className="text-[7px] font-black text-[#80FF00] uppercase">Auto-Sync: Syncing Netflix interview</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Side: Kanban column sync preview */}
        <div className="w-1/2 bg-[#12141c] border border-white/10 rounded-xl p-3 flex flex-col justify-between h-full shadow-2xl relative">
          <div className="text-[7px] font-black text-white/40 uppercase tracking-widest pb-1 border-b border-white/5">Auto-Tracking</div>
          <div className="flex-1 flex gap-2 items-center justify-around py-3">
            {/* Column 1: Applied */}
            <div className="w-1/2 h-full bg-black/20 rounded-lg p-1.5 flex flex-col gap-2 border border-white/5 relative">
              <div className="text-[6px] uppercase tracking-wider text-white/30 font-bold text-center">Applied</div>
              {stage === 0 ? (
                <motion.div layoutId="jobCard" className="bg-[#1c1e26] border border-white/10 rounded p-1.5 space-y-1 shadow-md">
                  <div className="text-[6.5px] font-black text-white">React Architect</div>
                  <div className="text-[5.5px] text-white/40">Netflix</div>
                </motion.div>
              ) : (
                <div className="flex-grow flex items-center justify-center border border-dashed border-white/5 rounded text-[5px] text-white/10">Empty</div>
              )}
            </div>

            {/* Column 2: Interview */}
            <div className="w-1/2 h-full bg-black/20 rounded-lg p-1.5 flex flex-col gap-2 border border-white/5 relative">
              <div className="text-[6px] uppercase tracking-wider text-[#80FF00] font-bold text-center">Interview</div>
              {stage >= 1 ? (
                <motion.div layoutId="jobCard" className="bg-[#1c1e26] border border-emerald-500/40 bg-emerald-500/5 rounded p-1.5 space-y-1 shadow-md relative">
                  <div className="text-[6.5px] font-black text-white">React Architect</div>
                  <div className="text-[5.5px] text-[#80FF00]">Netflix</div>
                  <div className="absolute -top-1.5 -right-1 bg-[#80FF00] text-black px-1 rounded-[3px] text-[4.5px] font-black uppercase scale-75 animate-bounce">
                    Updated
                  </div>
                </motion.div>
              ) : (
                <div className="flex-grow flex items-center justify-center border border-dashed border-white/5 rounded text-[5px] text-white/10">Empty</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── STAGE 2: KANBAN BOARD JOURNEY DEMO ───
const KanbanJourneyDemo = () => {
  const [stage, setStage] = useState(0);
  const [zoomStyle, setZoomStyle] = useState({ transform: 'scale(1) translate(0px, 0px)' });

  useEffect(() => {
    const timer = setInterval(() => {
      setStage((prev) => (prev + 1) % 4);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (stage === 0) {
      setZoomStyle({ transform: 'scale(1) translate(0px, 0px)' });
    } else if (stage === 1) {
      setZoomStyle({ transform: 'scale(1.2) translate(14%, 0px)' }); // Focus on column 1-2
    } else if (stage === 2) {
      setZoomStyle({ transform: 'scale(1.22) translate(-10%, 0px)' }); // Focus on column 3-4
    } else if (stage === 3) {
      setZoomStyle({ transform: 'scale(1) translate(0px, 0px)' });
    }
  }, [stage]);

  const stagesData = [
    { title: 'Draft', color: 'text-white/40' },
    { title: 'Created', color: 'text-teal-400' },
    { title: 'Applied', color: 'text-blue-400' },
    { title: 'Interview', color: 'text-amber-400' },
    { title: 'Offer', color: 'text-[#80FF00]' }
  ];

  return (
    <div className="w-full h-full bg-[#0b0c10] overflow-hidden relative flex items-center justify-center font-sans">
      <div 
        className="w-[90%] h-[90%] flex gap-2 transition-transform duration-700 ease-in-out origin-center"
        style={zoomStyle}
      >
        {stagesData.map((st, i) => {
          const hasCard = 
            (stage === 0 && i === 0) || // Card is in Draft
            (stage === 1 && i === 1) || // Card moves to Created
            (stage === 2 && i === 3) || // Card moves to Interview
            (stage === 3 && i === 4);   // Card moves to Offer

          return (
            <div key={i} className="flex-1 bg-[#12141c] border border-white/5 rounded-xl p-2 flex flex-col justify-between h-full shadow-lg">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between pb-1 border-b border-white/5">
                  <span className={`text-[6.5px] font-black uppercase tracking-wider ${st.color}`}>{st.title}</span>
                  <span className="text-[5.5px] text-white/30 font-mono">{hasCard ? '1' : '0'}</span>
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-center items-center py-2 relative">
                {hasCard ? (
                  <motion.div 
                    layoutId="journeyCard"
                    className="w-full bg-[#1c1e26] border border-white/10 rounded p-1.5 space-y-1 shadow-md relative z-10"
                    transition={{ type: 'spring', stiffness: 80, damping: 15 }}
                  >
                    <div className="text-[6.5px] font-black text-white truncate">Staff Engineer</div>
                    <div className="text-[5px] text-white/40">Google</div>
                    <div className="flex justify-between items-center pt-1 mt-1 border-t border-white/5">
                      <span className="text-[4.5px] bg-[#80FF00]/10 text-[#80FF00] px-0.5 rounded">ATS: 91%</span>
                      {stage === 1 && <span className="text-[4px] text-teal-400">Tailored</span>}
                      {stage === 2 && <span className="text-[4px] text-amber-400">Scheduled</span>}
                      {stage === 3 && <span className="text-[4.5px] bg-emerald-500 text-black font-black px-0.5 rounded">Offer</span>}
                    </div>
                  </motion.div>
                ) : (
                  <div className="text-[4.5px] text-white/10 uppercase tracking-widest">Drop zone</div>
                )}

                {/* Cursor animation showing move action */}
                {((stage === 0 && i === 0) || (stage === 1 && i === 1) || (stage === 2 && i === 3)) && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10, y: 10 }}
                    animate={{ opacity: 1, x: 25, y: -20 }}
                    transition={{ duration: 1.5, repeat: Infinity, repeatType: 'reverse' }}
                    className="absolute z-20"
                  >
                    <MousePointer className="w-3.5 h-3.5 text-[#80FF00] drop-shadow-md" />
                  </motion.div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── STAGE 3: CARD CLICK & SIDEBAR PREVIEW ───
const SidebarPreviewDemo = () => {
  const [stage, setStage] = useState(0);
  const [zoomStyle, setZoomStyle] = useState({ transform: 'scale(1) translate(0px, 0px)' });

  useEffect(() => {
    const timer = setInterval(() => {
      setStage((prev) => (prev + 1) % 3);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (stage === 0) {
      setZoomStyle({ transform: 'scale(1) translate(0px, 0px)' });
    } else if (stage === 1) {
      setZoomStyle({ transform: 'scale(1.15) translate(-14%, 0px)' }); // Focus on board card click
    } else if (stage === 2) {
      setZoomStyle({ transform: 'scale(1.22) translate(14%, 0px)' }); // Focus on sidebar content details
    }
  }, [stage]);

  return (
    <div className="w-full h-full bg-[#0b0c10] overflow-hidden relative flex items-center justify-center font-sans">
      <div 
        className="w-full h-full flex items-center justify-between p-4 gap-4 transition-transform duration-700 ease-in-out origin-center"
        style={zoomStyle}
      >
        {/* Left Side: Kanban Column with a Card */}
        <div className="w-2/5 h-[90%] bg-[#12141c] border border-white/10 rounded-xl p-3 flex flex-col justify-between shadow-2xl relative">
          <div className="text-[7px] font-black text-white/40 uppercase tracking-widest pb-1 border-b border-white/5">Kanban Board</div>
          <div className="flex-grow flex flex-col justify-center items-center py-4">
            <div className={`w-full bg-[#1c1e26] border transition-all duration-300 rounded p-2.5 space-y-1.5 shadow-lg relative ${stage >= 1 ? 'border-[#80FF00] ring-1 ring-[#80FF00]/30' : 'border-white/10'}`}>
              <div className="text-[8px] font-black text-white">Staff Engineer</div>
              <div className="text-[6px] text-white/40">Google</div>
              <div className="flex justify-between pt-1 border-t border-white/5 text-[5px]">
                <span className="bg-emerald-500/10 text-emerald-400 px-0.5 rounded font-black">Interview Stage</span>
                <span className="text-white/30">July 4</span>
              </div>
              {stage === 0 && (
                <div className="absolute right-2 bottom-2 animate-bounce">
                  <MousePointer className="w-4 h-4 text-[#80FF00]" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Slide-out Mock Job Sidebar */}
        <div className="w-3/5 h-[95%] bg-[#161822] border border-white/15 rounded-xl p-3.5 flex flex-col justify-between shadow-2xl relative">
          <AnimatePresence mode="wait">
            {stage >= 1 ? (
              <motion.div 
                initial={{ x: 60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 60, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                className="w-full h-full flex flex-col justify-between"
              >
                {/* Header */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[6px] text-[#80FF00] font-black uppercase tracking-wider">
                    <span>Job Details</span>
                    <span className="bg-amber-400/20 text-amber-400 px-1 rounded">Active</span>
                  </div>
                  <div className="text-[9.5px] font-black text-white">Staff Cloud Engineer</div>
                  <div className="text-[7px] text-white/50">Google • Mountain View, CA</div>
                  <div className="w-full h-px bg-white/5 my-1.5" />
                </div>

                {/* Content Sections */}
                <div className="flex-1 space-y-3 py-2 text-[6.5px]">
                  {/* ATS Meter */}
                  <div className="space-y-1 bg-black/40 border border-white/5 rounded-lg p-1.5">
                    <div className="flex justify-between items-center text-white/40 font-bold uppercase text-[5.5px]">
                      <span>ATS Keyword Match</span>
                      <span className="text-[#80FF00]">91% Perfect</span>
                    </div>
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-[#80FF00] rounded-full" style={{ width: '91%' }} />
                    </div>
                  </div>

                  {/* Checklist */}
                  <div className="space-y-1">
                    <span className="text-white/45 font-black uppercase text-[5.5px]">Interview Checklist</span>
                    <div className="space-y-1 font-mono text-[5.5px] text-white/60">
                      <div className="flex items-center gap-1">
                        <CheckCircle className="w-2.5 h-2.5 text-[#80FF00] shrink-0" />
                        <span>Submit custom technical CV</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle className="w-2.5 h-2.5 text-[#80FF00] shrink-0" />
                        <span>Generate custom cover letter</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                        <span>Prep System Design questions</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Info */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[6px] text-white/30 uppercase tracking-widest font-black">
                  <span>Synced via Email</span>
                  <span>Jul 4, 2026</span>
                </div>
              </motion.div>
            ) : (
              <div className="w-full h-full flex flex-col justify-center items-center text-white/10 text-[6.5px] uppercase font-bold tracking-widest">
                <span>Click Card to view Sidebar details</span>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

// ─── STEP 4: VIEW SWITCHER & SHORTCUTS DEMO ───
const ViewsDemo = () => {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setStage((prev) => (prev + 1) % 2);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full h-full bg-[#0b0c10] flex items-center justify-center p-5 relative overflow-hidden font-sans">
      <div className="w-full h-full flex flex-col justify-between max-w-xl">
        {/* Toggle headers mockup */}
        <div className="flex justify-between items-center pb-2 border-b border-white/5">
          <div className="flex items-center gap-1.5">
            <Columns3 className="w-3.5 h-3.5 text-[#80FF00]" />
            <span className="text-[7.5px] font-black uppercase text-white/50 tracking-wider">Tracker views</span>
          </div>
          
          {/* Toggles */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-0.5 flex gap-0.5 shrink-0 scale-90">
            <span className={`px-1.5 py-0.5 rounded text-[6px] font-bold ${stage === 0 ? 'bg-[#80FF00] text-black' : 'text-white/40'}`}>Kanban</span>
            <span className={`px-1.5 py-0.5 rounded text-[6px] font-bold ${stage === 1 ? 'bg-[#80FF00] text-black' : 'text-white/40'}`}>List View</span>
          </div>
        </div>

        {/* Dynamic switching content area */}
        <div className="flex-1 flex items-center justify-center py-4 relative">
          <AnimatePresence mode="wait">
            {stage === 0 ? (
              <motion.div 
                key={0} 
                initial={{ opacity: 0, scale: 0.98 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.98 }}
                className="w-full h-full grid grid-cols-3 gap-2 px-1"
              >
                {/* 3 Columns */}
                {['Draft', 'Interview', 'Offer'].map((col, idx) => (
                  <div key={idx} className="bg-black/20 rounded-lg p-1.5 flex flex-col gap-1 border border-white/5">
                    <div className="text-[5.5px] font-black uppercase text-white/30 text-center pb-1 border-b border-white/5">{col}</div>
                    <div className="bg-[#1c1e26] border border-white/10 rounded p-1 space-y-0.5 mt-1 shadow">
                      <div className="w-12 h-1 bg-white/20 rounded-full" />
                      <div className="w-8 h-0.5 bg-white/10 rounded-full" />
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : (
              <motion.div 
                key={1} 
                initial={{ opacity: 0, scale: 0.98 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.98 }}
                className="w-full h-full flex flex-col gap-1 bg-[#12141c] border border-white/10 rounded-lg p-2 shadow-2xl justify-around"
              >
                {/* List items */}
                {[
                  { r: 'Staff Software Architect', c: 'Netflix', s: 'Interview', sc: 'bg-amber-400/20 text-amber-400' },
                  { r: 'Principal DevOps Lead', c: 'Google', s: 'Offer', sc: 'bg-[#80FF00]/20 text-[#80FF00]' },
                  { r: 'Senior Frontend Dev', c: 'Stripe', s: 'Applied', sc: 'bg-blue-500/20 text-blue-400' }
                ].map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-1.5 rounded bg-black/25 border border-white/5 text-[6.5px]">
                    <div className="flex gap-1.5 items-center">
                      <span className="font-extrabold text-white">{item.r}</span>
                      <span className="text-white/40">• {item.c}</span>
                    </div>
                    <span className={`px-1 rounded text-[5px] font-black uppercase tracking-wider ${item.sc}`}>{item.s}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

// ─── ONBOARDING DATA CONFIG ───

interface OnboardingSlide {
  title: string;
  description: string;
  demoComponent: React.ReactNode;
}

const ONBOARDING_SLIDES_DATA: OnboardingSlide[] = [
  {
    title: "Automated Email Auto-Tracking",
    description: "Enable Sync to automatically scan incoming recruiter emails. Status updates (like interview requests, application confirmations, or offers) instantly transition your job cards on the board without manual entry.",
    demoComponent: <EmailSyncDemo />
  },
  {
    title: "Kanban Board Stages",
    description: "Visually organize your job hunt across modular pipelines: Draft, Created, Applied, Interview, and Offer. Watch your cards progress through the lifecycle as you tailor CVs and secure final packages.",
    demoComponent: <KanbanJourneyDemo />
  },
  {
    title: "Interactive Card Inspection",
    description: "Click any job card to slide open the detail inspection sidebar. Access checklists, notes, employer contacts, auto-generated cover letters, and live ATS matching reports all in one spot.",
    demoComponent: <SidebarPreviewDemo />
  },
  {
    title: "Hot-Swap Board & List Views",
    description: "Quickly toggle between a visual card column layout and a high-density, searchable table view. Filter by priority, status, date, or salary to audit your active pipeline in seconds.",
    demoComponent: <ViewsDemo />
  }
];

export default function TrackerOnboarding({ onClose }: TrackerOnboardingProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem('cvcircle_tracker_onboarding_seen');
    if (!seen) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('cvcircle_tracker_onboarding_seen', 'true');
    setIsOpen(false);
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  const totalSlides = ONBOARDING_SLIDES_DATA.length;
  const slide = ONBOARDING_SLIDES_DATA[currentSlide];

  const handleNext = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  const handleBack = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
        {/* Fullscreen blocker click disabled to guarantee walkthrough engagement */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white dark:bg-[#111317] border border-gray-200 dark:border-white/10 rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="px-8 py-5 border-b border-gray-100 dark:border-white/5 bg-gradient-to-r from-lime-500/10 via-emerald-500/5 to-transparent flex justify-between items-center shrink-0">
            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-lime-500">
                Tracker Walkthrough
              </span>
              <h2 className="text-lg font-black text-gray-900 dark:text-white mt-0.5 leading-none uppercase tracking-tight">
                Quick Feature Tour
              </h2>
            </div>
            <button 
              onClick={handleClose}
              className="p-1.5 rounded-xl text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors border-none bg-transparent cursor-pointer"
              title="Skip Tour"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Interactive view mock header display */}
          <div className="flex justify-center py-4 bg-gray-50/50 dark:bg-black/30 border-b border-gray-100 dark:border-white/5 shrink-0">
            <div className="flex items-center gap-1.5 bg-gray-200 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-full px-4 py-1.5 shrink-0 shadow-inner text-[9.5px] font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
              <Columns3 className="w-3.5 h-3.5 text-lime-500" />
              <span>Application Pipelines Sync</span>
            </div>
          </div>

          {/* Core Content */}
          <div className="flex-grow flex flex-col overflow-y-auto">
            {/* 16:9 Animation Video Window */}
            <div className="w-full aspect-video border-b border-gray-100 dark:border-white/5 relative overflow-hidden bg-black/40 flex items-center justify-center shrink-0">
              <AnimatePresence mode="wait">
                <motion.div 
                  key={currentSlide}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full animate-fadeIn"
                >
                  {slide.demoComponent}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Description Area */}
            <div className="p-8 space-y-3.5 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-lime-500">
                  Feature {currentSlide + 1} of {totalSlides}
                </span>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSlide}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <h3 className="text-lg font-black text-gray-900 dark:text-white leading-tight uppercase tracking-tight">
                      {slide.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2.5 leading-relaxed font-medium">
                      {slide.description}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Navigation & Controls */}
              <div className="pt-6 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                {/* Pagination Dots */}
                <div className="flex gap-2">
                  {ONBOARDING_SLIDES_DATA.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentSlide(idx)}
                      className={`h-2.5 rounded-full transition-all duration-300 ${
                        currentSlide === idx ? 'w-6 bg-lime-500' : 'w-2.5 bg-gray-300 dark:bg-white/10 hover:bg-white/20'
                      }`}
                      title={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>

                {/* Back / Next buttons */}
                <div className="flex gap-3">
                  {currentSlide > 0 && (
                    <button
                      onClick={handleBack}
                      className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-white text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer bg-transparent"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>
                  )}
                  
                  <button
                    onClick={handleNext}
                    className="px-5 py-2.5 rounded-xl bg-lime-500 hover:bg-[#80e600] text-black text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer shadow-md hover:shadow-lg active:scale-95 duration-100"
                  >
                    <span>{currentSlide === totalSlides - 1 ? "Start Tracking" : "Next"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
