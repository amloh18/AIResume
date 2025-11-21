'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft } from 'lucide-react';
import DraftStageView from './stages/DraftStageView';
import CreatedStageView from './stages/CreatedStageView';
import AppliedStageView from './stages/AppliedStageView';
import InterviewStageView from './stages/InterviewStageView';
import OfferStageView from './stages/OfferStageView';
import RejectedStageView from './stages/RejectedStageView';
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
  applicationDate?: Date | string;
  deadline?: Date | string;
  priority: 'low' | 'medium' | 'high';
  matchScore?: number;
  atsScore?: number;
  createdAt: string;
  updatedAt: string;
}

interface StageViewProps {
  isOpen: boolean;
  onClose: () => void;
  stage: 'draft' | 'created' | 'applied' | 'interview' | 'offer' | 'rejected';
  jobs: JobApplication[];
  journeys: CVJourney[];
  onJobClick: (job: JobApplication) => void;
  onJobStatusUpdate: (jobId: string, newStatus: string) => Promise<void>;
  onCreateJourney: (job: JobApplication) => Promise<void>;
  getJobJourneys: (jobId: string) => CVJourney[];
  getJourneyProgress: (journey: CVJourney) => number;
  getJourneyStatusText: (jobJourneys: CVJourney[], jobStatus?: string) => string;
}

const StageView: React.FC<StageViewProps> = ({
  isOpen,
  onClose,
  stage,
  jobs,
  journeys,
  onJobClick,
  onJobStatusUpdate,
  onCreateJourney,
  getJobJourneys,
  getJourneyProgress,
  getJourneyStatusText
}) => {
  const stageTitles = {
    draft: 'Draft Jobs',
    created: 'Active Journeys',
    applied: 'Applied Jobs',
    interview: 'Interview Stage',
    offer: 'Offers',
    rejected: 'Rejected Applications'
  };

  const stageColors = {
    draft: 'bg-gray-100 dark:bg-gray-500/20 border-gray-300 dark:border-gray-500/30 text-gray-800 dark:text-white',
    created: 'bg-purple-100 dark:bg-purple-500/20 border-purple-300 dark:border-purple-500/30 text-purple-800 dark:text-white',
    applied: 'bg-blue-100 dark:bg-blue-500/20 border-blue-300 dark:border-blue-500/30 text-blue-800 dark:text-white',
    interview: 'bg-orange-100 dark:bg-orange-500/20 border-orange-300 dark:border-orange-500/30 text-orange-800 dark:text-white',
    offer: 'bg-green-100 dark:bg-green-500/20 border-green-300 dark:border-green-500/30 text-green-800 dark:text-white',
    rejected: 'bg-red-100 dark:bg-red-500/20 border-red-300 dark:border-red-500/30 text-red-800 dark:text-white'
  };

  const renderStageContent = () => {
    switch (stage) {
      case 'draft':
        return (
          <DraftStageView
            jobs={jobs}
            onJobClick={onJobClick}
            onCreateJourney={onCreateJourney}
          />
        );
      case 'created':
        return (
          <CreatedStageView
            jobs={jobs}
            journeys={journeys}
            getJobJourneys={getJobJourneys}
            getJourneyProgress={getJourneyProgress}
            getJourneyStatusText={getJourneyStatusText}
            onJobClick={onJobClick}
          />
        );
      case 'applied':
        return (
          <AppliedStageView
            jobs={jobs}
            onJobClick={onJobClick}
            onJobStatusUpdate={onJobStatusUpdate}
            isFullScreen={true}
          />
        );
      case 'interview':
        return (
          <InterviewStageView
            jobs={jobs}
            journeys={journeys}
            getJobJourneys={getJobJourneys}
            onJobClick={onJobClick}
            onJobStatusUpdate={onJobStatusUpdate}
            isFullScreen={true}
          />
        );
      case 'offer':
        return (
          <OfferStageView
            jobs={jobs}
            onJobClick={onJobClick}
            onJobStatusUpdate={onJobStatusUpdate}
            isFullScreen={true}
          />
        );
      case 'rejected':
        return (
          <RejectedStageView
            jobs={jobs}
            onJobClick={onJobClick}
            isFullScreen={true}
          />
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Stage View Container */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-4 md:inset-8 lg:inset-16 bg-white dark:bg-[#141810] rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`flex items-center justify-between p-4 md:p-6 border-b ${stageColors[stage]} border-b-2`}>
              <div className="flex items-center gap-4">
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-white/20 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl md:text-2xl font-bold">
                  {stageTitles[stage]}
                </h2>
                <span className="px-3 py-1 bg-gray-200 dark:bg-white/20 rounded-full text-sm font-medium">
                  {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              {renderStageContent()}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default StageView;

