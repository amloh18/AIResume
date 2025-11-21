'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Building, MapPin, TrendingUp, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

interface JobApplication {
  id: string;
  _id: string;
  jobTitle: string;
  title?: string;
  company: string;
  location?: string;
  jobDescription?: string;
  description?: string;
  matchScore?: number;
  atsScore?: number;
}

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
  const handleCreateJourney = async (job: JobApplication, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await onCreateJourney(job);
      toast.success('CV and Cover Letter journey created!');
    } catch (error) {
      console.error('Error creating journey:', error);
      toast.error('Failed to create journey. Please try again.');
    }
  };

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No draft jobs
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Add a job to get started with your application journey.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#141810] rounded-xl overflow-hidden border border-gray-200 dark:border-white/10">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-[#141810]">
            <tr>
              <th className="px-6 py-4 text-left text-gray-900 dark:text-white font-semibold text-sm uppercase tracking-wide">
                Company Name
              </th>
              <th className="px-6 py-4 text-left text-gray-900 dark:text-white font-semibold text-sm uppercase tracking-wide">
                Job Title
              </th>
              <th className="px-6 py-4 text-left text-gray-900 dark:text-white font-semibold text-sm uppercase tracking-wide">
                Location
              </th>
              <th className="px-6 py-4 text-left text-gray-900 dark:text-white font-semibold text-sm uppercase tracking-wide">
                Match Score
              </th>
              <th className="px-6 py-4 text-left text-gray-900 dark:text-white font-semibold text-sm uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
      {jobs.map((job) => {
        const matchScore = job.matchScore || job.atsScore || 0;

        return (
                <motion.tr
            key={job.id || job._id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-[#1a2015] border-b border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-[#1f2619] transition-colors cursor-pointer"
            onClick={() => onJobClick(job)}
                  whileHover={{ backgroundColor: undefined }}
                >
                  <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">
                    <div className="flex items-center gap-2">
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                        <Building className="w-4 h-4 text-white" />
                      </div>
                      <span>{job.company || 'Unknown Company'}</span>
                  </div>
                  </td>
                  <td className="px-6 py-4 text-gray-900 dark:text-white">
                    {job.jobTitle || job.title || 'Untitled Job'}
                  </td>
                  <td className="px-6 py-4 text-gray-700 dark:text-white">
                    {job.location ? (
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                        <span>{job.location}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500 dark:text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {matchScore > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                      <span className={`text-sm font-semibold ${
                        matchScore >= 80 ? 'text-green-600 dark:text-green-400' :
                        matchScore >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-red-600 dark:text-red-400'
                      }`}>
                        {matchScore}%
                      </span>
                    </div>
                        <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          matchScore >= 80 ? 'bg-green-500' :
                          matchScore >= 60 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${matchScore}%` }}
                      />
                    </div>
                  </div>
                    ) : (
                      <span className="text-xs text-gray-500 dark:text-gray-400">-</span>
                )}
                  </td>
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                <motion.button
                  onClick={(e) => handleCreateJourney(job, e)}
                      className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-lg font-medium transition-all flex items-center gap-2 shadow-md hover:shadow-lg text-sm"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Sparkles className="w-4 h-4" />
                      <span className="hidden sm:inline">Create CV and CL</span>
                      <span className="sm:hidden">Create</span>
                </motion.button>
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

export default DraftStageView;

