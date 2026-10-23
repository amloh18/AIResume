/**
 * pricingCache — the in-memory cache backing GET /api/pricing-plans.
 *
 * Extracted into a shared module so the admin plans API can invalidate it the
 * moment a plan is edited. Previously the cache lived inside the route module,
 * so admin edits were invisible until the 5-minute TTL expired (and only on
 * that instance).
 *
 * Single-instance cache: this app runs on one VPS (one Node process per
 * container), so process-local invalidation is sufficient. If the app is ever
 * multi-instance, move this to Mongo/Redis.
 */

const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = { data: unknown; timestamp: number };

const cache = new Map<string, CacheEntry>();

export function getCachedPricing<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp >= CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCachedPricing(key: string, data: unknown): void {
  cache.set(key, { data, timestamp: Date.now() });
}

/**
 * Drop every cached pricing response. Called by the admin plans API after any
 * plan create/update/delete so the landing page and paywall reflect the edit
 * immediately.
 */
export function invalidatePricingCache(): void {
  cache.clear();
}
