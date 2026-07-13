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
      <div className="w-full h-full flex gap-4 max-w-xl relative">
        {/* Left: Inbox */}
        <motion.div
          className="w-1/2 bg-[#12141c] border border-white/10 rounded-xl p-3 flex flex-col justify-between h-full shadow-2xl relative z-10"
          animate={{
            scale: stage === 1 ? 1.02 : 1,
            borderColor: stage === 1 ? 'rgba(251, 191, 36, 0.3)' : 'rgba(255,255,255,0.1)',
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <div className="space-y-1.5 shrink-0">
            <div className="flex items-center justify-between pb-1 border-b border-white/5">
              <div className="flex items-center gap-1">
                <Mail className="w-3 h-3 text-[#80FF00]" />
                <span className="text-[7.5px] font-black uppercase text-white/50 tracking-wider">Sync Inbox</span>
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-500">
                <motion.div
                  className="w-full h-full rounded-full bg-emerald-400"
                  animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center space-y-2 py-2">
            {/* Netflix email */}
            <motion.div
              className={`p-1.5 rounded-lg border transition-all duration-500 relative overflow-hidden ${
                stage >= 1
                  ? 'border-amber-500/40 bg-amber-500/5'
                  : 'border-white/5 bg-black/20 opacity-60'
              }`}
              animate={stage === 1 ? { y: [0, -2, 0] } : {}}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
            >
              {stage === 1 && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-amber-500/0"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 1.5, ease: 'easeInOut' }}
                />
              )}
              <div className="flex justify-between text-[6px] text-white/40 font-bold relative z-10">
                <span>Netflix Careers</span>
                <motion.span
                  className={stage === 1 ? 'text-amber-400' : ''}
                  animate={stage === 1 ? { opacity: [0.5, 1, 0.5] } : {}}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  Just Now
                </motion.span>
              </div>
              <div className="text-[7px] text-white font-extrabold mt-0.5 relative z-10">
                {stage >= 1 ? "Let's schedule an interview" : 'Application Received'}
              </div>
              <div className="text-[5.5px] text-white/40 leading-relaxed mt-0.5 truncate relative z-10">
                {stage >= 1 ? 'We loved your tailored resume...' : 'Thank you for applying...'}
              </div>
            </motion.div>

            {/* Google email dimmed */}
            <div className="p-1.5 rounded-lg border border-white/5 bg-black/20 opacity-30">
              <div className="flex justify-between text-[6px] text-white/40 font-bold">
                <span>Google Recruiting</span>
                <span>1d ago</span>
              </div>
              <div className="text-[7px] text-white font-extrabold mt-0.5">Application Received</div>
            </div>
          </div>

          {/* Sync banner */}
          <AnimatePresence>
            {stage === 1 && (
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95, transition: { duration: 0.2 } }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                className="absolute inset-x-6 bottom-6 z-30 bg-emerald-950/90 border border-emerald-500/30 rounded-xl p-2 flex items-center justify-center gap-1.5 shadow-2xl backdrop-blur-md"
              >
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.15, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 1.5 }}
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#80FF00]" />
                </motion.div>
                <span className="text-[7px] font-black text-[#80FF00] uppercase tracking-wider whitespace-nowrap">
                  Auto-Sync: Syncing Netflix interview
                </span>
                <motion.div
                  className="w-1 h-1 rounded-full bg-[#80FF00]"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Right: Kanban preview */}
        <motion.div
          className="w-1/2 bg-[#12141c] border border-white/10 rounded-xl p-3 flex flex-col justify-between h-full shadow-2xl relative"
          animate={{
            scale: stage >= 1 ? 1.02 : 1,
            borderColor: stage >= 1 ? 'rgba(128, 255, 0, 0.15)' : 'rgba(255,255,255,0.1)',
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <div className="text-[7px] font-black text-white/40 uppercase tracking-widest pb-1 border-b border-white/5 flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              {stage >= 1 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
              <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${stage >= 1 ? 'bg-emerald-500' : 'bg-white/20'}`} />
            </span>
            Auto-Tracking
          </div>

          <div className="flex-1 flex gap-2 items-stretch py-3">
            {/* Applied column */}
            <div className="w-1/2 h-full bg-black/20 rounded-lg p-1.5 flex flex-col gap-2 border border-white/5 relative">
              <div className="text-[6px] uppercase tracking-wider text-white/30 font-bold text-center pb-1 border-b border-white/5">
                Applied
              </div>
              <div className="flex-1 flex items-center justify-center relative">
                <AnimatePresence mode="wait">
                  {stage === 0 && (
                    <motion.div
                      key="applied-card"
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.85, y: -8, transition: { duration: 0.25 } }}
                      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                      className="w-full bg-[#1c1e26] border border-white/10 rounded-lg p-1.5 shadow-md"
                    >
                      <div className="text-[6.5px] font-black text-white">React Architect</div>
                      <div className="text-[5.5px] text-white/40">Netflix</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Interview column */}
            <div className="w-1/2 h-full bg-black/20 rounded-lg p-1.5 flex flex-col gap-2 border border-white/5 relative">
              <div className="text-[6px] uppercase tracking-wider text-[#80FF00] font-bold text-center pb-1 border-b border-white/5">
                Interview
              </div>
              <div className="flex-1 flex items-center justify-center relative">
                <AnimatePresence mode="wait">
                  {stage >= 1 && (
                    <motion.div
                      key="interview-card"
                      initial={{ opacity: 0, scale: 0.8, x: 20 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.85, x: -10, transition: { duration: 0.25 } }}
                      transition={{ type: 'spring', stiffness: 350, damping: 26 }}
                      className="w-full bg-[#1c1e26] border border-emerald-500/40 bg-emerald-500/5 rounded-lg p-1.5 shadow-md relative"
                    >
                      <motion.div
                        className="absolute -top-1.5 -right-1 bg-[#80FF00] text-black px-1.5 rounded-md text-[4.5px] font-black uppercase tracking-wider"
                        initial={{ scale: 0, rotate: -12 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30, delay: 0.1 }}
                      >
                        Updated
                      </motion.div>
                      <div className="text-[6.5px] font-black text-white">React Architect</div>
                      <div className="text-[5.5px] text-[#80FF00] font-bold">Netflix</div>
                      <div className="mt-1 pt-1 border-t border-white/5 space-y-0.5 text-[4.8px] text-white/50">
                        <div className="flex justify-between">
                          <span>Interview:</span>
                          <span className="text-[#80FF00] font-bold">July 15, 10 AM</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Contact:</span>
                          <span>Sarah Connor</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>
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
    switch (stage) {
      case 0:
        setZoomStyle({ transform: 'scale(1) translate(0px, 0px)' });
        break;
      case 1:
        setZoomStyle({ transform: 'scale(1.2) translate(14%, 0px)' });
        break;
      case 2:
        setZoomStyle({ transform: 'scale(1.22) translate(-10%, 0px)' });
        break;
      case 3:
        setZoomStyle({ transform: 'scale(1) translate(0px, 0px)' });
        break;
      default:
        break;
    }
  }, [stage]);

  const stagesData = [
    { title: 'Draft', color: 'text-white/40', dot: 'bg-white/30' },
    { title: 'Created', color: 'text-teal-400', dot: 'bg-teal-400' },
    { title: 'Applied', color: 'text-blue-400', dot: 'bg-blue-400' },
    { title: 'Interview', color: 'text-amber-400', dot: 'bg-amber-400' },
    { title: 'Offer', color: 'text-[#80FF00]', dot: 'bg-[#80FF00]' },
  ];

  const cardPosition = (colIndex: number) => {
    if (stage === 0 && colIndex === 0) return true;
    if (stage === 1 && colIndex === 1) return true;
    if (stage === 2 && colIndex === 3) return true;
    if (stage === 3 && colIndex === 4) return true;
    return false;
  };

  return (
    <div className="w-full h-full bg-[#0b0c10] overflow-hidden relative flex items-center justify-center font-sans">
      <motion.div
        className="w-[90%] h-[90%] flex gap-2 transition-transform duration-700 ease-in-out origin-center"
        style={zoomStyle}
      >
        {stagesData.map((st, i) => {
          const hasCard = cardPosition(i);

          return (
            <div
              key={i}
              className={`flex-1 rounded-xl p-2 flex flex-col justify-between h-full shadow-lg transition-all duration-500 relative ${
                hasCard
                  ? 'bg-[#12141c] border border-white/10'
                  : 'bg-[#0e0f14] border border-white/5'
              }`}
            >
              {/* Column header */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between pb-1 border-b border-white/5">
                  <div className="flex items-center gap-1.5">
                    <motion.span
                      className={`w-1.5 h-1.5 rounded-full ${st.dot}`}
                      animate={hasCard ? { scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] } : {}}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <span className={`text-[6.5px] font-black uppercase tracking-wider ${st.color}`}>
                      {st.title}
                    </span>
                  </div>
                  <motion.span
                    className="text-[5.5px] text-white/30 font-mono"
                    animate={hasCard ? { opacity: [0.4, 1, 0.4] } : {}}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    {hasCard ? '1' : '0'}
                  </motion.span>
                </div>
              </div>

              {/* Card area */}
              <div className="flex-1 flex flex-col justify-center items-center py-2 relative min-h-[60px]">
                <AnimatePresence mode="wait">
                  {hasCard && (
                    <motion.div
                      key={`${stage}-${i}-card`}
                      layoutId="journeyCard"
                      initial={{ opacity: 0, scale: 0.8, y: stage === 0 ? 0 : 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.85, y: -12, transition: { duration: 0.2 } }}
                      transition={{
                        type: 'spring',
                        stiffness: 280,
                        damping: 24,
                        mass: 0.8,
                      }}
                      className="w-full bg-[#1c1e26] border border-white/10 rounded-xl p-2 space-y-1.5 shadow-xl relative z-10"
                    >
                      <div className="text-[6.5px] font-black text-white truncate">Staff Engineer</div>
                      <div className="text-[5px] text-white/40">Google</div>
                      <div className="flex justify-between items-center pt-1.5 mt-1 border-t border-white/5">
                        <span className="text-[4.5px] bg-[#80FF00]/10 text-[#80FF00] px-1 rounded font-black">ATS: 91%</span>
                        <AnimatePresence>
                          {stage === 1 && (
                            <motion.span
                              key="tailored"
                              initial={{ opacity: 0, x: -6, scale: 0.8 }}
                              animate={{ opacity: 1, x: 0, scale: 1 }}
                              exit={{ opacity: 0, x: 6, scale: 0.8 }}
                              className="text-[4px] text-teal-400 font-black uppercase tracking-wider"
                            >
                              Tailored
                            </motion.span>
                          )}
                          {stage === 2 && (
                            <motion.span
                              key="scheduled"
                              initial={{ opacity: 0, x: -6, scale: 0.8 }}
                              animate={{ opacity: 1, x: 0, scale: 1 }}
                              exit={{ opacity: 0, x: 6, scale: 0.8 }}
                              className="text-[4px] text-amber-400 font-black uppercase tracking-wider"
                            >
                              Scheduled
                            </motion.span>
                          )}
                          {stage === 3 && (
                            <motion.span
                              key="offer"
                              initial={{ opacity: 0, scale: 0.5 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.5 }}
                              className="text-[4.5px] bg-emerald-500 text-black font-black px-1 rounded"
                            >
                              Offer
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!hasCard && (
                  <motion.div
                    className="text-[4.5px] text-white/10 uppercase tracking-widest"
                    animate={{ opacity: [0.02, 0.08, 0.02] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    Drop zone
                  </motion.div>
                )}
              </div>

              {/* Cursor hint */}
              {((stage === 0 && i === 0) || (stage === 1 && i === 1) || (stage === 2 && i === 3)) && (
                <motion.div
                  className="absolute z-20 pointer-events-none"
                  initial={{ opacity: 0, x: -8, y: 8 }}
                  animate={{ opacity: 1, x: 20, y: -16 }}
                  transition={{
                    duration: 1.8,
                    repeat: Infinity,
                    repeatType: 'reverse',
                    ease: 'easeInOut',
                  }}
                >
                  <MousePointer className="w-3.5 h-3.5 text-[#80FF00] drop-shadow-[0_0_6px_rgba(128,255,0,0.6)]" />
                </motion.div>
              )}
            </div>
          );
        })}
      </motion.div>
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
    switch (stage) {
      case 0:
        setZoomStyle({ transform: 'scale(1) translate(0px, 0px)' });
        break;
      case 1:
        setZoomStyle({ transform: 'scale(1.15) translate(-14%, 0px)' });
        break;
      case 2:
        setZoomStyle({ transform: 'scale(1.22) translate(14%, 0px)' });
        break;
      default:
        break;
    }
  }, [stage]);

  return (
    <div className="w-full h-full bg-[#0b0c10] overflow-hidden relative flex items-center justify-center font-sans">
      <motion.div
        className="w-full h-full flex items-center justify-between p-4 gap-4 transition-transform duration-700 ease-in-out origin-center"
        style={zoomStyle}
      >
        {/* Board column */}
        <motion.div
          className="w-2/5 h-[90%] bg-[#12141c] border border-white/10 rounded-xl p-3 flex flex-col justify-between shadow-2xl relative"
          animate={{
            borderColor: stage >= 1 ? 'rgba(128, 255, 0, 0.25)' : 'rgba(255,255,255,0.1)',
            boxShadow: stage >= 1 ? '0 0 30px rgba(128, 255, 0, 0.06)' : '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div className="text-[7px] font-black text-white/40 uppercase tracking-widest pb-1 border-b border-white/5 flex items-center gap-1.5">
            <Columns3 className="w-3 h-3" />
            Kanban Board
          </div>

          <div className="flex-grow flex flex-col justify-center items-center py-4">
            <motion.div
              className={`w-full bg-[#1c1e26] border rounded-xl p-3 space-y-2 shadow-lg relative overflow-hidden ${
                stage >= 1
                  ? 'border-[#80FF00] ring-1 ring-[#80FF00]/30'
                  : 'border-white/10'
              }`}
              animate={stage >= 1 ? { scale: [1, 1.02, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              {/* Shimmer on hover state */}
              {stage >= 1 && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-[#80FF00]/5 to-transparent"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}

              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[8px] font-black text-white">Staff Engineer</div>
                  <div className="text-[6px] text-white/40">Google</div>
                </div>
                <motion.span
                  className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md text-[5px] font-black"
                  animate={stage >= 1 ? { opacity: [0.7, 1, 0.7] } : {}}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  Interview
                </motion.span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-white/5 text-[5px]">
                <span className="text-white/30">July 4, 2026</span>
                <span className="text-[#80FF00] font-black">Priority</span>
              </div>

              {/* Cursor pointer animation */}
              <AnimatePresence>
                {stage === 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1, y: [0, -4, 0] }}
                    exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute right-2 bottom-2"
                  >
                    <MousePointer className="w-4 h-4 text-[#80FF00] drop-shadow-[0_0_8px_rgba(128,255,0,0.5)]" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </motion.div>

        {/* Slide-out sidebar */}
        <motion.div
          className="w-3/5 h-[95%] bg-[#161822] border border-white/15 rounded-xl p-4 flex flex-col justify-between shadow-2xl relative overflow-hidden"
          initial={false}
        >
          {/* Subtle background glow */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-[#80FF00]/3 via-transparent to-transparent pointer-events-none"
            animate={{ opacity: stage >= 1 ? [0.3, 0.6, 0.3] : 0 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />

          <AnimatePresence mode="wait">
            {stage >= 1 ? (
              <motion.div
                key="sidebar-content"
                initial={{ x: 80, opacity: 0, filter: 'blur(4px)' }}
                animate={{ x: 0, opacity: 1, filter: 'blur(0px)' }}
                exit={{ x: 40, opacity: 0, filter: 'blur(4px)', transition: { duration: 0.2 } }}
                transition={{ type: 'spring', stiffness: 120, damping: 18, mass: 0.9 }}
                className="w-full h-full flex flex-col justify-between relative z-10"
              >
                {/* Sidebar header */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[#80FF00]">
                      <motion.div
                        animate={{ rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                      >
                        <Info className="w-3.5 h-3.5" />
                      </motion.div>
                      <span className="text-[6.5px] font-black uppercase tracking-widest">Job Details</span>
                    </div>
                    <motion.span
                      className="bg-amber-400/20 text-amber-400 px-2 py-0.5 rounded-md text-[5.5px] font-black uppercase tracking-wider"
                      animate={{ opacity: [0.6, 1, 0.6] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      Active
                    </motion.span>
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-white leading-tight">Staff Cloud Engineer</div>
                    <div className="text-[6.5px] text-white/50 mt-0.5 flex items-center gap-1">
                      <span>Google</span>
                      <span className="text-white/20">•</span>
                      <span>Mountain View, CA</span>
                    </div>
                  </div>
                  <motion.div
                    className="w-full h-px bg-gradient-to-r from-[#80FF00]/20 via-white/5 to-transparent"
                    layout
                  />
                </div>

                {/* Stats */}
                <div className="flex-1 space-y-3 py-3 overflow-hidden">
                  {/* ATS Meter */}
                  <motion.div
                    className="space-y-2 bg-black/30 border border-white/5 rounded-xl p-3 overflow-hidden relative"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                  >
                    <div className="flex justify-between items-center text-white/40 font-bold uppercase text-[5.5px] tracking-wider">
                      <span>ATS Keyword Match</span>
                      <motion.span
                        className="text-[#80FF00] flex items-center gap-1"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 400 }}
                      >
                        <Sparkles className="w-2.5 h-2.5" />
                        91% Perfect
                      </motion.span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden relative">
                      <motion.div
                        className="h-full bg-gradient-to-r from-[#80FF00] to-emerald-400 rounded-full relative"
                        initial={{ width: 0 }}
                        animate={{ width: '91%' }}
                        transition={{ duration: 1.2, delay: 0.2, ease: 'easeOut' }}
                      >
                        <motion.div
                          className="absolute inset-0 bg-white/20"
                          animate={{ x: ['-100%', '100%'] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        />
                      </motion.div>
                    </div>
                  </motion.div>

                  {/* Checklist */}
                  <motion.div
                    className="space-y-2"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25, duration: 0.4 }}
                  >
                    <span className="text-white/45 font-black uppercase text-[5.5px] tracking-widest">
                      Interview Checklist
                    </span>
                    <div className="space-y-2">
                      {[
                        { label: 'Submit custom technical CV', done: true },
                        { label: 'Generate custom cover letter', done: true },
                        { label: 'Prep System Design questions', done: false },
                      ].map((item, idx) => (
                        <motion.div
                          key={idx}
                          className="flex items-center gap-2"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + idx * 0.08, duration: 0.35 }}
                        >
                          <motion.div
                            className={`w-3.5 h-3.5 rounded-md flex items-center justify-center ${
                              item.done
                                ? 'bg-[#80FF00]/15 border border-[#80FF00]/30'
                                : 'bg-white/5 border border-white/10'
                            }`}
                            animate={item.done ? { scale: [1, 1.1, 1] } : {}}
                            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                          >
                            {item.done ? (
                              <CheckCircle className="w-2.5 h-2.5 text-[#80FF00]" />
                            ) : (
                              <Clock className="w-2.5 h-2.5 text-amber-400/60" />
                            )}
                          </motion.div>
                          <span className={`text-[5.5px] font-mono ${item.done ? 'text-white/60' : 'text-white/30'}`}>
                            {item.label}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Tags */}
                  <motion.div
                    className="flex gap-2 pt-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.4 }}
                  >
                    {['Senior', 'On-site', 'Urgent'].map((tag, i) => (
                      <motion.span
                        key={tag}
                        className="text-[5px] font-black uppercase tracking-wider bg-white/5 border border-white/10 text-white/40 px-2 py-1 rounded-lg"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 + i * 0.06, type: 'spring', stiffness: 400 }}
                      >
                        {tag}
                      </motion.span>
                    ))}
                  </motion.div>
                </div>

                {/* Footer */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[5.5px] text-white/30 uppercase tracking-widest font-black">
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3 h-3" />
                    <span>Synced via Email</span>
                  </div>
                  <span>Jul 4, 2026</span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="sidebar-empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                className="w-full h-full flex flex-col justify-center items-center text-white/10 gap-3"
              >
                <motion.div
                  animate={{ scale: [1, 1.05, 1], opacity: [0.1, 0.15, 0.1] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Columns3 className="w-8 h-8" />
                </motion.div>
                <span className="text-[6.5px] uppercase font-bold tracking-widest">
                  Click Card to inspect
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
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

  const kanbanColumns = ['Draft', 'Interview', 'Offer'];
  const listRows = [
    { role: 'Staff Software Architect', company: 'Netflix', status: 'Interview', color: 'bg-amber-400/20 text-amber-400 border-amber-400/30' },
    { role: 'Principal DevOps Lead', company: 'Google', status: 'Offer', color: 'bg-[#80FF00]/20 text-[#80FF00] border-[#80FF00]/30' },
    { role: 'Senior Frontend Dev', company: 'Stripe', status: 'Applied', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  ];

  return (
    <div className="w-full h-full bg-[#0b0c10] flex items-center justify-center p-5 relative overflow-hidden font-sans">
      <div className="w-full h-full flex flex-col justify-between max-w-xl">
        {/* Header toolbar */}
        <div className="flex justify-between items-center pb-3 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: [0, 3, -3, 0] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
            >
              <Columns3 className="w-4 h-4 text-[#80FF00]" />
            </motion.div>
            <span className="text-[8px] font-black uppercase text-white/60 tracking-widest">
              Application Pipelines
            </span>
            <motion.span
              className="text-[6px] text-white/20 font-mono"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              3 active
            </motion.span>
          </div>

          {/* Toggle pills */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-1 flex gap-0.5 shrink-0 shadow-inner">
            {['Kanban', 'List View'].map((label, i) => (
              <motion.div
                key={label}
                className={`px-3 py-1.5 rounded-lg text-[6.5px] font-black uppercase tracking-wider transition-all duration-300 ${
                  (stage === 0 && i === 0) || (stage === 1 && i === 1)
                    ? 'bg-[#80FF00] text-black shadow-lg shadow-[#80FF00]/20'
                    : 'text-white/40'
                }`}
                animate={
                  (stage === 0 && i === 0) || (stage === 1 && i === 1)
                    ? { y: [0, -1, 0] }
                    : {}
                }
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                {label}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex items-center justify-center py-5 relative min-h-0">
          <AnimatePresence mode="wait">
            {stage === 0 ? (
              /* Kanban View */
              <motion.div
                key="kanban"
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -10, transition: { duration: 0.2 } }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                className="w-full h-full grid grid-cols-3 gap-3"
              >
                {kanbanColumns.map((col, idx) => (
                  <motion.div
                    key={col}
                    className="bg-[#12141c] border border-white/5 rounded-xl p-2.5 flex flex-col gap-2 shadow-lg"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.08, duration: 0.4, type: 'spring', stiffness: 300 }}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <span className="text-[6px] font-black uppercase text-white/40 tracking-widest">{col}</span>
                      <motion.span
                        className="text-[5.5px] text-white/20 font-mono"
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity, delay: idx * 0.3 }}
                      >
                        1
                      </motion.span>
                    </div>

                    <motion.div
                      className="bg-[#1c1e26] border border-white/10 rounded-xl p-2.5 space-y-2 shadow-md relative overflow-hidden"
                      whileHover={{ y: -2, borderColor: 'rgba(128, 255, 0, 0.2)' }}
                      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                    >
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent"
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: idx * 0.5 }}
                      />
                      <div className="relative z-10">
                        <div className="h-2 bg-white/15 rounded-full w-3/4 mb-2" />
                        <div className="h-1.5 bg-white/8 rounded-full w-1/2" />
                        <div className="mt-3 flex items-center gap-2">
                          <motion.div
                            className="h-3 bg-[#80FF00]/15 border border-[#80FF00]/20 rounded-md px-1.5"
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          >
                            <span className="text-[4.5px] font-black text-[#80FF00] uppercase tracking-wider">
                              {col === 'Offer' ? 'Offer' : col === 'Interview' ? 'Scheduled' : 'Pending'}
                            </span>
                          </motion.div>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              /* List View */
              <motion.div
                key="list"
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -10, transition: { duration: 0.2 } }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                className="w-full h-full flex flex-col gap-2 bg-[#12141c] border border-white/10 rounded-2xl p-3 shadow-2xl overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center gap-3 px-3 py-2 border-b border-white/5 shrink-0">
                  <div className="w-3.5 h-3.5 rounded bg-white/5 border border-white/10 flex items-center justify-center">
                    <motion.div
                      className="w-1.5 h-1.5 rounded-sm bg-white/10"
                      animate={{ scale: [1, 0.8, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </div>
                  <div className="h-2 bg-white/10 rounded-full w-24" />
                  <div className="h-2 bg-white/5 rounded-full w-16" />
                  <div className="h-2 bg-white/5 rounded-full w-12" />
                </div>

                {/* Rows */}
                {listRows.map((row, idx) => (
                  <motion.div
                    key={row.role}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-black/20 border border-white/5 group cursor-pointer relative overflow-hidden"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1, duration: 0.4, type: 'spring', stiffness: 300 }}
                    whileHover={{
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      borderColor: 'rgba(255,255,255,0.1)',
                    }}
                  >
                    {/* Row shimmer */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.015] to-transparent"
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: idx * 0.4 }}
                    />

                    <motion.div
                      className="w-3.5 h-3.5 rounded border border-white/10 flex items-center justify-center relative z-10"
                      whileHover={{ borderColor: 'rgba(128, 255, 0, 0.5)', backgroundColor: 'rgba(128, 255, 0, 0.05)' }}
                      transition={{ duration: 0.15 }}
                    >
                      <motion.div
                        className="w-1.5 h-1.5 rounded-sm bg-[#80FF00]"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3 + idx * 0.1, type: 'spring', stiffness: 500 }}
                      />
                    </motion.div>

                    <div className="flex-1 flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="text-[7px] font-black text-white group-hover:text-[#80FF00] transition-colors">
                            {row.role}
                          </div>
                          <div className="text-[5.5px] text-white/30 font-mono">{row.company}</div>
                        </div>
                      </div>
                      <motion.span
                        className={`text-[5.5px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border ${row.color}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 + idx * 0.1, type: 'spring', stiffness: 400 }}
                      >
                        {row.status}
                      </motion.span>
                    </div>
                  </motion.div>
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
    const fetchTourStatus = async () => {
      try {
        const res = await fetch('/api/user/onboarding');
        if (res.ok) {
          const json = await res.json();
          const seenTours = json?.data?.onboarding?.seen_tours || {};
          if (!seenTours.tracker) {
            setIsOpen(true);
          }
        }
      } catch (err) {
        console.error('Failed to fetch tracker onboarding state from server:', err);
        const seen = localStorage.getItem('cvcircle_tracker_onboarding_seen');
        if (!seen) setIsOpen(true);
      }
    };
    fetchTourStatus();
  }, []);

  const handleClose = async () => {
    setIsOpen(false);
    localStorage.setItem('cvcircle_tracker_onboarding_seen', 'true');
    if (onClose) onClose();
    try {
      await fetch('/api/user/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seen_tours: {
            tracker: true
          }
        })
      });
    } catch (err) {
      console.error('Failed to save seen tracker tour to server:', err);
    }
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
