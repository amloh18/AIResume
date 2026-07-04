'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Palette, Briefcase, FileJson, LayoutTemplate,
  X, ChevronRight, ChevronLeft
} from 'lucide-react';
import {
  ProfilerDemo,
  MoriDemo,
  DesignDemo,
  LayoutDemo,
  JsonDemo,
  Step4WriterDemo,
  Step4HeaderDemo,
  Step4ToneDemo,
  Step5ScanDemo,
  Step5ExportDemo
} from '@/components/resume-enhancer/components/PremiumWorkflowDemos';

interface EditorOnboardingProps {
  step: number; // 3, 4, 5
}

interface OnboardingSlide {
  title: string;
  description: string;
  demoComponent: React.ReactNode;
}

const ONBOARDING_SLIDES_DATA: Record<number, OnboardingSlide[]> = {
  3: [
    {
      title: "Target Position Profiler",
      description: "Set your target role and seniority level to align ATS keyword analysis and grading matrices.",
      demoComponent: <ProfilerDemo />
    },
    {
      title: "Mori AI Assistant",
      description: "Click any section or bullet point to contextually rewrite CV text in high-impact professional phrasing. Mori Chat takes your input, transforms the details, and updates the resume live.",
      demoComponent: <MoriDemo />
    },
    {
      title: "Global Design Engine",
      description: "Tweak spacing, line-heights, colors and fonts. Adjust layout spacing dynamically with micro sliders.",
      demoComponent: <DesignDemo />
    },
    {
      title: "Template Library",
      description: "Hot-swap layout structural patterns. Instantly choose between modern, classic, or split-column designs while preserving your data.",
      demoComponent: <LayoutDemo />
    },
    {
      title: "Raw JSON Editor",
      description: "Directly modify key names or text strings in the live JSON tree for precise adjustments.",
      demoComponent: <JsonDemo />
    }
  ],
  4: [
    {
      title: "AI Cover Letter Generator",
      description: "Context-aware AI reads your target position and resume data to generate a cohesive letter matching your experience.",
      demoComponent: <Step4WriterDemo />
    },
    {
      title: "Header Matching Templates",
      description: "Choose from minimalist, typography-led, or modern template grids matching your resume header style.",
      demoComponent: <Step4HeaderDemo />
    },
    {
      title: "Real-Time Tone Adjustment",
      description: "Slide length and tone control inputs. Perform offline grammar scans for spelling and composition errors.",
      demoComponent: <Step4ToneDemo />
    }
  ],
  5: [
    {
      title: "Visual Health Auditing",
      description: "Automatically audits margins, page limits, orphan words, and empty fields before final generation, auto-correcting spacing to fit one page.",
      demoComponent: <Step5ScanDemo />
    },
    {
      title: "PDF & Schema Backup",
      description: "Export high-resolution print PDFs or backup raw JSON to import back into your dashboard.",
      demoComponent: <Step5ExportDemo />
    }
  ]
};

export default function EditorOnboarding({ step }: EditorOnboardingProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    // Check if onboarding seen
    const seen = localStorage.getItem(`cvcircle_onboarding_seen_step_${step}`);
    if (!seen) {
      setIsOpen(true);
    }
  }, [step]);

  const handleClose = () => {
    localStorage.setItem(`cvcircle_onboarding_seen_step_${step}`, 'true');
    setIsOpen(false);
  };

  const slides = ONBOARDING_SLIDES_DATA[step];
  if (!isOpen || !slides || slides.length === 0) return null;

  const totalSlides = slides.length;
  const slide = slides[currentSlide];

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

  // Sync current slide to pill mockup active states
  const activePillPanel = step === 3 
    ? (currentSlide === 0 ? 'role' : currentSlide === 1 ? 'mori' : currentSlide === 2 ? 'design' : currentSlide === 3 ? 'layout' : 'json') 
    : step === 4
      ? (currentSlide === 0 ? 'mori' : currentSlide === 1 ? 'layout' : 'design')
      : (currentSlide === 0 ? 'layout' : 'json');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
        {/* Fullscreen blocker click is disabled to force action */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white dark:bg-[#111317] border border-gray-200 dark:border-white/10 rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="px-8 py-5 border-b border-gray-100 dark:border-white/5 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent flex justify-between items-center shrink-0">
            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500">
                Step {step} Walkthrough
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

          {/* Interactive Utility Panel Pill Mockup Sync */}
          <div className="flex justify-center py-4 bg-gray-50/50 dark:bg-black/30 border-b border-gray-100 dark:border-white/5 shrink-0">
            <div className="flex items-center gap-1 bg-gray-200 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-full p-1 shrink-0 scale-105 shadow-inner">
              {[
                { id: 'role', icon: Briefcase, label: 'Target Position', slideIndex: 0, visible: step === 3 },
                { id: 'mori', icon: Sparkles, label: 'Mori AI Assistant', slideIndex: step === 3 ? 1 : step === 4 ? 0 : -1, visible: step === 3 || step === 4 },
                { id: 'design', icon: Palette, label: 'Global Design', slideIndex: step === 3 ? 2 : step === 4 ? 2 : -1, visible: step === 3 || step === 4 },
                { id: 'layout', icon: LayoutTemplate, label: 'Template Library', slideIndex: step === 3 ? 3 : step === 4 ? 1 : step === 5 ? 0 : -1, visible: step === 3 || step === 4 || step === 5 },
                { id: 'json', icon: FileJson, label: 'Raw JSON Editor', slideIndex: step === 3 ? 4 : step === 5 ? 1 : -1, visible: step === 3 || step === 5 }
              ].filter(btn => btn.visible).map(btn => {
                const Icon = btn.icon;
                const isActive = activePillPanel === btn.id;
                return (
                  <button
                    key={btn.id}
                    onClick={() => {
                      if (btn.slideIndex >= 0) {
                        setCurrentSlide(btn.slideIndex);
                      }
                    }}
                    className={`p-2 rounded-full transition-all flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 duration-150 ${
                      isActive 
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 scale-110 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-white/10'
                    }`}
                    title={btn.label}
                  >
                    <Icon className="w-4.5 h-4.5" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Core Content */}
          <div className="flex-1 flex flex-col overflow-y-auto">
            {/* 16:9 Animation Video Window */}
            <div className="w-full aspect-video border-b border-gray-100 dark:border-white/5 relative overflow-hidden bg-black/40 flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div 
                  key={currentSlide}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full"
                >
                  {slide.demoComponent}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Description Area */}
            <div className="p-8 space-y-3.5 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#80FF00]/90">
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
                  {slides.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentSlide(idx)}
                      className={`h-2.5 rounded-full transition-all duration-300 ${
                        currentSlide === idx ? 'w-6 bg-[#80FF00]' : 'w-2.5 bg-gray-300 dark:bg-white/10 hover:bg-white/20'
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
                    className="px-5 py-2.5 rounded-xl bg-[#80FF00] hover:bg-[#70e600] text-black text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer shadow-md hover:shadow-lg active:scale-95 duration-100"
                  >
                    <span>{currentSlide === totalSlides - 1 ? "Start Building" : "Next"}</span>
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
