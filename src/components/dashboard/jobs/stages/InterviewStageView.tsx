'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, AlertCircle, Building, GraduationCap, MapPin, Link as LinkIcon, User, TrendingUp } from 'lucide-react';
import { CVJourney } from '@/types/cv';
import { JobApplication } from '@/types/job';
import { JobTable, JobTableHeader, JobTableRow, JobTableCompanyCell, JobTableRoleCell, JobTableLocationCell, JobTableCompCell } from './JobTablePrimitives';



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
        <h3 className="text-h3 font-semibold text-gray-900 dark:text-white mb-2">
          No interviews scheduled
        </h3>
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

      <JobTable
        headers={
          <>
            <JobTableHeader label="Company" />
            <JobTableHeader label="Role" />
            <JobTableHeader label="Location" />
            <JobTableHeader label="Comp Range" />
            <JobTableHeader label="Schedule" />
            <JobTableHeader label="Round Type" />
            <JobTableHeader label="Interviewer" />
            <JobTableHeader label="Link" align="center" />
            <JobTableHeader label="Action" align="right" />
          </>
        }
      >
        {sortedJobs.map((job) => {
          const nextInterview = getNextInterview(job);
          const interviewDate = nextInterview ? new Date(nextInterview.date) : null;

          return (
            <JobTableRow key={job.id || job._id} job={job} onClick={() => onJobClick(job)}>
              <JobTableCompanyCell job={job} />
              <JobTableRoleCell job={job} />
              <JobTableLocationCell job={job} />
              <JobTableCompCell job={job} />

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
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-small font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 capitalize">
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
            </JobTableRow>
          );
        })}
      </JobTable>
    </div>
  );
};

export default InterviewStageView;
