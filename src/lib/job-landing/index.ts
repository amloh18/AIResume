/**
 * Job-Landing Document Engine
 *
 * Structured intelligence layer between Master CV and generated documents.
 *
 * Usage:
 *   import { buildGenerationContext, summarizeGenerationContext } from '@/lib/job-landing';
 *
 *   const context = await buildGenerationContext({
 *     jobTitle: 'Senior Software Engineer',
 *     company: 'Acme Corp',
 *     jobDescription: '...',
 *     masterCvData: cv.cvData,
 *     masterCvId: cv._id.toString(),
 *     userId: user._id.toString(),
 *     jobId: job._id.toString(),
 *     mode: 'standout',
 *   });
 *
 *   console.log(summarizeGenerationContext(context));
 *   // → "Job: Senior Software Engineer at Acme Corp
 *   //     Overall Match: 78%
 *   //     Tier 1 keywords: 12
 *   //     ..."
 */

export { buildGenerationContext, summarizeGenerationContext } from './orchestrator';
export { buildJobTargetProfile } from './jobTargetProfileService';
export { buildEvidenceProfile } from './evidenceProfileService';
export { performGapAnalysis } from './gapAnalysisService';
export { buildKeywordStrategy, getKeywordsForTier, getAllKeywords } from './keywordStrategyService';
export { evaluateCvRefinement, evaluateCVReuse, textEvidencesKeyword } from './cvReuseEngine';
export type {
  JobTargetProfile,
  EvidenceProfile,
  GapAnalysis,
  KeywordStrategy,
  CVReuseEvaluation,
  CVRefinementSeed,
  GenerationContext,
  EvidenceItem,
  GapItem,
  KeywordTier,
  Requirement,
  SeniorityLevel,
  RemoteType,
} from './types';
