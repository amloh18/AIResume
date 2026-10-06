/**
 * Job-Landing Intelligence Orchestrator
 *
 * Orchestrates the full intelligence pipeline:
 *   Job Description → Target Profile → Evidence → Gap Analysis → Keyword Strategy → Reuse Check
 *
 * This is the main entry point for the job-landing document engine.
 */

import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import {
  JobTargetProfile,
  EvidenceProfile,
  GapAnalysis,
  KeywordStrategy,
  CVReuseEvaluation,
  GenerationContext,
} from './types';
import { buildJobTargetProfile } from './jobTargetProfileService';
import { buildEvidenceProfile } from './evidenceProfileService';
import { performGapAnalysis } from './gapAnalysisService';
import { buildKeywordStrategy } from './keywordStrategyService';
import { evaluateCVReuse } from './cvReuseEngine';

// ─── Main Orchestrator ────────────────────────────────────────────────

/**
 * Build the complete GenerationContext for a job application.
 *
 * This replaces the current pattern of sending raw Master CV JSON to AI.
 * Instead, it builds a structured intelligence layer that guides generation.
 */
export async function buildGenerationContext(params: {
  jobTitle: string;
  company: string;
  jobDescription: string;
  location?: string;
  masterCvData: UnifiedCVDataStructure;
  masterCvId: string;
  userId: string;
  jobId: string;
  mode: 'standard' | 'standout';
}): Promise<GenerationContext> {
  const {
    jobTitle, company, jobDescription, location,
    masterCvData, masterCvId, userId, jobId, mode,
  } = params;

  // Step 1: Build Job Target Profile
  const jobTargetProfile = await buildJobTargetProfile({
    jobTitle,
    company,
    jobDescription,
    location,
  });

  // Step 2: Build Evidence Profile from Master CV
  const evidenceProfile = buildEvidenceProfile({
    cvData: masterCvData,
    masterCvId,
  });

  // Step 3: Perform Gap Analysis
  const gapAnalysis = performGapAnalysis({
    jobTargetProfile,
    evidenceProfile,
    jobId,
    userId,
  });

  // Step 4: Build Keyword Strategy
  const keywordStrategy = buildKeywordStrategy({
    jobTargetProfile,
    evidenceProfile,
    gapAnalysis,
    mode,
  });

  // Step 5: Evaluate refinement seed from prior CVs
  //
  // NOTE: this does NOT decide whether to reuse an existing CV. Every journey
  // gets its own tailored CV. The result is used purely to seed keyword targets
  // for the new document's refinement.
  const reuseEvaluation = await evaluateCVReuse({
    userId,
    jobTargetProfile,
    evidenceProfile,
    gapAnalysis,
    masterCvData,
  });

  return {
    mode,
    jobTargetProfile,
    evidenceProfile,
    gapAnalysis,
    keywordStrategy,
    masterCvData,
    reuseEvaluation,
  };
}

/**
 * Build a summary of the generation context for logging/debugging.
 */
export function summarizeGenerationContext(ctx: GenerationContext): string {
  const { jobTargetProfile, gapAnalysis, keywordStrategy, reuseEvaluation } = ctx;

  const lines = [
    `Job: ${jobTargetProfile.targetRole} at ${jobTargetProfile.company}`,
    `Mode: ${ctx.mode}`,
    `Seniority: ${jobTargetProfile.seniority}`,
    `Remote: ${jobTargetProfile.remoteType}`,
    ``,
    `Gap Analysis:`,
    `  Overall Match: ${gapAnalysis.overallMatch}%`,
    `  Hard Requirements: ${gapAnalysis.hardRequirementMatch}%`,
    `  Preferred Requirements: ${gapAnalysis.preferredRequirementMatch}%`,
    `  Keyword Coverage: ${gapAnalysis.keywordCoverage}%`,
    `  Matched: ${gapAnalysis.matched.length}`,
    `  Partial: ${gapAnalysis.partiallyMatched.length}`,
    `  Missing: ${gapAnalysis.missing.length}`,
    `  Uncertain: ${gapAnalysis.uncertain.length}`,
    ``,
    `Keyword Strategy:`,
    `  Tier 1 (Mandatory): ${keywordStrategy.tiers[0]?.keywords.length || 0} keywords`,
    `  Tier 2 (Major): ${keywordStrategy.tiers[1]?.keywords.length || 0} keywords`,
    `  Tier 3 (Contextual): ${keywordStrategy.tiers[2]?.keywords.length || 0} keywords`,
    `  Tier 4 (Filler): ${keywordStrategy.tiers[3]?.keywords.length || 0} keywords`,
    `  Total: ${keywordStrategy.totalKeywords}`,
    `  Coverage Target: ${Math.round(keywordStrategy.coverageTarget * 100)}%`,
    ``,
    `CV Refinement Seed:`,
    `  Seed Found: ${reuseEvaluation?.refinementSeed ? 'yes' : 'no'}`,
    `  Similarity: ${reuseEvaluation?.reuseConfidence ?? 0}`,
    `  Reason: ${reuseEvaluation?.reason || 'N/A'}`,
    `  Already Evidenced Keywords: ${reuseEvaluation?.refinementSeed?.alreadyEvidencedKeywords.length ?? 0}`,
    `  Still Missing Keywords: ${reuseEvaluation?.refinementSeed?.stillMissingKeywords.length ?? 0}`,
    `  Adaptations Needed: ${reuseEvaluation?.adaptationNeeded.length || 0}`,
  ];

  return lines.join('\n');
}
