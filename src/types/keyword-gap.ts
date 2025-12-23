/**
 * Keyword Gap Types for Resume Enhancer Career Ecosystem
 * 
 * Used for analyzing missing keywords between a CV and Job Description
 * in Journey CV mode.
 */

/**
 * Represents a keyword gap found when comparing CV content to JD requirements
 */
export interface KeywordGap {
  /** The missing keyword or phrase */
  keyword: string;
  
  /** Category of the keyword */
  category: 'skill' | 'tool' | 'certification' | 'experience' | 'soft_skill' | 'industry';
  
  /** Number of times this keyword appears in the JD */
  frequency: number;
  
  /** Importance level based on JD context and frequency */
  importance: 'critical' | 'preferred' | 'nice-to-have';
  
  /** Suggested CV section where this keyword could be added */
  suggestion?: string;
  
  /** Optional context from the JD where this keyword was found */
  context?: string;
  
  /** Whether the user has marked this as "I have this skill" */
  userConfirmed?: boolean;
  
  /** Whether this keyword was auto-dismissed (e.g., semantic match found) */
  dismissed?: boolean;
  
  /** If a semantic match was found, what term was detected */
  semanticMatch?: {
    foundTerm: string;
    confidence: number; // 0-1
  };
}

/**
 * Result of keyword gap analysis between CV and JD
 */
export interface KeywordGapAnalysisResult {
  /** List of all identified gaps */
  gaps: KeywordGap[];
  
  /** Overall match score (0-100) */
  matchScore: number;
  
  /** Keywords successfully matched */
  matchedKeywords: string[];
  
  /** Summary statistics */
  stats: {
    totalJDKeywords: number;
    matchedCount: number;
    gapCount: number;
    criticalGaps: number;
    preferredGaps: number;
    niceToHaveGaps: number;
  };
  
  /** Analysis metadata */
  analyzedAt: Date;
  
  /** Hash of JD content for cache invalidation */
  jdContentHash: string;
}

/**
 * Keyword with its extracted metadata from JD
 */
export interface ExtractedKeyword {
  keyword: string;
  category: KeywordGap['category'];
  frequency: number;
  importance: KeywordGap['importance'];
  context: string;
}

/**
 * Request payload for keyword gap analysis API
 */
export interface KeywordGapAnalysisRequest {
  /** CV data to analyze */
  cvData: any; // UnifiedCVDataStructure
  
  /** Job description text */
  jobDescription: string;
  
  /** Optional job title for context */
  jobTitle?: string;
  
  /** Optional company name for context */
  company?: string;
}

/**
 * Response from keyword gap analysis API
 */
export interface KeywordGapAnalysisResponse {
  success: boolean;
  data?: KeywordGapAnalysisResult;
  error?: string;
}

