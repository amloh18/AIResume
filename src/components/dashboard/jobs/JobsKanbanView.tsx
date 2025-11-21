'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle, X, ChevronDown, MapPin, DollarSign, Calendar, Clock,
  Target, Eye, ArrowRight, AlertCircle, TrendingUp
} from 'lucide-react';
import JourneyTimelineCard from '../JourneyTimelineCard';
import { CVJourney } from '@/types/cv';
import DraftStageView from './stages/DraftStageView';
import CreatedStageView from './stages/CreatedStageView';
import AppliedStageView from './stages/AppliedStageView';
import InterviewStageView from './stages/InterviewStageView';
import OfferStageView from './stages/OfferStageView';
import RejectedStageView from './stages/RejectedStageView';

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
  createdAt: string;
  updatedAt: string;
}

interface JobsKanbanViewProps {
  jobs: JobApplication[];
  jobsByStatus: {
    draft: JobApplication[];
    created: JobApplication[];
    applied: JobApplication[];
    interview: JobApplication[];
    offer: JobApplication[];
    rejected: JobApplication[];
  };
  loading: boolean;
  selectedJobs: Set<string>;
  setSelectedJobs: (jobs: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  setShowBulkActions: (show: boolean) => void;
  draggedJob: string | null;
  zoomedStage: string | null;
  onJobClick: (job: JobApplication) => void;
  onStageClick: (stageStatus: string) => void;
  onDragStart: (e: React.DragEvent, jobId: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, newStatus: string) => void;
  isJobDraggable: (job: JobApplication) => boolean;
  isDraggableStage: (stage: string) => boolean;
  getJobJourneys: (jobId: string) => CVJourney[];
  getJourneyProgress: (journey: CVJourney) => number;
  getJourneyStatusText: (jobJourneys: CVJourney[], jobStatus?: string) => string;
  isFocusMode?: boolean;
  onSkillGapAnalysis?: (job: JobApplication) => void;
  journeys?: CVJourney[];
  onJobStatusUpdate?: (jobId: string, newStatus: string) => Promise<void>;
  onCreateJourney?: (job: JobApplication) => Promise<void>;
  onRefresh?: () => void;
}

const JobsKanbanView: React.FC<JobsKanbanViewProps> = ({
  jobs,
  jobsByStatus,
  loading,
  selectedJobs,
  setSelectedJobs,
  setShowBulkActions,
  draggedJob,
  zoomedStage,
  onJobClick,
  onStageClick,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isJobDraggable,
  isDraggableStage,
  getJobJourneys,
  getJourneyProgress,
  getJourneyStatusText,
  isFocusMode = false,
  onSkillGapAnalysis,
  journeys = [],
  onJobStatusUpdate,
  onCreateJourney,
  onRefresh
}) => {
  const allStages = [
    { status: 'draft', title: 'Draft', color: 'bg-gray-100 dark:bg-gray-500 border-gray-300 dark:border-gray-500 text-gray-800 dark:text-white' },
    { status: 'created', title: 'Created', color: 'bg-purple-100 dark:bg-purple-500 border-purple-300 dark:border-purple-500 text-purple-800 dark:text-white' },
    { status: 'applied', title: 'Applied', color: 'bg-blue-100 dark:bg-blue-500 border-blue-300 dark:border-blue-500 text-blue-800 dark:text-white' },
    { status: 'interview', title: 'Interview', color: 'bg-orange-100 dark:bg-orange-500 border-orange-300 dark:border-orange-500 text-orange-800 dark:text-white' },
    { status: 'offer', title: 'Offer', color: 'bg-green-100 dark:bg-green-500 border-green-300 dark:border-green-500 text-green-800 dark:text-white' },
    { status: 'rejected', title: 'Rejected', color: 'bg-red-100 dark:bg-red-500 border-red-300 dark:border-red-500 text-red-800 dark:text-white' }
  ];

  // Filter stages based on focus mode
  const stages = isFocusMode
    ? allStages.filter(stage => stage.status !== 'draft' && stage.status !== 'rejected')
    : allStages;

  const getDaysSinceLastUpdate = (job: JobApplication) => {
    const lastUpdate = new Date(job.updatedAt);
    const now = new Date();
    return Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
  };

  const isFollowUpNeeded = (job: JobApplication) => {
    const days = getDaysSinceLastUpdate(job);
    return ['applied', 'interview', 'offer'].includes(job.status) && (days >= 3 || days >= 7);
  };

  return (
    <div className="h-full w-full">
      {zoomedStage ? (
        // Zoomed stage - show stage-specific view
        <div className="w-full h-full overflow-y-auto px-4">
          {stages
            .filter(stage => stage.status === zoomedStage)
            .map((stage) => {
              const stageJobs = jobsByStatus[stage.status as keyof typeof jobsByStatus];
              
              return (
                <div key={stage.status} className="space-y-4 py-4">
                  {/* Stage Header */}
                  <div 
                    className={`p-3 rounded-xl border-2 ${stage.status === 'draft' || stage.status === 'created' ? 'border-solid' : 'border-dashed'} ${stage.color} min-h-[60px] flex items-center justify-center sticky top-0 z-10 backdrop-blur-sm bg-white/80 dark:bg-[#141810]/80 cursor-pointer hover:opacity-80 transition-opacity duration-200 opacity-100`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStageClick(stage.status);
                    }}
                  >
                    <div className="flex items-center justify-between w-full">
                      <h3 className="text-base font-bold">{stage.title}</h3>
                      <span className="text-sm">{stageJobs.length}</span>
                    </div>
                  </div>

                  {/* Stage-Specific Content */}
                  <div className="mt-4">
                    {stage.status === 'draft' && onCreateJourney && (
                      <DraftStageView
                        jobs={stageJobs}
                        onJobClick={onJobClick}
                        onCreateJourney={onCreateJourney}
                      />
                    )}
                    {stage.status === 'created' && (
                      <CreatedStageView
                        jobs={stageJobs}
                        journeys={journeys}
                        getJobJourneys={getJobJourneys}
                        getJourneyProgress={getJourneyProgress}
                        getJourneyStatusText={getJourneyStatusText}
                        onJobClick={onJobClick}
                        onRefresh={onRefresh}
                      />
                    )}
                    {stage.status === 'applied' && onJobStatusUpdate && (
                      <AppliedStageView
                        jobs={stageJobs}
                        onJobClick={onJobClick}
                        onJobStatusUpdate={onJobStatusUpdate}
                      />
                    )}
                    {stage.status === 'interview' && onJobStatusUpdate && (
                      <InterviewStageView
                        jobs={stageJobs}
                        journeys={journeys}
                        getJobJourneys={getJobJourneys}
                        onJobClick={onJobClick}
                        onJobStatusUpdate={onJobStatusUpdate}
                      />
                    )}
                    {stage.status === 'offer' && onJobStatusUpdate && (
                      <OfferStageView
                        jobs={stageJobs}
                        onJobClick={onJobClick}
                        onJobStatusUpdate={onJobStatusUpdate}
                      />
                    )}
                    {stage.status === 'rejected' && (
                      <RejectedStageView
                        jobs={stageJobs}
                        onJobClick={onJobClick}
                      />
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        // All stages - horizontal scrollable with proper width
        <div className="flex flex-row gap-4 h-full min-w-max pb-4 px-4">
          {stages.map((stage) => {
            const stageJobs = jobsByStatus[stage.status as keyof typeof jobsByStatus];
            return (
              <div key={stage.status} className="space-y-4 min-w-[280px] flex-shrink-0">
                {/* Stage Header */}
                <div
                  className={`p-3 rounded-xl border-2 ${stage.status === 'draft' || stage.status === 'created' ? 'border-solid' : 'border-dashed'} ${stage.color} min-h-[60px] flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity duration-200 opacity-100`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onStageClick(stage.status);
                  }}
                >
                  <div className="flex items-center justify-between w-full">
                    <h3 className="text-base font-bold">{stage.title}</h3>
                    <span className="text-sm">{stageJobs.length}</span>
                  </div>
                </div>

                {/* Drop Zone */}
                <div
                  className={`w-full rounded-xl border-2 border-dashed transition-all duration-300 ${draggedJob
                    ? isDraggableStage(stage.status)
                      ? `border-blue-300 dark:border-[rgb(60,75,60)] bg-blue-50 dark:bg-[rgb(60,75,60)]/20 min-h-[100px]`
                      : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/30 opacity-50 min-h-[100px]'
                    : 'border-transparent min-h-[100px]'
                    }`}
                  onDragOver={onDragOver}
                  onDrop={(e) => onDrop(e, stage.status)}
                >
                  {/* Job Cards */}
                  <div className={zoomedStage && stage.status === 'created' ? "space-y-4" : zoomedStage ? "grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-4" : "space-y-3"}>
                    {loading ? (
                      // Skeleton loading
                      Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="bg-[#141810] rounded-xl p-4 animate-pulse">
                          <div className="flex items-center justify-between mb-3">
                            <div className="space-y-2">
                              <div className="h-4 bg-white/20 rounded w-32"></div>
                              <div className="h-3 bg-white/10 rounded w-24"></div>
                            </div>
                            <div className="h-6 bg-white/20 rounded w-16"></div>
                          </div>
                          <div className="space-y-2">
                            <div className="h-3 bg-white/10 rounded w-full"></div>
                            <div className="h-3 bg-white/10 rounded w-3/4"></div>
                          </div>
                        </div>
                      ))
                    ) : (stage.status === 'draft' || stage.status === 'created') && zoomedStage ? (
                      // Show journey cards for created stage when zoomed
                      stageJobs.map((job) => {
                        const jobJourneys = getJobJourneys(job.id);
                        return jobJourneys
                          .filter(journey => journey.id)
                          .map((journey, index) => (
                            <JourneyTimelineCard
                              key={`${job.id}-${journey.id || `journey-${index}`}`}
                              journey={journey}
                              onResume={() => { }}
                              onDownload={() => { }}
                              onDelete={() => { }}
                              onRefresh={() => { }}
                              onUpdateJourney={() => { }}
                              onShowDeleteConfirm={() => { }}
                            />
                          ));
                      }).flat()
                    ) : (
                      // Regular job cards
                      stageJobs.map((job) => {
                        const jobJourneys = getJobJourneys(job.id);
                        const journeyStatusText = getJourneyStatusText(jobJourneys, job.status);
                        const avgProgress = jobJourneys.length > 0
                          ? Math.round(jobJourneys.reduce((sum, journey) => sum + getJourneyProgress(journey), 0) / jobJourneys.length)
                          : 0;
                        const isSelected = selectedJobs.has(job.id);
                        const isDragging = draggedJob === job.id;
                        const canDrag = isJobDraggable(job);

                        return (
                          <div
                            key={job.id}
                            draggable={canDrag}
                            onDragStart={(e: React.DragEvent) => onDragStart(e, job.id)}
                            onDragEnd={onDragEnd}
                            onDragOver={onDragOver}
                            onClick={() => onJobClick(job)}
                            className={`group relative overflow-hidden cursor-pointer transition-all duration-300 ${isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
                              } ${isDragging ? 'opacity-50' : ''} ${!canDrag && stage.status !== 'draft' && stage.status !== 'created' ? 'opacity-60 cursor-not-allowed' : ''
                              }`}
                            role="button"
                            tabIndex={0}
                            aria-label={`Job application: ${job.jobTitle} at ${job.company}`}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onJobClick(job);
                              }
                            }}
                          >
                            {/* Card Background */}
                            <div className="absolute inset-0 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/20 rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300" />

                            {/* Card Content */}
                            <div className="relative z-10 p-4">
                              {/* Collapsed View */}
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                                        {job.jobTitle}
                                      </h4>
                                      <p className="text-gray-600 dark:text-gray-400 text-xs truncate">{job.company}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {/* Show CV/CL/ATS indicators for Applied, Interview, Offer, Rejected stages */}
                                    {['applied', 'interview', 'offer', 'rejected'].includes(stage.status) && jobJourneys.length > 0 ? (
                                      (() => {
                                        const primaryJourney = jobJourneys[0];
                                        const hasCV = !!primaryJourney.cvId;
                                        const hasCoverLetter = !!primaryJourney.coverLetterId;
                                        const atsScore = primaryJourney.atsScore;

                                        return (
                                          <div className="flex flex-col items-end gap-1">
                                            <div className={`flex items-center gap-1 ${hasCV ? 'text-green-500' : 'text-red-500'}`}>
                                              {hasCV ? <CheckCircle size={14} /> : <X size={14} />}
                                              <span className="text-xs">CV</span>
                                            </div>
                                            <div className={`flex items-center gap-1 ${hasCoverLetter ? 'text-green-500' : 'text-red-500'}`}>
                                              {hasCoverLetter ? <CheckCircle size={14} /> : <X size={14} />}
                                              <span className="text-xs">CL</span>
                                            </div>
                                            {atsScore !== null && atsScore !== undefined && (
                                              <div className={`flex items-center gap-1 text-xs font-medium ${atsScore >= 85 ? 'text-green-500' :
                                                atsScore >= 70 ? 'text-blue-500' :
                                                  'text-red-500'
                                                }`}>
                                                <span>ATS {atsScore}%</span>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()
                                    ) : (
                                      jobJourneys.length > 0 && (() => {
                                        const completedJourneys = jobJourneys.filter(j => j.status === 'completed');
                                        const hasCompleted = completedJourneys.length > 0;
                                        const allCompleted = completedJourneys.length === jobJourneys.length;

                                        return (
                                          <div className="flex items-center gap-1">
                                            {hasCompleted && (
                                              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${allCompleted
                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                                }`}>
                                                <CheckCircle size={10} />
                                                <span>{completedJourneys.length}/{jobJourneys.length}</span>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()
                                    )}

                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                      <ChevronDown size={12} className="text-gray-400" />
                                    </div>
                                  </div>
                                </div>

                                {/* Progress Bar */}
                                {jobJourneys.length > 0 && !['applied', 'interview', 'offer', 'rejected'].includes(stage.status) && (
                                  <div className="w-full bg-gray-200 dark:bg-gray-700/50 rounded-full h-2 overflow-hidden group-hover:h-0 group-hover:opacity-0 transition-all duration-300">
                                    <motion.div
                                      className={`h-2 rounded-full transition-all duration-500 ${avgProgress >= 80 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                                        avgProgress >= 60 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                                          avgProgress >= 40 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                                            'bg-gradient-to-r from-red-500 to-red-600'
                                        }`}
                                      initial={{ width: 0 }}
                                      animate={{ width: `${avgProgress}%` }}
                                      transition={{ duration: 0.8, ease: "easeOut" }}
                                    />
                                  </div>
                                )}
                              </div>

                              {/* Expanded View - Visible on Hover */}
                              <div className="max-h-0 group-hover:max-h-96 overflow-hidden transition-all duration-300 ease-out">
                                <div className="mt-4 space-y-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                                  {/* Follow-up notification */}
                                  {['applied', 'interview', 'offer'].includes(stage.status) && isFollowUpNeeded(job) && (
                                    <div className="mb-3 p-2 bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 rounded-full">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <AlertCircle size={14} className="text-orange-600" />
                                          <span className="text-xs text-orange-700 dark:text-orange-400">
                                            Follow-up recommended - {getDaysSinceLastUpdate(job)} days since {job.status}
                                          </span>
                                        </div>
                                        <button
                                          className="px-2 py-1 bg-orange-500 hover:bg-orange-600 text-white text-xs rounded"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onJobClick(job);
                                          }}
                                        >
                                          Take Action
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {/* Key Info */}
                                  <div className="space-y-2">
                                    {job.location && (
                                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                        <MapPin size={12} />
                                        <span>{job.location}</span>
                                      </div>
                                    )}
                                    {job.salary && (job.salary.min || job.salary.max) && (
                                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                        <DollarSign size={12} />
                                        <span>
                                          {job.salary.min && job.salary.max
                                            ? `${job.salary.currency || '$'}${job.salary.min.toLocaleString()}-${job.salary.max.toLocaleString()}`
                                            : job.salary.min
                                              ? `${job.salary.currency || '$'}${job.salary.min.toLocaleString()}+`
                                              : job.salary.max
                                                ? `${job.salary.currency || '$'}${job.salary.max.toLocaleString()}`
                                                : 'Not specified'
                                          }
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                                      {job.applicationDate && (
                                        <div className="flex items-center gap-1.5">
                                          <Calendar size={12} />
                                          <span>Applied: {new Date(job.applicationDate).toLocaleDateString()}</span>
                                        </div>
                                      )}
                                      {job.deadline && (
                                        <div className="flex items-center gap-1.5">
                                          <Clock size={12} />
                                          <span>Deadline: {new Date(job.deadline).toLocaleDateString()}</span>
                                        </div>
                                      )}
                                      {!job.applicationDate && !job.deadline && (
                                        <div className="flex items-center gap-2">
                                          <Calendar size={12} />
                                          <span>Created: {new Date(job.createdAt).toLocaleDateString()}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Divider */}
                                  <div className="border-t border-gray-200 dark:border-white/20 dark:border-gray-600/50"></div>

                                  {/* Journey Status */}
                                  {!['created', 'applied'].includes(stage.status) && (
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                          <Target size={12} />
                                          <span>{journeyStatusText}</span>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Action Buttons */}
                                  <div className="flex items-center gap-2 mt-3">
                                  {/* Action Button */}
                                  <motion.button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onJobClick(job);
                                      }}
                                      className="flex-1 px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xs font-medium rounded-full transition-all duration-200 flex items-center justify-center gap-2"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                  >
                                    <Eye size={12} />
                                    Manage Applications
                                    <ArrowRight size={12} />
                                  </motion.button>

                                    {/* Skill Gap Analysis Button */}
                                    {(job.jobDescription || job.description) && onSkillGapAnalysis && (
                                      <motion.button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onSkillGapAnalysis(job);
                                        }}
                                        className="px-3 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-xs font-medium rounded-full transition-all duration-200 flex items-center justify-center gap-2 flex-shrink-0"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        title="Skill Gap Analysis"
                                      >
                                        <TrendingUp size={12} />
                                        <span className="hidden sm:inline">Analysis</span>
                                      </motion.button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default JobsKanbanView;

