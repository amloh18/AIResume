/**
 * Freshness Score Calculation
 *
 * Calculates a 0-100 score based on job posting age.
 * Higher scores indicate fresher, more recently posted jobs.
 *
 * Formula (configurable):
 * <1 hour      = 100
 * 1-3 hours    = 95
 * 3-6 hours    = 90
 * 6-12 hours   = 82
 * 12-24 hours  = 70
 * 1-3 days     = 50
 * 3-7 days     = 25
 * >7 days      = 5
 */

export interface FreshnessConfig {
  /** Hours thresholds for score tiers */
  thresholds: number[];
  /** Corresponding scores for each threshold */
  scores: number[];
  /** Stale threshold in hours (jobs older than this are marked stale) */
  staleThresholdHours: number;
  /** Recently updated threshold in hours */
  recentlyUpdatedThresholdHours: number;
}

export const DEFAULT_FRESHNESS_CONFIG: FreshnessConfig = {
  thresholds: [1, 3, 6, 12, 24, 72, 168], // 1h, 3h, 6h, 12h, 24h, 3d, 7d
  scores: [100, 95, 90, 82, 70, 50, 25, 5],
  staleThresholdHours: 168, // 7 days
  recentlyUpdatedThresholdHours: 24, // 1 day
};

export interface FreshnessResult {
  score: number;
  ageHours: number;
  isStale: boolean;
  isRecentlyUpdated: boolean;
  isRemoved: boolean;
}

/**
 * Calculate freshness score based on posting date
 */
export function calculateFreshnessScore(
  postedAt: Date | string | null | undefined,
  config: FreshnessConfig = DEFAULT_FRESHNESS_CONFIG
): FreshnessResult {
  const now = new Date();

  // If no posted date, assume moderate freshness
  if (!postedAt) {
    return {
      score: 50,
      ageHours: 0,
      isStale: false,
      isRecentlyUpdated: true,
      isRemoved: false,
    };
  }

  const postedDate = new Date(postedAt);
  const ageMs = now.getTime() - postedDate.getTime();
  const ageHours = Math.max(0, ageMs / (1000 * 60 * 60));

  // Calculate score based on age
  let score = config.scores[config.scores.length - 1]; // Default to lowest score

  for (let i = 0; i < config.thresholds.length; i++) {
    if (ageHours <= config.thresholds[i]) {
      score = config.scores[i];
      break;
    }
  }

  // Determine status flags
  const isStale = ageHours > config.staleThresholdHours;
  const isRecentlyUpdated = ageHours <= config.recentlyUpdatedThresholdHours;
  const isRemoved = false; // This would be set by external logic

  return {
    score: Math.round(score),
    ageHours: Math.round(ageHours * 10) / 10, // Round to 1 decimal
    isStale,
    isRecentlyUpdated,
    isRemoved,
  };
}

/**
 * Calculate freshness score considering both posted date and last seen date
 * This accounts for jobs that were reposted or updated
 */
export function calculateFreshnessWithUpdate(
  postedAt: Date | string | null | undefined,
  lastSeenAt: Date | string | null | undefined,
  config: FreshnessConfig = DEFAULT_FRESHNESS_CONFIG
): FreshnessResult {
  const now = new Date();

  // If no dates, assume moderate freshness
  if (!postedAt && !lastSeenAt) {
    return {
      score: 50,
      ageHours: 0,
      isStale: false,
      isRecentlyUpdated: true,
      isRemoved: false,
    };
  }

  // Use the most recent date for freshness calculation
  const postedDate = postedAt ? new Date(postedAt) : null;
  const lastSeenDate = lastSeenAt ? new Date(lastSeenAt) : null;

  // Primary freshness based on posted date
  const primaryResult = calculateFreshnessScore(postedDate, config);

  // If we have a last seen date that's more recent, boost the score
  if (lastSeenDate) {
    const lastSeenAgeMs = now.getTime() - lastSeenDate.getTime();
    const lastSeenAgeHours = lastSeenAgeMs / (1000 * 60 * 60);

    // If last seen very recently, the job is still active
    if (lastSeenAgeHours <= 1) {
      // Job was seen in the last hour - very active
      primaryResult.score = Math.max(primaryResult.score, 90);
      primaryResult.isRecentlyUpdated = true;
    } else if (lastSeenAgeHours <= config.recentlyUpdatedThresholdHours) {
      // Job was seen recently - still active
      primaryResult.isRecentlyUpdated = true;
    }
  }

  return primaryResult;
}

/**
 * Detect if a job has been removed or closed
 * This is typically determined by external factors (HTTP 404, etc.)
 */
export function detectRemovedJob(
  lastSeenAt: Date | string | null | undefined,
  removedThresholdHours: number = 48
): boolean {
  if (!lastSeenAt) return false;

  const now = new Date();
  const lastSeenDate = new Date(lastSeenAt);
  const ageMs = now.getTime() - lastSeenDate.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);

  return ageHours > removedThresholdHours;
}
