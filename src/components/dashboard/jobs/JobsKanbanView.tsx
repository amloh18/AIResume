"use client";

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
} from "lucide-react";
import JourneyTimelineCard from "../JourneyTimelineCard";
import { CVJourney } from "@/types/cv";
import DraftStageView from "./stages/DraftStageView";
import CreatedStageView from "./stages/CreatedStageView";
import AppliedStageView from "./stages/AppliedStageView";
import InterviewStageView from "./stages/InterviewStageView";
import OfferStageView from "./stages/OfferStageView";
import RejectedStageView from "./stages/RejectedStageView";
import JobKanbanCard from "./JobKanbanCard";

interface JobApplication {
  id: string;
  _id: string;
  userId: string;
  jobTitle: string;
  title?: string;
  company: string;
  status:
    | "draft"
    | "created"
    | "applied"
    | "screening"
    | "interview"
    | "offer"
    | "rejected"
    | "accepted"
    | "withdrawn";
  jobDescription?: string;
  description?: string;
  location?: string;
  jobUrl?: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: "hourly" | "monthly" | "yearly";
  };
  jobType?: "full-time" | "part-time" | "contract" | "internship";
  type?: string;
  source?: string;
  postedDate?: Date;
  applicationDate?: Date;
  deadline?: Date;
  offerDetails?: {
    salary?: number;
    bonus?: string;
    equity?: string;
    deadline?: Date;
    status?: string;
  };
  priority: "low" | "medium" | "high";
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
  setSelectedJobs: (
    jobs: Set<string> | ((prev: Set<string>) => Set<string>),
  ) => void;
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
  const targetDate =
    job.status === "offer" ? job.offerDetails?.deadline : job.deadline;
  if (!targetDate) return false;
  const d = new Date(targetDate);
  const now = new Date();
  const diffDays = Math.ceil(
    (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  return diffDays < 0;
};

const ExpiredJobsAccordion: React.FC<{
  jobs: JobApplication[];
  stage: string;
  getJobJourneys: (jobId: string) => CVJourney[];
  selectedJobs: Set<string>;
  draggedJob: string | null;
  isJobDraggable: (job: JobApplication) => boolean;
  onJobClick: (job: JobApplication) => void;
  onDragStart: (e: React.DragEvent, jobId: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onCreateJourney?: (job: JobApplication) => Promise<void>;
  onImproveATS?: (job: JobApplication) => void;
  onDownload?: (job: JobApplication) => void;
  onJobStatusUpdate?: (jobId: string, newStatus: string) => Promise<void>;
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
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  if (jobs.length === 0) return null;

  return (
    <div className="mt-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-[#141810] border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
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
                onAction={(action, job, e) => {
                  if (action === "generate_docs") {
                    onCreateJourney && onCreateJourney(job as any);
                  } else if (action === "inject_data") {
                    onImproveATS?.(job as any);
                  } else if (action === "download") {
                    onDownload?.(job as any);
                  } else if (action === "move_interview") {
                    onJobStatusUpdate && onJobStatusUpdate(job.id, "interview");
                  } else if (action === "accept_offer") {
                    onJobStatusUpdate && onJobStatusUpdate(job.id, "accepted");
                  } else if (action === "decline_offer") {
                    onJobStatusUpdate && onJobStatusUpdate(job.id, "rejected");
                  } else if (action === "archive") {
                    onJobStatusUpdate && onJobStatusUpdate(job.id, "withdrawn");
                  } else if (
                    action === "view_notes" ||
                    action === "add_feedback"
                  ) {
                    onJobClick(job as any);
                  }
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

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
  journeys = [],
  onJobStatusUpdate,
  onCreateJourney,
  onRefresh,
  onImproveATS,
  onDownload,
}) => {
  // Draft color (used as default for all stages)
  const draftColor =
    "bg-gray-100 dark:bg-gray-500/20 border-gray-300 dark:border-gray-500/30 text-gray-600 dark:text-white";

  const allStages = [
    {
      status: "draft",
      title: "Draft",
      color: draftColor,
      hoverColor: draftColor,
    },
    {
      status: "created",
      title: "Created",
      color: draftColor,
      hoverColor:
        "bg-purple-100 dark:bg-purple-500/20 border-purple-300 dark:border-purple-500/30 text-purple-600 dark:text-white",
    },
    {
      status: "applied",
      title: "Applied",
      color: draftColor,
      hoverColor:
        "bg-blue-100 dark:bg-blue-500/20 border-blue-300 dark:border-blue-500/30 text-blue-600 dark:text-white",
    },
    {
      status: "interview",
      title: "Interview",
      color: draftColor,
      hoverColor:
        "bg-orange-100 dark:bg-orange-500/20 border-orange-300 dark:border-orange-500/30 text-orange-600 dark:text-white",
    },
    {
      status: "offer",
      title: "Offer",
      color: draftColor,
      hoverColor:
        "bg-green-100 dark:bg-green-500/20 border-green-300 dark:border-green-500/30 text-green-600 dark:text-white",
    },
    {
      status: "rejected",
      title: "Rejected",
      color: draftColor,
      hoverColor:
        "bg-red-100 dark:bg-red-500/20 border-red-300 dark:border-red-500/30 text-red-600 dark:text-white",
    },
  ];

  // Filter stages based on focus mode
  const stages = isFocusMode
    ? allStages.filter(
        (stage) => stage.status !== "draft" && stage.status !== "rejected",
      )
    : allStages;

  const getDaysSinceLastUpdate = (job: JobApplication) => {
    const lastUpdate = new Date(job.updatedAt);
    const now = new Date();
    return Math.floor(
      (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24),
    );
  };

  const isFollowUpNeeded = (job: JobApplication) => {
    const days = getDaysSinceLastUpdate(job);
    return (
      ["applied", "interview", "offer"].includes(job.status) &&
      (days >= 3 || days >= 7)
    );
  };

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
                jobsByStatus[stage.status as keyof typeof jobsByStatus];

              return (
                <div key={stage.status} className="space-y-4 py-4">
                  {/* Stage Header */}
                  <div
                    className={`p-3 rounded-xl border-2 border-solid ${stage.color} min-h-[60px] flex items-center justify-center sticky top-0 z-10 backdrop-blur-sm bg-white/80 dark:bg-[#141810]/80 cursor-pointer transition-all duration-200 group`}
                    onMouseEnter={(e) => {
                      e.currentTarget.className = `p-3 rounded-xl border-2 border-solid ${stage.hoverColor} min-h-[60px] flex items-center justify-center sticky top-0 z-10 backdrop-blur-sm bg-white/80 dark:bg-[#141810]/80 cursor-pointer transition-all duration-200 group`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.className = `p-3 rounded-xl border-2 border-solid ${stage.color} min-h-[60px] flex items-center justify-center sticky top-0 z-10 backdrop-blur-sm bg-white/80 dark:bg-[#141810]/80 cursor-pointer transition-all duration-200 group`;
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStageClick(stage.status);
                    }}
                  >
                    <div className="flex items-center justify-between w-full">
                      <h3 className="text-base font-bold text-black dark:text-white">
                        {stage.title}
                      </h3>
                      <span className="text-sm">{stageJobs.length}</span>
                    </div>
                  </div>

                  {/* Stage-Specific Content */}
                  <div className="mt-4">
                    {stage.status === "draft" && onCreateJourney && (
                      <DraftStageView
                        jobs={stageJobs as any}
                        onJobClick={onJobClick as any}
                        onCreateJourney={onCreateJourney as any}
                      />
                    )}
                    {stage.status === "created" && (
                      <CreatedStageView
                        jobs={stageJobs as any}
                        journeys={journeys}
                        getJobJourneys={getJobJourneys}
                        getJourneyProgress={getJourneyProgress}
                        getJourneyStatusText={getJourneyStatusText}
                        onJobClick={onJobClick as any}
                        onRefresh={onRefresh}
                      />
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
                    {stage.status === "rejected" && (
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
              jobsByStatus[stage.status as keyof typeof jobsByStatus];
            return (
              <div
                key={stage.status}
                className="flex flex-col gap-4 w-[320px] flex-shrink-0 h-full max-h-full"
              >
                {/* Stage Header */}
                <div
                  className={`flex-shrink-0 p-3 rounded-xl border-2 border-solid ${stage.color} min-h-[60px] flex items-center justify-center cursor-pointer transition-all duration-200 group`}
                  style={
                    {
                      "--hover-color": stage.hoverColor,
                    } as React.CSSProperties
                  }
                  onMouseEnter={(e) => {
                    e.currentTarget.className = `p-3 rounded-xl border-2 border-solid ${stage.hoverColor} min-h-[60px] flex items-center justify-center cursor-pointer transition-all duration-200 group`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.className = `p-3 rounded-xl border-2 border-solid ${stage.color} min-h-[60px] flex items-center justify-center cursor-pointer transition-all duration-200 group`;
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onStageClick(stage.status);
                  }}
                >
                  <div className="flex items-center justify-between w-full">
                    <h3 className="text-base font-bold text-black dark:text-white">
                      {stage.title}
                    </h3>
                    <span className="text-sm">{stageJobs.length}</span>
                  </div>
                </div>

                {/* Drop Zone */}
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
                      zoomedStage && stage.status === "created"
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
                            className="bg-[#141810] rounded-xl p-4 animate-pulse"
                          >
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
                      : (stage.status === "draft" ||
                            stage.status === "created") &&
                          zoomedStage
                        ? // Show journey cards for created stage when zoomed
                          stageJobs
                            .map((job) => {
                              const jobJourneys = getJobJourneys(job.id);
                              return jobJourneys
                                .filter((journey) => journey.id)
                                .map((journey, index) => (
                                  <JourneyTimelineCard
                                    key={`${job.id}-${journey.id || `journey-${index}`}`}
                                    journey={journey}
                                    onResume={() => {}}
                                    onDownload={() => {}}
                                    onDelete={() => {}}
                                    onRefresh={() => {}}
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
                                      onAction={(action, job, e) => {
                                        // Handle actions from the card
                                        if (action === "generate_docs") {
                                          onCreateJourney &&
                                            onCreateJourney(job);
                                        } else if (action === "inject_data") {
                                          // Logic to show inject data popup
                                          onImproveATS?.(job);
                                        } else if (action === "download") {
                                          // Logic to open download modal
                                          onDownload?.(job);
                                        } else if (
                                          action === "move_interview"
                                        ) {
                                          onJobStatusUpdate &&
                                            onJobStatusUpdate(
                                              job.id,
                                              "interview",
                                            );
                                        } else if (action === "log_activity") {
                                          console.log(
                                            "Log activity for",
                                            job.id,
                                          );
                                        } else if (
                                          action === "view_notes" ||
                                          action === "add_feedback"
                                        ) {
                                          onJobClick(job); // Open sidebar
                                        } else if (
                                          action === "interview_prep"
                                        ) {
                                          console.log(
                                            "Interview Prep for",
                                            job.id,
                                          );
                                        } else if (action === "accept_offer") {
                                          onJobStatusUpdate &&
                                            onJobStatusUpdate(
                                              job.id,
                                              "accepted",
                                            );
                                        } else if (action === "decline_offer") {
                                          onJobStatusUpdate &&
                                            onJobStatusUpdate(
                                              job.id,
                                              "rejected",
                                            );
                                        } else if (action === "archive") {
                                          onJobStatusUpdate &&
                                            onJobStatusUpdate(
                                              job.id,
                                              "withdrawn",
                                            );
                                        }
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
                                />
                              </>
                            );
                          })()}
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
