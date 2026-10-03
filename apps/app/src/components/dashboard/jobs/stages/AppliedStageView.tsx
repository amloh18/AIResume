'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, AlertCircle, CheckCircle, Building, Eye, Globe, MapPin, Bell, TrendingUp } from 'lucide-react';
import CompanyLogo from '@/components/ui/CompanyLogo';
import { getCurrencySymbol } from '@/lib/config/job-constants';
import { CHIP_INLINE, CHIP_TONES } from '@/components/ui/chip-styles';

interface JobApplication {
  id: string;
  _id: string;
  jobTitle: string;
  title?: string;
  company: string;
  companyLogo?: string;
  location?: string;
  status?: string;
  applicationDate?: Date | string;
  deadline?: Date | string;
  updatedAt: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  source?: string;
}

interface AppliedStageViewProps {
  jobs: JobApplication[];
  onJobClick: (job: JobApplication) => void;
  onJobStatusUpdate: (jobId: string, newStatus: string) => Promise<void>;
  isFullScreen?: boolean;
}

const AppliedStageView: React.FC<AppliedStageViewProps> = ({
  jobs,
  onJobClick,
  isFullScreen = false
}) => {
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const getDaysSinceApplication = (applicationDate?: Date | string): number => {
    if (!applicationDate) return 0;
    const date = typeof applicationDate === 'string' ? new Date(applicationDate) : applicationDate;
    const now = new Date();
    return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getDaysUntilDeadline = (deadline?: Date | string): number | null => {
    if (!deadline) return null;
    const date = typeof deadline === 'string' ? new Date(deadline) : deadline;
    const now = new Date();
    const diff = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const isFollowUpNeeded = (job: JobApplication): boolean => {
    const daysSince = getDaysSinceApplication(job.applicationDate);
    const daysSinceUpdate = getDaysSinceApplication(job.updatedAt);
    return daysSince >= 7 && daysSinceUpdate >= 7;
  };

  const getCompRange = (job: JobApplication) => {
    if (!job.salary?.min && !job.salary?.max) return '-';
    const currency = getCurrencySymbol(job.salary.currency);
    const min = job.salary.min ? `${currency}${job.salary.min >= 1000 ? (job.salary.min / 1000).toFixed(0) + 'k' : job.salary.min}` : '';
    const max = job.salary.max ? `${currency}${job.salary.max >= 1000 ? (job.salary.max / 1000).toFixed(0) + 'k' : job.salary.max}` : '';
    return min && max ? `${min} - ${max}` : min || max;
  };

  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => {
      const dateA = a.applicationDate ? (typeof a.applicationDate === 'string' ? new Date(a.applicationDate) : a.applicationDate).getTime() : 0;
      const dateB = b.applicationDate ? (typeof b.applicationDate === 'string' ? new Date(b.applicationDate) : b.applicationDate).getTime() : 0;
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [jobs, sortOrder]);

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CheckCircle className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4" />
        <div className="text-body font-semibold text-gray-900 dark:text-white mb-2">
          No applied jobs
        </div>
        <p className="text-small text-gray-500 dark:text-gray-400">
          Jobs you&apos;ve applied to will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#141810] rounded-xl overflow-hidden border border-gray-200 dark:border-white/10">
      {/* Quick Filter Bar */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-end">
        <button
          onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
          className="flex items-center gap-2 text-small font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <TrendingUp size={14} />
          <span>Sort by Most Recent ({sortOrder === 'desc' ? 'Newest First' : 'Oldest First'})</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-[#1c2018]">
            <tr>
              {/* Universal Columns */}
              <th className="px-6 py-4 text-left text-small font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Company</th>
              <th className="px-6 py-4 text-left text-small font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
              <th className="px-6 py-4 text-left text-small font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Location</th>
              <th className="px-6 py-4 text-left text-small font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Comp Range</th>

              {/* Stage Specific Columns */}
              <th className="px-6 py-4 text-left text-small font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Applied On</th>
              <th className="px-6 py-4 text-left text-small font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Elapsed Time</th>
              <th className="px-6 py-4 text-left text-small font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Platform</th>
              <th className="px-6 py-4 text-left text-small font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Next Follow-up</th>

              <th className="px-6 py-4 text-right text-small font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-white/10">
            {sortedJobs.map((job) => {
              const daysSinceApplication = getDaysSinceApplication(job.applicationDate);
              const needsFollowUp = isFollowUpNeeded(job);
              const appliedDate = job.applicationDate ? (typeof job.applicationDate === 'string' ? new Date(job.applicationDate) : job.applicationDate) : null;

              // Calculate follow up date (7 days after last update/application)
              const lastUpdate = job.updatedAt ? new Date(job.updatedAt) : new Date();
              const followUpDate = new Date(lastUpdate);
              followUpDate.setDate(followUpDate.getDate() + 7);

              return (
                <motion.tr
                  key={job.id || job._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => onJobClick(job)}
                >
                  {/* Company */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <CompanyLogo company={job.company} size={32} logoUrl={job.companyLogo} jobId={job.id || job._id} />
                      <span className="text-small font-semibold text-gray-900 dark:text-white">{job.company}</span>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-small text-gray-900 dark:text-white">{job.jobTitle || job.title}</span>
                  </td>

                  {/* Location */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-small text-gray-500 dark:text-gray-400">
                      <MapPin size={14} />
                      <span className="truncate max-w-[150px]">{job.location || '-'}</span>
                    </div>
                  </td>

                  {/* Comp Range */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-small text-gray-600 dark:text-gray-300">{getCompRange(job)}</span>
                  </td>

                  {/* Applied On */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-small text-gray-500 dark:text-gray-400">
                      <Calendar size={14} />
                      <span>{appliedDate ? appliedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}</span>
                    </div>
                  </td>

                  {/* Elapsed Time */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`${CHIP_INLINE} font-medium ${CHIP_TONES[daysSinceApplication > 14 ? 'rose' : daysSinceApplication > 7 ? 'amber' : 'neutral']}`}>
                      {daysSinceApplication} days ago
                    </span>
                  </td>

                  {/* Platform */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-small text-gray-500 dark:text-gray-400">
                      <Globe size={14} />
                      <span className="capitalize">{(job.source || 'manual').replace(/-/g, ' ')}</span>
                    </div>
                  </td>

                  {/* Next Follow-up */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`flex items-center gap-1.5 text-small ${needsFollowUp ? 'text-orange-600 dark:text-orange-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                      <Bell size={14} />
                      <span>{followUpDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </td>

                  {/* Action */}
                  <td className="px-6 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Trigger log activity or simply open sidebar for now as requested for "Log Activity"
                        onJobClick(job);
                      }}
                      className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-small font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors inline-flex items-center gap-1.5"
                    >
                      Log Activity
                    </button>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AppliedStageView;
