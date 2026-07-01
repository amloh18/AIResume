'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { XCircle, Building, Calendar, TrendingUp, Archive, RefreshCw, BarChart3, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

interface JobApplication {
  id: string;
  _id: string;
  jobTitle: string;
  title?: string;
  company: string;
  companyLogo?: string;
  applicationDate?: Date | string;
  updatedAt: string;
  matchScore?: number;
  atsScore?: number;
  notes?: string;
}

interface RejectedStageViewProps {
  jobs: JobApplication[];
  onJobClick: (job: JobApplication) => void;
  isFullScreen?: boolean;
}

const RejectedStageView: React.FC<RejectedStageViewProps> = ({
  jobs,
  onJobClick,
  isFullScreen = false
}) => {
  const getDaysBetween = (startDate?: Date | string, endDate?: Date | string): number | null => {
    if (!startDate || !endDate) return null;
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  const handleViewAnalysis = (job: JobApplication, e: React.MouseEvent) => {
    e.stopPropagation();
    // This will be handled by the parent component to open skill gap analysis
    onJobClick(job);
  };

  const handleArchive = async (job: JobApplication, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Archive functionality would be implemented here
      toast.success('Job archived');
    } catch (error) {
      console.error('Error archiving job:', error);
      toast.error('Failed to archive job');
    }
  };

  // Calculate insights
  const avgMatchScore = jobs.length > 0
    ? Math.round(jobs.reduce((sum, job) => sum + (job.matchScore || job.atsScore || 0), 0) / jobs.length)
    : 0;

  const avgDaysToRejection = jobs.length > 0
    ? Math.round(
      jobs
        .map(job => getDaysBetween(job.applicationDate, job.updatedAt))
        .filter((days): days is number => days !== null)
        .reduce((sum, days) => sum + days, 0) /
      jobs.filter(job => getDaysBetween(job.applicationDate, job.updatedAt) !== null).length
    )
    : 0;

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <XCircle className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4" />
        <h3 className="text-h3 font-semibold text-gray-900 dark:text-white mb-2">
          No rejected applications
        </h3>
        <p className="text-small text-gray-500 dark:text-gray-400">
          Keep applying! Learn from each application.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Insights Section - Only show when NOT full screen */}
      {!isFullScreen && (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50 rounded-lg p-4 md:p-6 border border-gray-200 dark:border-white/10">
          <h3 className="text-h3 font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-[#1a2015] rounded-lg p-4">
              <div className="text-h2 font-bold text-gray-900 dark:text-white mb-1">
                {jobs.length}
              </div>
              <div className="text-small text-gray-600 dark:text-gray-400">
                Total Rejections
              </div>
            </div>
            <div className="bg-white dark:bg-[#1a2015] rounded-lg p-4">
              <div className="text-h2 font-bold text-gray-900 dark:text-white mb-1">
                {avgMatchScore}%
              </div>
              <div className="text-small text-gray-600 dark:text-gray-400">
                Avg Match Score
              </div>
            </div>
            <div className="bg-white dark:bg-[#1a2015] rounded-lg p-4">
              <div className="text-h2 font-bold text-gray-900 dark:text-white mb-1">
                {avgDaysToRejection}
              </div>
              <div className="text-small text-gray-600 dark:text-gray-400">
                Avg Days to Rejection
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Jobs List */}
      <div className="space-y-4">
        {jobs.map((job) => {
          const daysToRejection = getDaysBetween(job.applicationDate, job.updatedAt);
          const matchScore = job.matchScore || job.atsScore || 0;

          // COMPACT FULL SCREEN LAYOUT
          if (isFullScreen) {
            return (
              <motion.div
                key={job.id || job._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between gap-4 p-4 bg-white dark:bg-[#1a2015] border border-gray-200 dark:border-white/10 rounded-lg hover:shadow-md transition-all"
              >
                {/* Left: Compact Job Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <Building className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-body font-semibold text-gray-900 dark:text-white truncate">
                      {job.jobTitle || job.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-small text-gray-600 dark:text-gray-400">
                      <span>{job.company}</span>
                      {daysToRejection !== null && (
                        <>
                          <span>•</span>
                          <span>{daysToRejection} days to rejection</span>
                        </>
                      )}
                      {matchScore > 0 && (
                        <>
                          <span>•</span>
                          <span className={`font-semibold ${matchScore >= 80 ? 'text-green-600 dark:text-green-400' :
                              matchScore >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                                'text-red-600 dark:text-red-400'
                            }`}>
                            {matchScore}% match
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: CTA Buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <motion.button
                    onClick={(e) => handleViewAnalysis(job, e)}
                    className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-small font-medium transition-all flex items-center gap-1.5"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <BarChart3 className="w-3 h-3" />
                    Analysis
                  </motion.button>
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      onJobClick(job);
                    }}
                    className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-small font-medium transition-all flex items-center gap-1.5"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Eye className="w-3 h-3" />
                    Details
                  </motion.button>
                </div>
              </motion.div>
            );
          }

          // EXISTING VERTICAL LAYOUT
          return (
            <motion.div
              key={job.id || job._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-[#1a2015] border border-gray-200 dark:border-white/10 rounded-lg p-4 md:p-6 hover:shadow-lg transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {/* Left: Job Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
                      <Building className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-h3 font-semibold text-gray-900 dark:text-white mb-1 truncate">
                        {job.jobTitle || job.title}
                      </h3>
                      <p className="text-small text-gray-600 dark:text-gray-400">
                        {job.company}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-small mb-3">
                    {/* Application Date */}
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span>
                        Applied: {job.applicationDate
                          ? (typeof job.applicationDate === 'string'
                            ? new Date(job.applicationDate).toLocaleDateString()
                            : job.applicationDate.toLocaleDateString())
                          : 'N/A'}
                      </span>
                    </div>

                    {/* Rejection Date */}
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <XCircle className="w-4 h-4" />
                      <span>
                        Rejected: {job.updatedAt
                          ? (typeof job.updatedAt === 'string'
                            ? new Date(job.updatedAt).toLocaleDateString()
                            : new Date(job.updatedAt).toLocaleDateString())
                          : 'N/A'}
                      </span>
                    </div>

                    {/* Days to Rejection */}
                    {daysToRejection !== null && (
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <span>{daysToRejection} days to rejection</span>
                      </div>
                    )}
                  </div>

                  {/* Match Score */}
                  {matchScore > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-small font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Match Score
                        </span>
                        <span className={`text-small font-semibold ${matchScore >= 80 ? 'text-green-600 dark:text-green-400' :
                            matchScore >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                              'text-red-600 dark:text-red-400'
                          }`}>
                          {matchScore}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${matchScore >= 80 ? 'bg-green-500' :
                              matchScore >= 60 ? 'bg-yellow-500' :
                                'bg-red-500'
                            }`}
                          style={{ width: `${matchScore}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <motion.button
                    onClick={(e) => handleViewAnalysis(job, e)}
                    className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-small font-medium transition-all flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <BarChart3 className="w-4 h-4" />
                    View Analysis
                  </motion.button>
                  <motion.button
                    onClick={(e) => handleArchive(job, e)}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-small font-medium transition-all flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Archive className="w-4 h-4" />
                    Archive
                  </motion.button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default RejectedStageView;

