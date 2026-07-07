'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

interface AgingTrackerWidgetProps {
  status?: string;
  applicationDate?: Date;
  deadline?: Date;
  nextFollowUpAt?: Date;
}

const STAGE_CONFIG: Record<
  string,
  { label: string; targetDays: number; progressLabel: string; alertFn: (elapsed: number) => string; color: string }
> = {
  draft: {
    label: 'Target Apply',
    targetDays: 5,
    progressLabel: 'Time to apply',
    color: 'blue',
    alertFn: (elapsed) =>
      elapsed < 3
        ? 'Good start! Tailor your documents and aim to apply within 5 days for best callback rates.'
        : 'Approaching target window. Submit your application soon to maintain momentum.',
  },
  created: {
    label: 'Target Apply',
    targetDays: 5,
    progressLabel: 'Time to apply',
    color: 'emerald',
    alertFn: (elapsed) =>
      elapsed < 3
        ? 'Good start! Tailor your documents and aim to apply within 5 days for best callback rates.'
        : 'Approaching target window. Submit your application soon to maintain momentum.',
  },
  applied: {
    label: 'Response Window',
    targetDays: 14,
    progressLabel: 'Response window',
    color: 'indigo',
    alertFn: (elapsed) =>
      elapsed < 7
        ? 'Early in the response window. Continue researching the company and keep networking.'
        : elapsed < 14
          ? "You're approaching the average response time. Consider sending a polite follow-up this week."
          : 'Response window exceeded. We recommend sending a polite follow-up email or LinkedIn message.',
  },
  screening: {
    label: 'Response Window',
    targetDays: 14,
    progressLabel: 'Response window',
    color: 'indigo',
    alertFn: (elapsed) =>
      elapsed < 7
        ? 'Company is reviewing your application. Keep your documents ready for any update request.'
        : elapsed < 14
          ? "Screening is taking longer than usual. Follow up with the recruiter to check your status."
          : 'Longer than expected screening period. Consider reaching out to your contact for a status update.',
  },
  interview: {
    label: 'Interview Cycle',
    targetDays: 21,
    progressLabel: 'Interview cycle',
    color: 'violet',
    alertFn: (elapsed) =>
      elapsed < 10
        ? 'Interview process underway. Use the Interview Prep tab to practice and stay sharp.'
        : 'Extended interview cycle. Follow up with your contact for next steps and timeline updates.',
  },
  offer: {
    label: 'Decision Window',
    targetDays: 7,
    progressLabel: 'Decision window',
    color: 'amber',
    alertFn: () =>
      'Congratulations! Review the compensation details, plan your negotiation strategy, and prepare your response before the deadline.',
  },
  accepted: {
    label: 'Closed',
    targetDays: 0,
    progressLabel: 'Completed',
    color: 'emerald',
    alertFn: () =>
      'Amazing work landing this offer! Complete any onboarding requirements and keep this record as a reference.',
  },
  rejected: {
    label: 'Closed',
    targetDays: 0,
    progressLabel: 'Completed',
    color: 'slate',
    alertFn: () =>
      'Review notes and insights from this application to refine your approach for the next opportunity.',
  },
  withdrawn: {
    label: 'Closed',
    targetDays: 0,
    progressLabel: 'Completed',
    color: 'slate',
    alertFn: () =>
      'This application is closed. Documents remain available for reference or to duplicate for other roles.',
  },
};

const colorMap: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300',
};

const progressColorMap: Record<string, string> = {
  blue: 'bg-blue-500',
  emerald: 'bg-emerald-500',
  indigo: 'bg-indigo-500',
  violet: 'bg-violet-500',
  amber: 'bg-amber-500',
  slate: 'bg-gray-400',
};

const AlertCircleIcon = AlertCircle;

const AgingTrackerWidget: React.FC<AgingTrackerWidgetProps> = ({
  status = 'applied',
  applicationDate,
  deadline,
}) => {
  const nowTime = Date.now();
  const startDate = applicationDate ? new Date(applicationDate) : new Date(nowTime);
  const elapsedDays = Math.max(0, Math.floor((nowTime - startDate.getTime()) / (1000 * 60 * 60 * 24)));

  const config = STAGE_CONFIG[status] || STAGE_CONFIG.applied;
  const targetDays = config.targetDays;
  const progressPercent = targetDays > 0 ? Math.min((elapsedDays / targetDays) * 100, 100) : 100;
  const alertMessage = config.alertFn(elapsedDays);
  const colorKey = config.color;

  const formattedStartDate = startDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const followUpDate = nextFollowUpAt ? new Date(nextFollowUpAt) : null;
  const followUpText = followUpDate
    ? followUpDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  return (
    <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-emerald-500/10 dark:bg-[#131810] flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-bold text-gray-900 dark:text-white text-body">
            {config.label} &middot; {elapsedDays} day{elapsedDays !== 1 ? 's' : ''} elapsed
          </h4>
          <p className="text-[11px] text-gray-500 mt-0.5">Started {formattedStartDate}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-gray-500">{config.progressLabel}</p>
          <p className="font-bold text-gray-900 dark:text-white text-body">{targetDays} days</p>
        </div>
        {followUpText && (
          <div className="text-right">
            <p className="text-[11px] text-gray-500">Next follow-up</p>
            <p className="font-bold text-gray-900 dark:text-white text-body">{followUpText}</p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="relative h-[6px] bg-gray-100 dark:bg-white/10 rounded-full">
          <div
            className={`absolute left-0 top-0 h-full rounded-full transition-all duration-300 ${progressColorMap[colorKey]}`}
            style={{ width: `${progressPercent}%` }}
          />
          <div
            className={`absolute top-1/2 -translate-y-1/2 h-3 w-3 ${progressColorMap[colorKey]} border-2 border-white dark:border-gray-900 rounded-full shadow-md -translate-x-1/2`}
            style={{ left: `${progressPercent}%` }}
          />
        </div>
        <div className="relative flex justify-between text-[10px] text-gray-400 font-bold px-0.5">
          <span>0 days</span>
          <span>{targetDays > 0 ? `${targetDays} days` : 'Closed'}</span>
        </div>
      </div>

      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100/50 dark:border-amber-500/10 text-[11px] text-amber-800 dark:text-amber-300">
        <AlertCircleIcon className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">{alertMessage}</p>
      </div>
    </div>
  );
};

export default AgingTrackerWidget;
