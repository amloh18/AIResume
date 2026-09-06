"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  MapPin,
  DollarSign,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  X,
  ExternalLink,
  FileText,
  Zap,
  Linkedin,
  Mail,
  ArrowRight,
  Eye,
  GraduationCap,
  Target,
  Shield,
  Award,
  Briefcase,
  ChevronRight,
} from "lucide-react";
import CompanyLogo from "@/components/ui/CompanyLogo";
import { CVJourney } from "@/types/cv";
import { isJobStale, getFollowUpNudge, calculateSuccessProbability } from "@/lib/utils/jobIntelligence";
import { useJobLiveStatusStore } from "@/lib/stores/jobLiveStatusStore";
import { JobLiveStatusCard } from "@/components/jobs/JobLiveStatusCard";
import { getJobCardColorClass } from "@/lib/config/job-constants";

interface JobApplication {
  id: string;
  _id: string;
  userId: string;
  jobTitle: string;
  title?: string;
  company: string;
  companyLogo?: string;
  status:
    | "saved"
    | "created"
    | "applied"
    | "screening"
    | "interview"
    | "offer"
    | "rejected"
    | "accepted"
    | "withdrawn";
  location?: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: "hourly" | "monthly" | "yearly";
  };
  offerDetails?: {
    salary?: number;
    bonus?: string;
    equity?: string;
    deadline?: Date;
    status?: string;
  };
  interviews?: Array<{
    type: string;
    date: Date | string;
    interviewer?: string;
  }>;
  applicationDate?: Date;
  deadline?: Date;
  createdAt: string;
  updatedAt: string;
  matchScore?: number;
  sponsorship?: "yes" | "no" | "unknown";
  jobUrl?: string;
  atsScore?: number;
  jobDescription?: string;
  trustScore?: number;
  trustSnapshot?: {
    ghostRiskLevel?: "low" | "medium" | "high";
  };
  source?: string;
  priority: "low" | "medium" | "high";
}

interface JobKanbanCardProps {
  job: JobApplication;
  stage: string;
  jobJourneys: CVJourney[];
  isSelected: boolean;
  isDragging: boolean;
  canDrag: boolean;
  isExpired?: boolean;
  colorIndex?: number;
  onClick: (job: JobApplication) => void;
  onDragStart: (e: React.DragEvent, jobId: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onRefresh?: () => void;
  onAction?: (action: string, job: JobApplication, e: React.MouseEvent) => void;
}

// Global set to track analyzed jobs across component remounts
// This prevents the infinite loop where:
// 1. Analysis triggers update -> 2. Update triggers refresh -> 3. Refresh unmounts cards -> 4. Remount forgets local ref -> 5. Analysis triggers again
const analyzedJobIds = new Set<string>();

const JobKanbanCard: React.FC<JobKanbanCardProps> = ({
  job,
  stage,
  jobJourneys,
  isSelected,
  isDragging,
  canDrag,
  isExpired,
  colorIndex,
  onClick,
  onDragStart,
  onDragEnd,
  onDragOver,
  onRefresh,
  onAction,
}) => {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // Prevent infinite loops by tracking attempts locally
  const hasAnalyzedRef = React.useRef(false);

  const [progress, setProgress] = useState(0);
  const primaryJourney = jobJourneys && jobJourneys.length > 0 ? jobJourneys[0] : null;
  const atsScore = primaryJourney?.atsScore || job.atsScore || job.matchScore;
  const isGenerating = stage === "created" && primaryJourney?.status === "processing_documents";

  // Progress simulation timer
  React.useEffect(() => {
    if (!isGenerating) {
      setProgress(0);
      return;
    }

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95;
        const inc = Math.floor(Math.random() * 5) + 3; // 3% to 7%
        return Math.min(95, prev + inc);
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isGenerating]);

  // Polling database for updates on journey status ONLY if actively generating
  React.useEffect(() => {
    if (!isGenerating) return;

    let isMounted = true;
    const pollTimer = setInterval(async () => {
      try {
        const jobId = job.id || job._id;
        const res = await fetch(`/api/application-journey?jobId=${jobId}`);
        if (res.ok && isMounted) {
          const result = await res.json();
          if (result.success && result.data?.journeys && result.data.journeys.length > 0) {
            const updatedJourney = primaryJourney
              ? result.data.journeys.find(
                  (j: any) => j.id === primaryJourney.id || j._id === primaryJourney.id || j.jobId === jobId
                )
              : result.data.journeys[0];
            if (updatedJourney && updatedJourney.status !== "processing_documents") {
              clearInterval(pollTimer);
              if (isMounted) {
                onRefresh?.();
              }
            }
          }
        }
      } catch (err) {
        console.error("Error polling journey status in Kanban card:", err);
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(pollTimer);
    };
  }, [isGenerating, primaryJourney?.id, job.id, job._id, onRefresh]);

  const handlePracticeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/dashboard/interview/${job._id}`);
  };

  // Helper to format currency
  const formatSalary = (amount?: number, currency = "$") => {
    if (!amount) return "N/A";
    return amount >= 1000
      ? `${currency}${(amount / 1000).toFixed(0)}k`
      : `${currency}${amount}`;
  };

  // Helper for dates
  const formatDate = (date?: Date | string) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getDaysAgo = (date?: Date | string) => {
    if (!date) return "";
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor(
      (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
    );
    return diff === 0 ? "Today" : diff === 1 ? "Yesterday" : `${diff}d ago`;
  };

  const renderExpiryIndicator = () => {
    const targetDate =
      stage === "offer" ? job.offerDetails?.deadline : job.deadline;
    if (!targetDate) return null;

    const d = new Date(targetDate);
    const now = new Date();
    const diffDays = Math.ceil(
      (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (isExpired || diffDays < 0) {
      return (
        <div className="flex items-center gap-1.5 mt-2 text-small text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
          <AlertCircle size={12} />
          <span>Expired on {formatDate(targetDate)}</span>
        </div>
      );
    } else if (diffDays <= 3) {
      return (
        <div className="flex items-center gap-1.5 mt-2 text-small text-orange-600 dark:text-orange-400 font-medium bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded">
          <AlertCircle size={12} />
          <span>
            Expires in {diffDays} {diffDays === 1 ? "day" : "days"}
          </span>
        </div>
      );
    } else {
      return null;
    }
  };

  // --- STAGE SPECIFIC RENDERERS ---

  const renderDraftContent = () => (
    <>
      {/* Compact View */}
      <div className="flex justify-between items-center mt-2">
        <div
          className={`px-2 py-1 text-small font-bold rounded-full ${job.matchScore !== undefined ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400"}`}
        >
          {job.matchScore !== undefined
            ? `${job.matchScore}% Match`
            : isAnalyzing
              ? "Calculating..."
              : "Score Pending"}
        </div>
        {job.sponsorship === "yes" && (
          <div className="text-gray-500" title="Sponsorship Available">
            <Award size={14} />
          </div>
        )}
      </div>

      {renderExpiryIndicator()}

      {/* Hover View */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-3 mt-2 border-t border-gray-100 dark:border-white/10 space-y-2">
              <div className="flex gap-3 text-small text-gray-500 dark:text-gray-400">
                {job.salary && (
                  <span className="flex items-center gap-1">
                    <DollarSign size={10} />
                    {formatSalary(job.salary.min)} -{" "}
                    {formatSalary(job.salary.max)}
                  </span>
                )}
                {job.location && (
                  <span className="flex items-center gap-1 truncate max-w-[100px]">
                    <MapPin size={10} />
                    {job.location}
                  </span>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAction?.("generate_docs", job, e);
                }}
                className="w-full py-1.5 bg-[#013f2e] text-white text-small font-bold rounded-lg hover:bg-[#025c43] transition-colors shadow-sm"
              >
                Generate Docs
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  const renderCreatedContent = () => {
    const primaryJourney = jobJourneys[0];
    const hasCV = !!primaryJourney?.cvId;
    const hasCL = !!primaryJourney?.coverLetterId;

    if (isGenerating) {
      return (
        <>
          {/* Compact View */}
          <div className="flex justify-between items-center mt-2">
            <div className="flex-1 mr-3">
              <div className="flex items-center justify-between text-small mb-1">
                <span className="font-medium text-gray-600 dark:text-gray-300 animate-pulse">
                  Generating Documents...
                </span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">
                  {progress}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-1.5 rounded-full bg-blue-500 transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <div className="flex gap-1.5">
              <div
                className="p-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 animate-pulse"
                title="CV in progress"
              >
                <FileText size={12} />
              </div>
              <div
                className="p-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 animate-pulse"
                title="Cover Letter in progress"
              >
                <FileText size={12} />
              </div>
            </div>
          </div>

          {renderExpiryIndicator()}

          {/* Hover View */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-3 mt-2 border-t border-gray-100 dark:border-white/10">
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 italic">
                    Tailoring your CV and cover letter to match this job description...
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      );
    }

    return (
      <>
        {/* Compact View */}
        <div className="flex justify-between items-center mt-2">
          <div className="flex items-center gap-1.5 text-small text-gray-500 dark:text-gray-400">
            <span>Documents ready</span>
          </div>
          <div className="flex gap-1.5">
            <div
              className={`p-1 rounded-full ${hasCV ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"}`}
              title={hasCV ? "CV Generated" : "No CV"}
            >
              <FileText size={12} />
            </div>
            <div
              className={`p-1 rounded-full ${hasCL ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"}`}
              title={hasCL ? "Cover Letter Generated" : "No Cover Letter"}
            >
              <FileText size={12} />
            </div>
          </div>
        </div>

        {renderExpiryIndicator()}

        {/* Hover View */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-3 mt-2 border-t border-gray-100 dark:border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-small">
                  <Shield size={12} className="text-blue-500" />
                  <span className="text-gray-600 dark:text-gray-300">
                    {job.trustSnapshot?.ghostRiskLevel === "low"
                      ? "Low Risk"
                      : "Risk Analysis Pending"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction?.("inject_data", job, e);
                    }}
                    className="py-1.5 bg-[#36D39B]/15 text-[#013f2e] dark:text-[#36D39B] border border-[#36D39B]/30 rounded-lg text-small font-medium hover:bg-[#36D39B]/25 transition-colors"
                  >
                    Improve ATS
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction?.("download", job, e);
                    }}
                    className="py-1.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg text-small font-medium hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                  >
                    Download
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  };

  const renderAppliedContent = () => (
    <>
      {/* Compact View */}
      <div className="flex justify-between items-center mt-2">
        <div className="flex items-center gap-1.5 text-small text-gray-600 dark:text-gray-400">
          <Clock size={12} />
          <span>Applied {getDaysAgo(job.applicationDate)}</span>
        </div>
        <div className="text-small text-gray-400 font-medium capitalize">
          {(job.source || "manual").replace(/-/g, " ")}
        </div>
      </div>

      {renderExpiryIndicator()}

      {/* Hover View */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-3 mt-2 border-t border-gray-100 dark:border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-small text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded">
                <AlertCircle size={12} />
                <span>Follow up in 3 days</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction?.("move_interview", job, e);
                  }}
                  className="py-1.5 bg-[#013f2e] text-white rounded-lg text-small font-bold hover:bg-[#025c43] transition-colors shadow-sm"
                >
                  Move Stage
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction?.("log_activity", job, e);
                  }}
                  className="py-1.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg text-small font-medium hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                >
                  Log Activity
                </button>
                <button
                  onClick={handlePracticeClick}
                  className="col-span-2 mt-2 py-1.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg text-small font-medium hover:text-[#013f2e] dark:hover:text-[#36D39B] transition-colors flex items-center justify-center gap-2"
                >
                  <GraduationCap size={12} />
                  Practice
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  const renderInterviewContent = () => {
    const nextInterview = job.interviews?.[0]; // Assuming sorted by date

    return (
      <>
        {/* Compact View */}
        <div className="flex justify-between items-center mt-2">
          <div
            className={`flex items-center gap-1.5 text-small px-2 py-1 rounded-md ${
              !nextInterview
                ? "bg-gray-100 text-gray-500"
                : "bg-amber-100 text-amber-700 font-medium"
            }`}
          >
            <Calendar size={12} />
            <span>
              {nextInterview
                ? `${new Date(nextInterview.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} @ ${new Date(nextInterview.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : "Schedule Pending"}
            </span>
          </div>
          {nextInterview && (
            <div className="text-small text-gray-500">{nextInterview.type}</div>
          )}
        </div>

        {renderExpiryIndicator()}

        {/* Hover View */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-3 mt-2 border-t border-gray-100 dark:border-white/10 space-y-2">
                {nextInterview?.interviewer && (
                  <div className="flex items-center gap-2 text-small text-gray-600">
                    <Target size={12} />
                    <span>with {nextInterview.interviewer}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction?.("view_notes", job, e);
                    }}
                    className="py-1.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg text-small font-medium hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                  >
                    View Notes
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction?.("add_feedback", job, e);
                    }}
                    className="py-1.5 bg-[#013f2e] text-white rounded-lg text-small font-bold hover:bg-[#025c43] transition-colors shadow-sm"
                  >
                    Add Feedback
                  </button>
                </div>
                <button
                  onClick={handlePracticeClick}
                  className="w-full mt-2 py-1.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg text-small font-medium hover:text-[#013f2e] dark:hover:text-[#36D39B] transition-colors flex items-center justify-center gap-2"
                >
                  <GraduationCap size={12} />
                  Practice
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  };

  const renderOfferContent = () => (
    <>
      {/* Compact View */}
      <div className="flex justify-between items-center mt-2">
        <div className="flex items-center gap-1 text-small font-bold text-green-600 dark:text-green-400">
          <DollarSign size={14} />
          {job.offerDetails?.salary
            ? formatSalary(job.offerDetails.salary, "")
            : formatSalary(job.salary?.min || 0, "")}
          /yr
        </div>
      </div>

      {renderExpiryIndicator()}

      {/* Hover View */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-3 mt-2 border-t border-gray-100 dark:border-white/10 space-y-2">
              {/* Equity/Bonus */}
              {(job.offerDetails?.equity || job.offerDetails?.bonus) && (
                <div className="flex gap-3 text-small text-gray-600">
                  {job.offerDetails.bonus && (
                    <span>+{job.offerDetails.bonus} Bonus</span>
                  )}
                  {job.offerDetails.equity && (
                    <span>+{job.offerDetails.equity} Equity</span>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction?.("accept_offer", job, e);
                  }}
                  className="py-1.5 bg-green-500 text-white rounded-lg text-small font-bold hover:bg-green-600 transition-colors"
                >
                  Accept
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction?.("decline_offer", job, e);
                  }}
                  className="py-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-small font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                >
                  Decline
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  const isStale = isJobStale(job as any);
  const nudge = getFollowUpNudge(job as any);
  const successProb = calculateSuccessProbability(job as any);

  const jobId = String(job.id || job._id || '');
  const liveStatus = useJobLiveStatusStore((state) => (jobId ? state.statuses[jobId] : undefined));
  const { clearStatus } = useJobLiveStatusStore();
  const cardColorClass = getJobCardColorClass(colorIndex, jobId);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <div
        draggable={canDrag}
        onDragStart={(e) => onDragStart(e, job.id)}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
        onClick={() => onClick(job)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`job-card-kanban group relative overflow-hidden rounded-xl border transition-all duration-300 ${cardColorClass} ${
          isSelected
            ? "ring-2 ring-blue-500 ring-opacity-50"
            : ""
        } ${isDragging ? "opacity-50" : ""} ${!canDrag ? "cursor-default" : "cursor-grab active:cursor-grabbing"}
        ${isExpired ? "opacity-60 grayscale border-dashed" : "shadow-2xs group-hover:shadow-md"}
        `}
      >
      <div className="p-3">
        {isStale && (
          <div className="mb-3 flex items-center justify-between bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-2 py-1.5 rounded text-small font-medium border border-red-100 dark:border-red-900/30">
            <div className="flex items-center gap-1.5">
              <AlertCircle size={12} />
              <span>Stale Application</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction?.("archive", job, e);
              }}
              className="hover:bg-red-100 dark:hover:bg-red-900/50 p-1 rounded transition-colors"
              title="Archive Job"
            >
              <X size={12} />
            </button>
          </div>
        )}
        
        {nudge && !isStale && (
          <div className="mb-3 flex items-start gap-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-1.5 rounded text-small font-medium border border-blue-100 dark:border-blue-900/30">
            <Zap size={12} className="mt-0.5 flex-shrink-0" />
            <span>{nudge}</span>
          </div>
        )}

        {/* Visual Anchor: Logo & Title */}
        <div className="flex gap-2.5">
          <CompanyLogo company={job.company} size={28} logoUrl={job.companyLogo} jobId={job.id || job._id} />
          <div className="min-w-0 flex-1">
            <div className="flex justify-between items-start">
              <h4 className="font-bold text-small text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {job.jobTitle || job.title}
              </h4>
              <div className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${
                 successProb >= 70 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                 successProb >= 40 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                 successProb >= 20 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
               }`}>
                 {successProb}% Win
              </div>
            </div>
            <p className="text-small text-gray-500 dark:text-gray-400 truncate">
              {job.company}
            </p>
          </div>
        </div>

        {/* Live Status OR Stage Specific Content */}
        {liveStatus ? (
          <div className="mt-2.5">
            <JobLiveStatusCard
              status={liveStatus}
              onClose={() => clearStatus(jobId)}
              inline={true}
              compact={true}
            />
          </div>
        ) : (
          <div className="mt-1">
            {stage === "saved" && renderDraftContent()}
            {stage === "created" && renderCreatedContent()}
            {stage === "applied" && renderAppliedContent()}
            {stage === "interview" && renderInterviewContent()}
            {stage === "offer" && renderOfferContent()}
            {stage === "rejected" && (
              <div className="mt-2 text-small text-red-500 font-medium">
                Application Rejected
              </div>
            )}

            {/* Inline ATS + Deadline Display for Staging (created), Applied, and Interview stages */}
            {["created", "applied", "interview"].includes(stage) && (
              <div className="flex items-center justify-between text-[11px] mt-2.5 pt-2.5 border-t border-gray-100 dark:border-white/5 gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-gray-500 dark:text-gray-400 font-bold">ATS Score:</span>
                  <span className={`font-black ${atsScore && atsScore >= 80 ? 'text-green-600 dark:text-green-400' : atsScore && atsScore > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}`}>
                    {atsScore && atsScore > 0 ? `${atsScore}%` : 'N/A'}
                  </span>
                </div>
                {job.deadline && (
                  <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                    <Calendar size={11} className="shrink-0" />
                    <span className="truncate">
                      Due {new Date(job.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </motion.div>
  );
};

export default JobKanbanCard;
