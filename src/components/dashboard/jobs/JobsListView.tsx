// @ts-nocheck
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  MapPin,
  Clock,
  Sparkles,
  ExternalLink,
  Briefcase,
  Eye,
  Pencil,
  Trash2
} from 'lucide-react';
import CompanyLogo from '@/components/ui/CompanyLogo';
import { CVJourney } from '@/types/cv';

interface JobApplication {
  id: string;
  _id: string;
  userId: string;
  jobTitle: string;
  title?: string;
  company: string;
  status: 'draft' | 'created' | 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'accepted' | 'withdrawn';
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
  selectedJobs: Set<string>;
  setSelectedJobs: (jobs: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  setShowBulkActions: (show: boolean) => void;
  onJobClick: (job: JobApplication) => void;
  onEditJob?: (job: JobApplication) => void;
  onDeleteJob?: (job: JobApplication) => void;
  getJobJourneys: (jobId: string) => CVJourney[];
  getJourneyProgress: (journey: CVJourney) => number;
  getJourneyStatusText: (jobJourneys: CVJourney[], jobStatus?: string) => string;
}

function getSourceBadge(source?: string) {
  if (!source) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300 border border-gray-200 dark:border-white/10">
        Direct ATS
      </span>
    );
  }
  const s = source.toLowerCase();
  if (s.includes('naukri')) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
        Naukri
      </span>
    );
  }
  if (s.includes('indeed')) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
        Indeed
      </span>
    );
  }
  if (s.includes('greenhouse')) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
        Greenhouse
      </span>
    );
  }
  if (s.includes('lever')) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
        Lever
      </span>
    );
  }
  if (s.includes('adzuna')) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
        Adzuna
      </span>
    );
  }
  if (s.includes('linkedin')) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
        LinkedIn
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300 border border-gray-200 dark:border-white/10">
      Direct ATS
    </span>
  );
}

function getStatusBadge(status?: string) {
  const st = (status || 'draft').toLowerCase();
  switch (st) {
    case 'applied':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
          <Clock className="w-3 h-3" />
          Applied
        </span>
      );
    case 'interview':
    case 'screening':
    case 'assessment':
    case 'phone_screen':
    case 'technical_test':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
          <Sparkles className="w-3 h-3" />
          Interview
        </span>
      );
    case 'offer':
    case 'accepted':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle className="w-3 h-3" />
          Offer
        </span>
      );
    case 'rejected':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
          <XCircle className="w-3 h-3" />
          Rejected
        </span>
      );
    case 'created':
    case 'staging':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
          <Clock className="w-3 h-3" />
          Submitting
        </span>
      );
    case 'draft':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300 border border-gray-200 dark:border-white/10">
          Draft
        </span>
      );
  }
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
  selectedJobs,
  setSelectedJobs,
  setShowBulkActions,
  onJobClick,
  getJobJourneys,
  getJourneyProgress,
  getJourneyStatusText,
}) => {
  const handleSelectJob = (jobId: string) => {
    setSelectedJobs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      setShowBulkActions(newSet.size > 0);
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedJobs.size === jobs.length && jobs.length > 0) {
      setSelectedJobs(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedJobs(new Set(jobs.map(job => job.id || job._id)));
      setShowBulkActions(true);
    }
  };

  return (
    <div className="bg-white dark:bg-[#141810] rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50/80 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3.5 px-4 w-10 text-center">
                <input
                  type="checkbox"
                  checked={selectedJobs.size === jobs.length && jobs.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="py-3.5 px-5">Job Role & Title</th>
              <th className="py-3.5 px-4">Company</th>
              <th className="py-3.5 px-4">Location</th>
              <th className="py-3.5 px-4">Portal / ATS</th>
              <th className="py-3.5 px-4">Match Score</th>
              <th className="py-3.5 px-4">Date Applied</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/5 font-medium">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-200 dark:border-white/10">
                  <td className="py-4 px-4 text-center">
                    <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto" />
                  </td>
                  <td className="py-4 px-5">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-44 animate-pulse" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-28 animate-pulse" />
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
                  <td className="py-4 px-5 text-right">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16 ml-auto animate-pulse" />
                  </td>
                </tr>
              ))
            ) : jobs.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-16 px-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-3 text-gray-400">
                    <Briefcase className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                    No jobs found
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                    Try adjusting your filters or click "Add Job" to start tracking applications.
                  </p>
                </td>
              </tr>
            ) : (
              jobs.map((job) => {
                const jobId = job.id || job._id;
                const isSelected = selectedJobs.has(jobId);
                const jobJourneys = getJobJourneys ? getJobJourneys(jobId) : [];
                const score = job.atsScore ?? (job.matchScore ?? null);
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
                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectJob(jobId)}
                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                      />
                    </td>

                    {/* Job Role & Title */}
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-gray-900 dark:text-white text-xs group-hover:text-lime-600 dark:group-hover:text-lime-400 transition-colors">
                        {job.jobTitle || job.title || 'Untitled Role'}
                      </div>
                      {salaryStr && (
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 font-normal">
                          {salaryStr}
                        </div>
                      )}
                    </td>

                    {/* Company */}
                    <td className="py-3.5 px-4 text-gray-700 dark:text-gray-300">
                      <div className="flex items-center gap-2">
                        <CompanyLogo company={job.company} size={22} logoUrl={job.companyLogo} jobId={jobId} />
                        <span className="font-medium text-xs truncate max-w-[140px]">
                          {job.company || 'Unknown Company'}
                        </span>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4 text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1.5 text-xs">
                        <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="truncate max-w-[130px]">{job.location || 'Remote'}</span>
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
                      {getStatusBadge(job.status)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {/* CV & CL indicators */}
                        {jobJourneys && jobJourneys.length > 0 && (() => {
                          const primaryJourney = jobJourneys[0];
                          const hasCV = Boolean(primaryJourney.cvId);
                          const hasCoverLetter = Boolean(primaryJourney.coverLetterId);
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
