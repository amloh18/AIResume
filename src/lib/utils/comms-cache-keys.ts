/**
 * Cache keys for communications data.
 *
 * These live in one place because two surfaces now read the same records — the Comms
 * tab's list/reading pane, and the journey sidebar's Comms tab (which shows one job's
 * thread through the same reading-pane component). They only share a cache entry if
 * they build the *identical* string, and a mismatch would present itself as "the cache
 * doesn't work" rather than "the two call sites disagree". Keeping the format here
 * makes that impossible to get wrong by accident.
 *
 * `userId` must come from `commsCacheUserId()` at every call site: the two surfaces
 * resolve the signed-in user through different hooks (`useSession` in CommsPanel,
 * `useUnifiedAuth` in the sidebar) and their own fallbacks differ.
 *
 * Lifetime is one page load — see `readSessionCache` / `writeSessionCache`.
 */

export interface CommsCacheFilter {
  jobId?: string;
  direction?: string;
  classification?: string;
  status?: string;
}

/**
 * The user segment of a comms cache key, from whichever id the caller has.
 *
 * The `'anon'` fallback keeps a signed-out render from writing to the same key as a
 * signed-in one. Both call sites pass a session id in practice, so the two agree.
 */
export function commsCacheUserId(id?: string | null): string {
  return id || 'anon';
}

/**
 * The communications list is filter-dependent, so its key is too.
 *
 * Parameter order is load-bearing: `URLSearchParams` serialises in insertion order, so
 * the same filter must be built in the same order to produce the same key.
 */
export function commsListCacheKey(userId: string, filter: CommsCacheFilter): string {
  const params = new URLSearchParams();
  if (filter.jobId) params.set('jobId', filter.jobId);
  if (filter.direction) params.set('direction', filter.direction);
  if (filter.classification) params.set('classification', filter.classification);
  if (filter.status) params.set('status', filter.status);
  return `comms:${userId}:${params.toString()}`;
}

/** The job list used to resolve a communication's company, logo and title. */
export const commsJobsCacheKey = (userId: string) => `comms-jobs:${userId}`;

/** Per-job unread counts for the list's badges. */
export const commsUnreadCacheKey = (userId: string) => `comms-unread:${userId}`;

/** The user's assigned application email address, if one has been generated. */
export const commsAccountCacheKey = (userId: string) => `comms-account:${userId}`;
