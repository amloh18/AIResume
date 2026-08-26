'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronRight } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3;
  completedSteps: number[];
  onStepClick?: (step: 1 | 2 | 3) => void;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

const steps = [
  { number: 1, label: 'Editor', description: 'Edit and optimize with AI' },
  { number: 2, label: 'Cover Letter Editor', description: 'Generate AI cover letter' },
  { number: 3, label: 'Review', description: 'Preview and save' }
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
      <div className={`flex flex-col gap-3 ${className}`}>
        {/* Compact horizontal step numbers */}
        <div className="flex items-center justify-between gap-1">
          {steps.map((step, index) => {
            const isActive = currentStep === step.number;
            const isCompleted = completedSteps.includes(step.number);
            const isClickable = isCompleted && onStepClick;

            return (
              <React.Fragment key={step.number}>
                <motion.button
                  type="button"
                  onClick={() => isClickable && onStepClick?.(step.number as 1 | 2 | 3)}
                  disabled={!isClickable}
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 flex-shrink-0
                    ${isCompleted ? 'bg-[#013f2e] text-black cursor-pointer hover:bg-[#02523c] shadow-sm shadow-[#013f2e]/20' : ''}
                    ${isActive && !isCompleted ? 'bg-white/5 text-white ring-2 ring-[#013f2e]/50 shadow-sm shadow-black/30' : ''}
                    ${!isActive && !isCompleted ? 'bg-white/5 text-gray-500' : ''}
                    ${isClickable ? 'cursor-pointer' : 'cursor-default'}
                  `}
                  whileHover={isClickable ? { scale: 1.05 } : {}}
                  whileTap={isClickable ? { scale: 0.95 } : {}}
                  title={step.label}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 stroke-[2.5] text-black" />
                  ) : (
                    <span>{step.number}</span>
                  )}
                </motion.button>

                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 rounded-full ${completedSteps.includes(step.number) ? 'bg-[#013f2e]' : 'bg-white/10'
                      }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Current step label */}
        <div className="text-center">
          <div className="text-sm font-semibold text-white">
            {steps.find(s => s.number === currentStep)?.label}
          </div>
          <div className="text-[10px] text-gray-400">
            {steps.find(s => s.number === currentStep)?.description}
          </div>
        </div>
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
                onClick={() => isClickable && onStepClick?.(step.number as 1 | 2 | 3)}
                disabled={!isClickable}
                className={`
                    w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 flex-shrink-0
                    ${isCompleted ? 'bg-[#013f2e] text-black cursor-pointer hover:bg-[#02523c] shadow-sm shadow-[#013f2e]/20' : ''}
                    ${isActive && !isCompleted ? 'bg-white/5 text-white shadow-sm shadow-black/30' : ''}
                    ${!isActive && !isCompleted ? 'bg-white/5 text-gray-500' : ''}
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
                  ${isCompleted ? 'text-[#013f2e]' : ''}
                  ${isActive && !isCompleted ? 'text-white' : ''}
                  ${!isActive && !isCompleted ? 'text-gray-500' : ''}
                `}>
                {step.label}
              </span>
            </div>

            {/* Chevron Separator */}
            {index < steps.length - 1 && (
              <ChevronRight className="w-5 h-5 text-gray-600 flex-shrink-0 mx-1" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
