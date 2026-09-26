// @ts-nocheck pre-existing type escape — removal tracked as R14 in docs/application-automation/fix-tasks.md
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  CheckCircle2,
  XCircle,
  MapPin,
  Clock,
  Sparkles,
  ExternalLink,
  Briefcase,
  Eye,
  Pencil,
  Trash2,
  Loader2
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import CompanyLogo from '@/components/ui/CompanyLogo';
import { CVJourney } from '@/types/cv';
import { useJobLiveStatusStore } from '@/lib/stores/jobLiveStatusStore';
import { getJourneyDocumentsForJob } from '@/lib/utils/journey-documents';
import { deriveApplicationStatusBadge, type StatusIconKey } from '@/lib/utils/application-status-badge';
import { CHIP_INLINE, CHIP_TONES, chipTone, type ChipTone } from '@/components/ui/chip-styles';

interface JobApplication {
  id: string;
  _id: string;
  userId: string;
  jobTitle: string;
  title?: string;
  company: string;
  status: 'draft' | 'created' | 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'accepted' | 'withdrawn';
  /** Live pipeline state — decides Submitting vs Awaiting approval vs Apply manually. */
  internalStatus?: string;
  /** Reason of the latest APPLICATION_REQUIRES_REVIEW event (hover text + label split). */
  reviewReason?: string;
  jobDescription?: string;
  description?: string;
  location?: string;
  jobUrl?: string;
  applyUrl?: string;
  sourceUrl?: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: 'hourly' | 'monthly' | 'yearly';
  } | string;
  jobType?: 'full-time' | 'part-time' | 'contract' | 'internship';
  type?: string;
  source?: string;
  postedDate?: Date;
  applicationDate?: Date;
  appliedAt?: string | Date;
  deadline?: Date;
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  tags?: string[];
  isArchived?: boolean;
  atsScore?: number;
  matchScore?: number;
  companyLogo?: string;
  createdAt: string;
  updatedAt: string;
}

interface JobsListViewProps {
  jobs: JobApplication[];
  loading: boolean;
  selectedJobs?: Set<string>;
  setSelectedJobs?: (jobs: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  setShowBulkActions?: (show: boolean) => void;
  onJobClick: (job: JobApplication) => void;
  onEditJob?: (job: JobApplication) => void;
  onDeleteJob?: (job: JobApplication) => void;
  getJobJourneys: (jobId: string) => CVJourney[];
  getJourneyProgress: (journey: CVJourney) => number;
  getJourneyStatusText: (jobJourneys: CVJourney[], jobStatus?: string) => string;
  borderless?: boolean;
  hideSelection?: boolean;
  hideActions?: boolean;
}

/**
 * Job-source chips. One row per source; `key` is matched with `includes` against
 * the lowercased source string, so order only matters if two keys could both
 * match (they can't here).
 *
 * The hues are the source's own brand-ish colour, which is why they are a tone
 * table rather than a single neutral — but the *shape* is the shared capsule.
 */
const SOURCE_CHIPS: Array<{ key: string; label: string; tone: ChipTone }> = [
  { key: 'naukri', label: 'Naukri', tone: 'blue' },
  { key: 'indeed', label: 'Indeed', tone: 'indigo' },
  { key: 'greenhouse', label: 'Greenhouse', tone: 'emerald' },
  { key: 'lever', label: 'Lever', tone: 'teal' },
  { key: 'adzuna', label: 'Adzuna', tone: 'cyan' },
  { key: 'linkedin', label: 'LinkedIn', tone: 'sky' },
  { key: 'ashby', label: 'Ashby', tone: 'violet' },
  { key: 'workday', label: 'Workday', tone: 'orange' },
  { key: 'workable', label: 'Workable', tone: 'orange' },
  { key: 'extension', label: 'Extension', tone: 'purple' },
  { key: 'discover', label: 'Discover', tone: 'green' },
]

function getSourceBadge(source?: string) {
  if (!source) {
    return (
      <span className={`${CHIP_INLINE} ${CHIP_TONES.neutral} font-medium`}>
        Direct ATS
      </span>
    );
  }
  const s = source.toLowerCase();
  const hit = SOURCE_CHIPS.find((c) => s.includes(c.key));
  return (
    <span
      className={`${CHIP_INLINE} ${CHIP_TONES[hit ? hit.tone : 'neutral']} font-medium ${hit ? '' : 'capitalize'}`}
    >
      {hit ? hit.label : source.replace(/-/g, ' ')}
    </span>
  );
}

/**
 * Status chips — label/tone/icon come from the shared derivation, the only
 * place that knows `review_required` rows must not read as "Submitting"
 * (reason → label mapping lives in application-status-badge.ts).
 */
const STATUS_ICONS: Record<StatusIconKey, LucideIcon | null> = {
  clock: Clock,
  external: ExternalLink,
  eye: Eye,
  x: XCircle,
  sparkles: Sparkles,
  check: CheckCircle,
  none: null,
};

function getStatusBadge(job: { status?: string; internalStatus?: string; reviewReason?: string }) {
  const { label, tone, icon, title } = deriveApplicationStatusBadge(job);
  const Icon = STATUS_ICONS[icon];
  return (
    <span className={`${chipTone(tone, 'md')} font-semibold`} title={title}>
      {Icon && <Icon className="w-3 h-3" />}
      {label}
    </span>
  );
}

function formatSalary(salary?: any): string {
  if (!salary) return '';
  if (typeof salary === 'string') return salary;
  if (typeof salary === 'object') {
    const cur = salary.currency || '$';
    const min = salary.min ? `${cur}${salary.min.toLocaleString()}` : '';
    const max = salary.max ? `${cur}${salary.max.toLocaleString()}` : '';
    if (min && max) return `${min} - ${max}`;
    return min || max || '';
  }
  return '';
}

const JobsListView: React.FC<JobsListViewProps> = ({
  jobs,
  loading,
  selectedJobs = new Set(),
  setSelectedJobs,
  setShowBulkActions,
  onJobClick,
  onEditJob,
  onDeleteJob,
  getJobJourneys,
  getJourneyProgress,
  getJourneyStatusText,
  borderless = false,
  hideSelection = false,
  hideActions = false,
}) => {
  const handleSelectJob = (jobId: string) => {
    if (!setSelectedJobs) return;
    setSelectedJobs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      setShowBulkActions?.(newSet.size > 0);
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (!setSelectedJobs) return;
    if (selectedJobs.size === jobs.length && jobs.length > 0) {
      setSelectedJobs(new Set());
      setShowBulkActions?.(false);
    } else {
      setSelectedJobs(new Set(jobs.map(job => job.id || job._id)));
      setShowBulkActions?.(true);
    }
  };

  const visibleColCount = 7 - (hideSelection ? 1 : 0) - (hideActions ? 1 : 0) + 2;

  return (
    <div className={`w-full overflow-hidden ${borderless ? '' : 'bg-white dark:bg-[#141810] rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm'}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50/80 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              {!hideSelection && (
                <th className="py-3.5 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedJobs.size === jobs.length && jobs.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                </th>
              )}
              <th className="py-3.5 px-5">Company</th>
              <th className="py-3.5 px-4">Job Role & Title</th>
              <th className="py-3.5 px-4">Location</th>
              <th className="py-3.5 px-4">Portal</th>
              <th className="py-3.5 px-4">Match Score</th>
              <th className="py-3.5 px-4">Date Applied</th>
              <th className="py-3.5 px-4">Status</th>
              {!hideActions && <th className="py-3.5 px-5 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/5 font-medium">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-200 dark:border-white/10">
                  {!hideSelection && (
                    <td className="py-4 px-4 text-center">
                      <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto" />
                    </td>
                  )}
                  <td className="py-4 px-5">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-28 animate-pulse" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-44 animate-pulse" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-16 animate-pulse" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12 animate-pulse" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-20 animate-pulse" />
                  </td>
                  {!hideActions && (
                    <td className="py-4 px-5 text-right">
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16 ml-auto animate-pulse" />
                    </td>
                  )}
                </tr>
              ))
            ) : jobs.length === 0 ? (
              <tr>
                <td colSpan={visibleColCount} className="py-16 px-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-3 text-gray-400">
                    <Briefcase className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                    No jobs found
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                    Try adjusting your filters or click &quot;Add Job&quot; to start tracking applications.
                  </p>
                </td>
              </tr>
            ) : (
              jobs.map((job) => {
                const jobId = job.id || job._id;
                const isSelected = selectedJobs.has(jobId);
                const jobJourneys = getJobJourneys ? getJobJourneys(jobId) : [];
                const score = job.matchScore ?? null;
                const salaryStr = formatSalary(job.salary);

                let appliedDateStr = '-';
                const rawDate = job.applicationDate || job.appliedAt || job.createdAt;
                if (rawDate) {
                  if (rawDate instanceof Date) {
                    appliedDateStr = rawDate.toISOString().split('T')[0];
                  } else if (typeof rawDate === 'string') {
                    appliedDateStr = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate;
                  }
                }

                return (
                  <motion.tr
                    key={jobId}
                    className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors cursor-pointer group"
                    onClick={() => onJobClick(job)}
                  >
                    {/* Checkbox */}
                    {!hideSelection && (
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectJob(jobId)}
                          className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                    )}

                    {/* Company */}
                    <td className="py-3.5 px-5 text-gray-700 dark:text-gray-300">
                      <div className="flex items-center gap-2">
                        <CompanyLogo company={job.company} size={22} logoUrl={job.companyLogo} jobId={jobId} />
                        <span className="font-medium text-xs truncate max-w-[110px] sm:max-w-[140px]">
                          {job.company || 'Unknown Company'}
                        </span>
                      </div>
                    </td>

                    {/* Job Role & Title */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-900 dark:text-white text-xs group-hover:text-lime-600 dark:group-hover:text-lime-400 transition-colors truncate max-w-[180px]">
                        {job.jobTitle || job.title || 'Untitled Role'}
                      </div>
                      {salaryStr && (
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 font-normal">
                          {salaryStr}
                        </div>
                      )}
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4 text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1.5 text-xs">
                        <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="truncate max-w-[70px] sm:max-w-[100px] md:max-w-[130px]" title={job.location || 'Remote'}>
                          {job.location || 'Remote'}
                        </span>
                      </div>
                    </td>

                    {/* Portal / ATS */}
                    <td className="py-3.5 px-4">
                      {getSourceBadge(job.source)}
                    </td>

                    {/* Match Score */}
                    <td className="py-3.5 px-4">
                      {score !== null && score !== undefined && score > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${score >= 70 ? 'bg-lime-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-400'}`} />
                          <span className="font-bold text-gray-900 dark:text-white text-xs">
                            {Math.round(score)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                          —
                        </span>
                      )}
                    </td>

                    {/* Date Applied */}
                    <td className="py-3.5 px-4 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                      {appliedDateStr}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {(() => {
                        const liveStatus = useJobLiveStatusStore.getState().statuses[jobId];
                        if (liveStatus) {
                          const isSuccess = liveStatus.step === 'submitted' || liveStatus.success;
                          return (
                            <span className={`${chipTone(isSuccess ? 'emerald' : 'blue', 'md')} font-bold animate-pulse`}>
                              {isSuccess ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
                              <span>{liveStatus.title}</span>
                            </span>
                          );
                        }
                        return getStatusBadge(job);
                      })()}
                    </td>

                    {/* Actions */}
                    {!hideActions && (
                      <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* CV & CL indicators — union across the job's
                              journeys, via the shared derivation, so the list
                              agrees with the kanban card and the sidebar. */}
                          {jobJourneys && jobJourneys.length > 0 && (() => {
                            const { hasCV, hasCoverLetter } =
                              getJourneyDocumentsForJob(jobJourneys);
                            return (
                              <div className="flex items-center gap-1.5 mr-1 text-[11px] font-semibold">
                                <span className={`inline-flex items-center gap-0.5 ${hasCV ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`} title={hasCV ? 'CV Generated' : 'No CV'}>
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>CV</span>
                                </span>
                                <span className={`inline-flex items-center gap-0.5 ${hasCoverLetter ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`} title={hasCoverLetter ? 'Cover Letter Generated' : 'No Cover Letter'}>
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>CL</span>
                                </span>
                              </div>
                            );
                          })()}

                        {/* External Link */}
                        {(job.jobUrl || job.applyUrl || job.sourceUrl) && (
                          <a
                            href={job.jobUrl || job.applyUrl || job.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-white/10 hover:border-lime-500 text-gray-600 dark:text-gray-300 hover:text-lime-600 transition-colors"
                            title="Open job posting"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {/* View Button */}
                        <button
                          onClick={() => onJobClick(job)}
                          className="p-1.5 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-lime-600 dark:hover:text-lime-400 transition-colors"
                          title="View job details"
                          aria-label="View job"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => onEditJob ? onEditJob(job) : onJobClick(job)}
                          className="p-1.5 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          title="Edit job"
                          aria-label="Edit job"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => onDeleteJob && onDeleteJob(job)}
                          className="p-1.5 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:border-red-800 transition-colors"
                          title="Delete job"
                          aria-label="Delete job"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    )}
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default JobsListView;
