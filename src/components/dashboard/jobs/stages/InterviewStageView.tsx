'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, AlertCircle, Building, GraduationCap, MapPin, Link as LinkIcon, User, TrendingUp } from 'lucide-react';
import CompanyLogo from '@/components/ui/CompanyLogo';
import { CVJourney } from '@/types/cv';
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
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  applicationDate?: Date | string;
  updatedAt: string;
  interviews?: Array<{
    type: string;
    date: Date | string;
    outcome?: string;
    interviewer?: string;
    meetingLink?: string;
  }>;
}

interface InterviewStageViewProps {
  jobs: JobApplication[];
  journeys: CVJourney[];
  getJobJourneys: (jobId: string) => CVJourney[];
  onJobClick: (job: JobApplication) => void;
  onJobStatusUpdate: (jobId: string, newStatus: string) => Promise<void>;
  isFullScreen?: boolean;
}

const InterviewStageView: React.FC<InterviewStageViewProps> = ({
  jobs,
  onJobClick,
}) => {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const getCompRange = (job: JobApplication) => {
    if (!job.salary?.min && !job.salary?.max) return '-';
    const currency = getCurrencySymbol(job.salary.currency);
    const min = job.salary.min ? `${currency}${job.salary.min >= 1000 ? (job.salary.min / 1000).toFixed(0) + 'k' : job.salary.min}` : '';
    const max = job.salary.max ? `${currency}${job.salary.max >= 1000 ? (job.salary.max / 1000).toFixed(0) + 'k' : job.salary.max}` : '';
    return min && max ? `${min} - ${max}` : min || max;
  };

  const getNextInterview = (job: JobApplication) => {
    if (!job.interviews || job.interviews.length === 0) return null;

    // Filter for future or today's interviews
    const upcoming = job.interviews
      .filter(i => {
        const date = new Date(i.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day
        return date >= today && i.outcome !== 'completed' && i.outcome !== 'cancelled';
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return upcoming.length > 0 ? upcoming[0] : null;
  };

  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => {
      const interviewA = getNextInterview(a);
      const interviewB = getNextInterview(b);

      const dateA = interviewA ? new Date(interviewA.date).getTime() : Infinity; // No interview = end of list
      const dateB = interviewB ? new Date(interviewB.date).getTime() : Infinity;

      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [jobs, sortOrder]);

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <GraduationCap className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4" />
        <div className="text-body font-semibold text-gray-900 dark:text-white mb-2">
          No interviews scheduled
        </div>
        <p className="text-small text-gray-500 dark:text-gray-400">
          Jobs in interview stage will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#141810] rounded-xl overflow-hidden border border-gray-200 dark:border-white/10">
      {/* Quick Filter Bar */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-end">
        <button
          onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
          className="flex items-center gap-2 text-small font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <TrendingUp size={14} />
          <span>Sort by Date ({sortOrder === 'asc' ? 'Earliest First' : 'Latest First'})</span>
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
              <th className="px-6 py-4 text-left text-small font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Schedule</th>
              <th className="px-6 py-4 text-left text-small font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Round Type</th>
              <th className="px-6 py-4 text-left text-small font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Interviewer</th>
              <th className="px-6 py-4 text-center text-small font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Link</th>

              <th className="px-6 py-4 text-right text-small font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-white/10">
            {sortedJobs.map((job) => {
              const nextInterview = getNextInterview(job);
              const interviewDate = nextInterview ? new Date(nextInterview.date) : null;

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

                  {/* Schedule */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {interviewDate ? (
                      <div className="flex flex-col">
                        <span className="text-small font-bold text-gray-900 dark:text-white">
                          {interviewDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-small text-gray-500 dark:text-gray-400">
                          {interviewDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ) : (
                      <span className="text-small text-gray-400 italic">No upcoming</span>
                    )}
                  </td>

                  {/* Round Type */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {nextInterview ? (
                      <span className={`${CHIP_INLINE} ${CHIP_TONES.purple} font-medium capitalize`}>
                        {(nextInterview.type || 'Unknown').replace('-', ' ')}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>

                  {/* Interviewer */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {nextInterview?.interviewer ? (
                      <div className="flex items-center gap-2 text-small text-gray-600 dark:text-gray-300">
                        <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] uppercase">
                          {nextInterview.interviewer.substring(0, 1)}
                        </div>
                        <span>{nextInterview.interviewer}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-small text-gray-400 italic">
                        <User size={14} />
                        <span>Not assigned</span>
                      </div>
                    )}
                  </td>

                  {/* Meeting Link */}
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {nextInterview?.meetingLink ? (
                      <a
                        href={nextInterview.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                        title="Join Meeting"
                      >
                        <LinkIcon size={16} />
                      </a>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-700">-</span>
                    )}
                  </td>

                  {/* Action */}
                  <td className="px-6 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // View details to see notes
                        onJobClick(job);
                      }}
                      className="px-3 py-1.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 text-small font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-white/20 transition-colors inline-flex items-center gap-1.5"
                    >
                      View Notes
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

export default InterviewStageView;
