'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronRight } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3 | 4;
  completedSteps: number[];
  onStepClick?: (step: 1 | 2 | 3 | 4) => void;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

const steps = [
  { number: 1, label: 'Personal Info', description: 'Upload or add your resume details' },
  { number: 2, label: 'Template', description: 'Pick a template for your CV' },
  { number: 3, label: 'Builder & Surgeon', description: 'Edit and optimize with AI' },
  { number: 4, label: 'Review', description: 'Preview and save to dashboard' }
];

export default function StepIndicator({
  currentStep,
  completedSteps,
  onStepClick,
  orientation = 'horizontal',
  className = ''
}: StepIndicatorProps) {

  if (orientation === 'vertical') {
    return (
      <div className={`flex flex-col gap-0.5 ${className}`}>
        {steps.map((step, index) => {
          const isActive = currentStep === step.number;
          const isCompleted = completedSteps.includes(step.number);
          const isClickable = isCompleted && onStepClick;

          return (
            <div
              key={step.number}
              className={`
                rounded-xl px-3 pt-2 pb-0 transition-colors
                ${isActive ? 'bg-black/5 dark:bg-white/5 shadow-sm shadow-black/10 dark:shadow-black/30' : ''}
                ${isClickable ? 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5' : ''}
              `}
              onClick={() => isClickable && onStepClick?.(step.number as 1 | 2 | 3 | 4)}
              role={isClickable ? 'button' : undefined}
              tabIndex={isClickable ? 0 : -1}
              onKeyDown={(e) => {
                if (!isClickable) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onStepClick?.(step.number as 1 | 2 | 3 | 4);
                }
              }}
            >
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                <motion.button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isClickable) onStepClick?.(step.number as 1 | 2 | 3 | 4);
                  }}
                  disabled={!isClickable}
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 flex-shrink-0
                    ${isCompleted ? 'bg-[#80FF00] text-black cursor-pointer hover:bg-[#70e600] shadow-sm shadow-[#80FF00]/20' : ''}
                    ${isActive && !isCompleted ? 'bg-[var(--bg-tertiary)] text-[color:var(--text-primary)] shadow-sm shadow-black/10 dark:shadow-black/30' : ''}
                    ${!isActive && !isCompleted ? 'bg-black/5 dark:bg-white/5 text-[color:var(--text-tertiary)]' : ''}
                    ${isClickable ? 'cursor-pointer' : 'cursor-default'}
                  `}
                  whileHover={isClickable ? { scale: 1.05 } : {}}
                  whileTap={isClickable ? { scale: 0.95 } : {}}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 stroke-[2.5] text-black" />
                  ) : (
                    <span>{step.number}</span>
                  )}
                </motion.button>

                {index < steps.length - 1 && (
                  <div
                    className={`w-[2px] h-6 my-0.5 rounded-full ${
                      completedSteps.includes(step.number) ? 'bg-[#80FF00]' : 'bg-black/10 dark:bg-white/10'
                    }`}
                  />
                )}
                </div>

                <div className="min-w-0 pt-0.5">
                  <div className="flex items-center gap-2">
                    <div
                      className={`
                        text-sm font-semibold whitespace-nowrap
                        ${isCompleted ? 'text-[color:var(--text-primary)] dark:text-[color:var(--accent-primary)]' : ''}
                        ${isActive && !isCompleted ? 'text-[color:var(--text-primary)]' : ''}
                        ${!isActive && !isCompleted ? 'text-[color:var(--text-secondary)]' : ''}
                      `}
                    >
                      {step.label}
                    </div>
                    {isActive && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-[color:var(--text-secondary)]">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[color:var(--text-tertiary)] mt-0.5">
                    {step.description}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center max-w-2xl mx-auto gap-2 ${className}`}>
        {steps.map((step, index) => {
          const isActive = currentStep === step.number;
          const isCompleted = completedSteps.includes(step.number);
          const isClickable = isCompleted && onStepClick;

          return (
            <React.Fragment key={step.number}>
              {/* Step Circle with Label */}
              <div className="flex items-center gap-2">
                <motion.button
                  onClick={() => isClickable && onStepClick(step.number as 1 | 2 | 3 | 4)}
                  disabled={!isClickable}
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 flex-shrink-0
                    ${isCompleted ? 'bg-[#80FF00] text-black cursor-pointer hover:bg-[#70e600] shadow-sm shadow-[#80FF00]/20' : ''}
                    ${isActive && !isCompleted ? 'bg-black/5 dark:bg-white/5 text-[color:var(--text-primary)] shadow-sm shadow-black/10 dark:shadow-black/30' : ''}
                    ${!isActive && !isCompleted ? 'bg-black/5 dark:bg-white/5 text-[color:var(--text-tertiary)]' : ''}
                    ${isClickable ? 'cursor-pointer' : 'cursor-default'}
                  `}
                  whileHover={isClickable ? { scale: 1.05 } : {}}
                  whileTap={isClickable ? { scale: 0.95 } : {}}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 stroke-[2.5] text-black" />
                  ) : (
                    <span>{step.number}</span>
                  )}
                </motion.button>
                <span className={`
                  text-sm font-medium whitespace-nowrap
                  ${isCompleted ? 'text-[color:var(--text-primary)] dark:text-[#80FF00]' : ''}
                  ${isActive && !isCompleted ? 'text-[color:var(--text-primary)]' : ''}
                  ${!isActive && !isCompleted ? 'text-[color:var(--text-tertiary)]' : ''}
                `}>
                  {step.label}
                </span>
              </div>

              {/* Chevron Separator */}
              {index < steps.length - 1 && (
                <ChevronRight className="w-5 h-5 text-[color:var(--text-tertiary)] flex-shrink-0 mx-1" />
              )}
            </React.Fragment>
          );
        })}
    </div>
  );
}

