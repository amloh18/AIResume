/**
 * ScoreResolver — Single source of truth for resolving job scores.
 *
 * All UI components should read scores through this module instead of
 * computing them inline or reading from different DB fields.
 *
 * Canonical storage locations:
 *   - matchScore:  JobApplication.matchScore  (set during save/auto-apply)
 *   - atsScore:    JobApplication.atsScore    (set by CentralScoreManager)
 *   - winScore:    Computed client-side from status + matchScore
 */

import { calculateSuccessProbability } from '@/lib/utils/jobIntelligence';

export interface JobScores {
  /** Job-fit score (0–100). How well the job matches the candidate's profile. */
  matchScore: number;
  /** ATS parseability score (0–100). How well the CV passes ATS screening. */
  atsScore: number;
  /** Win probability (0–100). Likelihood of success based on pipeline stage. */
  winScore: number;
  /** Whether scores were loaded from DB or are defaults. */
  isScored: boolean;
}

/**
 * Resolve canonical scores for a job from tracker/application data.
 *
 * @param job - The job listing (may carry matchScore from the discover API)
 * @param tracker - Optional tracker/application data (carries persisted scores)
 * @param journeyScores - Optional journey-level scores (atsScore, intelligence)
 * @returns Normalized, canonical scores
 */
export function resolveJobScores(
  job: {
    matchScore?: number;
    atsScore?: number;
    status?: string;
    interviews?: any[];
  },
  tracker?: {
    matchScore?: number;
    atsScore?: number;
    status?: string;
    interviews?: any[];
  } | null,
  journeyScores?: {
    atsScore?: number;
    overallMatch?: number;
  } | null
): JobScores {
  // Prefer persisted tracker scores over listing scores
  const matchScore = resolveMatchScore(job, tracker, journeyScores);
  const atsScore = resolveAtsScore(job, tracker, journeyScores);

  // Win score is always computed, never stored
  const effectiveStatus = tracker?.status || job.status || 'created';
  const winScore = calculateSuccessProbability({
    status: effectiveStatus as any,
    matchScore,
    atsScore,
    interviews: tracker?.interviews || job.interviews,
  });

  const isScored = matchScore > 0 || atsScore > 0;

  return { matchScore, atsScore, winScore, isScored };
}

/**
 * Resolve the canonical match score.
 * Priority: tracker > journey > job listing > 0
 */
function resolveMatchScore(
  job: { matchScore?: number },
  tracker?: { matchScore?: number } | null,
  journeyScores?: { overallMatch?: number } | null
): number {
  if (typeof tracker?.matchScore === 'number' && tracker.matchScore > 0) {
    return Math.min(98, Math.max(0, tracker.matchScore));
  }
  if (typeof journeyScores?.overallMatch === 'number' && journeyScores.overallMatch > 0) {
    return Math.min(98, Math.max(0, journeyScores.overallMatch));
  }
  if (typeof job.matchScore === 'number' && job.matchScore > 0) {
    return Math.min(98, Math.max(0, job.matchScore));
  }
  return 0;
}

/**
 * Resolve the canonical ATS score.
 * Priority: tracker > journey > job listing > 0
 */
function resolveAtsScore(
  job: { atsScore?: number },
  tracker?: { atsScore?: number } | null,
  journeyScores?: { atsScore?: number } | null
): number {
  if (typeof tracker?.atsScore === 'number' && tracker.atsScore > 0) {
    return Math.min(100, Math.max(0, tracker.atsScore));
  }
  if (typeof journeyScores?.atsScore === 'number' && journeyScores.atsScore > 0) {
    return Math.min(100, Math.max(0, journeyScores.atsScore));
  }
  if (typeof job.atsScore === 'number' && job.atsScore > 0) {
    return Math.min(100, Math.max(0, job.atsScore));
  }
  return 0;
}

/**
 * Resolve scores specifically for the sidebar/kanban display.
 * This is the function components should call instead of inline score reads.
 */
export function resolveSidebarScores(params: {
  job: any;
  tracker?: any;
  journey?: any;
  insights?: any;
}): JobScores {
  return resolveJobScores(
    {
      matchScore: params.job?.matchScore,
      atsScore: params.job?.atsScore,
      status: params.job?.status,
      interviews: params.job?.interviews,
    },
    params.tracker
      ? {
          matchScore: params.tracker.matchScore,
          atsScore: params.tracker.atsScore,
          status: params.tracker.status,
          interviews: params.tracker.interviews,
        }
      : null,
    params.journey
      ? {
          atsScore: params.journey.atsScore,
          overallMatch: params.journey.intelligence?.overallMatch,
        }
      : null
  );
}
