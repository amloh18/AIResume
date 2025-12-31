/**
 * Studio Service Integration
 * 
 * Integrates Studio with CVSurgeonService, CVScoringService, and other CV services
 * for real-time analysis and score updates.
 */

import { CVSurgeonService } from '@/lib/services/cv-surgeon-service';
import { CVScoringService, type CVScoreBreakdown, type ATSScoreBreakdown } from '@/lib/services/cv-scoring-service';
import { normalizeSurgicalFixesToAnnotations } from '@/components/resume-enhancer/annotations/fix-annotation';
import { toStudioAnnotations } from './annotation-utils';
import type { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import type { StudioAnnotation, PillarScores, SectionAnalysis } from '@/types/studio';

// ============================================================================
// Types
// ============================================================================

export interface StudioAnalysisResult {
    cvScore: number;
    atsScore: number | null;
    pillarScores: PillarScores;
    annotations: StudioAnnotation[];
    sectionAnalyses: SectionAnalysis[];
    cvScoreBreakdown: CVScoreBreakdown;
    atsScoreBreakdown: ATSScoreBreakdown | null;
    cached: boolean;
}

export interface AnalyzeOptions {
    userId: string;
    cvId?: string;
    targetRole?: string;
    seniorityLevel?: string;
    jobData?: any;
    useCache?: boolean;
}

// ============================================================================
// Normalization
// ============================================================================

/**
 * Normalizes CV Score breakdown to PillarScores (0-20 each)
 */
export function normalizeToPillarScores(cvScore: CVScoreBreakdown): PillarScores {
    return {
        completeness: Math.round((cvScore.completeness / 25) * 20),
        impactVerbs: cvScore.impactVerbs, // Already 0-20
        quantification: cvScore.quantification, // Already 0-20
        formatting: Math.round((cvScore.formatting / 15) * 20),
        readability: cvScore.readability, // Already 0-20
    };
}

/**
 * Calculates section-wise analysis from annotations
 */
export function calculateSectionAnalyses(
    annotations: StudioAnnotation[],
    cvScoreBreakdown: CVScoreBreakdown
): SectionAnalysis[] {
    // Group annotations by section
    const sectionMap = new Map<string, StudioAnnotation[]>();

    annotations.forEach(annotation => {
        const section = annotation.sectionId;
        if (!sectionMap.has(section)) {
            sectionMap.set(section, []);
        }
        sectionMap.get(section)!.push(annotation);
    });

    // Calculate analysis for each section
    const analyses: SectionAnalysis[] = [];

    sectionMap.forEach((sectionAnnotations, sectionId) => {
        // Calculate pillar scores for this section based on annotations
        // This is a simplified calculation - in production, you'd have section-specific scoring
        const pillarCounts: Record<string, number> = {};
        const openCount = sectionAnnotations.filter(a => a.status === 'open').length;

        sectionAnnotations.forEach(a => {
            pillarCounts[a.pillar] = (pillarCounts[a.pillar] || 0) + 1;
        });

        // Estimate section scores based on global scores minus penalties from open annotations
        const basePillarScores = normalizeToPillarScores(cvScoreBreakdown);
        const sectionPillarScores: PillarScores = { ...basePillarScores };

        // Reduce scores based on open annotations in this section
        sectionAnnotations
            .filter(a => a.status === 'open')
            .forEach(a => {
                const penalty = Math.min(a.impactScoreDelta * 0.5, 5);
                sectionPillarScores[a.pillar] = Math.max(0, sectionPillarScores[a.pillar] - penalty);
            });

        // Calculate overall section score (average of pillars)
        const pillarValues = Object.values(sectionPillarScores);
        const overallScore = Math.round(pillarValues.reduce((sum, v) => sum + v, 0) / pillarValues.length) * 5;

        analyses.push({
            sectionId,
            sectionName: getSectionName(sectionId),
            pillarScores: sectionPillarScores,
            annotations: sectionAnnotations,
            overallScore,
        });
    });

    return analyses;
}

function getSectionName(sectionId: string): string {
    const names: Record<string, string> = {
        personal: 'Personal Information',
        work: 'Work Experience',
        education: 'Education',
        skills: 'Skills',
        projects: 'Projects',
        certificates: 'Certificates',
        languages: 'Languages',
        volunteer: 'Volunteer Experience',
    };
    return names[sectionId] || sectionId;
}

// ============================================================================
// Main Analysis Function
// ============================================================================

/**
 * Runs full analysis on CV data and returns Studio-formatted results
 */
export async function analyzeCV(
    cvData: UnifiedCVDataStructure,
    options: AnalyzeOptions
): Promise<StudioAnalysisResult> {
    const {
        userId,
        cvId,
        targetRole,
        seniorityLevel,
        jobData,
        useCache = true,
    } = options;

    // Calculate CV Score
    const cvScoreBreakdown = CVScoringService.calculateCVScore(cvData);
    const pillarScores = normalizeToPillarScores(cvScoreBreakdown);

    // Calculate ATS Score if job data available
    let atsScoreBreakdown: ATSScoreBreakdown | null = null;
    if (jobData?.jobDescription) {
        atsScoreBreakdown = CVScoringService.calculateATSScore(cvData, jobData.jobDescription);
    }

    // Get surgical analysis (fixes/suggestions)
    let annotations: StudioAnnotation[] = [];
    let cached = false;

    // Determine role and seniority
    const role = targetRole || jobData?.jobTitle || '';
    const seniority = seniorityLevel || 'professional';

    if (role) {
        try {
            let surgeonResult: { score: number; fixes: any[]; annotations: any[]; cached?: boolean };

            if (useCache && cvId && userId) {
                // Use cached version with full arguments
                const cachedResult = await CVSurgeonService.analyzeCVWithCache(
                    cvData,
                    role,
                    seniority,
                    cvId,
                    userId,
                    jobData
                );
                surgeonResult = cachedResult;
                cached = cachedResult.cached || false;
            } else {
                // Use direct analysis (no caching)
                surgeonResult = await CVSurgeonService.analyzeCV(
                    cvData,
                    role,
                    seniority,
                    jobData
                );
                cached = false;
            }

            // Convert to FixAnnotations first, then to StudioAnnotations
            const fixAnnotations = normalizeSurgicalFixesToAnnotations(cvData, surgeonResult.fixes);
            annotations = toStudioAnnotations(fixAnnotations);
        } catch (error) {
            console.error('Studio analysis error:', error);
            // Continue with empty annotations on error
        }
    }

    // Calculate section analyses
    const sectionAnalyses = calculateSectionAnalyses(annotations, cvScoreBreakdown);

    return {
        cvScore: cvScoreBreakdown.total,
        atsScore: atsScoreBreakdown?.total ?? null,
        pillarScores,
        annotations,
        sectionAnalyses,
        cvScoreBreakdown,
        atsScoreBreakdown,
        cached,
    };
}

// ============================================================================
// Score Update Functions
// ============================================================================

/**
 * Recalculates scores after applying/dismissing annotations
 */
export function recalculateScoresAfterFix(
    cvData: UnifiedCVDataStructure,
    appliedAnnotation: StudioAnnotation,
    currentScores: { cvScore: number; pillarScores: PillarScores }
): { cvScore: number; pillarScores: PillarScores } {
    // Recalculate from scratch for accuracy
    const newCvScoreBreakdown = CVScoringService.calculateCVScore(cvData);
    const newPillarScores = normalizeToPillarScores(newCvScoreBreakdown);

    return {
        cvScore: newCvScoreBreakdown.total,
        pillarScores: newPillarScores,
    };
}

/**
 * Estimates score improvement from applying an annotation
 */
export function estimateScoreImprovement(
    annotation: StudioAnnotation,
    currentScores: PillarScores
): PillarScores {
    const improved = { ...currentScores };
    const delta = Math.min(annotation.impactScoreDelta * 0.5, 3);
    improved[annotation.pillar] = Math.min(20, improved[annotation.pillar] + delta);
    return improved;
}
