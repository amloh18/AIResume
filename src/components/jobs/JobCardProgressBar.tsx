'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bookmark,
  FileText,
  FileCheck2,
  Send,
  CheckCircle2,
  MessageSquare,
  Trophy,
  XCircle,
  Loader2,
} from 'lucide-react';
import type { JobLiveStep } from '@/lib/stores/jobLiveStatusStore';

/**
 * Pipeline stages for the inline progress bar.
 * Each stage has an icon, label, and color.
 * The `order` field determines position on the progress bar.
 */
const PROGRESS_STAGES: Record<string, { icon: React.ElementType; label: string; order: number; activeColor: string; doneColor: string }> = {
  saving:            { icon: Bookmark,          label: 'Saving',                order: 0, activeColor: 'text-amber-500',    doneColor: 'text-amber-500' },
  tailoring_cv:      { icon: FileText,          label: 'Tailoring CV',          order: 1, activeColor: 'text-blue-500',     doneColor: 'text-blue-500' },
  tailoring_cover_letter: { icon: FileCheck2,   label: 'Cover Letter',          order: 2, activeColor: 'text-purple-500',   doneColor: 'text-purple-500' },
  applying:          { icon: Send,              label: 'Applying',              order: 3, activeColor: 'text-[#013f2e] dark:text-[#36D39B]', doneColor: 'text-[#013f2e] dark:text-[#36D39B]' },
  applied:           { icon: CheckCircle2,      label: 'Applied',               order: 4, activeColor: 'text-sky-500',      doneColor: 'text-sky-500' },
  interview:         { icon: MessageSquare,     label: 'Interview',             order: 5, activeColor: 'text-orange-500',   doneColor: 'text-orange-500' },
  accepted:          { icon: Trophy,            label: 'Accepted',              order: 6, activeColor: 'text-emerald-500',  doneColor: 'text-emerald-500' },
  failed:            { icon: XCircle,           label: 'Failed',                order: 99, activeColor: 'text-rose-500',    doneColor: 'text-rose-500' },
};

/** Map legacy steps to new pipeline stages */
function resolveStageFromStep(step: JobLiveStep): string {
  switch (step) {
    case 'saving':            return 'saving';
    case 'matching':          return 'saving';
    case 'tailoring_cv':      return 'tailoring_cv';
    case 'tailoring':         return 'tailoring_cv';
    case 'tailoring_cover_letter': return 'tailoring_cover_letter';
    case 'queued':            return 'applying';
    case 'submitting':        return 'applying';
    case 'applying':          return 'applying';
    case 'applied':           return 'applied';
    case 'submitted':         return 'applied';
    case 'interview':         return 'interview';
    case 'accepted':          return 'accepted';
    case 'failed':            return 'failed';
    default:                  return 'saving';
  }
}

export interface JobCardProgressBarProps {
  currentStep: JobLiveStep;
  progress: number;
  success?: boolean;
  description?: string;
  jobTitle?: string;
  company?: string;
}

export function JobCardProgressBar({
  currentStep,
  progress,
  success,
  description,
  jobTitle,
  company,
}: JobCardProgressBarProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const currentStage = resolveStageFromStep(currentStep);
  const currentOrder = PROGRESS_STAGES[currentStage]?.order ?? 0;
  const isFailed = currentStep === 'failed';
  const isComplete = currentStep === 'applied' || currentStep === 'submitted' || currentStep === 'interview' || currentStep === 'accepted';

  // Determine which stages are done vs active vs upcoming
  const stages = Object.entries(PROGRESS_STAGES)
    .filter(([key]) => key !== 'failed')
    .sort((a, b) => a[1].order - b[1].order);

  return (
    <div className="w-full space-y-2.5" onClick={(e) => e.stopPropagation()}>
      {/* Stage icons row */}
      <div className="flex items-center justify-between px-0.5">
        {stages.map(([key, meta], idx) => {
          const stageOrder = meta.order;
          const isDone = isFailed
            ? stageOrder < currentOrder
            : stageOrder < currentOrder || (stageOrder === currentOrder && progress >= 100);
          const isActive = !isDone && !isFailed && stageOrder === currentOrder;
          const Icon = meta.icon;

          return (
            <React.Fragment key={key}>
              {/* Stage dot + icon */}
              <motion.div
                initial={mounted ? false : { scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: idx * 0.05, duration: 0.2 }}
                className="flex flex-col items-center gap-1 relative z-10"
              >
                <div
                  className={`
                    w-7 h-7 rounded-full flex items-center justify-center transition-all duration-500
                    ${isDone
                      ? `${meta.doneColor} bg-current/10`
                      : isActive
                        ? `${meta.activeColor} bg-current/10 ring-2 ring-current/30`
                        : 'text-gray-300 dark:text-gray-600 bg-gray-100 dark:bg-white/5'
                    }
                  `}
                >
                  {isActive ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Icon className="w-3.5 h-3.5" />
                  )}
                </div>
                <span
                  className={`
                    text-[9px] font-semibold leading-none transition-colors duration-300
                    ${isDone || isActive ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}
                  `}
                >
                  {meta.label}
                </span>
              </motion.div>

              {/* Connector line between stages */}
              {idx < stages.length - 1 && (
                <div className="flex-1 h-0.5 mx-1 mt-[-14px] relative">
                  <div className="absolute inset-0 bg-gray-200 dark:bg-white/10 rounded-full" />
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: isDone ? 1 : 0 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className={`absolute inset-0 origin-left rounded-full ${
                      isFailed && stageOrder >= currentOrder
                        ? 'bg-rose-400/50'
                        : 'bg-[#013f2e] dark:bg-[#36D39B]'
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="relative w-full h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className={`absolute inset-y-0 left-0 rounded-full ${
            isFailed
              ? 'bg-rose-500'
              : isComplete
                ? 'bg-emerald-500'
                : 'bg-[#013f2e] dark:bg-[#36D39B]'
          }`}
        />
        {/* Shimmer effect while active */}
        {!isComplete && !isFailed && (
          <motion.div
            className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full"
            animate={{ x: ['-80px', '400px'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        )}
      </div>

      {/* Current action text */}
      <AnimatePresence mode="wait">
        <motion.p
          key={currentStage}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="text-[11px] text-gray-600 dark:text-gray-400 text-center leading-snug"
        >
          {isFailed ? (
            <span className="text-rose-500">{description || 'Application failed'}</span>
          ) : isComplete ? (
            <span className="text-emerald-600 dark:text-emerald-400">{description || 'Complete'}</span>
          ) : (
            description || `${PROGRESS_STAGES[currentStage]?.label || 'Processing'}...`
          )}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
