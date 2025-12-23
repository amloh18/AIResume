/**
 * Data Integrity Utilities
 * 
 * Handles edge cases for Data Integrity & Linking (EC-21 to EC-30)
 */

/**
 * EC-21: Journey CV Immutability
 * Journey CVs are immutable snapshots - changes to Master CV don't affect them
 * This function validates that a journey CV is not being incorrectly synced
 */
export function isJourneyImmutable(cvType: string, journeyId: string | undefined): boolean {
  return cvType === 'journey' && !!journeyId;
}

/**
 * EC-22: Master CV Role Deletion Check
 * Before deleting a job role from Master, check if it's used in any Journey CVs
 */
export interface DependencyCheck {
  hasDependencies: boolean;
  journeyCount: number;
  journeyIds: string[];
  warning?: string;
}

/**
 * EC-23: Archive on Rejection
 * Journey CVs linked to rejected applications should be archived, not deleted
 */
export function determineArchiveAction(
  applicationStatus: string
): { shouldArchive: boolean; shouldDelete: boolean; reason: string } {
  const archivedStatuses = ['rejected', 'withdrawn', 'expired', 'closed'];
  const activeStatuses = ['created', 'applied', 'screening', 'interviewing', 'offered'];
  
  if (archivedStatuses.includes(applicationStatus.toLowerCase())) {
    return {
      shouldArchive: true,
      shouldDelete: false,
      reason: `Application ${applicationStatus} - CV will be archived for reference`
    };
  }
  
  if (activeStatuses.includes(applicationStatus.toLowerCase())) {
    return {
      shouldArchive: false,
      shouldDelete: false,
      reason: 'Application is still active'
    };
  }
  
  return {
    shouldArchive: false,
    shouldDelete: false,
    reason: 'Unknown status - no action taken'
  };
}

/**
 * EC-24: Standalone Fork Chain Tracking
 * Track the chain of forks: Master -> Standalone -> Standalone2
 */
export interface ForkChain {
  sourceId: string;
  depth: number;
  chain: string[];
}

export function buildForkChain(
  cvId: string,
  parentMasterId: string | undefined,
  createdFrom: string | undefined
): ForkChain {
  const chain: string[] = [cvId];
  let depth = 0;
  
  if (createdFrom) {
    chain.unshift(createdFrom);
    depth++;
  }
  
  if (parentMasterId && parentMasterId !== createdFrom) {
    chain.unshift(parentMasterId);
    depth++;
  }
  
  return {
    sourceId: chain[0],
    depth,
    chain
  };
}

/**
 * EC-25: JD Update Triggers Re-analysis
 * Detect if JD has changed and requires re-running ATS analysis
 */
export function hasJDChanged(
  currentJD: string,
  previousJDHash: string | undefined
): { hasChanged: boolean; newHash: string } {
  const newHash = hashString(currentJD);
  
  return {
    hasChanged: !previousJDHash || newHash !== previousJDHash,
    newHash
  };
}

/**
 * EC-26: Guest Data Retention
 * Calculate TTL for guest user data (7 days default)
 */
export function calculateGuestDataExpiry(
  createdAt: Date = new Date(),
  ttlDays: number = 7
): Date {
  const expiry = new Date(createdAt);
  expiry.setDate(expiry.getDate() + ttlDays);
  return expiry;
}

export function isGuestDataExpired(
  expiresAt: Date
): boolean {
  return new Date() > new Date(expiresAt);
}

/**
 * EC-27: A/B Testing - Multiple Journey CVs per Job
 * Validate that multiple versions for same job are properly labeled
 */
export interface JourneyVersion {
  journeyId: string;
  cvId: string;
  versionNumber: number;
  createdAt: Date;
  label: string;
}

export function createVersionLabel(
  existingVersions: number
): string {
  if (existingVersions === 0) return 'Original';
  return `Version ${existingVersions + 1}`;
}

/**
 * EC-29: Template ATS Score Cap Enforcement
 * Ensure ATS score respects template cap
 */
export function enforceATSScoreCap(
  rawScore: number,
  atsScoreCap: number = 100
): { cappedScore: number; wasCapped: boolean } {
  const cappedScore = Math.min(rawScore, atsScoreCap);
  return {
    cappedScore,
    wasCapped: rawScore > atsScoreCap
  };
}

/**
 * EC-30: Dual Score Display
 * Determine which scores to show based on CV type
 */
export interface ScoreDisplay {
  primaryScore: number;
  primaryLabel: string;
  secondaryScore?: number;
  secondaryLabel?: string;
  showBoth: boolean;
}

export function determineScoreDisplay(
  cvType: 'master' | 'journey' | 'standalone',
  cvScore: number,
  atsScore?: number
): ScoreDisplay {
  if (cvType === 'journey' && atsScore !== undefined) {
    return {
      primaryScore: atsScore,
      primaryLabel: 'ATS Match',
      secondaryScore: cvScore,
      secondaryLabel: 'CV Quality',
      showBoth: true
    };
  }
  
  return {
    primaryScore: cvScore,
    primaryLabel: 'Profile Strength',
    showBoth: false
  };
}

/**
 * Helper: Simple string hash for comparison
 */
function hashString(str: string): string {
  let hash = 0;
  if (str.length === 0) return hash.toString();
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return hash.toString(36);
}

/**
 * Validate CV data integrity before save
 */
export interface IntegrityCheckResult {
  isValid: boolean;
  issues: string[];
  warnings: string[];
}

export function checkDataIntegrity(
  cvData: any,
  cvType: 'master' | 'journey' | 'standalone',
  journeyId?: string,
  parentMasterId?: string
): IntegrityCheckResult {
  const issues: string[] = [];
  const warnings: string[] = [];
  
  // Journey CV must have journeyId
  if (cvType === 'journey' && !journeyId) {
    issues.push('Journey CV must be linked to a job application');
  }
  
  // Master CV should not have parentMasterId
  if (cvType === 'master' && parentMasterId) {
    warnings.push('Master CV should not reference another Master CV');
  }
  
  // CV data must have basics
  if (!cvData?.basics) {
    issues.push('CV must have basic information (name, email)');
  } else {
    if (!cvData.basics.name) {
      warnings.push('CV is missing a name');
    }
    if (!cvData.basics.email) {
      warnings.push('CV is missing an email address');
    }
  }
  
  // Check for required template
  // (Template validation handled separately)
  
  return {
    isValid: issues.length === 0,
    issues,
    warnings
  };
}

/**
 * Sanitize CV data to prevent XSS
 * EC-46: XSS Prevention
 */
export function sanitizeCVData(cvData: any): any {
  if (!cvData) return cvData;
  
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '');
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const sanitized: any = {};
      for (const key of Object.keys(obj)) {
        sanitized[key] = sanitize(obj[key]);
      }
      return sanitized;
    }
    
    return obj;
  };
  
  return sanitize(cvData);
}

