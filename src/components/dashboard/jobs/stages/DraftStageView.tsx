'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Building, MapPin, TrendingUp, Sparkles, DollarSign, MoreHorizontal, Award, Globe, Calendar } from 'lucide-react';
import { JobApplication } from '@/types/job';
import { JobTable, JobTableHeader, JobTableRow, JobTableCompanyCell, JobTableRoleCell, JobTableLocationCell, JobTableCompCell } from './JobTablePrimitives';



interface DraftStageViewProps {
  jobs: JobApplication[];
  onJobClick: (job: JobApplication) => void;
  onCreateJourney: (job: JobApplication) => Promise<void>;
}

const DraftStageView: React.FC<DraftStageViewProps> = ({
  jobs,
  onJobClick,
  onCreateJourney
}) => {
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const handleCreateJourney = async (job: JobApplication, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await onCreateJourney(job);
    } catch (error) {
      console.error('Error creating journey:', error);
    }
  };

  const sortedJobs = [...jobs].sort((a, b) => {
    const scoreA = a.matchScore || 0;
    const scoreB = b.matchScore || 0;
    return sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
  });

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4" />
        <h3 className="text-h3 font-semibold text-gray-900 dark:text-white mb-2">
          No draft jobs
        </h3>
        <p className="text-small text-gray-500 dark:text-gray-400">
          Add a job to get started with your application journey.
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
          <span>Sort by Match Score ({sortOrder === 'desc' ? 'High to Low' : 'Low to High'})</span>
        </button>
      </div>

      <JobTable
        headers={
          <>
            <JobTableHeader label="Company" />
            <JobTableHeader label="Role" />
            <JobTableHeader label="Location" />
            <JobTableHeader label="Comp Range" />
            <JobTableHeader label="Match Score" />
            <JobTableHeader label="Sponsorship" />
            <JobTableHeader label="Source" />
            <JobTableHeader label="Date Added" />
            <JobTableHeader label="Action" align="right" />
          </>
        }
      >
        {sortedJobs.map((job) => {
          const matchScore = job.matchScore || 98;
          return (
            <JobTableRow key={job.id || job._id} job={job} onClick={() => onJobClick(job)}>
              <JobTableCompanyCell job={job} />
              <JobTableRoleCell job={job} />
              <JobTableLocationCell job={job} />
              <JobTableCompCell job={job} />

              {/* Match Score */}
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-small font-medium ${matchScore >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                  matchScore >= 60 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                  {matchScore}%
                </span>
              </td>

              {/* Sponsorship */}
              <td className="px-6 py-4 whitespace-nowrap text-center">
                {job.sponsorship === 'yes' ? (
                  <div className="text-gray-500 dark:text-gray-400" title="Sponsorship Available">
                    <Award size={16} />
                  </div>
                ) : (
                  <span className="text-gray-300 dark:text-gray-700">-</span>
                )}
              </td>

              {/* Source */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-1.5 text-small text-gray-500 dark:text-gray-400">
                  <Globe size={14} />
                  <span>{job.source || 'Manual'}</span>
                </div>
              </td>

              {/* Date Added */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-1.5 text-small text-gray-500 dark:text-gray-400">
                  <Calendar size={14} />
                  <span>{new Date(job.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </div>
              </td>

              {/* Action */}
              <td className="px-6 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={(e) => handleCreateJourney(job, e)}
                  className="px-3 py-1.5 bg-lime-500 text-[#141810] text-small font-bold rounded-lg hover:bg-lime-400 transition-colors inline-flex items-center gap-1.5"
                >
                  <Sparkles size={14} />
                  Generate Docs
                </button>
              </td>
            </JobTableRow>
          );
        })}
      </JobTable>
    </div>
  );
};

export default DraftStageView;
