'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, AlertCircle, Building, GraduationCap } from 'lucide-react';
import { CVJourney } from '@/types/cv';

interface JobApplication {
  id: string;
  _id: string;
  jobTitle: string;
  title?: string;
  company: string;
  applicationDate?: Date | string;
  updatedAt: string;
  interviews?: Array<{
    type: string;
    date: Date | string;
    outcome?: string;
  }>;
}

interface InterviewStageViewProps {
  jobs: JobApplication[];
  journeys: CVJourney[];
  getJobJourneys: (jobId: string) => CVJourney[];
  onJobClick: (job: JobApplication) => void;
  onJobStatusUpdate: (jobId: string, newStatus: string) => Promise<void>;
  isFullScreen?: boolean; // Indicates if this is in full screen/zoomed mode
}

const InterviewStageView: React.FC<InterviewStageViewProps> = ({
  jobs,
  journeys,
  getJobJourneys,
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

  const getNextInterviewDate = (job: JobApplication): Date | null => {
    if (!job.interviews || job.interviews.length === 0) return null;
    
    const upcomingInterviews = job.interviews
      .filter(interview => {
        const interviewDate = typeof interview.date === 'string' ? new Date(interview.date) : interview.date;
        return interviewDate > new Date() && interview.outcome !== 'completed' && interview.outcome !== 'cancelled';
      })
      .map(interview => typeof interview.date === 'string' ? new Date(interview.date) : interview.date)
      .sort((a, b) => a.getTime() - b.getTime());
    
    return upcomingInterviews.length > 0 ? upcomingInterviews[0] : null;
  };

  const getDaysUntilInterview = (interviewDate: Date): number => {
    const now = new Date();
    return Math.floor((interviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const isFollowUpNeeded = (job: JobApplication): boolean => {
    const daysSince = getDaysSinceApplication(job.applicationDate);
    const daysSinceUpdate = getDaysSinceApplication(job.updatedAt);
    return daysSince >= 3 && daysSinceUpdate >= 3;
  };

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <GraduationCap className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No interviews scheduled
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Jobs in interview stage will appear here.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className={isFullScreen ? "grid grid-cols-1 gap-4" : "grid grid-cols-1 lg:grid-cols-2 gap-4"}>
        {jobs.map((job) => {
          const daysSinceApplication = getDaysSinceApplication(job.applicationDate);
          const nextInterview = getNextInterviewDate(job);
          const daysUntilInterview = nextInterview ? getDaysUntilInterview(nextInterview) : null;
          const needsFollowUp = isFollowUpNeeded(job);
          const jobJourneys = getJobJourneys(job.id || job._id);

          // COMPACT FULL SCREEN LAYOUT
          if (isFullScreen) {
            return (
              <motion.div
                key={job.id || job._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-center justify-between gap-4 p-4 bg-white dark:bg-[#1a2015] border rounded-lg hover:shadow-md transition-all ${
                  daysUntilInterview !== null && daysUntilInterview <= 3
                    ? 'border-orange-300 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10'
                    : 'border-gray-200 dark:border-white/10'
                }`}
              >
                {/* Left: Compact Job Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                    <Building className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                      {job.jobTitle || job.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-600 dark:text-gray-400">
                      <span>{job.company}</span>
                      {nextInterview && (
                        <>
                          <span>•</span>
                          <span className={daysUntilInterview !== null && daysUntilInterview <= 3 ? 'text-orange-600 dark:text-orange-400 font-semibold' : 'text-blue-600 dark:text-blue-400'}>
                            {daysUntilInterview === 0 
                              ? 'Today!' 
                              : daysUntilInterview === 1 
                                ? 'Tomorrow' 
                                : `${daysUntilInterview} days away`}
                          </span>
                          <span>•</span>
                          <span>{nextInterview.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        </>
                      )}
                      {!nextInterview && (
                        <>
                          <span>•</span>
                          <span>Applied {daysSinceApplication} days ago</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: CTA Buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      onJobClick(job);
                    }}
                    className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <GraduationCap className="w-3 h-3" />
                    Interview Prep
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
              <div className="flex flex-col gap-4">
                {/* Job Header */}
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
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

                {/* Interview Date */}
                {nextInterview && (
                  <div className={`p-3 rounded-lg ${
                    daysUntilInterview !== null && daysUntilInterview <= 3
                      ? 'bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700'
                      : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className={`w-4 h-4 ${
                        daysUntilInterview !== null && daysUntilInterview <= 3
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-blue-600 dark:text-blue-400'
                      }`} />
                      <span className={`text-sm font-medium ${
                        daysUntilInterview !== null && daysUntilInterview <= 3
                          ? 'text-orange-700 dark:text-orange-300'
                          : 'text-blue-700 dark:text-blue-300'
                      }`}>
                        Next Interview
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {nextInterview.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                    {daysUntilInterview !== null && (
                      <p className={`text-xs mt-1 ${
                        daysUntilInterview <= 3
                          ? 'text-orange-600 dark:text-orange-400 font-semibold'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {daysUntilInterview === 0 
                          ? 'Today!' 
                          : daysUntilInterview === 1 
                            ? 'Tomorrow' 
                            : `${daysUntilInterview} days away`}
                      </p>
                    )}
                  </div>
                )}

                {/* Application Info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>Applied {daysSinceApplication} days ago</span>
                  </div>
                  {jobJourneys.length > 0 && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">
                        {jobJourneys.length} journey{jobJourneys.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>

                {/* Follow-up Status */}
                {needsFollowUp && (
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 rounded-lg">
                    <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span>Follow-up recommended</span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <motion.button
                    onClick={() => onJobClick(job)}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <GraduationCap className="w-4 h-4" />
                    Interview Prep
                  </motion.button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </>
  );
};

export default InterviewStageView;

