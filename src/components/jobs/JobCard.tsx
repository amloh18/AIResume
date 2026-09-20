'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { JobListing } from '@/types/automation-schema';
import CompanyLogo from '@/components/ui/CompanyLogo';
import { timeAgo } from '@/lib/utils/format-utils';
import { useJobLiveStatusStore } from '@/lib/stores/jobLiveStatusStore';
import { JobLiveStatusCard } from '@/components/jobs/JobLiveStatusCard';
import { getCurrencySymbol, getJobCardColorClass } from '@/lib/config/job-constants';
import {
  MapPin,
  CheckCircle2,
  Sparkles,
  Loader2,
  Check,
  Bookmark,
  Zap,
  Briefcase,
  DollarSign,
  X,
  Flame,
  FileText,
  Send,
  AlertCircle,
  FileCheck2,
  Target,
  ShieldCheck,
  Eye,
} from 'lucide-react';

/**
 * Tracker snapshot for a job the user has already saved.
 *
 * Supplied by the caller (which resolves it from the dashboard data context),
 * NOT fetched here — the Explore grid renders hundreds of these cards and must
 * stay a pure renderer.
 */
export interface JobCardTrackerInfo {
  /** JobApplication.status — saved | draft | created | applied | screening | interview | offer | accepted | rejected | withdrawn */
  status: string;
  applicationDate?: string;
  /** ATS score of the tailored document, when one exists. */
  atsScore?: number;
  hasCV: boolean;
  hasCoverLetter: boolean;
}

export interface JobCardProps {
  job: JobListing;
  isSaved: boolean;
  isApplied?: boolean;
  applicationMode?: string;
  saving: boolean;
  onOpen: () => void;
  onSave: () => void;
  onApply: () => void;
  onPass?: () => void;
  colorIndex?: number;
  /** Present only for jobs that exist in the user's tracker. */
  tracker?: JobCardTrackerInfo | null;
  /** True while an apply/generate task is in flight for THIS job. */
  applying?: boolean;
  /** 0-100, drives the inline progress readout on the disabled CTA. */
  progressPercent?: number;
  /** Short sentence explaining what is running, shown under the CTAs. */
  progressLabel?: string;
  /** Jump to the application tracker for this job. */
  onOpenTracker?: () => void;
  /** Jump to the documents view for this job. */
  onOpenDocuments?: () => void;
}

/**
 * Pipeline stage → chip styling.
 *
 * `saved`/`draft` collapse to one label because the user never sees the
 * distinction; `rejected`/`withdrawn` both read as "Closed" for the same
 * reason. `created` is surfaced as "Staging" to match the kanban column name.
 */
const TRACKER_STAGE_META: Record<string, { label: string; dot: string; chip: string }> = {
  saved: {
    label: 'Saved',
    dot: 'bg-amber-500',
    chip: 'text-amber-800 dark:text-amber-300 bg-amber-500/15 border-amber-500/30',
  },
  draft: {
    label: 'Saved',
    dot: 'bg-amber-500',
    chip: 'text-amber-800 dark:text-amber-300 bg-amber-500/15 border-amber-500/30',
  },
  created: {
    label: 'Staging',
    dot: 'bg-violet-500',
    chip: 'text-violet-800 dark:text-violet-300 bg-violet-500/15 border-violet-500/30',
  },
  applied: {
    label: 'Applied',
    dot: 'bg-sky-500',
    chip: 'text-sky-800 dark:text-sky-300 bg-sky-500/15 border-sky-500/30',
  },
  screening: {
    label: 'Screening',
    dot: 'bg-cyan-500',
    chip: 'text-cyan-800 dark:text-cyan-300 bg-cyan-500/15 border-cyan-500/30',
  },
  interview: {
    label: 'Interview',
    dot: 'bg-orange-500',
    chip: 'text-orange-800 dark:text-orange-300 bg-orange-500/15 border-orange-500/30',
  },
  offer: {
    label: 'Offer',
    dot: 'bg-emerald-500',
    chip: 'text-emerald-800 dark:text-emerald-300 bg-emerald-500/15 border-emerald-500/30',
  },
  accepted: {
    label: 'Accepted',
    dot: 'bg-emerald-600',
    chip: 'text-emerald-800 dark:text-emerald-300 bg-emerald-600/15 border-emerald-600/30',
  },
  rejected: {
    label: 'Closed',
    dot: 'bg-rose-500',
    chip: 'text-rose-800 dark:text-rose-300 bg-rose-500/15 border-rose-500/30',
  },
  withdrawn: {
    label: 'Withdrawn',
    dot: 'bg-gray-500',
    chip: 'text-gray-700 dark:text-gray-300 bg-gray-500/15 border-gray-500/25',
  },
};

function trackerStageMeta(status?: string) {
  return TRACKER_STAGE_META[status || ''] || TRACKER_STAGE_META.saved;
}

/**
 * Compact age string for the pipeline strip. Must stay short — it shares one
 * line with the stage chip and the ATS chip.
 */
function shortAge(dateStr?: string): string | null {
  if (!dateStr) return null;
  const ms = Date.now() - new Date(dateStr).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

const formatSalary = (job: JobListing): string => {
  // Handle nested salary object from recommended/tracker APIs
  const salaryObj = (job as any).salary;
  if (salaryObj && typeof salaryObj === 'object') {
    const min = salaryObj.min;
    const max = salaryObj.max;
    const cur = salaryObj.currency ? ` ${salaryObj.currency}` : '';
    if (!min && !max) return '';
    const minStr = min ? `${min.toLocaleString()}${cur}` : '';
    const maxStr = max ? `${max.toLocaleString()}${cur}` : '';
    if (minStr && maxStr) return `${minStr} – ${maxStr}`;
    return minStr || maxStr;
  }
  // Handle flat fields from discover API
  if (!job.salaryMin && !job.salaryMax) return '';
  const cur = job.salaryCurrency ? ` ${job.salaryCurrency}` : '';
  const min = job.salaryMin ? `${job.salaryMin.toLocaleString()}${cur}` : '';
  const max = job.salaryMax ? `${job.salaryMax.toLocaleString()}${cur}` : '';
  if (min && max) return `${min} – ${max}`;
  return min || max;
};

const extractSkills = (job: JobListing): string[] => {
  if (job.keywords && job.keywords.length > 0) {
    return job.keywords.slice(0, 4);
  }
  const skills: string[] = [];
  if (job.remote) skills.push('Remote');
  if (skills.length === 0) skills.push('Full Time', 'Product', 'Engineering');
  return skills.slice(0, 4);
};

const extractExperience = (job: JobListing): number | null => {
  if (job.experienceYears) return job.experienceYears;
  const match = (job.title + ' ' + (job.description || '')).match(/(\d+)\+?\s*(?:yrs|years|yr)/i);
  if (match && match[1]) {
    const parsed = parseInt(match[1], 10);
    if (parsed > 0 && parsed < 25) return parsed;
  }
  return null;
};

export function JobCard({
  job,
  isSaved,
  isApplied = false,
  applicationMode = 'manual_review',
  saving,
  onOpen,
  onSave,
  onApply,
  onPass,
  colorIndex,
  tracker = null,
  applying = false,
  progressPercent,
  progressLabel,
  onOpenTracker,
  onOpenDocuments,
}: JobCardProps) {
  const jobId = String(job._id || job.id || '');
  const liveStatus = useJobLiveStatusStore((state) => (jobId ? state.statuses[jobId] : undefined));
  const { clearStatus } = useJobLiveStatusStore();

  const skills = extractSkills(job);
  const expYears = extractExperience(job);
  const score = job.matchScore || 0;
  const companyName = job.company || 'Confidential';
  const salaryStr = formatSalary(job);
  const cardColorClass = getJobCardColorClass(colorIndex, jobId);

  // Categorize match score into human-friendly confidence bands
  let matchTier = {
    label: 'Match',
    badgeClass: 'text-gray-700 dark:text-gray-300 bg-white/80 dark:bg-white/5 border-black/10 dark:border-white/10 shadow-2xs',
    dotClass: 'bg-gray-400',
  };

  if (score >= 90) {
    matchTier = {
      label: 'Excellent match',
      badgeClass: 'text-emerald-800 dark:text-emerald-300 bg-emerald-500/15 border-emerald-500/30',
      dotClass: 'bg-emerald-500',
    };
  } else if (score >= 80) {
    matchTier = {
      label: 'Strong match',
      badgeClass: 'text-[#013f2e] dark:text-[#36D39B] bg-lime-500/20 border-lime-500/30',
      dotClass: 'bg-lime-500',
    };
  } else if (score >= 70) {
    matchTier = {
      label: 'Good match',
      badgeClass: 'text-sky-800 dark:text-sky-300 bg-sky-500/15 border-sky-500/30',
      dotClass: 'bg-sky-500',
    };
  } else if (score >= 60) {
    matchTier = {
      label: 'Possible match',
      badgeClass: 'text-gray-800 dark:text-gray-300 bg-gray-500/15 border-gray-500/25',
      dotClass: 'bg-gray-400',
    };
  }

  // Application readiness
  const isAutoApplyCapable = ['naukri', 'indeed'].includes((job.source || '').toLowerCase());

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      onClick={onOpen}
      className={`job-card-discover group relative flex flex-col justify-between rounded-2xl border p-5 cursor-pointer transition-all duration-200 ${cardColorClass} hover:border-lime-500/50 hover:shadow-xl hover:scale-[1.01] min-h-[300px]`}
    >
      {/* Optional subtle pass/dismiss button */}
      {onPass && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPass();
          }}
          title="Don't show me this job again"
          className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-all z-10"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {/* High-match glow ring */}
      {score >= 90 && (
        <div className="absolute inset-0 rounded-2xl ring-2 ring-emerald-500/20 pointer-events-none" />
      )}

      {/* Live status pulse */}
      {liveStatus && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-lime-500" />
          </span>
          <span className="text-[10px] font-bold text-lime-600 dark:text-lime-400 uppercase tracking-wide">Live</span>
        </div>
      )}

      <div className="flex flex-col h-full gap-3.5">
        {/* Top Header: Company + Match Quality Pill */}
        <div className="flex items-center justify-between gap-2 pr-6">
          <div className="flex items-center gap-2.5 min-w-0">
            <CompanyLogo
              company={companyName}
              size={24}
              logoUrl={job.companyLogo}
              jobId={job._id || job.id || ''}
            />
            <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
              {companyName}
            </span>
          </div>

          {score > 0 && (
            <div className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1.5 shrink-0 ${matchTier.badgeClass}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${matchTier.dotClass}`} />
              <span>{score}% · {matchTier.label}</span>
            </div>
          )}
        </div>

        {/* Job Title & Location */}
        <div className="space-y-2">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-snug line-clamp-2 group-hover:text-lime-600 dark:group-hover:text-[#013f2e] transition-colors">
            {job.title}
          </h3>

          {/* Location & Compensation */}
          <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400 font-medium">
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="truncate">{job.location || 'Remote'}</span>
            </div>

            {(salaryStr || expYears !== null) && (
              <div className="flex items-center gap-1.5 truncate text-gray-900 dark:text-gray-300 font-semibold">
                {salaryStr && <span>{salaryStr}</span>}
                {salaryStr && expYears !== null && <span className="opacity-40">·</span>}
                {expYears !== null && <span>{expYears}+ yrs experience</span>}
              </div>
            )}
          </div>
        </div>

        {/* Live Status OR Normal Skills/Actions */}
        {liveStatus ? (
          <div className="mt-1 flex-1 flex flex-col justify-between">
            <JobLiveStatusCard
              status={liveStatus}
              onClose={() => clearStatus(jobId)}
              inline={true}
            />
          </div>
        ) : (
          <>
            {/*
              Tracked jobs trade the skills-tag row for a pipeline strip.
              The card's footprint must not grow, so this is a swap rather than
              an addition: one row out, one row in. `truncate` keeps it to a
              single line even with a long stage label and a date.
            */}
            {tracker ? (
              <div className="flex items-center gap-1.5 pt-1 min-w-0">
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border shrink-0 ${trackerStageMeta(tracker.status).chip}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${trackerStageMeta(tracker.status).dot}`} />
                  {trackerStageMeta(tracker.status).label}
                </span>

                {typeof tracker.atsScore === 'number' && tracker.atsScore > 0 && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/70 dark:bg-white/5 text-gray-700 dark:text-gray-300 border border-black/5 dark:border-white/10 shrink-0"
                    title="ATS score of the tailored document for this job"
                  >
                    <ShieldCheck className="w-3 h-3" />
                    ATS {tracker.atsScore}%
                  </span>
                )}

                {shortAge(tracker.applicationDate) && (
                  <span className="text-[11px] text-gray-600 dark:text-gray-400 font-medium truncate">
                    · {shortAge(tracker.applicationDate)}
                  </span>
                )}
              </div>
            ) : (
              /* Skills tags */
              <div className="flex flex-wrap gap-1.5 pt-1">
                {skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 rounded-lg text-[11px] font-medium bg-white/70 dark:bg-white/5 text-gray-800 dark:text-gray-300 border border-black/5 dark:border-white/5 shadow-2xs backdrop-blur-xs"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}

            {/* Freshness timestamp */}
            <div className="text-[11px] text-gray-600 dark:text-gray-400 pt-0.5">
              Posted {timeAgo(job.postedDate)}
            </div>

            {/* Bottom Section: Readiness & Action Journey */}
            <div className="mt-auto pt-3 border-t border-black/8 dark:border-white/5 space-y-2.5">
              {/* Dynamic stage info */}
              <div className="flex items-center justify-between text-xs">
                {isSaved ? (
                  <span className="inline-flex items-center gap-1.5 font-bold text-lime-600 dark:text-[#013f2e]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {tracker ? 'In your tracker' : 'Saved in Staging'}
                  </span>
                ) : isAutoApplyCapable ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <Check className="w-3 h-3" />
                    Auto-Apply available
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] text-gray-700 dark:text-gray-300 font-medium">
                    <Target className="w-3 h-3 text-[#013f2e] dark:text-[#36D39B]" />
                    Ready to apply
                  </span>
                )}

                {/* Document readiness — only meaningful for tracked jobs */}
                {tracker && (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-600 dark:text-gray-400"
                    title={
                      tracker.hasCV && tracker.hasCoverLetter
                        ? 'Tailored CV and cover letter ready'
                        : tracker.hasCV || tracker.hasCoverLetter
                          ? 'One document ready'
                          : 'No tailored documents yet'
                    }
                  >
                    <FileText
                      className={`w-3 h-3 ${tracker.hasCV ? 'text-emerald-500' : 'text-gray-300 dark:text-gray-600'}`}
                    />
                    <FileText
                      className={`w-3 h-3 ${tracker.hasCoverLetter ? 'text-emerald-500' : 'text-gray-300 dark:text-gray-600'}`}
                    />
                  </span>
                )}

                {/* Freshness indicator for recently posted jobs */}
                {!tracker && job.postedDate && (() => {
                  const ageMs = Date.now() - new Date(job.postedDate).getTime();
                  const ageHours = ageMs / (1000 * 60 * 60);
                  if (ageHours < 24) {
                    return (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600 dark:text-orange-400">
                        <Flame className="w-3 h-3" />
                        {ageHours < 1 ? 'Just posted' : `${Math.round(ageHours)}h ago`}
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Primary Action Buttons */}
              {isApplied ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled
                    className="px-3 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-sm flex justify-center items-center gap-1.5 cursor-default"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Applied</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      (onOpenTracker || onOpen)();
                    }}
                    className="px-3 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 text-gray-800 dark:text-gray-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </button>
                </div>
              ) : isSaved && tracker ? (
                /*
                  A tracked job gets more to do than an untracked one, at the
                  same height: the single full-width button becomes a 2-up row.
                */
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (applying) return;
                      onApply();
                    }}
                    disabled={applying || applicationMode === 'find_only'}
                    title={applying ? 'A task is already running for this job' : undefined}
                    className={`px-3 py-2.5 rounded-xl text-white dark:text-black text-xs font-bold transition-all shadow-sm flex justify-center items-center gap-1.5 ${
                      applying || applicationMode === 'find_only'
                        ? 'bg-gray-400 dark:bg-gray-500 cursor-not-allowed'
                        : 'bg-[#013f2e] hover:bg-[#02523c] dark:bg-lime-500 dark:hover:bg-lime-400'
                    }`}
                  >
                    {applying ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{progressPercent ? `${progressPercent}%` : 'Working…'}</span>
                      </>
                    ) : (
                      <>
                        <Briefcase className="w-3.5 h-3.5" />
                        <span>
                          {tracker.status === 'saved' || tracker.status === 'draft'
                            ? applicationMode === 'automatic'
                              ? 'Auto Apply'
                              : 'Prepare'
                            : 'Tracker'}
                        </span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      (onOpenDocuments || onOpenTracker || onOpen)();
                    }}
                    className="px-3 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 text-gray-800 dark:text-gray-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>{tracker.hasCV || tracker.hasCoverLetter ? 'Documents' : 'Open'}</span>
                  </button>
                </div>
              ) : isSaved ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (applying) return;
                    onApply();
                  }}
                  disabled={applying || applicationMode === 'find_only'}
                  className={`col-span-2 w-full px-4 py-2.5 rounded-xl text-white dark:text-black text-xs font-bold transition-all shadow-sm flex justify-center items-center gap-1.5 ${
                    applying || applicationMode === 'find_only'
                      ? 'bg-gray-400 dark:bg-gray-500 cursor-not-allowed'
                      : 'bg-[#013f2e] hover:bg-[#02523c] dark:bg-lime-500 dark:hover:bg-lime-400'
                  }`}
                >
                  {applying ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{progressPercent ? `${progressPercent}%` : 'Working…'}</span>
                    </>
                  ) : (
                    <>
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>{applicationMode === 'automatic' ? 'Auto Apply' : 'Prepare Application'}</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSave();
                    }}
                    disabled={saving}
                    className="px-3.5 py-2 rounded-xl border border-black/10 dark:border-white/10 hover:border-lime-500 dark:hover:border-lime-500 text-gray-800 dark:text-gray-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 bg-white/80 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 shadow-2xs"
                  >
                    {saving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-lime-500" />
                    ) : (
                      <>
                        <Bookmark className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                        <span>Save</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (applying) return;
                      onApply();
                    }}
                    disabled={applying || applicationMode === 'find_only'}
                    className={`px-3.5 py-2 rounded-xl text-white text-xs font-bold transition-all shadow-sm flex justify-center items-center gap-1 ${
                      applying || applicationMode === 'find_only'
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gray-900 hover:bg-black dark:bg-[#013f2e] dark:hover:brightness-95'
                    }`}
                  >
                    {applying ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{progressPercent ? `${progressPercent}%` : 'Working…'}</span>
                      </>
                    ) : (
                      <span>{applicationMode === 'automatic' ? 'Auto Apply' : 'Apply'}</span>
                    )}
                  </button>
                </div>
              )}

              {/* In-flight explanation — a disabled button with no reason reads as a bug */}
              {applying && progressLabel && (
                <p className="text-[10px] text-gray-500 dark:text-gray-400 text-center leading-snug">
                  {progressLabel}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
