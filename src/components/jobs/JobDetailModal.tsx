'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { JobListing } from '@/types/automation-schema';
import {
  MapPin,
  DollarSign,
  Clock,
  ExternalLink,
  Briefcase,
  CheckCircle2,
  Building2,
  Zap,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MatchScoreBadge } from './MatchScoreBadge';
import { MatchBreakdownBars } from './MatchBreakdownBars';
import { renderRichText, timeAgo } from '@/lib/utils/format-utils';

export interface JobDetailModalProps {
  job: JobListing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSaved: boolean;
  saving: boolean;
  onSave: () => void;
  onApply: () => void;
}

const formatSalary = (job: JobListing): string => {
  if (!job.salaryMin && !job.salaryMax) return '';
  const cur = job.salaryCurrency ? ` ${job.salaryCurrency}` : '';
  const min = job.salaryMin ? `${job.salaryMin.toLocaleString()}${cur}` : '';
  const max = job.salaryMax ? `${job.salaryMax.toLocaleString()}${cur}` : '';
  if (min && max) return `${min} – ${max}`;
  return min || max;
};

/**
 * Decode HTML entities (e.g. <div> -> <div>) so the raw JD HTML
 * can be rendered properly, then sanitize it for safe display.
 */
const decodeHtmlEntities = (html: string): string => {
  if (!html) return '';
  if (typeof window === 'undefined') {
    return html
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
  }
  const textarea = document.createElement('textarea');
  textarea.innerHTML = html;
  return textarea.value;
};

export function JobDetailModal({
  job,
  open,
  onOpenChange,
  isSaved,
  saving,
  onSave,
  onApply,
}: JobDetailModalProps) {
  // Decode HTML entities first, then sanitize for safe rendering
  const rawDescription = job?.description || '';
  const decodedDescription = decodeHtmlEntities(rawDescription);
  const safeDescription = renderRichText(decodedDescription);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && job && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed bg-black/50 backdrop-blur-sm z-[99998]"
            style={{ top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}
            onClick={() => onOpenChange(false)}
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: 'calc(100% + 12px)' }}
            animate={{ x: 0 }}
            exit={{ x: 'calc(100% + 12px)' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-3 top-3 bottom-3 h-auto bg-white dark:bg-[#141810] shadow-2xl z-[99999] flex flex-col rounded-2xl overflow-hidden transition-all duration-300"
            style={{ width: 'min(680px, calc(100vw - 24px))' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-lime-500/10 text-lime-600 dark:text-lime-400 font-black ring-1 ring-lime-500/20 text-h3">
                    {job.company
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((w) => w[0]?.toUpperCase())
                      .join('')}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-h2 font-bold text-gray-900 dark:text-white leading-snug truncate">
                      {job.title}
                    </h2>
                    <p className="flex items-center gap-1 text-h3 text-gray-600 dark:text-gray-400">
                      <Building2 className="w-4 h-4" />
                      {job.company}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <MatchScoreBadge score={job.matchScore} size="lg" />
                  <button
                    onClick={() => onOpenChange(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                    title="Close"
                  >
                    <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-small text-gray-600 dark:text-gray-400">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {job.location}
                </span>
                {formatSalary(job) && (
                  <span className="inline-flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">
                    <DollarSign className="w-4 h-4" />
                    {formatSalary(job)}
                  </span>
                )}
                {job.postedDate && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {timeAgo(job.postedDate)}
                  </span>
                )}
                {job.remote && (
                  <span className="inline-flex items-center rounded-full bg-[#80FF00]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-lime-600 dark:text-lime-400 ring-1 ring-lime-500/20">
                    Remote
                  </span>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-5">
              {/* Match breakdown */}
              <section>
                <h4 className="flex items-center gap-2 text-small font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                  <Zap className="w-4 h-4 text-lime-500" />
                  Why we matched you
                </h4>
                <MatchBreakdownBars breakdown={job.matchBreakdown} compact={false} />
              </section>

              {/* Description */}
              <section>
                <h4 className="text-small font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                  Job description
                </h4>
                <div className="bg-gray-50 dark:bg-[#1a230f] border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                  {safeDescription ? (
                    <div
                      className="text-small text-gray-700 dark:text-gray-300 leading-relaxed [&_a]:text-lime-600 [&_a]:dark:text-lime-400 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_strong]:font-semibold [&_h1]:text-h3 [&_h2]:text-h3 [&_h3]:text-h3 [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-bold [&_h1]:mt-3 [&_h2]:mt-3 [&_h3]:mt-3 [&_p]:my-2 [&_hr]:my-3 [&_hr]:border-gray-200 [&_hr]:dark:border-gray-700"
                      dangerouslySetInnerHTML={{ __html: safeDescription }}
                    />
                  ) : (
                    <p className="text-small text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                      No description available. Open the job posting to view full details.
                    </p>
                  )}
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="p-6 pt-4 border-t border-gray-100 dark:border-gray-800 gap-2 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 flex-shrink-0">
              <button
                onClick={onApply}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-lime-500 hover:bg-lime-600 text-black font-semibold py-2.5 px-4 rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Apply Now
              </button>
              {isSaved ? (
                <button
                  disabled
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-semibold py-2.5 px-4 rounded-lg"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Saved to Tracker
                </button>
              ) : (
                <button
                  onClick={onSave}
                  disabled={saving}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-wait"
                >
                  <Briefcase className="w-4 h-4" />
                  {saving ? 'Saving…' : 'Save to Tracker'}
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
