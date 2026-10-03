/**
 * Do-Not-Apply Engine
 *
 * Creates explicit rules for jobs that should not be applied to.
 * A successful system should deliberately reject many jobs.
 */

export interface DoNotApplyRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  evaluate: (context: DoNotApplyContext) => DoNotApplyResult;
}

export interface DoNotApplyContext {
  job: {
    id: string;
    title: string;
    company: string;
    domain?: string;
    location: string;
    remoteType: string;
    employmentType: string;
    salary?: { min?: number; max?: number; currency?: string };
    postedAt?: Date;
    expiresAt?: Date;
    isExpired?: boolean;
    isRemoved?: boolean;
    atsType?: string;
    description?: string;
  };
  candidate: {
    id: string;
    workAuthorization: string[];
    preferredLocations: string[];
    remotePreference: string;
    minSalary?: number;
    maxSalary?: number;
    preferredEmploymentTypes: string[];
    requiredCertifications?: string[];
    blockedCompanies?: string[];
    blockedDomains?: string[];
  };
  applicationHistory: {
    alreadyApplied: boolean;
    appliedAt?: Date;
    duplicateJob?: boolean;
    unsupportedAts?: boolean;
  };
  freshness: {
    ageHours: number;
    isStale: boolean;
  };
}

export interface DoNotApplyResult {
  shouldNotApply: boolean;
  reason?: string;
  reasonCode?: string;
  confidence: number;
}

/**
 * Default do-not-apply rules
 */
export const DEFAULT_DO_NOT_APPLY_RULES: DoNotApplyRule[] = [
  {
    id: 'already_applied',
    name: 'Already Applied',
    description: 'Skip jobs the candidate has already applied to',
    enabled: true,
    priority: 100,
    evaluate: (context) => ({
      shouldNotApply: context.applicationHistory.alreadyApplied,
      reason: 'Already applied to this job',
      reasonCode: 'ALREADY_APPLIED',
      confidence: 1.0,
    }),
  },
  {
    id: 'duplicate_job',
    name: 'Duplicate Job',
    description: 'Skip duplicate job listings',
    enabled: true,
    priority: 95,
    evaluate: (context) => ({
      shouldNotApply: context.applicationHistory.duplicateJob || false,
      reason: 'Duplicate job listing',
      reasonCode: 'DUPLICATE_JOB',
      confidence: 0.95,
    }),
  },
  {
    id: 'expired_job',
    name: 'Expired Job',
    description: 'Skip expired job listings',
    enabled: true,
    priority: 90,
    evaluate: (context) => ({
      shouldNotApply: context.job.isExpired || false,
      reason: 'Job listing has expired',
      reasonCode: 'EXPIRED_JOB',
      confidence: 1.0,
    }),
  },
  {
    id: 'removed_job',
    name: 'Removed Job',
    description: 'Skip removed job listings',
    enabled: true,
    priority: 85,
    evaluate: (context) => ({
      shouldNotApply: context.job.isRemoved || false,
      reason: 'Job listing has been removed',
      reasonCode: 'REMOVED_JOB',
      confidence: 1.0,
    }),
  },
  {
    id: 'work_authorization',
    name: 'Work Authorization Mismatch',
    description: 'Skip jobs requiring work authorization the candidate does not have',
    enabled: true,
    priority: 80,
    evaluate: (context) => {
      // This is handled by hard filters, but we keep it as a safety net
      return {
        shouldNotApply: false,
        confidence: 0.0,
      };
    },
  },
  {
    id: 'location_mismatch',
    name: 'Location Mismatch',
    description: 'Skip jobs in locations the candidate cannot work in',
    enabled: true,
    priority: 75,
    evaluate: (context) => {
      // This is handled by hard filters
      return {
        shouldNotApply: false,
        confidence: 0.0,
      };
    },
  },
  {
    id: 'salary_below_minimum',
    name: 'Salary Below Minimum',
    description: 'Skip jobs with salary below candidate minimum',
    enabled: true,
    priority: 70,
    evaluate: (context) => {
      if (
        context.job.salary?.max &&
        context.candidate.minSalary &&
        context.job.salary.max < context.candidate.minSalary
      ) {
        return {
          shouldNotApply: true,
          reason: `Job salary ($${context.job.salary.max}) below candidate minimum ($${context.candidate.minSalary})`,
          reasonCode: 'SALARY_BELOW_MINIMUM',
          confidence: 0.95,
        };
      }
      return {
        shouldNotApply: false,
        confidence: 0.0,
      };
    },
  },
  {
    id: 'incompatible_employment_type',
    name: 'Incompatible Employment Type',
    description: 'Skip jobs with incompatible employment types',
    enabled: true,
    priority: 65,
    evaluate: (context) => {
      if (
        context.candidate.preferredEmploymentTypes.length > 0 &&
        !context.candidate.preferredEmploymentTypes.includes(context.job.employmentType)
      ) {
        return {
          shouldNotApply: true,
          reason: `Employment type (${context.job.employmentType}) not in preferred types`,
          reasonCode: 'INCOMPATIBLE_EMPLOYMENT_TYPE',
          confidence: 0.8,
        };
      }
      return {
        shouldNotApply: false,
        confidence: 0.0,
      };
    },
  },
  {
    id: 'stale_listing',
    name: 'Stale Listing',
    description: 'Skip jobs that are too old',
    enabled: true,
    priority: 60,
    evaluate: (context) => {
      if (context.freshness.isStale) {
        return {
          shouldNotApply: true,
          reason: `Job is ${context.freshness.ageHours} hours old (stale)`,
          reasonCode: 'STALE_LISTING',
          confidence: 0.7,
        };
      }
      return {
        shouldNotApply: false,
        confidence: 0.0,
      };
    },
  },
  {
    id: 'unsupported_ats',
    name: 'Unsupported ATS',
    description: 'Skip jobs on unsupported ATS platforms',
    enabled: true,
    priority: 55,
    evaluate: (context) => {
      if (context.applicationHistory.unsupportedAts) {
        return {
          shouldNotApply: true,
          reason: 'Unsupported ATS platform',
          reasonCode: 'UNSUPPORTED_ATS',
          confidence: 0.9,
        };
      }
      return {
        shouldNotApply: false,
        confidence: 0.0,
      };
    },
  },
  {
    id: 'blocked_company',
    name: 'Blocked Company',
    description: 'Skip jobs from blocked companies',
    enabled: true,
    priority: 100,
    evaluate: (context) => {
      if (
        context.candidate.blockedCompanies &&
        context.candidate.blockedCompanies.length > 0
      ) {
        const isBlocked = context.candidate.blockedCompanies.some((company) =>
          context.job.company.toLowerCase().includes(company.toLowerCase())
        );
        if (isBlocked) {
          return {
            shouldNotApply: true,
            reason: `Company (${context.job.company}) is in blocklist`,
            reasonCode: 'BLOCKED_COMPANY',
            confidence: 1.0,
          };
        }
      }
      return {
        shouldNotApply: false,
        confidence: 0.0,
      };
    },
  },
  {
    id: 'blocked_domain',
    name: 'Blocked Domain',
    description: 'Skip jobs from blocked domains',
    enabled: true,
    priority: 100,
    evaluate: (context) => {
      if (
        context.candidate.blockedDomains &&
        context.candidate.blockedDomains.length > 0 &&
        context.job.domain
      ) {
        if (context.candidate.blockedDomains.includes(context.job.domain)) {
          return {
            shouldNotApply: true,
            reason: `Company domain (${context.job.domain}) is in blocklist`,
            reasonCode: 'BLOCKED_DOMAIN',
            confidence: 1.0,
          };
        }
      }
      return {
        shouldNotApply: false,
        confidence: 0.0,
      };
    },
  },
];

/**
 * Evaluate all do-not-apply rules against a job
 */
export function evaluateDoNotApplyRules(
  context: DoNotApplyContext,
  rules: DoNotApplyRule[] = DEFAULT_DO_NOT_APPLY_RULES
): DoNotApplyResult {
  // Sort rules by priority (highest first)
  const sortedRules = [...rules]
    .filter((rule) => rule.enabled)
    .sort((a, b) => b.priority - a.priority);

  // Evaluate each rule
  for (const rule of sortedRules) {
    const result = rule.evaluate(context);
    if (result.shouldNotApply) {
      return result;
    }
  }

  // No rules triggered - job is eligible
  return {
    shouldNotApply: false,
    confidence: 0.0,
  };
}

/**
 * Get all applicable skip reasons for a job
 */
export function getAllSkipReasons(
  context: DoNotApplyContext,
  rules: DoNotApplyRule[] = DEFAULT_DO_NOT_APPLY_RULES
): Array<{ rule: string; reason: string; reasonCode: string; confidence: number }> {
  const skipReasons: Array<{
    rule: string;
    reason: string;
    reasonCode: string;
    confidence: number;
  }> = [];

  const sortedRules = [...rules]
    .filter((rule) => rule.enabled)
    .sort((a, b) => b.priority - a.priority);

  for (const rule of sortedRules) {
    const result = rule.evaluate(context);
    if (result.shouldNotApply && result.reason && result.reasonCode) {
      skipReasons.push({
        rule: rule.name,
        reason: result.reason,
        reasonCode: result.reasonCode,
        confidence: result.confidence,
      });
    }
  }

  return skipReasons;
}
