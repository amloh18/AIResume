'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';

// 6x6 Matrix shapes definition
// 0 = empty, 1 = active filled pixel
export const MORPH_SHAPES = {
  // Arrow pointing up-right (Conversion / Career Growth)
  growthArrow: [
    [0, 0, 0, 1, 1, 1],
    [0, 0, 0, 0, 1, 1],
    [0, 0, 0, 1, 0, 1],
    [0, 0, 1, 0, 0, 0],
    [0, 1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0],
  ],
  // Classic Up Arrow (like Invocas video)
  arrowUp: [
    [0, 0, 1, 1, 0, 0],
    [0, 1, 1, 1, 1, 0],
    [1, 1, 0, 0, 1, 1],
    [0, 0, 1, 1, 0, 0],
    [0, 0, 1, 1, 0, 0],
    [0, 0, 1, 1, 0, 0],
  ],
  // Step Chart (Optimization / ATS Score 98%)
  stepChart: [
    [0, 0, 0, 0, 1, 1],
    [0, 0, 0, 1, 1, 1],
    [0, 0, 1, 1, 1, 1],
    [0, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1],
  ],
  // Smiley / Happy Candidate (Confidence & Interviews)
  happyFace: [
    [0, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 1, 0],
    [0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 1],
    [0, 1, 1, 1, 1, 0],
    [0, 0, 0, 0, 0, 0],
  ],
  // Checkmark Shield (ATS Passed / Flawless Parse)
  verifiedShield: [
    [0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 1, 1],
    [1, 0, 0, 1, 1, 0],
    [1, 1, 1, 1, 0, 0],
    [0, 1, 1, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
  ],
  // Ecosystem Nodes Hub (Extensions / Integrations)
  nodesHub: [
    [0, 1, 0, 0, 1, 0],
    [1, 1, 1, 1, 1, 1],
    [0, 1, 0, 0, 1, 0],
    [0, 0, 1, 1, 0, 0],
    [1, 1, 1, 1, 1, 1],
    [0, 1, 0, 0, 1, 0],
  ]
};

export type ShapeKey = keyof typeof MORPH_SHAPES;

interface MorphGridProps {
  activeShape?: ShapeKey;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  interactive?: boolean;
}

export const MorphGrid: React.FC<MorphGridProps> = ({
  activeShape = 'arrowUp',
  size = 'md',
  className = '',
  interactive = false,
}) => {
  const [currentShape, setCurrentShape] = useState<ShapeKey>(activeShape);

  useEffect(() => {
    setCurrentShape(activeShape);
  }, [activeShape]);

  // Auto-cycle shapes if interactive
  useEffect(() => {
    if (!interactive) return;
    const keys = Object.keys(MORPH_SHAPES) as ShapeKey[];
    let idx = keys.indexOf(currentShape);
    const interval = setInterval(() => {
      idx = (idx + 1) % keys.length;
      setCurrentShape(keys[idx]);
    }, 2800);
    return () => clearInterval(interval);
  }, [interactive, currentShape]);

  const matrix = MORPH_SHAPES[currentShape] || MORPH_SHAPES.arrowUp;

  const cellDimensions = {
    sm: 'w-4 h-4 rounded-sm',
    md: 'w-6 h-6 sm:w-7 sm:h-7 rounded-[4px]',
    lg: 'w-8 h-8 sm:w-9 sm:h-9 rounded-md',
  }[size];

  const gapSize = {
    sm: 'gap-1',
    md: 'gap-1.5 sm:gap-2',
    lg: 'gap-2 sm:gap-2.5',
  }[size];

  return (
    <div className={`relative p-4 sm:p-5 rounded-2xl bg-[#061811]/90 border border-emerald-500/20 shadow-2xl backdrop-blur-md overflow-hidden ${className}`}>
      {/* Background grid line overlay */}
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(to right, #36D39B 1px, transparent 1px), linear-gradient(to bottom, #36D39B 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      <div className={`relative z-10 grid grid-cols-6 ${gapSize}`}>
        {matrix.map((row, rIdx) =>
          row.map((cell, cIdx) => {
            const isFilled = cell === 1;
            const cellId = `cell-${rIdx}-${cIdx}`;

            return (
              <div
                key={cellId}
                className={`relative flex items-center justify-center ${cellDimensions} transition-colors duration-300 ${
                  isFilled
                    ? 'bg-transparent'
                    : 'bg-emerald-950/20 border border-emerald-900/30'
                }`}
              >
                {isFilled && (
                  <motion.div
                    layoutId={cellId}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 25,
                      mass: 0.6,
                    }}
                    className={`w-full h-full rounded-[inherit] bg-gradient-to-tr from-[#25a87a] via-[#36D39B] to-[#86E8D1] shadow-[0_0_12px_rgba(54,211,155,0.6)]`}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// Interactive Morphing Signal Pill component inspired by video (e.g., Prospect calling, Mentioned Promotion, Application Completed)
interface SignalPillProps {
  label: string;
  active?: boolean;
  count?: number;
  onClick?: () => void;
  className?: string;
}

export const SignalPill: React.FC<SignalPillProps> = ({
  label,
  active = true,
  count,
  onClick,
  className = '',
}) => {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.03, y: -1 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 450, damping: 25 }}
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-tight transition-all duration-300 border ${
        active
          ? 'bg-[#013f2e]/90 border-emerald-400/40 text-white shadow-[0_0_15px_rgba(1,63,46,0.5)]'
          : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
      } ${className}`}
    >
      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
        active ? 'bg-emerald-400 text-black font-extrabold shadow-sm' : 'bg-white/10 text-gray-400'
      }`}>
        <Check className="w-2.5 h-2.5 stroke-[3.5]" />
      </div>
      <span>{label}</span>
      {typeof count === 'number' && (
        <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-white/10 text-emerald-300 font-mono">
          {count}
        </span>
      )}
    </motion.button>
  );
};

// Morphing Interactive Signal Deck (inspired by 00:02 - 00:03 in reference video)
export const MorphSignalDeck: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [activeSignal, setActiveSignal] = useState(0);

  const signals = [
    { label: 'ATS Parsed 98%', shape: 'verifiedShield' as ShapeKey, desc: 'Taleo, Workday & Greenhouse validated' },
    { label: 'Keywords Matched (14/14)', shape: 'growthArrow' as ShapeKey, desc: 'Semantic density & role calibration' },
    { label: 'STAR Impact Metrics', shape: 'stepChart' as ShapeKey, desc: 'Quantified bullet points generated' },
    { label: 'Ready for Interview', shape: 'happyFace' as ShapeKey, desc: 'Custom questions & AI coach primed' },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSignal((prev) => (prev + 1) % signals.length);
    }, 3200);
    return () => clearInterval(timer);
  }, [signals.length]);

  return (
    <div className={`rounded-3xl bg-gradient-to-br from-[#0c1813] via-[#09120e] to-[#050b08] border border-emerald-500/20 p-6 sm:p-8 shadow-2xl overflow-hidden relative ${className}`}>
      {/* Radial ambient glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#36D39B]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
        
        {/* Left Side: Header & Interactive Morphing Signals */}
        <div className="flex-1 w-full text-left">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Met Signals ({signals.length})
            </span>
          </div>

          <h3 className="text-2xl sm:text-3xl font-extrabold text-[#F5F7F7] tracking-tight mb-3">
            Ready to accelerate your job search?
          </h3>
          <p className="text-sm text-gray-400 leading-relaxed mb-6 max-w-md">
            Watch your resume match requirements in real time as our lexical engine and ATS parsers optimize each section.
          </p>

          {/* Signal Pills Matrix */}
          <div className="flex flex-wrap gap-2.5">
            {signals.map((sig, idx) => (
              <SignalPill
                key={sig.label}
                label={sig.label}
                active={activeSignal === idx}
                onClick={() => setActiveSignal(idx)}
              />
            ))}
          </div>

          <div className="mt-5 text-xs text-emerald-300/80 flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{signals[activeSignal].desc}</span>
          </div>
        </div>

        {/* Right Side: Morphing Matrix Display */}
        <div className="shrink-0 flex flex-col items-center">
          <MorphGrid
            activeShape={signals[activeSignal].shape}
            size="md"
          />
          <div className="mt-3 text-[11px] font-mono text-emerald-400/70 uppercase tracking-widest">
            {signals[activeSignal].shape.replace(/([A-Z])/g, ' $1')}
          </div>
        </div>

      </div>
    </div>
  );
};
