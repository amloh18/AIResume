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
    <div className="space-y-4">
      {jobs.map((job) => {
        const matchScore = job.matchScore || job.atsScore || 0;
        const jobDescription = job.jobDescription || job.description || '';
        const truncatedDescription = jobDescription.length > 150
          ? `${jobDescription.substring(0, 150)}...`
          : jobDescription;

        return (
          <motion.div
            key={job.id || job._id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-[#1a2015] border border-gray-200 dark:border-white/10 rounded-lg p-4 md:p-6 hover:shadow-lg transition-all cursor-pointer"
            onClick={() => onJobClick(job)}
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* Left: Job Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                    <Building className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 truncate">
                      {job.jobTitle || job.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {job.company}
                    </p>
                    {job.location && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-500 mb-2">
                        <MapPin className="w-3 h-3" />
                        <span>{job.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Match Score */}
                {matchScore > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Match Score
                      </span>
                      <span className={`text-sm font-semibold ${
                        matchScore >= 80 ? 'text-green-600 dark:text-green-400' :
                        matchScore >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-red-600 dark:text-red-400'
                      }`}>
                        {matchScore}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
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
                )}

                {/* Job Description Preview */}
                {truncatedDescription && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {truncatedDescription}
                  </p>
                )}
              </div>

              {/* Right: Action Button */}
              <div className="flex-shrink-0">
                <motion.button
                  onClick={(e) => handleCreateJourney(job, e)}
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-lg font-medium transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Sparkles className="w-4 h-4" />
                  Create CV and CL
                </motion.button>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default DraftStageView;

