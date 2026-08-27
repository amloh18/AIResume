/**
 * User Profile Cache
 *
 * Short-lived in-memory cache for normalized user profiles.
 * Avoids re-computing the profile from JobSearchProfile + CV on every request.
 *
 * Design:
 * - Per-user cache with 5-minute TTL
 * - Invalidated when user saves new preferences
 * - Lost on serverless cold start (acceptable for cache)
 */

// ── Types ───────────────────────────────────────────────────────────────────

export interface NormalizedUserProfile {
  userId: string;
  targetRoles: string[];
  roleFamilies: string[];
  skills: string[];
  seniority: string;
  experienceYears: number;
  locations: string[];
  remoteOnly: boolean;
  workplacePreference: 'remote' | 'hybrid' | 'onsite' | 'any';
  minSalary: number;
  salaryCurrency: string;
  industries: string[];
  availability: string;
  // Hard constraints (used for filtering)
  hardConstraints: {
    remoteOnly: boolean;
    minSalary: number;
    locations: string[];
    visaRequired: boolean;
  };
  // Soft preferences (used for ranking)
  softPreferences: {
    preferredIndustries: string[];
    preferredCompanySizes: string[];
    preferredWorkplace: string;
  };
  computedAt: Date;
}

// ── Cache ───────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 200;

interface CacheEntry {
  profile: NormalizedUserProfile;
  expiresAt: number;
}

const profileCache = new Map<string, CacheEntry>();

/**
 * Get a cached profile or compute and cache it.
 */
export async function getOrComputeProfile(
  userId: string,
  computeFn: () => Promise<NormalizedUserProfile>
): Promise<NormalizedUserProfile> {
  const cached = profileCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.profile;
  }

  const profile = await computeFn();

  // Evict oldest entries if cache is full
  if (profileCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = profileCache.keys().next().value;
    if (oldestKey) profileCache.delete(oldestKey);
  }

  profileCache.set(userId, {
    profile,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return profile;
}

/**
 * Invalidate a user's cached profile.
 * Call this when the user saves new preferences.
 */
export function invalidateProfile(userId: string): void {
  profileCache.delete(userId);
}

/**
 * Get a cached profile without computing (returns null if not cached).
 */
export function getCachedProfile(userId: string): NormalizedUserProfile | null {
  const cached = profileCache.get(userId);
  if (!cached || cached.expiresAt <= Date.now()) {
    if (cached) profileCache.delete(userId);
    return null;
  }
  return cached.profile;
}

/**
 * Clear the entire cache (for admin operations).
 */
export function clearProfileCache(): void {
  profileCache.clear();
}

/**
 * Get cache statistics.
 */
export function getCacheStats(): { size: number; hitRate: number } {
  return {
    size: profileCache.size,
    hitRate: 0, // Would need hit/miss counters for real hit rate
  };
}
