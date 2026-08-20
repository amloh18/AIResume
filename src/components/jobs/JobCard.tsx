'use client';

import React from 'react';
import type { JobListing } from '@/types/automation-schema';
import CompanyLogo from '@/components/ui/CompanyLogo';
import {
  Briefcase,
  Bookmark,
  CheckCircle2,
  ExternalLink,
  Sparkles
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

const CARD_TINTS = [
  'bg-[#fff9e6] dark:bg-[#1a1c14]',
  'bg-[#fef3e7] dark:bg-[#1c1914]',
  'bg-[#eef7fe] dark:bg-[#14191c]',
  'bg-[#eafaf1] dark:bg-[#131b15]',
  'bg-[#fdf4ff] dark:bg-[#19141c]',
];

const timeAgo = (date?: Date | string): string => {
  if (!date) return 'Recently';
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'a day ago';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return new Date(date).toLocaleDateString();
};

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
    return job.keywords.slice(0, 3);
  }
  const skills: string[] = [];
  if (job.remote) skills.push('Remote');
  if (job.atsType && (job.atsType as string) !== 'unknown') skills.push(job.atsType);
  if (job.source && (job.source as string) !== 'other') skills.push(job.source);
  if (skills.length === 0) skills.push('Full Time', 'Product', 'Engineering');
  return skills.slice(0, 3);
};

const extractExperience = (job: JobListing): number | null => {
  if ((job as any).experienceYears) return (job as any).experienceYears;
  const match = (job.title + ' ' + (job.description || '')).match(/(\d+)\+?\s*(?:yrs|years|yr)/i);
  if (match && match[1]) {
    const parsed = parseInt(match[1], 10);
    if (parsed > 0 && parsed < 25) return parsed;
  }
  return 2;
};

export function JobCard({
  job,
  isSaved,
  saving,
  onOpen,
  onSave,
  onApply,
  onPass,
  colorIndex = 0,
}: JobCardProps) {
  const tint = CARD_TINTS[Math.abs(colorIndex) % CARD_TINTS.length];
  const skills = extractSkills(job);
  const expYears = extractExperience(job);
  const score = job.matchScore || 75;
  const companyInitials = job.company
    ? job.company.slice(0, 2).toUpperCase()
    : 'CO';

  return (
    <div
      onClick={onOpen}
      className={`group flex flex-col justify-between rounded-2xl border border-gray-200/80 dark:border-white/10 p-4 sm:p-5 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${tint}`}
    >
      {/* Top Row: Location + Experience Badge + Posted Ago on left, Circular Match Gauge on right */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 truncate max-w-[170px]">
              {job.location || 'Remote'}
            </span>
            {expYears && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-semibold rounded bg-gray-200/70 dark:bg-white/15 text-gray-800 dark:text-gray-200">
                <Briefcase className="w-3 h-3" />
                {expYears}
              </span>
            )}
          </div>
          <div className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
            {timeAgo(job.postedDate)}
          </div>
        </div>

        {/* Circular Match Gauge from image copy 2.png */}
        <div className="w-11 h-11 rounded-full border-2 border-emerald-600 dark:border-emerald-400 flex flex-col items-center justify-center shrink-0 bg-white/80 dark:bg-black/40 shadow-sm">
          <span className="text-[11px] font-black text-gray-900 dark:text-white leading-tight">
            {score}%
          </span>
          <span className="text-[7.5px] font-bold tracking-tighter text-gray-500 dark:text-gray-400 uppercase leading-none">
            MATCH
          </span>
        </div>
      </div>

      {/* Middle Section: Job Title + Skill Chips */}
      <div className="my-4 space-y-2.5">
        <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white leading-snug line-clamp-2 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
          {job.title}
        </h3>

        <div className="flex flex-wrap gap-1.5">
          {skills.map((skill, idx) => (
            <span
              key={idx}
              className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-black/5 dark:bg-white/10 text-gray-700 dark:text-gray-300"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom Row: Company Logo + Name on left, Pass / Save / Apply on right */}
      <div className="pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <CompanyLogo
            company={job.company}
            size={22}
            logoUrl={(job as any).companyLogo}
            jobId={job._id || (job as any).id}
          />
          <span className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
            {job.company || 'Confidential'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onPass) onPass();
              else onSave();
            }}
            className="px-2.5 py-1 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            {onPass ? 'Pass' : isSaved ? 'Saved' : 'Save'}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onApply();
            }}
            className="px-3.5 py-1 rounded-lg bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1"
          >
            <span>Apply</span>
          </button>
        </div>
      </div>
    </div>
  );
}