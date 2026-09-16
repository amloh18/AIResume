import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { CentralScoreManager, CVScoreBreakdown, ATSScoreBreakdown, ScoreResult, TemplateAtsContext } from '@/lib/pill-engine/CentralScoreManager';
import { KeywordGapAnalysisResult } from '@/types/keyword-gap';

// Re-export types from CentralScoreManager for convenience
export type { CVScoreBreakdown, ATSScoreBreakdown, ScoreResult, TemplateAtsContext };

/**
 * Unified CV Scoring API
 * 
 * This module provides a unified interface to the CentralScoreManager.
 * All CV/ATS scoring calculations should use these functions to ensure
 * consistency across the application.
 */

/**
 * Calculate CV Score (Master/Standalone CVs - Human factors)
 * Uses CentralScoreManager for consistent scoring across the application
 * 
 * @param cvData - The CV data structure
 * @returns CVScoreBreakdown with completeness, impact, quantification, formatting, readability scores
 */
export function calculateCVScore(
    cvData: UnifiedCVDataStructure
): CVScoreBreakdown {
    return CentralScoreManager.getInstance().calculateCVScore(cvData);
}

/**
 * Calculate ATS Score (Journey CVs against Job Description)
 * Uses CentralScoreManager for consistent scoring across the application
 * 
 * @param cvData - The CV data structure
 * @param keywordAnalysis - Optional keyword gap analysis result
 * @param atsScoreCap - Maximum possible ATS score (default: 100)
 * @param templateContext - Template layout/safety context (structural ATS factors)
 * @returns ATSScoreBreakdown with keywordMatch, formatting, sectionAlignment, recency, contactability scores
 */
export function calculateATSScore(
    cvData: UnifiedCVDataStructure,
    keywordAnalysis?: KeywordGapAnalysisResult | null,
    atsScoreCap: number = 100,
    templateContext?: TemplateAtsContext
): ATSScoreBreakdown {
    return CentralScoreManager.getInstance().calculateATSScore(cvData, keywordAnalysis || null, atsScoreCap, templateContext);
}

/**
 * Calculate complete score (both CV and ATS)
 * Returns ScoreResult with all breakdowns and recommendations
 * 
 * @param cvData - The CV data structure
 * @param keywordAnalysis - Optional keyword gap analysis result
 * @param atsScoreCap - Maximum possible ATS score (default: 100)
 * @param templateContext - Template layout/safety context (structural ATS factors)
 * @returns ScoreResult with cvScore, atsScore, overallGrade, issues, and recommendations
 */
export function calculateScore(
    cvData: UnifiedCVDataStructure,
    keywordAnalysis?: KeywordGapAnalysisResult | null,
    atsScoreCap: number = 100,
    templateContext?: TemplateAtsContext
): ScoreResult {
    return CentralScoreManager.getInstance().getScoreSync(cvData, keywordAnalysis || null, atsScoreCap, templateContext);
}

/**
 * Canonical read selector for the score a user sees in list/thumbnail views.
 * 
 * Single source of truth: deterministic scores only. The LLM review score is
 * deliberately NOT used here — it is a subjective review, not an ATS keyword
 * score, and must never be presented as one. Use `getCvReviewScore` if a
 * surface genuinely wants the review number, and label it as a review.
 */
export function getCvScoreForDisplay(cv: any): number | undefined {
  if (!cv) return undefined;
  return typeof cv.metadata?.atsScore === 'number' ? cv.metadata.atsScore
    : typeof cv.cv_score_ats === 'number' ? cv.cv_score_ats
      : typeof cv.cv_score_master === 'number' ? cv.cv_score_master
        : typeof cv.atsScore === 'number' ? cv.atsScore
          : undefined;
}

/**
 * The LLM review score, kept separate from ATS/CV scores on purpose.
 * Lives only inside metadata.surgeonAnalysis.scoreReport.
 */
export function getCvReviewScore(cv: any): number | undefined {
  if (!cv) return undefined;
  return cv.metadata?.surgeonAnalysis?.scoreReport?.overall_score
    ?? cv.scoreReport?.overall_score;
}

/**
 * Resolve the ATS score for a journey, deterministically.
 *
 * `job.matchScore` is a job-fit metric, NOT an ATS score, so it is deliberately
 * excluded — an absent ATS score must read as "not calculated", never as a
 * different metric wearing the ATS label.
 */
export function getJourneyAtsScore(journey: any, job?: any): number | undefined {
  const fromJourney = typeof journey?.atsScore === 'number' ? journey.atsScore : undefined;
  if (fromJourney !== undefined) return fromJourney;
  return typeof job?.atsScore === 'number' ? job.atsScore : undefined;
}

/**
 * Get score color and label based on score value
 * Uses consistent color scheme across the application
 * 
 * @param score - Score value (0-100)
 * @returns Object with color hex, label, and background color class
 */
export function getScoreColor(score: number): { color: string; label: string; bgColor: string } {
    if (score >= 80) {
        return { color: '#10b981', label: 'Excellent', bgColor: 'bg-green-500' };
    } else if (score >= 60) {
        return { color: '#f59e0b', label: 'Good', bgColor: 'bg-yellow-500' };
    } else if (score >= 40) {
        return { color: '#f97316', label: 'Needs Work', bgColor: 'bg-orange-500' };
    } else {
        return { color: '#ef4444', label: 'Critical', bgColor: 'bg-red-500' };
    }
}
