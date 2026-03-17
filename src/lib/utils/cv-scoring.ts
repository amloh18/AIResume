import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { CentralScoreManager, CVScoreBreakdown, ATSScoreBreakdown, ScoreResult } from '@/lib/pill-engine/CentralScoreManager';
import { KeywordGapAnalysisResult } from '@/types/keyword-gap';

// Re-export types from CentralScoreManager for convenience
export type { CVScoreBreakdown, ATSScoreBreakdown, ScoreResult };

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
 * @returns ATSScoreBreakdown with keywordMatch, formatting, sectionAlignment, recency, contactability scores
 */
export function calculateATSScore(
    cvData: UnifiedCVDataStructure,
    keywordAnalysis?: KeywordGapAnalysisResult | null,
    atsScoreCap: number = 100
): ATSScoreBreakdown {
    return CentralScoreManager.getInstance().calculateATSScore(cvData, keywordAnalysis || null, atsScoreCap);
}

/**
 * Calculate complete score (both CV and ATS)
 * Returns ScoreResult with all breakdowns and recommendations
 * 
 * @param cvData - The CV data structure
 * @param keywordAnalysis - Optional keyword gap analysis result
 * @param atsScoreCap - Maximum possible ATS score (default: 100)
 * @returns ScoreResult with cvScore, atsScore, overallGrade, issues, and recommendations
 */
export function calculateScore(
    cvData: UnifiedCVDataStructure,
    keywordAnalysis?: KeywordGapAnalysisResult | null,
    atsScoreCap: number = 100
): ScoreResult {
    return CentralScoreManager.getInstance().getScoreSync(cvData, keywordAnalysis || null, atsScoreCap);
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
