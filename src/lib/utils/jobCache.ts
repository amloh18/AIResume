'use strict';

import type { JobListing } from '@/types/automation-schema';

interface CacheEntry {
  jobs: JobListing[];
  total: number;
  hasMore: boolean;
  timestamp: number;
}

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
const MAX_CACHE_ENTRIES = 20;

const cache = new Map<string, CacheEntry>();

function buildKey(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
}

export function getCachedJobs(params: Record<string, string>): CacheEntry | null {
  const key = buildKey(params);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry;
}

export function setCachedJobs(
  params: Record<string, string>,
  jobs: JobListing[],
  total: number,
  hasMore: boolean
): void {
  const key = buildKey(params);
  // Evict oldest if at capacity
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { jobs, total, hasMore, timestamp: Date.now() });
}

export function invalidateJobCache(): void {
  cache.clear();
}
