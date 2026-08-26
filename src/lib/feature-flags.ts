/**
 * Feature Flags for JobSearchProfile Migration
 * 
 * These flags control the rollout of the new JobSearchProfile architecture.
 * Supports percentage-based rollout via deterministic user hashing.
 */

import { createHash } from 'crypto';

export const FEATURE_FLAGS = {
  /**
   * Enable reading from canonical JobSearchProfile instead of legacy stores.
   * When false, falls back to legacy autoApplyPreferences and job_preferences.
   * Supports percentage rollout via FEATURE_USE_JOB_SEARCH_PROFILE_ROLLOUT.
   */
  USE_JOB_SEARCH_PROFILE: 'use_job_search_profile',

  /**
   * Disable legacy write sync to job_preferences and UserQuota.autoApplySettings.
   * When false, legacy stores are kept in sync (dual-write).
   * Set to true after full rollout to stop writing to legacy stores.
   */
  DISABLE_LEGACY_JOB_SEARCH_WRITES: 'disable_legacy_job_search_writes',

  /**
   * Enable user-isolated discovery cache.
   * When false, uses the old global cache key (INSECURE - cross-user leakage).
   */
  USE_USER_ISOLATED_DISCOVERY_CACHE: 'use_user_isolated_discovery_cache',

  /**
   * Enable migration validation logging.
   * When true, logs detailed comparison between legacy and new profiles.
   */
  ENABLE_JOB_SEARCH_MIGRATION_VALIDATION: 'enable_job_search_migration_validation',
};

/**
 * Deterministic hash of a userId to a value between 0-99.
 * Used for percentage-based rollout — same user always gets the same result.
 */
function getUserRolloutBucket(userId: string): number {
  const hash = createHash('sha256').update(userId).digest('hex');
  // Use first 8 hex chars → uint32 → mod 100
  return parseInt(hash.slice(0, 8), 16) % 100;
}

/**
 * Check if a feature flag is enabled globally (boolean check).
 * Uses environment variables for configuration.
 */
export function isFeatureFlagEnabled(flag: string): boolean {
  const envValue = process.env[`FEATURE_${flag.toUpperCase()}`];
  if (envValue !== undefined) {
    return envValue === 'true' || envValue === '1';
  }
  
  const defaults: Record<string, boolean> = {
    [FEATURE_FLAGS.USE_JOB_SEARCH_PROFILE]: false,
    [FEATURE_FLAGS.DISABLE_LEGACY_JOB_SEARCH_WRITES]: false,
    [FEATURE_FLAGS.USE_USER_ISOLATED_DISCOVERY_CACHE]: true,
    [FEATURE_FLAGS.ENABLE_JOB_SEARCH_MIGRATION_VALIDATION]: false,
  };
  
  return defaults[flag] ?? false;
}

/**
 * Check if a feature flag is enabled for a specific user.
 * Supports percentage-based rollout via FEATURE_<FLAG>_ROLLOUT env var (0-100).
 * If no rollout env var is set, falls back to the boolean flag check.
 */
export function isFeatureFlagEnabledForUser(flag: string, userId: string): boolean {
  // Check percentage rollout first
  const rolloutValue = process.env[`FEATURE_${flag.toUpperCase()}_ROLLOUT`];
  if (rolloutValue !== undefined) {
    const rolloutPercent = parseInt(rolloutValue, 10);
    if (isNaN(rolloutPercent) || rolloutPercent < 0) return false;
    if (rolloutPercent >= 100) return true;
    const bucket = getUserRolloutBucket(userId);
    return bucket < rolloutPercent;
  }
  
  // Fall back to boolean flag
  return isFeatureFlagEnabled(flag);
}

/**
 * Get all feature flag states.
 */
export function getAllFeatureFlags(): Record<string, boolean> {
  return Object.values(FEATURE_FLAGS).reduce((acc, flag) => {
    acc[flag] = isFeatureFlagEnabled(flag);
    return acc;
  }, {} as Record<string, boolean>);
}
