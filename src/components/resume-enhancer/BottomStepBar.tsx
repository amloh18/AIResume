'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check, Palette, PenTool, FileText, Edit2 } from 'lucide-react';

interface HeaderStep {
  id: 'layout' | 'edit' | 'cover' | 'review';
  label: string;
  isActive: boolean;
  isCompleted: boolean;
  targetStep: number;
  openTemplateOverlay?: boolean;
}

interface BottomStepBarProps {
  steps: HeaderStep[];
  currentStep: number;
  isTemplateOverlayOpen: boolean;
  onNavigate: (targetStep: number, openOverlay: boolean) => void;
}

function getStepIcon(id: HeaderStep['id'], isActive: boolean) {
  switch (id) {
    case 'layout':  return Palette;
    case 'edit':    return PenTool;
    case 'cover':   return isActive ? PenTool : FileText;
    case 'review':  return FileText;
    default:        return Edit2;
  }
}

export default function BottomStepBar({ steps, onNavigate }: BottomStepBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeIndex = steps.findIndex((s) => s.isActive);
  const safeActive  = activeIndex === -1 ? 0 : activeIndex;

  const canGoBack    = safeActive > 0;
  const canGoForward = safeActive < steps.length - 1;

  const goBack = useCallback(() => {
    if (!canGoBack) return;
    const prev = steps[safeActive - 1];
    onNavigate(prev.targetStep, !!prev.openTemplateOverlay);
  }, [canGoBack, safeActive, steps, onNavigate]);

  const goForward = useCallback(() => {
    if (!canGoForward) return;
    const next = steps[safeActive + 1];
    onNavigate(next.targetStep, !!next.openTemplateOverlay);
  }, [canGoForward, safeActive, steps, onNavigate]);

  return (
    <div
      className="flex items-center justify-center select-none origin-center"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      onTouchStart={() => setIsExpanded(true)}
      onTouchEnd={() => setTimeout(() => setIsExpanded(false), 1800)}
    >
      <motion.div
        layout
        style={{ transformOrigin: 'center center' }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        className="bg-white/95 dark:bg-[#141810]/95 backdrop-blur-md border border-gray-200/90 dark:border-white/10 rounded-full shadow-lg overflow-hidden flex items-center justify-center origin-center"
      >
        <AnimatePresence mode="wait" initial={false}>
          {!isExpanded ? (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              className="h-7 px-3.5 flex items-center justify-center gap-2 origin-center"
            >
              {steps.map((step) => (
                <button
                  key={step.id}
                  onClick={() => onNavigate(step.targetStep, !!step.openTemplateOverlay)}
                  title={step.label}
                  className="flex items-center justify-center p-0.5 transition-transform hover:scale-125 active:scale-90"
                >
                  {step.isCompleted ? (
                    <span className="w-2 h-2 rounded-full bg-lime-500 dark:bg-[#013f2e] block shadow-[0_0_5px_rgba(1, 63, 46,0.5)]" />
                  ) : step.isActive ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-lime-500 dark:bg-[#013f2e] block ring-2 ring-lime-300 dark:ring-[#013f2e]/40 shadow-[0_0_8px_rgba(1, 63, 46,0.6)]" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-white/20 block" />
                  )}
                </button>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="h-9 px-1.5 flex items-center justify-center gap-1 origin-center"
            >
              <button
                onClick={goBack}
                disabled={!canGoBack}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 disabled:opacity-25 disabled:cursor-not-allowed transition-all active:scale-90 flex-shrink-0"
                aria-label="Previous step"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1 mx-0.5">
                {steps.map((step, index) => {
                  const Icon = getStepIcon(step.id, step.isActive);
                  return (
                    <React.Fragment key={step.id}>
                      <button
                        onClick={() => onNavigate(step.targetStep, !!step.openTemplateOverlay)}
                        className={`h-7 flex items-center gap-1.5 px-2.5 rounded-full transition-all duration-200 active:scale-95 ${
                          step.isActive
                            ? 'bg-[#f1f9ec] dark:bg-[#1a2312] border border-[#dcedd9] dark:border-[#2a3c1d] shadow-sm'
                            : 'hover:bg-gray-100 dark:hover:bg-white/5'
                        }`}
                      >
                        {step.isCompleted ? (
                          <span className="w-4 h-4 rounded-full bg-lime-500 dark:bg-[#013f2e] flex items-center justify-center flex-shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3] text-white" />
                          </span>
                        ) : (
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                            step.isActive
                              ? 'bg-lime-600 dark:bg-[#02523c] text-white'
                              : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500'
                          }`}>
                            <Icon className="w-2.5 h-2.5 stroke-[2.5]" />
                          </span>
                        )}
                        <span className={`text-xs font-bold whitespace-nowrap leading-none ${
                          step.isActive
                            ? 'text-lime-800 dark:text-lime-400'
                            : step.isCompleted
                            ? 'text-gray-700 dark:text-gray-200'
                            : 'text-gray-400 dark:text-gray-500'
                        }`}>
                          {step.label}
                        </span>
                      </button>

                      {index < steps.length - 1 && (
                        <div className="w-3 h-px bg-gray-200 dark:bg-white/10 flex-shrink-0" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              <button
                onClick={goForward}
                disabled={!canGoForward}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-lime-500 dark:bg-[#013f2e] hover:bg-lime-600 dark:hover:bg-[#02523c] text-white disabled:bg-gray-100 dark:disabled:bg-white/5 disabled:text-gray-400 dark:disabled:text-gray-500 disabled:cursor-not-allowed transition-all active:scale-90 flex-shrink-0 shadow-sm"
                aria-label="Next step"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
