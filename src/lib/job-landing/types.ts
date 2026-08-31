/**
 * Job-Landing Document Engine — Core Types
 *
 * These types define the structured intelligence layer between
 * Master CV (source of truth) and generated documents (derived artifacts).
 *
 * Flow:
 *   Master CV + Job Description
 *       ↓
 *   JobTargetProfile (what the job needs)
 *   EvidenceProfile (what the candidate has)
 *       ↓
 *   GapAnalysis (what matches, what's missing, what's partial)
 *   KeywordStrategy (tiered keywords for ATS optimization)
 *       ↓
 *   CV Reuse Evaluation (can we reuse an existing CV?)
 *       ↓
 *   Tailored CV + Cover Letter (job-landing documents)
 */

// ─── Job Target Profile ───────────────────────────────────────────────

export interface JobTargetProfile {
  targetRole: string;
  company: string;
  seniority: SeniorityLevel;
  location: string;
  remoteType: RemoteType;

  // Structured requirements
  hardRequirements: Requirement[];
  preferredRequirements: Requirement[];
  contextualSignals: ContextualSignal[];

  // Keyword intelligence
  keywords: KeywordTier[];
  importantPhrases: string[];
  likelyATSKeywords: string[];

  // Role context
  responsibilities: string[];
  qualifications: string[];
  industry: string;
  tools: string[];
  technologies: string[];
  certifications: string[];

  // Gap intelligence (computed later, but stored here for reference)
  candidateGaps: string[];
  candidateStrengths: string[];

  // Metadata
  rawJobDescription: string;
  extractedAt: Date;
  confidence: number; // 0-1, how confident we are in the extraction
}

export type SeniorityLevel =
  | 'intern'
  | 'junior'
  | 'mid'
  | 'senior'
  | 'staff'
  | 'principal'
  | 'lead'
  | 'manager'
  | 'director'
  | 'vp'
  | 'c-level'
  | 'unknown';

export type RemoteType =
  | 'remote'
  | 'hybrid'
  | 'onsite'
  | 'unknown';

export interface Requirement {
  text: string;
  category: RequirementCategory;
  priority: 'mandatory' | 'preferred' | 'nice-to-have';
  evidenceType: EvidenceType;
}

export type RequirementCategory =
  | 'technical-skill'
  | 'experience'
  | 'education'
  | 'certification'
  | 'tool'
  | 'soft-skill'
  | 'language'
  | 'domain-knowledge';

export interface ContextualSignal {
  text: string;
  signalType: 'culture' | 'values' | 'team-size' | 'process' | 'growth' | 'benefit';
  relevance: 'high' | 'medium' | 'low';
}

// ─── Keyword Strategy ─────────────────────────────────────────────────

export interface KeywordTier {
  tier: 1 | 2 | 3 | 4;
  tierName: 'mandatory' | 'major' | 'contextual' | 'filler';
  keywords: string[];
  maxOccurrences: number; // How many times to use in CV
}

export interface KeywordStrategy {
  tiers: KeywordTier[];
  totalKeywords: number;
  coverageTarget: number; // 0-1, target coverage percentage
  mode: 'standard' | 'standout';
}

// ─── Evidence Profile ─────────────────────────────────────────────────

export interface EvidenceProfile {
  // Structured evidence by category
  experience: EvidenceItem[];
  skills: EvidenceItem[];
  achievements: EvidenceItem[];
  projects: EvidenceItem[];
  education: EvidenceItem[];
  certifications: EvidenceItem[];
  tools: EvidenceItem[];
  technologies: EvidenceItem[];
  languages: EvidenceItem[];
  leadership: EvidenceItem[];
  industryExperience: EvidenceItem[];

  // Summary statistics
  totalFacts: number;
  verifiedFacts: number;
  confidence: number; // 0-1, overall confidence in the evidence

  // Source
  masterCvId: string;
  extractedAt: Date;
}

export interface EvidenceItem {
  fact: string;
  source: EvidenceSource;
  confidence: number; // 0-1
  evidenceType: EvidenceType;
  keywords: string[]; // Relevant keywords this evidence supports
}

export type EvidenceType =
  | 'work-experience'
  | 'project'
  | 'skill'
  | 'education'
  | 'certification'
  | 'achievement'
  | 'tool'
  | 'technology'
  | 'language'
  | 'leadership'
  | 'industry'
  | 'soft-skill';

export interface EvidenceSource {
  section: string; // e.g., 'work', 'skills', 'projects'
  index?: number; // Index within the section
  field?: string; // Specific field (e.g., 'highlights[0]')
  originalText: string; // The original text from Master CV
}

// ─── Gap Analysis ─────────────────────────────────────────────────────

export interface GapAnalysis {
  // Categorized matches
  matched: GapItem[];
  partiallyMatched: GapItem[];
  missing: GapItem[];
  uncertain: GapItem[];

  // Scores
  overallMatch: number; // 0-100
  hardRequirementMatch: number; // 0-100
  preferredRequirementMatch: number; // 0-100
  keywordCoverage: number; // 0-100

  // Strategy recommendations
  strengths: string[]; // Things to emphasize
  gaps: string[]; // Things to address or acknowledge
  differentiators: string[]; // Things that set candidate apart

  // Metadata
  jobId: string;
  userId: string;
  analyzedAt: Date;
}

export interface GapItem {
  requirement: string;
  category: RequirementCategory;
  priority: 'mandatory' | 'preferred' | 'nice-to-have';
  status: 'matched' | 'partial' | 'missing' | 'uncertain';
  evidence?: EvidenceItem[]; // Supporting evidence if matched
  gapDescription?: string; // What's missing if not matched
  recommendation?: string; // How to address this gap
}

// ─── CV Reuse Evaluation ──────────────────────────────────────────────

export interface CVReuseEvaluation {
  canReuse: boolean;
  reuseCVId: string | null;
  reuseConfidence: number; // 0-1
  reason: string;
  adaptationNeeded: string[]; // What would need to change
  existingCVScore: number; // ATS score of the existing CV
  projectedScore: number; // Projected score after adaptation
}

// ─── Generation Context ───────────────────────────────────────────────

/**
 * The complete context passed to AI for document generation.
 * This replaces the current pattern of sending raw Master CV JSON.
 */
export interface GenerationContext {
  mode: 'standard' | 'standout';
  jobTargetProfile: JobTargetProfile;
  evidenceProfile: EvidenceProfile;
  gapAnalysis: GapAnalysis;
  keywordStrategy: KeywordStrategy;
  masterCvData: any; // UnifiedCVDataStructure
  reuseEvaluation?: CVReuseEvaluation;
}

// ─── Journey Extensions ───────────────────────────────────────────────

/**
 * Additional fields to add to ApplicationJourney model.
 * These persist the intelligence layer on the journey record.
 */
export interface JourneyIntelligence {
  tailoringMode: 'standard' | 'standout';
  jobTargetProfile: JobTargetProfile;
  evidenceProfile: EvidenceProfile;
  gapAnalysis: GapAnalysis;
  keywordStrategy: KeywordStrategy;
  generationContextHash: string; // For reproducibility
}
