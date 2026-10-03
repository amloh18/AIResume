/**
 * Application Modes
 *
 * Support three modes:
 * 1. AUTO - High-confidence application (90+ score)
 * 2. REVIEW - Application package generated, user must approve (80-89 score)
 * 3. MANUAL - Unsupported/complex application requiring user completion (70-79 score)
 * 4. SKIP - Below threshold (<70 score)
 *
 * Thresholds are configurable per user.
 */

export type ApplicationMode = 'auto' | 'review' | 'manual' | 'skip';

export interface ApplicationModeConfig {
  /** Minimum score for auto-apply */
  autoThreshold: number;
  /** Minimum score for review mode */
  reviewThreshold: number;
  /** Minimum score for manual mode */
  manualThreshold: number;
  /** Maximum applications per day */
  maxApplicationsPerDay: number;
  /** Maximum applications per hour */
  maxApplicationsPerHour: number;
  /** Maximum applications per company per day */
  maxApplicationsPerCompanyPerDay: number;
  /** Maximum applications per domain per hour */
  maxApplicationsPerDomainPerHour: number;
  /** Maximum concurrent applications */
  maxConcurrentApplications: number;
  /** Maximum retry attempts */
  maxRetryAttempts: number;
}

export const DEFAULT_APPLICATION_MODE_CONFIG: ApplicationModeConfig = {
  autoThreshold: 90,
  reviewThreshold: 80,
  manualThreshold: 70,
  maxApplicationsPerDay: 50,
  maxApplicationsPerHour: 10,
  maxApplicationsPerCompanyPerDay: 3,
  maxApplicationsPerDomainPerHour: 5,
  maxConcurrentApplications: 2,
  maxRetryAttempts: 3,
};

export interface ApplicationDecision {
  mode: ApplicationMode;
  score: number;
  reason: string;
  config: ApplicationModeConfig;
}

/**
 * Determine application mode based on score
 */
export function determineApplicationMode(
  score: number,
  config: ApplicationModeConfig = DEFAULT_APPLICATION_MODE_CONFIG
): ApplicationDecision {
  if (score >= config.autoThreshold) {
    return {
      mode: 'auto',
      score,
      reason: `Score ${score} meets auto-apply threshold (${config.autoThreshold}+)`,
      config,
    };
  }

  if (score >= config.reviewThreshold) {
    return {
      mode: 'review',
      score,
      reason: `Score ${score} meets review threshold (${config.reviewThreshold}+)`,
      config,
    };
  }

  if (score >= config.manualThreshold) {
    return {
      mode: 'manual',
      score,
      reason: `Score ${score} meets manual threshold (${config.manualThreshold}+)`,
      config,
    };
  }

  return {
    mode: 'skip',
    score,
    reason: `Score ${score} below minimum threshold (${config.manualThreshold})`,
    config,
  };
}

/**
 * Check if application limits are exceeded
 */
export function checkApplicationLimits(
  currentCounts: {
    todayCount: number;
    thisHourCount: number;
    companyTodayCount: number;
    domainThisHourCount: number;
    concurrentCount: number;
  },
  config: ApplicationModeConfig = DEFAULT_APPLICATION_MODE_CONFIG
): {
  allowed: boolean;
  reason?: string;
  limitType?: string;
} {
  // Check daily limit
  if (currentCounts.todayCount >= config.maxApplicationsPerDay) {
    return {
      allowed: false,
      reason: `Daily limit reached (${config.maxApplicationsPerDay})`,
      limitType: 'daily',
    };
  }

  // Check hourly limit
  if (currentCounts.thisHourCount >= config.maxApplicationsPerHour) {
    return {
      allowed: false,
      reason: `Hourly limit reached (${config.maxApplicationsPerHour})`,
      limitType: 'hourly',
    };
  }

  // Check company daily limit
  if (currentCounts.companyTodayCount >= config.maxApplicationsPerCompanyPerDay) {
    return {
      allowed: false,
      reason: `Company daily limit reached (${config.maxApplicationsPerCompanyPerDay})`,
      limitType: 'company_daily',
    };
  }

  // Check domain hourly limit
  if (currentCounts.domainThisHourCount >= config.maxApplicationsPerDomainPerHour) {
    return {
      allowed: false,
      reason: `Domain hourly limit reached (${config.maxApplicationsPerDomainPerHour})`,
      limitType: 'domain_hourly',
    };
  }

  // Check concurrent limit
  if (currentCounts.concurrentCount >= config.maxConcurrentApplications) {
    return {
      allowed: false,
      reason: `Concurrent limit reached (${config.maxConcurrentApplications})`,
      limitType: 'concurrent',
    };
  }

  return { allowed: true };
}

/**
 * Get application mode description
 */
export function getApplicationModeDescription(mode: ApplicationMode): string {
  switch (mode) {
    case 'auto':
      return 'Automatic submission - No user approval required';
    case 'review':
      return 'Requires user review - Application prepared but not submitted';
    case 'manual':
      return 'Manual application - User must complete and submit';
    case 'skip':
      return 'Skipped - Below minimum quality threshold';
    default:
      return 'Unknown mode';
  }
}
