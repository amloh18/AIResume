import { NormalizedJob } from '../models/Job';
export type DeduplicationTier = 'L1_EXACT_SOURCE_ID' | 'L2_CANONICAL_FINGERPRINT' | 'L3_SIMILARITY' | 'NONE';
export interface DuplicateCheckResult {
    isDuplicate: boolean;
    tier: DeduplicationTier;
    confidence: number;
    existingJobId?: string;
    matchedCanonicalId?: string;
}
export declare class DuplicateDetector {
    /**
     * Checks incoming normalized job against an existing candidate match
     */
    evaluateCandidate(incoming: NormalizedJob, existing: NormalizedJob): DuplicateCheckResult;
}
export declare const duplicateDetector: DuplicateDetector;
