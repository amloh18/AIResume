'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';

export default function EditorStepsNavOverlay() {
  const { state, goToStep } = useResumeEnhancer();
  const [isHovered, setIsHovered] = useState(false);

  const isMaster = state.cvType === 'master';
  
  // Construct the active flow steps list
  const stepsList = [
    { stepNumber: 1, label: 'Dashboard', description: 'Access your documents' },
    { stepNumber: 3, label: 'CV Builder', description: 'Optimize & edit resume' },
  ];
  
  if (!isMaster) {
    stepsList.push({ stepNumber: 4, label: 'Cover Letter', description: 'Generate matching cover letter' });
  }
  
  stepsList.push({ stepNumber: 5, label: 'Review & Export', description: 'Verify & download print PDFs' });

  // Map state.currentStep (1, 3, 4, 5) to index in active stepsList
  const currentIdx = stepsList.findIndex(s => s.stepNumber === state.currentStep);
  if (currentIdx === -1) return null; // Not in a recognized step flow (e.g. loading)

  const currentStepInfo = stepsList[currentIdx];
  const totalSteps = stepsList.length;
  const displayStepNumber = currentIdx + 1;

  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx < totalSteps - 1;

  const handlePrev = () => {
    if (hasPrev) {
      const prevStep = stepsList[currentIdx - 1];
      goToStep(prevStep.stepNumber as any);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      const nextStep = stepsList[currentIdx + 1];
      goToStep(nextStep.stepNumber as any);
    }
  };

  const prevStepInfo = hasPrev ? stepsList[currentIdx - 1] : null;
  const nextStepInfo = hasNext ? stepsList[currentIdx + 1] : null;

  return (
    <motion.div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="w-full shrink-0 mt-auto p-4 border-t border-gray-100 dark:border-white/5 no-print"
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="w-full rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-[#0f120a] shadow-lg overflow-hidden p-2.5 flex flex-col gap-2 transition-all duration-300">
        
        {/* Hover expanded panel containing full walkthrough step descriptions */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-b border-gray-100 dark:border-white/5 pb-2 flex flex-col gap-2.5"
            >
              <div className="flex justify-between items-center text-[10px] font-black tracking-wider text-emerald-500 uppercase">
                <span>Step Walkthrough Progress</span>
                <span>{displayStepNumber} of {totalSteps} Completed</span>
              </div>
              
              {/* Vertical steps progression */}
              <div className="flex flex-col gap-2 pt-1">
                {stepsList.map((step, idx) => {
                  const isActive = idx === currentIdx;
                  const isDone = idx < currentIdx;
                  
                  return (
                    <div key={step.stepNumber} className="flex gap-2.5 items-start">
                      <div className="flex flex-col items-center">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${
                          isActive 
                            ? 'bg-[#80FF00] text-black ring-2 ring-[#80FF00]/40' 
                            : isDone 
                              ? 'bg-emerald-500/20 text-emerald-500' 
                              : 'bg-gray-100 dark:bg-white/5 text-gray-400'
                        }`}>
                          {idx + 1}
                        </div>
                        {idx < totalSteps - 1 && (
                          <div className={`w-0.5 h-6 ${isDone ? 'bg-emerald-500/30' : 'bg-gray-200 dark:bg-white/5'}`} />
                        )}
                      </div>
                      <div className="flex-1 flex flex-col min-w-0 -mt-0.5">
                        <span className={`text-[11px] font-black leading-none uppercase tracking-tight ${
                          isActive ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'
                        }`}>
                          {step.label}
                        </span>
                        <span className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5 leading-tight truncate">
                          {step.description}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Next/Prev details */}
              <div className="flex justify-between items-center bg-gray-50/50 dark:bg-black/20 rounded-lg p-2 text-[10px] font-medium text-gray-500 dark:text-gray-400">
                {prevStepInfo ? (
                  <span className="truncate max-w-[45%]">
                    Prev: <strong className="text-gray-700 dark:text-gray-300">{prevStepInfo.label}</strong>
                  </span>
                ) : <span className="opacity-0">None</span>}
                {nextStepInfo ? (
                  <span className="truncate max-w-[45%] text-right">
                    Next: <strong className="text-gray-700 dark:text-gray-300">{nextStepInfo.label}</strong>
                  </span>
                ) : <span className="opacity-0">None</span>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Controls & Stepper Summary */}
        <div className="flex items-center justify-between gap-2.5">
          {/* Back Action */}
          <button
            onClick={handlePrev}
            disabled={!hasPrev}
            className={`h-9 px-3.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 border-none cursor-pointer transition-all duration-200 ${
              hasPrev 
                ? 'bg-gray-150 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-white hover:scale-102 active:scale-98' 
                : 'opacity-30 cursor-not-allowed text-gray-400 dark:text-gray-600 bg-transparent'
            }`}
            title={prevStepInfo ? `Back to ${prevStepInfo.label}` : 'First Step'}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          {/* Steps Indicator Tracker */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-wider leading-none">
              Step {displayStepNumber} of {totalSteps}
            </span>
            <div className="flex gap-1.5 mt-1">
              {stepsList.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentIdx 
                      ? 'w-5 bg-[#80FF00]' 
                      : idx < currentIdx 
                        ? 'w-1.5 bg-emerald-500/60' 
                        : 'w-1.5 bg-gray-200 dark:bg-white/10'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Next Action */}
          <button
            onClick={handleNext}
            disabled={!hasNext}
            className={`h-9 px-3.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 border-none cursor-pointer transition-all duration-200 ${
              hasNext 
                ? 'bg-[#80FF00] hover:bg-[#70e600] text-black hover:scale-102 active:scale-98 shadow-md shadow-[#80FF00]/10' 
                : 'opacity-30 cursor-not-allowed text-gray-400 dark:text-gray-600 bg-transparent'
            }`}
            title={nextStepInfo ? `Next to ${nextStepInfo.label}` : 'Final Step'}
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </motion.div>
  );
}
