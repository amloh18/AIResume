// @ts-nocheck
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, X } from 'lucide-react';
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
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: 'hourly' | 'monthly' | 'yearly';
  };
  jobType?: 'full-time' | 'part-time' | 'contract' | 'internship';
  type?: string;
  source?: string;
  postedDate?: Date;
  applicationDate?: Date;
  deadline?: Date;
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  tags?: string[];
  isArchived?: boolean;
  atsScore?: number;
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
  getJobJourneys: (jobId: string) => CVJourney[];
  getJourneyProgress: (journey: CVJourney) => number;
  getJourneyStatusText: (jobJourneys: CVJourney[], jobStatus?: string) => string;
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
  onSkillGapAnalysis
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
    if (selectedJobs.size === jobs.length) {
      setSelectedJobs(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedJobs(new Set(jobs.map(job => job.id)));
      setShowBulkActions(true);
    }
  };

  return (
    <div className="bg-white dark:bg-[#141810] rounded-xl overflow-hidden border border-gray-200 dark:border-white/10">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-[#141810]">
            <tr>
              <th className="px-6 py-4 text-left">
                <input
                  type="checkbox"
                  checked={selectedJobs.size === jobs.length && jobs.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-4 text-left text-gray-900 dark:text-white font-semibold text-small uppercase tracking-wide">
                Company Name
              </th>
              <th className="px-6 py-4 text-left text-gray-900 dark:text-white font-semibold text-small uppercase tracking-wide">
                Job Title
              </th>
              <th className="px-6 py-4 text-left text-gray-900 dark:text-white font-semibold text-small uppercase tracking-wide">
                Application Date
              </th>
              <th className="px-6 py-4 text-left text-gray-900 dark:text-white font-semibold text-small uppercase tracking-wide">
                Stage
              </th>
              <th className="px-6 py-4 text-left text-gray-900 dark:text-white font-semibold text-small uppercase tracking-wide">
                Priority
              </th>
              <th className="px-6 py-4 text-left text-gray-900 dark:text-white font-semibold text-small uppercase tracking-wide">
                ATS Score
              </th>
              <th className="px-6 py-4 text-left text-gray-900 dark:text-white font-semibold text-small uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              // Skeleton loading
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-200 dark:border-white/10">
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4 animate-pulse"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-40 animate-pulse"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
                  </td>
                </tr>
              ))
            ) : jobs.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                  No jobs found. Click "Add Job" to get started.
                </td>
              </tr>
            ) : (
              jobs.map((job) => {
                const jobJourneys = getJobJourneys(job.id);
                const journeyStatusText = getJourneyStatusText(jobJourneys, job.status);
                const avgProgress = jobJourneys.length > 0
                  ? Math.round(jobJourneys.reduce((sum, journey) => sum + getJourneyProgress(journey), 0) / jobJourneys.length)
                  : 0;
                const isSelected = selectedJobs.has(job.id);

                return (
                  <motion.tr
                    key={job.id}
                    className="bg-white dark:bg-[#1a2015] border-b border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-[#1f2619] transition-colors cursor-pointer"
                    onClick={() => onJobClick(job)}
                    whileHover={{ backgroundColor: undefined }}
                  >
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectJob(job.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">
                      {job.company || 'Unknown Company'}
                    </td>
                    <td className="px-6 py-4 text-gray-900 dark:text-white">
                      {job.jobTitle || 'Untitled Job'}
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-white">
                      {job.applicationDate
                        ? new Date(job.applicationDate).toISOString().split('T')[0]
                        : job.createdAt
                          ? new Date(job.createdAt).toISOString().split('T')[0]
                          : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-small font-medium ${
                        job.status === 'applied' ? 'bg-blue-100 dark:bg-blue-600 text-blue-700 dark:text-white' :
                        job.status === 'interview' ? 'bg-purple-100 dark:bg-purple-600 text-purple-700 dark:text-white' :
                        job.status === 'offer' ? 'bg-green-100 dark:bg-green-600 text-green-700 dark:text-white' :
                        job.status === 'rejected' ? 'bg-red-100 dark:bg-red-600 text-red-700 dark:text-white' :
                        job.status === 'created' ? 'bg-purple-100 dark:bg-purple-600 text-purple-700 dark:text-white' :
                        'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-white'
                      }`}>
                        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-small font-medium ${
                        job.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                        job.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                        'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400'
                      }`}>
                        {job.priority.charAt(0).toUpperCase() + job.priority.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {job.atsScore !== undefined && job.atsScore !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <span className={`text-small font-semibold ${
                              job.atsScore >= 80 ? 'text-green-600 dark:text-green-400' :
                              job.atsScore >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                              'text-red-600 dark:text-red-400'
                            }`}>
                              {job.atsScore}%
                            </span>
                          </div>
                          <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                job.atsScore >= 80 ? 'bg-green-500' :
                                job.atsScore >= 60 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${job.atsScore}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-small text-gray-500 dark:text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        {jobJourneys.length > 0 && (
                          <>
                            {(() => {
                              const primaryJourney = jobJourneys[0];
                              const hasCV = !!primaryJourney.cvId;
                              const hasCoverLetter = !!primaryJourney.coverLetterId;
                              return (
                                <>
                                  <div className={`flex items-center gap-1 ${hasCV ? 'text-green-500' : 'text-red-500'}`}>
                                    {hasCV ? <CheckCircle size={14} /> : <X size={14} />}
                                    <span className="text-small">CV</span>
                                  </div>
                                  <div className={`flex items-center gap-1 ${hasCoverLetter ? 'text-green-500' : 'text-red-500'}`}>
                                    {hasCoverLetter ? <CheckCircle size={14} /> : <X size={14} />}
                                    <span className="text-small">CL</span>
                                  </div>
                                </>
                              );
                            })()}
                          </>
                        )}
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

