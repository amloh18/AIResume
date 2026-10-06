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
import { resolveJobScores } from '@/lib/utils/scoreResolver';
import { getJourneyAtsScore } from "@/lib/utils/cv-scoring";
import {
  getJourneyDocumentsForJob,
  getJourneyDocumentStateForJob,
  isJourneyFailed,
  isJourneyProcessing,
  type JourneyDocumentState,
} from "@/lib/utils/journey-documents";
import { useJobLiveStatusStore } from "@/lib/stores/jobLiveStatusStore";
import { JobLiveStatusCard } from "@/components/jobs/JobLiveStatusCard";
import { useApplicationProgress } from '@/hooks/useApplicationProgress';
import { LiveProgressBar } from '@/components/applications/LiveProgressBar';
import { getJobCardColorClass } from "@/lib/config/job-constants";
import { metricTone, CHIP_TONES, chipTone } from "@/components/ui/chip-styles";
import JobStatusActionChip from "@/components/jobs/JobStatusActionChip";
import {
  deriveApplicationStatusBadge,
  type BadgeActionId,
} from "@/lib/utils/application-status-badge";

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
  internalStatus?: string;
  reviewReason?: string;
  queueEtaSeconds?: number;
  queuePosition?: number;
  applyUrl?: string;
  sourceUrl?: string;
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
  /** A document-generation request for this job is already in flight. */
  isJourneyPending?: boolean;
  onClick: (job: JobApplication) => void;
  onDragStart: (e: React.DragEvent, jobId: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onRefresh?: () => void;
  onAction?: (action: string, job: JobApplication, e: React.MouseEvent) => void;
  /** Approve / retry / dismiss a parked application (shared with the list view). */
  onAutomationAction?: (job: any, actionId: BadgeActionId) => void;
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
  isJourneyPending = false,
  onClick,
  onDragStart,
  onDragEnd,
  onDragOver,
  onRefresh,
  onAction,
  onAutomationAction,
}) => {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // Prevent infinite loops by tracking attempts locally
  const hasAnalyzedRef = React.useRef(false);

  const [progress, setProgress] = useState(0);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const primaryJourney = jobJourneys && jobJourneys.length > 0 ? jobJourneys[0] : null;
  // `job.matchScore` is a job-fit metric, NOT an ATS score. Falling back to it
  // here would display a different measurement under the "ATS Score" label, so
  // an unmeasured document correctly resolves to `undefined` instead.
  const atsScore = getJourneyAtsScore(primaryJourney, job);

  const jobId = String(job.id || job._id || '');
  const journeyStatus = primaryJourney?.status;
  /*
    Readiness is derived in ONE place (`@/lib/utils/journey-documents`) so this
    card, the list view and the sidebar cannot answer "do the documents exist?"
    differently. Locally recomputing `Boolean(cvId) && Boolean(coverLetterId)`
    here is how the card ended up disagreeing with the sidebar.

    Readiness is the union across the job's journeys: a retry can leave a CV on
    one row and a cover letter on another, and that is still a complete
    application.
  */
  const documents = getJourneyDocumentsForJob(jobJourneys);
  const hasCV = documents.hasCV;
  const hasCoverLetter = documents.hasCoverLetter;
  const documentsReady = documents.ready;
  const generationFailed = isJourneyFailed(journeyStatus);

  /**
   * A journey can stop "processing" *before* its document links are written —
   * `createJourneyDocuments` sets status/ids on the same document but the
   * parent's `journeys` payload is a separate read, so there is a real window
   * where status is terminal and `cvId`/`coverLetterId` are still absent.
   * Watching status alone left those cards pinned on two red document icons
   * with a "Documents ready" label and nothing to click.
   *
   * So keep watching while EITHER the journey is mid-flight OR the documents it
   * promises are not linked yet — unless the journey failed, which is terminal.
   */
  const journeyStillProcessing =
    Boolean(jobJourneys?.length) &&
    jobJourneys.some((journey) => isJourneyProcessing(journey.status));

  const shouldPoll =
    stage === 'created' &&
    Boolean(primaryJourney) &&
    !generationFailed &&
    (journeyStillProcessing || !documentsReady);

  const isGenerating = shouldPoll && !pollTimedOut;

  /**
   * `isJourneyPending` is the parent's knowledge that it has *asked* for
   * documents but the journey has not shown up in `jobJourneys` yet. Without
   * folding it in here, the card would flash "Documents ready" (with two red
   * icons) for the whole round-trip of the create request.
   */
  const isWorking = isGenerating || isJourneyPending;

  /**
   * The single label this card is allowed to show for document state.
   * `none` is distinct from `partial` on purpose: two red icons under
   * "Partially generated" reads as a broken half-generation, when the usual
   * cause is simply that no journey has been started for this job.
   */
  const documentState: JourneyDocumentState = isWorking
    ? 'generating'
    : getJourneyDocumentStateForJob(jobJourneys, {
        isPending: isJourneyPending,
        timedOut: pollTimedOut,
      });

  // Progress simulation timer
  React.useEffect(() => {
    if (!isWorking) {
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
  }, [isWorking]);

  /**
   * Poll the journey until the outcome is settled, then ask the parent to
   * reload. Bounded by a deadline: a document link that never arrives must not
   * leave the card spinning forever — after the deadline it offers a retry.
   */
  React.useEffect(() => {
    if (!shouldPoll) return;

    let cancelled = false;
    const POLL_INTERVAL_MS = 3000;
    const MAX_POLL_MS = 5 * 60 * 1000;
    const startedAt = Date.now();

    const timer = setInterval(async () => {
      if (cancelled) return;

      if (Date.now() - startedAt > MAX_POLL_MS) {
        clearInterval(timer);
        if (!cancelled) setPollTimedOut(true);
        return;
      }

      try {
        const res = await fetch(
          `/api/application-journey?jobId=${encodeURIComponent(jobId)}`
        );
        if (!res.ok || cancelled) return;

        const result = await res.json();
        const list = result?.data?.journeys;
        if (!Array.isArray(list) || list.length === 0) return;

        // Match on jobId first: this endpoint is already filtered by jobId, but
        // matching explicitly means a changed response shape cannot silently
        // attach another job's journey to this card.
        const updated = list.find((j: any) => String(j.jobId) === jobId) || list[0];

        const changed =
          updated.status !== journeyStatus ||
          Boolean(updated.cvId) !== hasCV ||
          Boolean(updated.coverLetterId) !== hasCoverLetter;

        if (changed) {
          clearInterval(timer);
          if (!cancelled) onRefresh?.();
          return;
        }

        /*
          Safety net. `shouldPoll` is already false once the journey is settled
          AND both links exist, so this is normally unreachable — reaching it
          means the server has settled state this card has not applied. Stopping
          without a refresh would strand the card on the stale view, so ask the
          parent to reload first and only then give up.
        */
        const settled =
          updated.status !== 'processing_documents' &&
          updated.status !== 'in-progress' &&
          updated.status !== 'paused';
        if (settled && updated.cvId && updated.coverLetterId) {
          clearInterval(timer);
          if (!cancelled) onRefresh?.();
        }
      } catch (err) {
        console.error("Error polling journey status in Kanban card:", err);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [shouldPoll, jobId, journeyStatus, hasCV, hasCoverLetter, onRefresh]);

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
        <div className={`${chipTone('rose', 'md')} mt-2 w-fit font-medium`}>
          <AlertCircle size={12} />
          <span>Expired on {formatDate(targetDate)}</span>
        </div>
      );
    } else if (diffDays <= 3) {
      return (
        <div className={`${chipTone('orange', 'md')} mt-2 w-fit font-medium`}>
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
          className={metricTone(job.matchScore !== undefined ? 'emerald' : 'slate')}
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
                  if (isJourneyPending) return;
                  onAction?.("generate_docs", job, e);
                }}
                disabled={isJourneyPending}
                title={isJourneyPending ? 'Documents are already being generated for this job' : undefined}
                className={`w-full py-1.5 text-small font-bold rounded-lg transition-colors shadow-sm flex items-center justify-center gap-1.5 ${
                  isJourneyPending
                    ? 'bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-[#013f2e] text-white hover:bg-[#025c43]'
                }`}
              >
                {isJourneyPending ? (
                  <>
                    <Clock size={11} />
                    Please wait — generating…
                  </>
                ) : (
                  'Generate Docs'
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  const renderCreatedContent = () => {
    /*
      The old version of this renderer only asked "is generation still
      running?" and treated every other answer as success. A journey that ended
      in `creation_failed` — or that settled without ever linking a document —
      therefore rendered "Documents ready" beside two red icons, with nothing to
      click. Success is now proven by the document links themselves, and the
      four outcomes are mutually exclusive and come from ONE derivation
      (`getJourneyDocumentState`), shared with the list view and the sidebar.
    */
    const generationFailedNow = documentState === 'failed';

    if (isWorking) {
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
                className={`p-1 rounded-full border ${CHIP_TONES.neutral} animate-pulse`}
                title="CV in progress"
              >
                <FileText size={12} />
              </div>
              <div
                className={`p-1 rounded-full border ${CHIP_TONES.neutral} animate-pulse`}
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
                <div className="pt-3 mt-2 border-t border-gray-100 dark:border-white/10 space-y-2">
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 italic">
                    Tailoring your CV and cover letter to match this job description...
                  </p>
                  <button
                    disabled
                    className="w-full py-1.5 bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 text-small font-bold rounded-lg cursor-not-allowed flex items-center justify-center gap-1.5"
                    title="Generation is already running for this job"
                  >
                    <Clock size={11} />
                    Please wait — {progress}% done
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      );
    }

    if (generationFailedNow) {
      return (
        <>
          {/* Compact View */}
          <div className="flex justify-between items-center mt-2">
            <div className="flex items-center gap-1.5 text-small text-red-600 dark:text-red-400 font-medium">
              <AlertCircle size={12} />
              <span>Generation failed</span>
            </div>
            <div className="flex gap-1.5">
              <div
                className={`p-1 rounded-full border ${CHIP_TONES[hasCV ? "emerald" : "rose"]}`}
                title={hasCV ? "CV Generated" : "No CV"}
              >
                <FileText size={12} />
              </div>
              <div
                className={`p-1 rounded-full border ${CHIP_TONES[hasCoverLetter ? "emerald" : "rose"]}`}
                title={hasCoverLetter ? "Cover Letter Generated" : "No Cover Letter"}
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
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    The tailored documents could not be created. Retry, or check the job
                    description is available.
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // A retry is a fresh request, so clear the local deadline
                      // first — otherwise `pollTimedOut` would immediately mark
                      // the new attempt as failed too.
                      setPollTimedOut(false);
                      onAction?.("generate_docs", job, e);
                    }}
                    className="w-full py-1.5 bg-[#013f2e] text-white text-small font-bold rounded-lg hover:bg-[#025c43] transition-colors shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Zap size={11} />
                    Retry generation
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      );
    }

    /*
      Settled states: `ready` (both links), `partial` (a journey exists but a
      document is missing) or `none` (no journey yet).

      `none` must NOT reuse the red-icon treatment: two red document icons read
      as "generation half-failed" and sent users hunting for a bug, when the
      honest statement is "you haven't generated documents for this job yet".
    */
    const hasNoJourney = documentState === 'none';
    const docIconClass = (present: boolean) =>
      `p-1 rounded-full border ${
        CHIP_TONES[present ? 'emerald' : hasNoJourney ? 'neutral' : 'rose']
      }`;

    return (
      <>
        {/* Compact View */}
        <div className="flex justify-between items-center mt-2">
          <div className="flex items-center gap-1.5 text-small text-gray-500 dark:text-gray-400">
            <span>
              {documentState === 'ready'
                ? "Documents ready"
                : documentState === 'partial'
                  ? "Partially generated"
                  : "Documents not generated"}
            </span>
          </div>
          <div className="flex gap-1.5">
            <div
              className={docIconClass(hasCV)}
              title={hasCV ? "CV Generated" : "No CV"}
            >
              <FileText size={12} />
            </div>
            <div
              className={docIconClass(hasCoverLetter)}
              title={hasCoverLetter ? "Cover Letter Generated" : "No Cover Letter"}
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
                {/* A missing half is the difference between a submittable
                    application and an incomplete one — offer the repair. */}
                {!documentsReady && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPollTimedOut(false);
                      onAction?.("generate_docs", job, e);
                    }}
                    className="w-full py-1.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg text-small font-medium hover:bg-gray-200 dark:hover:bg-white/20 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Zap size={11} />
                    {hasNoJourney ? "Generate documents" : "Generate missing document"}
                  </button>
                )}
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
              <div className={`${chipTone('orange', 'md')} w-fit font-medium`}>
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
            className={`${chipTone(!nextInterview ? 'neutral' : 'amber', 'md')} ${
              !nextInterview ? '' : 'font-medium'
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
  const scores = resolveJobScores(job as any);
  const successProb = scores.winScore;

  // `jobId` is declared once near the top of the component — it is needed by the
  // journey poll, which runs before this point in the render body.
  const liveStatus = useJobLiveStatusStore((state) => (jobId ? state.statuses[jobId] : undefined));
  const { clearStatus } = useJobLiveStatusStore();
  // Server-derived progress, from the same shared cache the list row and the
  // journey sidebar read — so a card and its table row never disagree.
  const { getForJob } = useApplicationProgress();
  const liveProgress = getForJob(jobId);
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

        {/*
          Application status + its one required action, same derivation and
          same component as the list view — a card parked for approval offers
          "Approve & submit" exactly like the table row does. Rendered only
          when the state is in-flight or demands action, so terminal cards
          (Applied/Interview/…) don't repeat their column header.
        */}
        {(() => {
          const badge = deriveApplicationStatusBadge(job);
          if (!badge.action && !badge.eta) return null;
          return (
            <div className="mb-2">
              <JobStatusActionChip job={job} onAutomationAction={onAutomationAction} variant="inline" />
            </div>
          );
        })()}

        {/* Visual Anchor: Logo & Title */}
        <div className="flex gap-2.5">
          <CompanyLogo company={job.company} size={28} logoUrl={job.companyLogo} jobId={job.id || job._id} />
          <div className="min-w-0 flex-1">
            <div className="flex justify-between items-start">
              <h4 className="font-bold text-small text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {job.jobTitle || job.title}
              </h4>
            </div>
            <p className="text-small text-gray-500 dark:text-gray-400 truncate">
              {job.company}
            </p>
          </div>
        </div>

        {/* Live Status OR Stage Specific Content */}
        {liveProgress?.isActive ? (
          <div className="mt-2.5">
            <LiveProgressBar
              progress={liveProgress}
              variant="compact"
              onAction={(actionId) => onAutomationAction?.(job, actionId)}
            />
          </div>
        ) : liveStatus ? (
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

            {/* Inline ATS + Win % + Deadline Display for Staging (created), Applied, and Interview stages */}
            {["created", "applied", "interview"].includes(stage) && (
              <div className="flex items-center justify-between text-[11px] mt-2.5 pt-2.5 border-t border-gray-100 dark:border-white/5 gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500 dark:text-gray-400 font-bold">ATS:</span>
                    <span className={`font-black ${atsScore && atsScore >= 80 ? 'text-green-600 dark:text-green-400' : atsScore && atsScore > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}`}>
                      {atsScore && atsScore > 0 ? `${atsScore}%` : 'N/A'}
                    </span>
                  </div>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500 dark:text-gray-400 font-bold">Win:</span>
                    <span className={`font-black ${
                      successProb >= 70 ? 'text-green-600 dark:text-green-400' :
                      successProb >= 40 ? 'text-blue-600 dark:text-blue-400' :
                      successProb >= 20 ? 'text-amber-600 dark:text-amber-400' :
                      'text-gray-400'
                    }`}>
                      {successProb}%
                    </span>
                  </div>
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
