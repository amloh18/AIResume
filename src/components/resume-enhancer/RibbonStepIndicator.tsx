'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, User, Palette, Sparkles, Eye, FileText } from 'lucide-react';

interface RibbonStepIndicatorProps {
  currentStep: 1 | 2 | 3 | 4 | 5;
  completedSteps: number[];
  onStepClick?: (step: 1 | 2 | 3 | 4 | 5) => void;
  className?: string;
}

const steps = [
  {
    number: 1,
    label: 'Dashboard',
    description: 'Upload or add your resume details',
    icon: User
  },
  {
    number: 2,
    label: 'Template',
    description: 'Pick a template for your CV and CL',
    icon: Palette
  },
  {
    number: 3,
    label: 'Editor',
    description: 'Edit and optimize with AI',
    icon: Sparkles
  },
  {
    number: 4,
    label: 'Cover Letter Editor',
    description: 'Generate AI cover letter',
    icon: FileText
  },
  {
    number: 5,
    label: 'Review',
    description: 'Preview and save',
    icon: Eye
  }
];

export default function RibbonStepIndicator({
  currentStep,
  completedSteps,
  onStepClick,
  className = ''
}: RibbonStepIndicatorProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Show at the top (within 10px of top)
      if (currentScrollY < 10) {
        setIsVisible(true);
      }
      // Hide when scrolling down, show when scrolling up
      else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      }
      else if (currentScrollY < lastScrollY) {
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <motion.div
      animate={{
        y: isVisible ? 0 : -100,
        opacity: isVisible ? 1 : 0
      }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className={`w-full bg-white dark:bg-[#141810] border-t border-gray-200 dark:border-white/10 sticky top-[48px] z-[50] ${className}`}
      style={{ pointerEvents: isVisible ? 'auto' : 'none' }}
    >
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center justify-center gap-0 overflow-x-auto">
          {steps.map((step, index) => {
            const isActive = currentStep === step.number;
            const isCompleted = completedSteps.includes(step.number);
            const isClickable = isCompleted && onStepClick;
            const IconComponent = step.icon;
            const isFirst = index === 0;
            const isLast = index === steps.length - 1;

            return (
              <React.Fragment key={step.number}>
                {/* Ribbon Step Box */}
                <motion.div
                  onClick={() => isClickable && onStepClick?.(step.number as 1 | 2 | 3 | 4 | 5)}
                  className={`
                    relative flex items-center gap-2 min-w-[160px] px-4 py-2 transition-all duration-300
                    ${isActive
                      ? 'bg-[#1a230f] border-y border-[#80FF00]/30 text-[#80FF00] shadow-lg shadow-[#80FF00]/20'
                      : isCompleted
                        ? 'bg-[#80FF00]/10 border-y border-[#80FF00]/30 text-[#80FF00] hover:bg-[#80FF00]/15'
                        : 'bg-[#1a230f] border-y border-white/5 text-[color:var(--text-tertiary)]'
                    }
                    ${isClickable ? 'cursor-pointer hover:scale-105' : 'cursor-default'}
                  `}
                  style={{
                    clipPath: 'polygon(12px 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 12px 100%)'
                  }}
                  whileHover={isClickable ? { scale: 1.02 } : {}}
                  whileTap={isClickable ? { scale: 0.98 } : {}}
                >
                  {/* Icon Circle */}
                  <div className={`
                    w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0
                    ${isActive
                      ? 'bg-[#80FF00] text-black'
                      : isCompleted
                        ? 'bg-[#80FF00] text-black'
                        : 'bg-[#252a1f] text-[color:var(--text-tertiary)]'
                    }
                  `}>
                    {isCompleted || isActive ? (
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    ) : (
                      <IconComponent className="w-3.5 h-3.5 opacity-60" />
                    )}
                  </div>

                  {/* Step Number and Label */}
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`
                        text-xs font-bold
                        ${isActive ? 'text-[#80FF00]' : isCompleted ? 'text-[#80FF00]' : 'text-[color:var(--text-tertiary)]'}
                      `}>
                        {step.number}
                      </span>
                      <span className={`
                        text-xs font-semibold truncate
                        ${isActive ? 'text-[#80FF00]' : isCompleted ? 'text-[#80FF00]' : 'text-[color:var(--text-secondary)]'}
                      `}>
                        {step.label}
                      </span>
                    </div>
                    <div className={`
                      text-[10px] leading-tight truncate
                      ${isActive ? 'text-[#80FF00]/70' : isCompleted ? 'text-[#80FF00]/60' : 'text-[color:var(--text-tertiary)]'}
                    `}>
                      {step.description}
                    </div>
                  </div>
                </motion.div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

