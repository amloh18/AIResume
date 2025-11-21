'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, AlertCircle, CheckCircle, Building, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

interface JobApplication {
  id: string;
  _id: string;
  jobTitle: string;
  title?: string;
  company: string;
  applicationDate?: Date | string;
  deadline?: Date | string;
  updatedAt: string;
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
  onJobStatusUpdate,
  isFullScreen = false
}) => {
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

  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => {
      // First sort by deadline (ascending, nulls last)
      const deadlineA = a.deadline ? (typeof a.deadline === 'string' ? new Date(a.deadline) : a.deadline).getTime() : Infinity;
      const deadlineB = b.deadline ? (typeof b.deadline === 'string' ? new Date(b.deadline) : b.deadline).getTime() : Infinity;
      
      if (deadlineA !== deadlineB) {
        return deadlineA - deadlineB;
      }
      
      // Then sort by follow-up needed
      const followUpA = isFollowUpNeeded(a) ? 0 : 1;
      const followUpB = isFollowUpNeeded(b) ? 0 : 1;
      return followUpA - followUpB;
    });
  }, [jobs]);

  const handleMarkFollowUpComplete = async (job: JobApplication, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Update job's updatedAt to current time (simulating follow-up completion)
      await onJobStatusUpdate(job.id || job._id, job.status);
      toast.success('Follow-up marked as complete');
    } catch (error) {
      console.error('Error updating follow-up:', error);
      toast.error('Failed to update follow-up status');
    }
  };

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CheckCircle className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No applied jobs
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Jobs you've applied to will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedJobs.map((job) => {
        const daysSinceApplication = getDaysSinceApplication(job.applicationDate);
        const daysUntilDeadline = getDaysUntilDeadline(job.deadline);
        const needsFollowUp = isFollowUpNeeded(job);
        
        const deadlineStatus = daysUntilDeadline === null 
          ? 'none'
          : daysUntilDeadline < 0 
            ? 'overdue' 
            : daysUntilDeadline <= 3 
              ? 'approaching' 
              : 'normal';

        // COMPACT FULL SCREEN LAYOUT
        if (isFullScreen) {
          return (
            <motion.div
              key={job.id || job._id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex items-center justify-between gap-4 p-4 bg-white dark:bg-[#1a2015] border rounded-lg hover:shadow-md transition-all ${
                deadlineStatus === 'overdue' 
                  ? 'border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10' 
                  : deadlineStatus === 'approaching'
                    ? 'border-yellow-300 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/10'
                    : 'border-gray-200 dark:border-white/10'
              }`}
            >
              {/* Left: Compact Job Info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                  <Building className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                    {job.jobTitle || job.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-600 dark:text-gray-400">
                    <span>{job.company}</span>
                    <span>•</span>
                    <span>{daysSinceApplication} days ago</span>
                    {job.deadline && (
                      <>
                        <span>•</span>
                        <span className={deadlineStatus === 'overdue' ? 'text-red-600 dark:text-red-400 font-semibold' : deadlineStatus === 'approaching' ? 'text-yellow-600 dark:text-yellow-400' : ''}>
                          {deadlineStatus === 'overdue' 
                            ? `Overdue ${Math.abs(daysUntilDeadline!)}d`
                            : deadlineStatus === 'approaching'
                              ? `${daysUntilDeadline}d left`
                              : `Deadline: ${(typeof job.deadline === 'string' ? new Date(job.deadline) : job.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                        </span>
                      </>
                    )}
                    {needsFollowUp && (
                      <>
                        <span>•</span>
                        <span className="text-orange-600 dark:text-orange-400 font-semibold">Follow-up needed</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: CTA Buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {needsFollowUp && (
                  <motion.button
                    onClick={(e) => handleMarkFollowUpComplete(job, e)}
                    className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <CheckCircle className="w-3 h-3" />
                    Mark Complete
                  </motion.button>
                )}
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    onJobClick(job);
                  }}
                  className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Eye className="w-3 h-3" />
                  View Details
                </motion.button>
              </div>
            </motion.div>
          );
        }

        // EXISTING VERTICAL LAYOUT (when not full screen)
        return (
          <motion.div
            key={job.id || job._id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white dark:bg-[#1a2015] border rounded-lg p-4 md:p-6 hover:shadow-lg transition-all cursor-pointer ${
              deadlineStatus === 'overdue' 
                ? 'border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10' 
                : deadlineStatus === 'approaching'
                  ? 'border-yellow-300 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/10'
                  : 'border-gray-200 dark:border-white/10'
            }`}
            onClick={() => onJobClick(job)}
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* Left: Job Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                    <Building className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 truncate">
                      {job.jobTitle || job.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {job.company}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
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

                  {/* Days Since Application */}
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>{daysSinceApplication} days ago</span>
                  </div>

                  {/* Deadline */}
                  {job.deadline && (
                    <div className={`flex items-center gap-2 ${
                      deadlineStatus === 'overdue' 
                        ? 'text-red-600 dark:text-red-400 font-semibold' 
                        : deadlineStatus === 'approaching'
                          ? 'text-yellow-600 dark:text-yellow-400 font-semibold'
                          : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      <AlertCircle className="w-4 h-4" />
                      <span>
                        {deadlineStatus === 'overdue' 
                          ? `Overdue by ${Math.abs(daysUntilDeadline!)} days`
                          : deadlineStatus === 'approaching'
                            ? `${daysUntilDeadline} days left`
                            : `Deadline: ${(typeof job.deadline === 'string' ? new Date(job.deadline) : job.deadline).toLocaleDateString()}`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Follow-up Status */}
                {needsFollowUp && (
                  <div className="mt-3 p-2 bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 rounded-lg">
                    <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span>Follow-up recommended - {daysSinceApplication} days since application</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Actions */}
              <div className="flex flex-col gap-2 flex-shrink-0">
                {needsFollowUp && (
                  <motion.button
                    onClick={(e) => handleMarkFollowUpComplete(job, e)}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Mark Follow-up Complete
                  </motion.button>
                )}
                {job.deadline && deadlineStatus !== 'normal' && (
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      onJobClick(job);
                    }}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-all"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    View Details
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default AppliedStageView;

