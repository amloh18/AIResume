'use client';

import React from 'react';
import type { JobListing } from '@/types/automation-schema';
import CompanyLogo from '@/components/ui/CompanyLogo';
import { timeAgo } from '@/lib/utils/format-utils';
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
  X
} from 'lucide-react';

export interface JobCardProps {
  job: JobListing;
  isSaved: boolean;
  saving: boolean;
  onOpen: () => void;
  onSave: () => void;
  onApply: () => void;
  onPass?: () => void;
  colorIndex?: number;
}

const formatSalary = (job: JobListing): string => {
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
  saving,
  onOpen,
  onSave,
  onApply,
  onPass,
}: JobCardProps) {
  const skills = extractSkills(job);
  const expYears = extractExperience(job);
  const score = job.matchScore || 0;
  const companyName = job.company || 'Confidential';
  const salaryStr = formatSalary(job);

  // Categorize match score into human-friendly confidence bands
  let matchTier = {
    label: 'Match',
    badgeClass: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10',
    dotClass: 'bg-gray-400',
  };

  if (score >= 90) {
    matchTier = {
      label: 'Excellent match',
      badgeClass: 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
      dotClass: 'bg-emerald-500',
    };
  } else if (score >= 80) {
    matchTier = {
      label: 'Strong match',
      badgeClass: 'text-lime-700 dark:text-[#80FF00] bg-lime-500/10 border-lime-500/30',
      dotClass: 'bg-lime-500',
    };
  } else if (score >= 70) {
    matchTier = {
      label: 'Good match',
      badgeClass: 'text-sky-700 dark:text-sky-300 bg-sky-500/10 border-sky-500/30',
      dotClass: 'bg-sky-500',
    };
  } else if (score >= 60) {
    matchTier = {
      label: 'Possible match',
      badgeClass: 'text-gray-700 dark:text-gray-300 bg-gray-500/10 border-gray-500/20',
      dotClass: 'bg-gray-400',
    };
  }

  // Application readiness
  const isAutoApplyCapable = ['naukri', 'indeed'].includes((job.source || '').toLowerCase());

  return (
    <div
      onClick={onOpen}
      className="group relative flex flex-col justify-between rounded-2xl border border-gray-200 dark:border-white/10 p-5 cursor-pointer transition-all duration-200 bg-white dark:bg-[#141810] hover:border-lime-500/40 hover:shadow-xl hover:scale-[1.01]"
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

        {/* Job Title */}
        <div className="space-y-2">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-snug line-clamp-2 group-hover:text-lime-600 dark:group-hover:text-[#80FF00] transition-colors">
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

          {/* Skills tags */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {skills.map((skill, idx) => (
              <span
                key={idx}
                className="px-2.5 py-0.5 rounded-lg text-[11px] font-medium bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300"
              >
                {skill}
              </span>
            ))}
          </div>

          {/* Freshness timestamp */}
          <div className="text-[11px] text-gray-500 dark:text-gray-500 pt-0.5">
            Posted {timeAgo(job.postedDate)}
          </div>
        </div>

        {/* Bottom Section: Readiness & Action Journey */}
        <div className="mt-auto pt-3 border-t border-gray-100 dark:border-white/5 space-y-2.5">
          {/* Status info */}
          <div className="flex items-center justify-between text-xs">
            {isSaved ? (
              <span className="inline-flex items-center gap-1.5 font-bold text-lime-600 dark:text-[#80FF00]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Saved in Staging
              </span>
            ) : isAutoApplyCapable ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <Check className="w-3 h-3" />
                Auto-Apply available
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                <Sparkles className="w-3 h-3 text-lime-500" />
                Tailored CV supported
              </span>
            )}
          </div>

          {/* Primary Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            {isSaved ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onApply();
                }}
                className="col-span-2 px-4 py-2.5 rounded-xl bg-lime-500 hover:bg-lime-600 dark:bg-[#80FF00] dark:hover:brightness-95 text-white dark:text-black text-xs font-bold transition-all shadow-sm flex justify-center items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Prepare Application</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSave();
                  }}
                  disabled={saving}
                  className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-white/10 hover:border-lime-500 dark:hover:border-lime-500 text-gray-800 dark:text-gray-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 shadow-xs"
                >
                  {saving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-lime-500" />
                  ) : (
                    <>
                      <Bookmark className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                      <span>Save</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onApply();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-gray-900 hover:bg-black dark:bg-[#80FF00] dark:hover:brightness-95 text-white dark:text-black text-xs font-bold transition-all shadow-sm flex justify-center items-center gap-1"
                >
                  <span>Apply</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}