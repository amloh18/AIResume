"use client";

import { getDaysSinceLastUpdate, isFollowUpNeeded, getFollowUpEmailSubject } from '@/lib/utils/job-intelligence';
import React from "react";
import { motion } from "framer-motion";
import {
  CheckCircle,
  X,
  ChevronDown,
  MapPin,
  DollarSign,
  Calendar,
  Clock,
  Target,
  Eye,
  ArrowRight,
  AlertCircle,
  Mail,
  Linkedin,
  GraduationCap,
  FolderPlus,
  Send,
  Award,
  Archive,
} from "lucide-react";
import JourneyTimelineCard from "../JourneyTimelineCard";
import { CVJourney } from "@/types/cv";
import { getJobExpiryState } from "@/utils/tracker-expiry";
import DraftStageView from "./stages/DraftStageView";
import CreatedStageView from "./stages/CreatedStageView";
import AppliedStageView from "./stages/AppliedStageView";
import InterviewStageView from "./stages/InterviewStageView";
import OfferStageView from "./stages/OfferStageView";
import RejectedStageView from "./stages/RejectedStageView";
import JobKanbanCard from "./JobKanbanCard";
import { JobApplication } from '@/types/job';
import {
  routeTrackerCardAction,
  type TrackerSidebarOpenContext,
} from "./trackerSidebarConfig";



interface JobsKanbanViewProps {
  jobs: JobApplication[];
  jobsByPipeline: {
    pipeline: JobApplication[];
    applied: JobApplication[];
    interview: JobApplication[];
    offer: JobApplication[];
    archive: JobApplication[];
  };
  loading: boolean;
  selectedJobs: Set<string>;
  setSelectedJobs: (
    jobs: Set<string> | ((prev: Set<string>) => Set<string>),
  ) => void;
  setShowBulkActions: (show: boolean) => void;
  draggedJob: string | null;
  zoomedStage: string | null;
  onJobClick: (job: JobApplication, context?: TrackerSidebarOpenContext) => void;
  onStageClick: (stageStatus: string) => void;
  onDragStart: (e: React.DragEvent, jobId: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, newStatus: string) => void;
  isJobDraggable: (job: JobApplication) => boolean;
  isDraggableStage: (stage: string) => boolean;
  getJobJourneys: (jobId: string) => CVJourney[];
  getJourneyProgress: (journey: CVJourney) => number;
  getJourneyStatusText: (
    jobJourneys: CVJourney[],
    jobStatus?: string,
  ) => string;
  isFocusMode?: boolean;
  journeys?: CVJourney[];
  onJobStatusUpdate?: (jobId: string, newStatus: string) => Promise<void>;
  onCreateJourney?: (job: JobApplication) => Promise<void>;
  onRefresh?: () => void;
  onImproveATS?: (job: JobApplication) => void;
  onDownload?: (job: JobApplication) => void;
}

const isJobExpired = (job: JobApplication) => {
  const expiry = getJobExpiryState(job);
  return expiry === 'archivable';
};

const ExpiredJobsAccordion: React.FC<{
  jobs: JobApplication[];
  stage: string;
  getJobJourneys: (jobId: string) => CVJourney[];
  selectedJobs: Set<string>;
  draggedJob: string | null;
  isJobDraggable: (job: JobApplication) => boolean;
  onJobClick: (job: JobApplication, context?: TrackerSidebarOpenContext) => void;
  onDragStart: (e: React.DragEvent, jobId: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onCreateJourney?: (job: JobApplication) => Promise<void>;
  onImproveATS?: (job: JobApplication) => void;
  onDownload?: (job: JobApplication) => void;
  onJobStatusUpdate?: (jobId: string, newStatus: string) => Promise<void>;
  onRefresh?: () => void;
}> = ({
  jobs,
  stage,
  getJobJourneys,
  selectedJobs,
  draggedJob,
  isJobDraggable,
  onJobClick,
  onDragStart,
  onDragEnd,
  onDragOver,
  onCreateJourney,
  onImproveATS,
  onDownload,
  onJobStatusUpdate,
  onRefresh,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  if (jobs.length === 0) return null;

  return (
    <div className="mt-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2 text-small font-medium text-[color:var(--text-secondary)] bg-[var(--bg-secondary)] border border-[color:var(--border-primary)] rounded-lg hover:bg-[var(--hover-bg)] transition-colors"
      >
        <span>Expired ({jobs.length})</span>
        <ChevronDown
          size={16}
          className={`transform transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="mt-3 space-y-3">
          {jobs.map((job) => {
            const jobJourneys = getJobJourneys(job.id);
            const isSelected = selectedJobs.has(job.id);
            const isDragging = draggedJob === job.id;
            const canDrag = isJobDraggable(job);

            return (
              <JobKanbanCard
                key={job.id}
                job={job as any}
                stage={stage}
                jobJourneys={jobJourneys}
                isSelected={isSelected}
                isDragging={isDragging}
                canDrag={canDrag}
                isExpired={true}
                onClick={onJobClick as any}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragOver={onDragOver}
                onRefresh={onRefresh}
                onAction={(action, job) => {
                  routeTrackerCardAction({
                    action: action as any,
                    job: job as any,
                    onCreateJourney: onCreateJourney as any,
                    onImproveATS: onImproveATS as any,
                    onDownload: onDownload as any,
                    onJobStatusUpdate: onJobStatusUpdate as any,
                    onOpenSidebar: onJobClick as any,
                    getJobId: (targetJob) => targetJob.id,
                  });
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

const STAGE_BLANK_STATES: Record<string, { title: string; desc: string }> = {
  pipeline: {
    title: "Start Your Pipeline",
    desc: "Drag jobs here or click 'Quick Add' to start tailoring your resume.",
  },
  applied: {
    title: "Track Submissions",
    desc: "Move jobs here once applied to trigger aging alerts & follow-ups.",
  },
  interview: {
    title: "Prepare for Rounds",
    desc: "Drag jobs here when you get scheduled to log panel info & mock prep.",
  },
  offer: {
    title: "Analyze Offers",
    desc: "Drag jobs here to break down compensation & track decision deadlines.",
  },
  archive: {
    title: "Archive History",
    desc: "Your accepted offers, rejections, and withdrawals will be stored here.",
  },
};

const StageBlankState: React.FC<{ stage: string }> = ({ stage }) => {
  const config = STAGE_BLANK_STATES[stage] || STAGE_BLANK_STATES.pipeline;
  
  let IconComponent = FolderPlus;
  if (stage === "applied") IconComponent = Send;
  if (stage === "interview") IconComponent = Calendar;
  if (stage === "offer") IconComponent = Award;
  if (stage === "archive") IconComponent = Archive;

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center rounded-xl border border-dashed border-[color:var(--border-primary)] bg-[var(--bg-primary)]/40 hover:bg-[var(--bg-primary)]/60 transition-all duration-300 min-h-[160px] my-1 mx-0.5 select-none">
      <div className="p-3 rounded-full bg-[var(--bg-secondary)] text-[color:var(--text-secondary)] mb-3 transition-transform">
        <IconComponent size={20} className="opacity-80" />
      </div>
      <h4 className="text-small font-bold text-[color:var(--text-primary)] mb-1">
        {config.title}
      </h4>
      <p className="text-[11px] leading-relaxed text-[color:var(--text-secondary)] max-w-[220px]">
        {config.desc}
      </p>
    </div>
  );
};

const JobsKanbanView: React.FC<JobsKanbanViewProps> = ({
  jobs,
  jobsByPipeline,
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
  journeys = [],
  onJobStatusUpdate,
  onCreateJourney,
  onRefresh,
  onImproveATS,
  onDownload,
}) => {
  const [collapsedColumns, setCollapsedColumns] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('kanban-collapsed-columns');
        if (stored) {
          try {
            setCollapsedColumns(new Set(JSON.parse(stored)));
          } catch (e) {
            console.error('Failed to parse kanban-collapsed-columns:', e);
          }
        }
      }
    } catch {
      setCollapsedColumns(new Set());
    }
  }, []);

  const toggleColumn = (columnId: string) => {
    setCollapsedColumns(prev => {
      const next = new Set(prev);
      if (next.has(columnId)) {
        next.delete(columnId);
      } else {
        next.add(columnId);
      }
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('kanban-collapsed-columns', JSON.stringify([...next]));
        } catch (e) {
          console.warn('Failed to save kanban state:', e);
        }
      }
      return next;
    });
  };

  // Draft color (used as default for all stages)
  const draftColor =
    "bg-[var(--bg-secondary)] border-[color:var(--border-primary)] text-[color:var(--text-primary)]";

  interface StageConfig {
    status: string;
    title: string;
    color: string;
    hoverColor: string;
    subStatuses: string[];
    collapsible?: boolean;
  }

  const allStages: StageConfig[] = [
    {
      status: "pipeline",
      title: "Pipeline",
      color: draftColor,
      hoverColor: "bg-[var(--hover-bg)] border-[color:var(--border-secondary)] text-[color:var(--text-primary)]",
      subStatuses: ["draft", "created"],
    },
    {
      status: "applied",
      title: "Applied",
      color: draftColor,
      hoverColor: "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400",
      subStatuses: ["applied", "screening"],
    },
    {
      status: "interview",
      title: "Interview",
      color: draftColor,
      hoverColor: "bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400",
      subStatuses: ["interview"],
    },
    {
      status: "offer",
      title: "Offer",
      color: draftColor,
      hoverColor: "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
      subStatuses: ["offer"],
    },
    {
      status: "archive",
      title: "Archive",
      color: draftColor,
      hoverColor: "bg-gray-500/10 border-gray-500/30 text-gray-600 dark:text-gray-400",
      subStatuses: ["rejected", "withdrawn", "accepted"],
    },
  ];

  // Filter stages based on focus mode
  const stages = isFocusMode
    ? allStages.filter(
        (stage) => stage.status !== "pipeline" && stage.status !== "archive",
      )
    : allStages;



  // Get follow-up timeline for applied jobs
  const getFollowUpTimeline = (job: JobApplication) => {
    if (job.status !== "applied") return [];
    return [
      {
        day: "Right after application",
        action: "Connect with hiring manager on LinkedIn & send DM and email",
      },
      { day: "Day 3-5", action: "Send initial follow-up email" },
      { day: "Day 14", action: "Send second follow-up if no response" },
    ];
  };

  // Handle email action
  const handleEmailAction = (job: JobApplication, e: React.MouseEvent) => {
    e.stopPropagation();
    const recipientEmail = (job as any).contactDetails?.email || "";
    const subject = encodeURIComponent(
      `Follow-up: ${job.jobTitle} at ${job.company}`,
    );
    const body = encodeURIComponent(
      `Dear Hiring Manager,\n\nI wanted to follow up on my application for the ${job.jobTitle} position at ${job.company}.\n\n[Your message here]\n\nBest regards,\n[Your name]`,
    );

    if (recipientEmail) {
      window.location.href = `mailto:${recipientEmail}?subject=${subject}&body=${body}`;
    } else {
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    }
  };

  // Handle LinkedIn action
  const handleLinkedInAction = (job: JobApplication, e: React.MouseEvent) => {
    e.stopPropagation();
    const searchQuery = encodeURIComponent(`${job.company} hiring manager`);
    window.open(
      `https://www.linkedin.com/search/results/people/?keywords=${searchQuery}`,
      "_blank",
    );
  };

  return (
    <div className="h-full w-full">
      {zoomedStage ? (
        // Zoomed stage - show stage-specific view
        <div className="w-full h-full overflow-y-auto px-4 scrollbar-hide">
          {stages
            .filter((stage) => stage.status === zoomedStage)
            .map((stage) => {
              const stageJobs =
                jobsByPipeline[stage.status as keyof typeof jobsByPipeline];

              return (
                <div key={stage.status} className="space-y-4 py-4">
                  {/* Stage Header */}
                  <div
                    className={`p-3 rounded-xl border-2 border-solid ${stage.color} min-h-[60px] flex items-center justify-center sticky top-0 z-10 backdrop-blur-sm bg-[var(--bg-primary)]/80 dark:bg-[var(--bg-primary)]/80 cursor-pointer transition-all duration-200 group`}
                    onMouseEnter={(e) => {
                      e.currentTarget.className = `p-3 rounded-xl border-2 border-solid ${stage.hoverColor} min-h-[60px] flex items-center justify-center sticky top-0 z-10 backdrop-blur-sm bg-[var(--bg-primary)]/80 dark:bg-[var(--bg-primary)]/80 cursor-pointer transition-all duration-200 group`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.className = `p-3 rounded-xl border-2 border-solid ${stage.color} min-h-[60px] flex items-center justify-center sticky top-0 z-10 backdrop-blur-sm bg-[var(--bg-primary)]/80 dark:bg-[var(--bg-primary)]/80 cursor-pointer transition-all duration-200 group`;
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStageClick(stage.status);
                    }}
                  >
                    <div className="flex items-center justify-between w-full">
                      <h3 className="text-small font-medium text-[color:var(--text-primary)] tracking-tight">
                        {stage.title}
                      </h3>
                      <span className="text-small">{stageJobs.length}</span>
                    </div>
                  </div>

                  {/* Stage-Specific Content */}
                  <div className="mt-4">
                    {(stage.status === "pipeline" || stage.status === "draft") && onCreateJourney && (
                      <div>
                        {stageJobs
                          .filter(job => job.status === 'draft')
                          .map((job) => {
                            const jobJourneys = getJobJourneys(job.id);
                            return (
                              <JourneyTimelineCard
                                key={job.id}
                                journey={jobJourneys[0]}
                                onResume={() => {}}
                                onDownload={() => {}}
                                onDelete={() => {}}
                                onRefresh={() => {}}
                                onUpdateJourney={() => {}}
                              />
                            );
                          })}
                        {stageJobs
                          .filter(job => job.status === 'created')
                          .map((job) => {
                            const jobJourneys = getJobJourneys(job.id);
                            return (
                              <JourneyTimelineCard
                                key={job.id}
                                journey={jobJourneys[0]}
                                onResume={() => {}}
                                onDownload={() => {}}
                                onDelete={() => {}}
                                onRefresh={() => {}}
                                onUpdateJourney={() => {}}
                              />
                            );
                          })}
                      </div>
                    )}
                    {stage.status === "applied" && onJobStatusUpdate && (
                      <AppliedStageView
                        jobs={stageJobs as any}
                        onJobClick={onJobClick as any}
                        onJobStatusUpdate={onJobStatusUpdate as any}
                        isFullScreen={!!zoomedStage}
                      />
                    )}
                    {stage.status === "interview" && onJobStatusUpdate && (
                      <InterviewStageView
                        jobs={stageJobs as any}
                        journeys={journeys}
                        getJobJourneys={getJobJourneys}
                        onJobClick={onJobClick as any}
                        onJobStatusUpdate={onJobStatusUpdate as any}
                        isFullScreen={!!zoomedStage}
                      />
                    )}
                    {stage.status === "offer" && onJobStatusUpdate && (
                      <OfferStageView
                        jobs={stageJobs as any}
                        onJobClick={onJobClick as any}
                        onJobStatusUpdate={onJobStatusUpdate as any}
                        isFullScreen={!!zoomedStage}
                      />
                    )}
                    {stage.status === "archive" && (
                      <RejectedStageView
                        jobs={stageJobs as any}
                        onJobClick={onJobClick as any}
                        isFullScreen={!!zoomedStage}
                      />
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        // All stages - horizontal scrollable with proper width
        <div className="flex flex-row gap-4 h-full min-w-max pb-4 pl-0 sm:pl-2 pr-0 sm:pr-4 overflow-x-auto scrollbar-hide">
          {stages.map((stage) => {
            const stageJobs =
              jobsByPipeline[stage.status as keyof typeof jobsByPipeline];
            const isCollapsed = stage.collapsible && collapsedColumns.has(stage.status);

            return (
              <div
                key={stage.status}
                className={`flex flex-col gap-4 ${isCollapsed ? 'w-[48px]' : 'w-[320px]'} flex-shrink-0 h-full max-h-full transition-all duration-300`}
              >
                {/* Stage Header */}
                <div
                  className={`p-3 rounded-xl border-2 border-solid ${stage.color} ${isCollapsed ? 'h-full py-8' : 'min-h-[60px] flex-shrink-0'} flex items-center justify-center cursor-pointer transition-all duration-200 group`}
                  style={
                    {
                      "--hover-color": stage.hoverColor,
                    } as React.CSSProperties
                  }
                  onMouseEnter={(e) => {
                    e.currentTarget.className = `p-3 rounded-xl border-2 border-solid ${stage.hoverColor} ${isCollapsed ? 'h-full py-8' : 'min-h-[60px] flex-shrink-0'} flex items-center justify-center cursor-pointer transition-all duration-200 group`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.className = `p-3 rounded-xl border-2 border-solid ${stage.color} ${isCollapsed ? 'h-full py-8' : 'min-h-[60px] flex-shrink-0'} flex items-center justify-center cursor-pointer transition-all duration-200 group`;
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (stage.collapsible) {
                      toggleColumn(stage.status);
                    } else {
                      onStageClick(stage.status);
                    }
                  }}
                >
                  {isCollapsed ? (
                    <div className="flex flex-col items-center justify-between h-full gap-4 select-none">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-small font-bold text-[color:var(--text-primary)] whitespace-nowrap" style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}>
                          {stage.title}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--bg-secondary)] border border-[color:var(--border-primary)] text-[color:var(--text-secondary)]">
                          {stageJobs.length}
                        </span>
                      </div>
                      <ChevronDown
                        size={14}
                        className="text-gray-400 rotate-90 group-hover:text-[color:var(--text-primary)] transition-colors mt-auto"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <h3 className="text-small font-medium text-[color:var(--text-primary)] tracking-tight">
                          {stage.title}
                        </h3>
                        {stage.collapsible && (
                          <ChevronDown
                            size={14}
                            className="text-gray-400"
                          />
                        )}
                      </div>
                      <span className="text-small">{stageJobs.length}</span>
                    </div>
                  )}
                </div>

                {!isCollapsed && (
                  /* Drop Zone */
                  <div
                    className={`w-full rounded-xl border-2 border-dashed transition-all duration-300 flex-1 overflow-y-auto scrollbar-hide min-h-0 ${
                      draggedJob
                        ? isDraggableStage(stage.status)
                          ? `border-blue-300 dark:border-[rgb(60,75,60)] bg-blue-50 dark:bg-[rgb(60,75,60)]/20`
                          : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/30 opacity-50"
                        : "border-transparent"
                    }`}
                    onDragOver={onDragOver}
                    onDrop={(e) => onDrop(e, stage.status)}
                  >
                    {/* Job Cards */}
                    <div
                      className={
                        zoomedStage && stage.status === "pipeline"
                          ? "space-y-4"
                          : zoomedStage
                            ? "grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-4"
                            : "space-y-3"
                      }
                    >
                      {loading
                        ? // Skeleton loading
                          Array.from({ length: 3 }).map((_, i) => (
                            <div
                              key={i}
                              className="bg-[var(--bg-secondary)] rounded-xl p-4 animate-pulse border border-[color:var(--border-primary)]"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="space-y-2">
                                  <div className="h-4 bg-[var(--bg-tertiary)] rounded w-32"></div>
                                  <div className="h-3 bg-[var(--bg-tertiary)] rounded w-24"></div>
                                </div>
                                <div className="h-6 bg-[var(--bg-tertiary)] rounded w-16"></div>
                              </div>
                              <div className="space-y-2">
                                <div className="h-3 bg-[var(--bg-tertiary)] rounded w-full"></div>
                                <div className="h-3 bg-[var(--bg-tertiary)] rounded w-3/4"></div>
                              </div>
                            </div>
                          ))
                        : stage.status === "pipeline" && zoomedStage
                          ? // Show journey cards for pipeline stage when zoomed
                            stageJobs
                              .map((job) => {
                                const jobJourneys = getJobJourneys(job.id);
                                return jobJourneys
                                  .filter((journey) => journey.id)
                                  .map((journey, index) => (
                                    <JourneyTimelineCard
                                      key={`${job.id}-${journey.id || `journey-${index}`}`}
                                      journey={journey}
                                      onResume={() => { if (onImproveATS) onImproveATS(job); }}
                                      onDownload={() => { if (onDownload) onDownload(job); }}
                                      onDelete={() => {}}
                                      onRefresh={() => { if (onRefresh) onRefresh(); }}
                                      onUpdateJourney={() => {}}
                                    />
                                  ));
                              })
                              .flat()
                          : // Regular job cards
                            (() => {
                              const activeJobs = stageJobs.filter(
                                (job) => !isJobExpired(job),
                              );
                              const expiredJobs = stageJobs.filter((job) =>
                                isJobExpired(job),
                              );

                              if (activeJobs.length === 0 && expiredJobs.length === 0) {
                                return <StageBlankState stage={stage.status} />;
                              }

                              return (
                                <>
                                  {activeJobs.map((job) => {
                                    const jobJourneys = getJobJourneys(job.id);
                                    const isSelected = selectedJobs.has(job.id);
                                    const isDragging = draggedJob === job.id;
                                    const canDrag = isJobDraggable(job);

                                    return (
                                      <JobKanbanCard
                                        key={job.id}
                                        job={job}
                                        stage={stage.status}
                                        jobJourneys={jobJourneys}
                                        isSelected={isSelected}
                                        isDragging={isDragging}
                                        canDrag={canDrag}
                                        onClick={onJobClick}
                                        onDragStart={onDragStart}
                                        onDragEnd={onDragEnd}
                                        onDragOver={onDragOver}
                                        onRefresh={onRefresh}
                                        onAction={(action, job) => {
                                          routeTrackerCardAction({
                                            action: action as any,
                                            job,
                                            onCreateJourney,
                                            onImproveATS,
                                            onDownload,
                                            onJobStatusUpdate: onJobStatusUpdate as any,
                                            onOpenSidebar: onJobClick,
                                            getJobId: (targetJob) => targetJob.id,
                                          });
                                        }}
                                      />
                                    );
                                  })}
                                  <ExpiredJobsAccordion
                                    jobs={expiredJobs}
                                    stage={stage.status}
                                    getJobJourneys={getJobJourneys}
                                    selectedJobs={selectedJobs}
                                    draggedJob={draggedJob}
                                    isJobDraggable={isJobDraggable}
                                    onJobClick={onJobClick as any}
                                    onDragStart={onDragStart}
                                    onDragEnd={onDragEnd}
                                    onDragOver={onDragOver}
                                    onCreateJourney={onCreateJourney as any}
                                    onImproveATS={onImproveATS as any}
                                    onDownload={onDownload as any}
                                    onJobStatusUpdate={onJobStatusUpdate as any}
                                    onRefresh={onRefresh}
                                  />
                                </>
                              );
                            })()}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default JobsKanbanView;
