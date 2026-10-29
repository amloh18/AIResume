/**
 * Discover Feed
 *
 * Builds the paged job feed behind `/api/jobs/discover`.
 *
 * Two modes, one query builder:
 *
 *   • Curated ("Recommended") — the user's target roles are part of the Mongo
 *     query, so every page is made of jobs that actually match the profile.
 *   • Catalogue ("All") — no role predicate; the user is browsing everything
 *     that meets their hard constraints.
 *
 * What went wrong before
 * ----------------------
 * Both modes fetched a fixed pool of recent jobs and then filtered it in
 * memory. Two consequences:
 *
 *   1. `total` came from `countDocuments()` over a *different* (broader)
 *      filter than the rows actually returned — 6,917-style numbers that had
 *      nothing to do with what the user could page through.
 *   2. Hard constraints (remote-only) and match-score filters were applied
 *      after `.limit(20)`, so a page could arrive with 3 rows in it.
 *
 * The fix is to push every predicate that Mongo can evaluate into the query
 * and paginate the database, so `skip`/`limit` and `countDocuments` describe
 * the same set. Scoring stays in memory, because match score depends on the
 * user's skills and cannot be expressed as a query.
 *
 * Ordering
 * --------
 * Pages are selected in freshness order (`postedAt` desc) — the product's
 * "fresh matches" signal — and re-sorted by match score *within* the page when
 * the caller asked for match-score order. Ranking the whole corpus by score
 * would mean scoring every matching job on every request; the page-local sort
 * keeps the feed fast and is honest about what the number means.
 */

import type { Db } from 'mongodb';
import { ObjectId } from 'mongodb';
import { buildLocationAndCountryFilter, mapToCandidate } from '@/lib/search/candidateRetrieval';
import { scoreJobForCandidate } from '@/matching/deterministicScoring';
import { AUTO_APPLY_SUPPORTED_ATS, resolveApplyUrl } from '@/lib/jobs/autoApplySupport';
import {
  buildRoleRelevanceClause,
  buildRoleRelevanceFallbackClause,
} from '@/lib/jobs/roleRelevance';
import type { NormalizedUserProfile } from '@/lib/search/userProfileCache';

// ── Types ───────────────────────────────────────────────────────────────────

export interface DiscoverFeedOptions {
  db: Db;
  userId?: string;
  profile: NormalizedUserProfile | null;
  /** Jobs the user passed on, plus saved jobs when not viewing the saved feed. */
  excludeJobIds: Set<string>;
  page: number;
  limit: number;
  /** Catalogue mode: the user asked for "All". */
  unpersonalized: boolean;
  searchQuery: string;
  keywords: string[];
  /** Resolved from explicit feed filters first, then the standing profile. */
  remoteOnly: boolean;
  countries: string[];
  companies: string[];
  locations: string[];
  sources: string[];
  atsTypes: string[];
  workplaceTypes: string[];
  roles: string[];
  jobTypes: string[];
  experienceLevels: string[];
  datePosted?: string | null;
  sponsorsVisa: boolean;
  easyApplyOnly: boolean;
  matchScoreMin: number;
  matchScoreMax: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface DiscoverFeedResult {
  jobs: any[];
  total: number;
  hasMore: boolean;
  /** True when the role predicate was applied (i.e. the feed is personalised). */
  curated: boolean;
  profileUsed: boolean;
  /** Curated feed requested, but the profile has no target roles to curate on. */
  needsProfile: boolean;
  suggestedSearches?: string[];
}

// ── Count cache ─────────────────────────────────────────────────────────────
//
// `countDocuments` is the single most expensive part of the request (0.5–1.8s
// on the production corpus, because a title regex has to be evaluated per
// document). The answer only changes when jobs are ingested, so a short TTL is
// enough to make paging and filter re-selection feel instant without ever
// serving a stale number for long.

const COUNT_TTL_MS = 3 * 60 * 1000;
const MAX_COUNT_ENTRIES = 500;
const countCache = new Map<string, { value: number; expiresAt: number }>();

function hashKey(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  }
  return `${hash >>> 0}`;
}

export function clearDiscoverCountCache(): void {
  countCache.clear();
  pageCache.clear();
}

async function cachedCount(db: Db, filter: Record<string, any>): Promise<number> {
  const key = hashKey(JSON.stringify(filter));
  const hit = countCache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  const value = await db.collection('jobs').countDocuments(filter);

  if (countCache.size >= MAX_COUNT_ENTRIES) {
    const oldest = countCache.keys().next().value;
    if (oldest) countCache.delete(oldest);
  }
  countCache.set(key, { value, expiresAt: Date.now() + COUNT_TTL_MS });
  return value;
}

// ── Page cache ──────────────────────────────────────────────────────────────
//
// A title regex on a rare role ("data analyst": 106 active matches in 52k) has
// to scan most of the collection to fill a page, which measured ~1s. Caching
// the *documents* (not the scored listings — the watchlist boost mutates
// scores) makes revisiting a page and the client's background prefetch free.
// Scoring stays per-request and is negligible at 20 rows.

const PAGE_TTL_MS = 60 * 1000;
const MAX_PAGE_ENTRIES = 200;
const pageCache = new Map<string, { docs: any[]; total: number; expiresAt: number }>();

async function cachedPage(
  opts: DiscoverFeedOptions,
  filter: Record<string, any>,
  skip: number,
  limit: number
): Promise<{ docs: any[]; total: number }> {
  const key = hashKey(
    JSON.stringify({ filter, skip, limit, sortBy: opts.sortBy, sortOrder: opts.sortOrder })
  );
  const hit = pageCache.get(key);
  if (hit && hit.expiresAt > Date.now()) return { docs: hit.docs, total: hit.total };

  const [docs, total] = await Promise.all([
    opts.db
      .collection('jobs')
      .find(filter)
      .sort(buildSort(opts.sortBy, opts.sortOrder))
      .skip(skip)
      .limit(limit)
      .toArray(),
    cachedCount(opts.db, filter),
  ]);

  if (pageCache.size >= MAX_PAGE_ENTRIES) {
    const oldest = pageCache.keys().next().value;
    if (oldest) pageCache.delete(oldest);
  }
  pageCache.set(key, { docs, total, expiresAt: Date.now() + PAGE_TTL_MS });

  return { docs, total };
}

// ── Clause builders ─────────────────────────────────────────────────────────

/**
 * `status: { $in: [...] }` rather than `$or: [{status: {$in}}, {status: {$exists:false}}]`.
 *
 * The `$exists: false` branch stops MongoDB from using
 * `jobs_status_postedAt` to serve the sort, which turned a 28ms page into a
 * 3.8s one. Thirteen legacy documents have no `status`; they are a stale
 * pre-normalisation shape that the feed already treats as inactive.
 */
function statusClause(): Record<string, any> {
  return { status: { $in: ['active', 'new'] } };
}

/**
 * Hard constraints (AGENTS §14) as a query predicate.
 *
 * Only remote-only is enforceable here — min salary and location preferences
 * are soft in the scorer and would silently empty the feed if promoted.
 *
 * `location.remote` is the normalised boolean (226k docs). `remote` and
 * `country: 'Global'` are kept because a slice of the corpus was ingested
 * before the nested location object existed.
 */
function hardConstraintClauses(profile: NormalizedUserProfile | null): Record<string, any>[] {
  if (!profile?.hardConstraints?.remoteOnly) return [];
  return [
    {
      $or: [
        { 'location.remote': true },
        { remote: true },
        { country: 'Global' },
      ],
    },
  ];
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** User-typed search: title/company/skills/description, case-insensitive. */
function searchClause(query: string): Record<string, any> | null {
  const trimmed = query.trim();
  if (!trimmed) return null;
  const pattern = new RegExp(escapeRegex(trimmed), 'i');
  return {
    $or: [
      { title: { $regex: pattern } },
      { normalizedTitle: { $regex: pattern } },
      { 'company.name': { $regex: pattern } },
      { keywords: { $in: [pattern] } },
      { skills: { $in: [pattern] } },
      { descriptionText: { $regex: pattern } },
    ],
  };
}

function inClause(values: string[], pattern: (v: string) => string): RegExp | null {
  if (values.length === 0) return null;
  return new RegExp(values.map((v) => escapeRegex(pattern(v))).join('|'), 'i');
}

/**
 * Everything the caller can express through the filter UI.
 *
 * These are deliberately DB predicates: a filter that only runs in memory
 * cannot be reconciled with `total`, which is exactly how the feed ended up
 * reporting a number that matched neither the filters nor the rows.
 */
function buildFilterClauses(
  opts: DiscoverFeedOptions,
  roleClause: Record<string, any> | null
): Record<string, any>[] {
  const clauses: Record<string, any>[] = [statusClause()];

  // Location / country.
  const locationClauses = buildLocationAndCountryFilter({
    limit: opts.limit,
    countryFilter: opts.countries.length > 0 ? opts.countries : undefined,
    remoteOnly: false,
  });
  clauses.push(...locationClauses);

  if (opts.remoteOnly) {
    clauses.push({
      $or: [
        { 'location.remote': true },
        { remote: true },
        { country: 'Global' },
      ],
    });
  }

  clauses.push(...hardConstraintClauses(opts.profile));

  if (opts.excludeJobIds.size > 0) {
    const ids = Array.from(opts.excludeJobIds)
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));
    if (ids.length > 0) clauses.push({ _id: { $nin: ids } });
  }

  if (roleClause) clauses.push(roleClause);

  const search = searchClause(opts.searchQuery);
  if (search) clauses.push(search);

  const companyRegex = inClause(opts.companies, (c) => c);
  if (companyRegex) {
    clauses.push({
      $or: [{ 'company.name': { $regex: companyRegex } }, { company: { $regex: companyRegex } }],
    });
  }

  const locationRegex = inClause(opts.locations, (l) => l);
  if (locationRegex) {
    clauses.push({
      $or: [
        { 'location.city': { $regex: locationRegex } },
        { 'location.country': { $regex: locationRegex } },
        { 'location.region': { $regex: locationRegex } },
      ],
    });
  }

  if (opts.sources.length > 0) {
    clauses.push({
      $or: [
        { 'source.primary': { $in: opts.sources } },
        { source: { $in: opts.sources } },
      ],
    });
  }

  if (opts.atsTypes.length > 0) {
    clauses.push({
      $or: [
        { atsType: { $in: opts.atsTypes } },
        { 'source.primary': { $in: opts.atsTypes } },
      ],
    });
  }

  if (opts.workplaceTypes.length > 0) {
    const wpClauses: Record<string, any>[] = [];
    if (opts.workplaceTypes.includes('remote')) {
      wpClauses.push(
        { 'location.remote': true },
        { remote: true },
        { country: 'Global' }
      );
    }
    if (opts.workplaceTypes.includes('onsite')) {
      wpClauses.push({
        'location.remote': false,
        remote: { $ne: true },
        country: { $ne: 'Global' },
      });
    }
    if (opts.workplaceTypes.includes('hybrid')) {
      wpClauses.push(
        { 'location.remoteType': 'hybrid' },
        { workplaceType: 'hybrid' },
        { 'location.city': { $regex: 'hybrid', $options: 'i' } }
      );
    }
    if (wpClauses.length > 0) clauses.push({ $or: wpClauses });
  }

  // Explicit role chip — an additional narrowing on top of the profile
  // predicate, never a replacement for it.
  const roleRegex = inClause(opts.roles, (r) => r);
  if (roleRegex) {
    clauses.push({ $or: [{ normalizedTitle: { $regex: roleRegex } }, { title: { $regex: roleRegex } }] });
  }

  const jobTypeRegex = inClause(opts.jobTypes, (j) => j);
  if (jobTypeRegex) {
    clauses.push({
      $or: [
        { employmentType: { $regex: jobTypeRegex } },
        { jobType: { $regex: jobTypeRegex } },
      ],
    });
  }

  const experienceRegex = inClause(opts.experienceLevels, (e) => e);
  if (experienceRegex) {
    clauses.push({
      $or: [
        { 'experience.level': { $regex: experienceRegex } },
        { seniority: { $regex: experienceRegex } },
        { experienceLevel: { $regex: experienceRegex } },
      ],
    });
  }

  if (opts.datePosted && opts.datePosted !== 'all') {
    const maxAgeMs =
      opts.datePosted === '24h' ? 24 * 60 * 60 * 1000 :
      opts.datePosted === '7d' ? 7 * 24 * 60 * 60 * 1000 :
      30 * 24 * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - maxAgeMs);
    clauses.push({
      $or: [
        { postedAt: { $gte: cutoff } },
        { postedDate: { $gte: cutoff } },
      ],
    });
  }

  if (opts.sponsorsVisa) {
    clauses.push({
      $or: [
        { 'visaSponsorship.mentioned': true },
        { visaSponsorship: true },
        { sponsorsVisa: true },
      ],
    });
  }

  if (opts.easyApplyOnly) {
    clauses.push({
      $or: [
        { atsType: { $in: AUTO_APPLY_SUPPORTED_ATS } },
        { 'source.primary': { $in: AUTO_APPLY_SUPPORTED_ATS } },
      ],
    });
  }

  return clauses;
}

function combine(clauses: Record<string, any>[]): Record<string, any> {
  return clauses.length === 1 ? clauses[0] : { $and: clauses };
}

function buildSort(sortBy: string, sortOrder: 'asc' | 'desc'): Record<string, 1 | -1> {
  const dir: 1 | -1 = sortOrder === 'asc' ? 1 : -1;
  if (sortBy === 'postedDate') return { postedAt: dir, postedDate: dir };
  if (sortBy === 'salary') return { 'salary.max': dir, 'salary.min': dir };
  if (sortBy === 'company') return { 'company.normalizedName': dir };
  // Default page selector: freshest first. Match-score ordering is applied
  // within the page after scoring (see module header).
  return { postedAt: -1, postedDate: -1 };
}

function scoreTier(score: number): string {
  if (score >= 80) return 'STRONG';
  if (score >= 60) return 'GOOD';
  if (score >= 40) return 'MODERATE';
  return 'WEAK';
}

function dedupeKey(job: any): string {
  const company = (job.company || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  const title = (job.title || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  const location = (job.location || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  return `${company}___${title}___${location}`;
}

// ── Main ────────────────────────────────────────────────────────────────────

export async function buildDiscoverFeedPage(opts: DiscoverFeedOptions): Promise<DiscoverFeedResult> {
  const hasSearchQuery = opts.searchQuery.trim().length > 0 || opts.keywords.length > 0;
  const effectiveQuery = opts.searchQuery.trim() || opts.keywords.join(' ');

  const targetRoles = opts.profile?.targetRoles ?? [];
  const roleFamilies = opts.profile?.roleFamilies ?? [];

  // Curated mode needs something to curate with. A search query is the user
  // saying "ignore my roles, I know what I want", so it wins.
  const wantsCurated = !opts.unpersonalized && !hasSearchQuery;
  const roleClause = wantsCurated ? buildRoleRelevanceClause(targetRoles, roleFamilies) : null;
  const curated = wantsCurated && roleClause !== null;

  const page = Math.max(opts.page, 1);
  const limit = opts.limit;
  const skip = (page - 1) * limit;

  const queryOpts: DiscoverFeedOptions = { ...opts, searchQuery: effectiveQuery };

  const baseClauses = buildFilterClauses(queryOpts, roleClause);
  let filter = combine(baseClauses);
  let { docs: rawJobs, total } = await cachedPage(opts, filter, skip, limit);

  // Safety valve: an empty curated feed usually means the corpus is not
  // normalised the way the indexed pattern assumes. Retry once with a
  // case-insensitive predicate before falling back to "nothing matched".
  if (curated && total === 0) {
    const fallback = buildRoleRelevanceFallbackClause(targetRoles, roleFamilies);
    if (fallback) {
      filter = combine(buildFilterClauses(queryOpts, fallback));
      const retry = await cachedPage(opts, filter, skip, limit);
      rawJobs = retry.docs;
      total = retry.total;
    }
  }

  // ── Score ────────────────────────────────────────────────────────────────
  const scored = rawJobs.map((doc) => {
    const candidate = mapToCandidate(doc, 'EXACT');

    let matchScore = opts.profile ? 45 : 50;
    let matchReasons: string[] | undefined;

    if (opts.profile) {
      try {
        const result = scoreJobForCandidate(
          {
            title: candidate.title,
            normalizedTitle: candidate.normalizedTitle,
            skills: candidate.keywords,
            location: { city: candidate.location, country: candidate.country, remote: candidate.remote },
            salary: { min: candidate.salaryMin, max: candidate.salaryMax, currency: candidate.salaryCurrency },
            experience: { level: candidate.seniority },
            roleFamily: candidate.roleFamily,
            seniority: candidate.seniority,
            description: candidate.description,
            postedAt: candidate.postedDate,
            applyUrl: resolveApplyUrl(candidate),
          },
          opts.profile
        );
        matchScore = Math.min(98, Math.max(5, result.score));
        matchReasons = result.reasons.length > 0 ? result.reasons : undefined;
      } catch {
        matchScore = 45;
      }
    }

    return {
      _id: candidate._id,
      title: candidate.title,
      company: candidate.company,
      companyLogo: candidate.companyLogo,
      location: candidate.location,
      remote: candidate.remote,
      salaryMin: candidate.salaryMin,
      salaryMax: candidate.salaryMax,
      salaryCurrency: candidate.salaryCurrency,
      matchScore,
      matchReasons,
      source: candidate.source as any,
      atsType: candidate.atsType as any,
      applyUrl: resolveApplyUrl(candidate),
      postedDate: candidate.postedDate,
      userId: opts.userId || '',
      country: candidate.country,
      description: candidate.description,
      keywords: candidate.keywords,
      matchTier: scoreTier(matchScore),
    };
  });

  // ── Within-page refinement ───────────────────────────────────────────────
  // These cannot run in Mongo (match score is profile-dependent) and cannot
  // refill the page without breaking skip/limit, so the page may come back
  // slightly short. `total` and `hasMore` still describe the full result set.
  let pageJobs = scored;

  if (opts.matchScoreMin > 0 || opts.matchScoreMax < 100) {
    pageJobs = pageJobs.filter(
      (job) => job.matchScore >= opts.matchScoreMin && job.matchScore <= opts.matchScoreMax
    );
  }

  const seen = new Set<string>();
  pageJobs = pageJobs.filter((job) => {
    const key = dedupeKey(job);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (opts.sortBy === 'matchScore') {
    const dir = opts.sortOrder === 'asc' ? 1 : -1;
    pageJobs = [...pageJobs].sort((a, b) => (a.matchScore - b.matchScore) * dir);
  }

  // ── Watchlist boost ──────────────────────────────────────────────────────
  if (opts.userId) {
    try {
      const CompanyWatchlist = (await import('@/models/CompanyWatchlist')).default;
      const entries = await CompanyWatchlist.find({ userId: opts.userId, isActive: true })
        .select({ company: 1 })
        .lean();
      const watched = new Set(entries.map((w: any) => (w.company || '').toLowerCase().trim()));
      if (watched.size > 0) {
        for (const job of pageJobs) {
          if (watched.has((job.company || '').toLowerCase().trim())) {
            job.matchScore = Math.min(98, job.matchScore + 15);
            job.matchTier = scoreTier(job.matchScore);
          }
        }
        if (opts.sortBy === 'matchScore') {
          const dir = opts.sortOrder === 'asc' ? 1 : -1;
          pageJobs = [...pageJobs].sort((a, b) => (a.matchScore - b.matchScore) * dir);
        }
      }
    } catch {
      // Watchlist boost is best-effort.
    }
  }

  const hasMore = page * limit < total;

  return {
    jobs: pageJobs,
    total,
    hasMore,
    curated,
    profileUsed: !!opts.profile,
    needsProfile: wantsCurated && !curated,
    suggestedSearches:
      total === 0 && hasSearchQuery
        ? ['software engineer', 'product manager', 'data analyst', 'designer']
        : undefined,
  };
}

/**
 * Everything the caller needs to know to debug "why is my feed empty".
 * Exported for tests; not part of the request path.
 */
export const __internal = {
  buildFilterClauses,
  combine,
  buildSort,
  statusClause,
  hardConstraintClauses,
  searchClause,
};
