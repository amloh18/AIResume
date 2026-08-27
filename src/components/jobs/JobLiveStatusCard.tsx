'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, AlertCircle, X, Sparkles, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { JobLiveStatus, useJobLiveStatusStore } from '@/lib/stores/jobLiveStatusStore';

export interface JobLiveStatusCardProps {
  status: JobLiveStatus;
  onClose?: () => void;
  compact?: boolean;
  inline?: boolean;
}

export function JobLiveStatusCard({
  status,
  onClose,
  compact = false,
  inline = false,
}: JobLiveStatusCardProps) {
  const router = useRouter();
  const { decrementTimer, pauseAutoClose, clearStatus } = useJobLiveStatusStore();

  const isSuccess = status.step === 'submitted' || status.success === true;
  const isFailed = status.step === 'failed' || status.success === false;
  const isInProgress = !isSuccess && !isFailed;

  // Countdown timer effect
  useEffect(() => {
    if (!status.autoCloseSeconds || status.autoClosePaused) return;

    const timer = setInterval(() => {
      decrementTimer(status.jobId);
    }, 1000);

    return () => clearInterval(timer);
  }, [status.autoCloseSeconds, status.autoClosePaused, status.jobId, decrementTimer]);

  const handleActionClick = (action: { label: string; onClick?: () => void; href?: string }, e: React.MouseEvent) => {
    e.stopPropagation();
    if (action.onClick) {
      action.onClick();
    } else if (action.href) {
      router.push(action.href);
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClose) {
      onClose();
    } else {
      clearStatus(status.jobId);
    }
  };

  const handlePause = (e: React.MouseEvent) => {
    e.stopPropagation();
    pauseAutoClose(status.jobId);
  };

  const containerClasses = inline
    ? `relative flex flex-col justify-between h-full w-full rounded-xl bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200/80 dark:border-white/10 overflow-hidden ${
        isFailed ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-emerald-500'
      } ${compact ? 'p-3' : 'p-3.5'}`
    : `relative flex flex-col justify-between h-full w-full rounded-2xl bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm ${
        isFailed ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-emerald-500'
      } ${compact ? 'p-3.5' : 'p-4 sm:p-5'}`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className={containerClasses}
    >
      <div className="space-y-2.5">
        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {/* Status Icon */}
            {isSuccess && (
              <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            )}
            {isInProgress && (
              <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
              </div>
            )}
            {isFailed && (
              <div className="w-6 h-6 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center shrink-0">
                <AlertCircle className="w-3.5 h-3.5" />
              </div>
            )}

            {/* Title */}
            <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white leading-tight truncate">
              {status.title || (isSuccess ? 'Application Submitted' : isInProgress ? 'Processing Application' : 'Application Failed')}
            </h4>
          </div>

          {/* Dismiss Button */}
          <button
            type="button"
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors shrink-0"
            title="Dismiss status"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Description / Subtitle */}
        <p className="text-[11px] sm:text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
          {status.description ||
            (status.company
              ? `Tailored application prepared for ${status.company}. Review documents in Studio or complete submission.`
              : 'Application is being prepared and synchronized.')}
        </p>

        {/* Action CTAs */}
        {status.actions && status.actions.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {status.actions.map((action, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => handleActionClick(action, e)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-white/10 hover:bg-gray-50 dark:hover:bg-white/15 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 transition-colors shadow-xs"
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : isSuccess ? (
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                router.push('/dashboard/jobs?tab=applications');
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-white/10 hover:bg-gray-50 dark:hover:bg-white/15 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 transition-colors shadow-xs"
            >
              Check tracker
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                router.push('/dashboard/interview');
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-white/10 hover:bg-gray-50 dark:hover:bg-white/15 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 transition-colors shadow-xs"
            >
              Prep for the interview
            </button>
          </div>
        ) : null}
      </div>

      {/* Footer / Timer Bar */}
      <div className="mt-auto pt-2.5 border-t border-gray-200/60 dark:border-white/5 space-y-1.5">
        {status.autoCloseSeconds !== undefined && status.autoCloseSeconds > 0 && !status.autoClosePaused ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400">
              <span>
                This message will close in {status.autoCloseSeconds}s.{' '}
                <button
                  type="button"
                  onClick={handlePause}
                  className="font-semibold text-gray-700 dark:text-gray-200 hover:underline inline-block"
                >
                  Click to stop.
                </button>
              </span>
            </div>
            <div className="w-full h-1 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-emerald-500"
                initial={{ width: '100%' }}
                animate={{ width: `${((status.autoCloseSeconds || 1) / 10) * 100}%` }}
                transition={{ duration: 1, ease: 'linear' }}
              />
            </div>
          </div>
        ) : isInProgress ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400">
              <span>{status.step === 'matching' ? 'Matching CV...' : status.step === 'tailoring' ? 'Tailoring documents...' : 'Submitting to ATS...'}</span>
              <span className="font-semibold text-emerald-500">{status.progress || 50}%</span>
            </div>
            <div className="w-full h-1 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${status.progress || 50}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

export default JobLiveStatusCard;
