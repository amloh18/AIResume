/**
 * Feature Flags for JobSearchProfile Migration
 * 
 * These flags control the rollout of the new JobSearchProfile architecture.
 * Use existing project feature-flag conventions if available.
 */

export const FEATURE_FLAGS = {
  /**
   * Enable reading from canonical JobSearchProfile instead of legacy stores.
   * When false, falls back to legacy autoApplyPreferences and job_preferences.
   */
  USE_JOB_SEARCH_PROFILE: 'use_job_search_profile',

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
 * Check if a feature flag is enabled.
 * Uses environment variables for configuration.
 */
export function isFeatureFlagEnabled(flag: string): boolean {
  // Check environment variable first
  const envValue = process.env[`FEATURE_${flag.toUpperCase()}`];
  if (envValue !== undefined) {
    return envValue === 'true' || envValue === '1';
  }
  
  // Default values for migration flags
  const defaults: Record<string, boolean> = {
    [FEATURE_FLAGS.USE_JOB_SEARCH_PROFILE]: false, // Start disabled
    [FEATURE_FLAGS.USE_USER_ISOLATED_DISCOVERY_CACHE]: true, // Enable immediately (critical fix)
    [FEATURE_FLAGS.ENABLE_JOB_SEARCH_MIGRATION_VALIDATION]: false, // Start disabled
  };
  
  return defaults[flag] ?? false;
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
