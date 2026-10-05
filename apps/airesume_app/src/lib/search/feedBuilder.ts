/**
 * Feed Builder
 *
 * Constructs a tiered Discover feed from retrieved candidates.
 * Groups results into sections (Best Matches, Related Opportunities,
 * Adjacent Opportunities) with expansion notes when applicable.
 */

import { TieredCandidates, RetrievedCandidate, MatchTier, getTierSummary } from '@/lib/search/candidateRetrieval';
import { JobListing } from '@/types/automation-schema';

// ── Types ───────────────────────────────────────────────────────────────────

export interface DiscoverFeed {
  bestMatches: JobListing[];
  relatedOpportunities: JobListing[];
  adjacentOpportunities: JobListing[];
  allJobs: JobListing[];
  searchMeta: {
    exactCount: number;
    closeCount: number;
    relatedCount: number;
    adjacentCount: number;
    totalInDatabase: number;
    expansionNote?: string;
    tiersUsed: string[];
    fallbackTriggered: boolean;
  };
}

export interface FeedBuilderOptions {
  limit: number;
  page: number;
  userMatchScores?: Map<string, number>;  // jobId → matchScore
}

// ── Feed Construction ───────────────────────────────────────────────────────

/**
 * Build a tiered Discover feed from candidates.
 *
 * Expansion logic:
 * - 20+ exact: show exact only, no expansion
 * - 6-20 exact: show exact first, related below
 * - 1-5 exact: show exact, aggressively expand
 * - 0 exact: expand maximally with explanation
 */
export function buildDiscoverFeed(
  candidates: TieredCandidates,
  options: FeedBuilderOptions
): DiscoverFeed {
  const summary = getTierSummary(candidates);

  // Convert candidates to JobListing format
  const exactListings = candidates.exact.map(toJobListing);
  const closeListings = candidates.close.map(toJobListing);
  const relatedListings = candidates.related.map(toJobListing);
  const adjacentListings = candidates.adjacent.map(toJobListing);

  // Combine exact + close as "best matches"
  const bestMatchPool = [...exactListings, ...closeListings];

  // Determine expansion note
  let expansionNote: string | undefined;
  const exactTotal = summary.exact + summary.close;

  if (exactTotal === 0 && summary.related > 0) {
    expansionNote = `No exact matches found. Showing ${summary.related} related opportunities.`;
  } else if (exactTotal > 0 && exactTotal < 6 && summary.related > 0) {
    expansionNote = `Showing related roles because there are limited exact matches.`;
  } else if (exactTotal >= 6 && exactTotal < 20 && summary.related > 0) {
    expansionNote = undefined; // Subtle: just show the sections
  }

  // Apply pagination to the combined feed
  const allJobs = [...bestMatchPool, ...relatedListings, ...adjacentListings];
  const startIndex = (options.page - 1) * options.limit;
  const paginatedJobs = allJobs.slice(startIndex, startIndex + options.limit);

  // Split paginated results back into tiers
  const paginatedBest: JobListing[] = [];
  const paginatedRelated: JobListing[] = [];
  const paginatedAdjacent: JobListing[] = [];

  for (const job of paginatedJobs) {
    const tier = (job as any).matchTier as MatchTier | undefined;
    if (tier === 'ADJACENT') {
      paginatedAdjacent.push(job);
    } else if (tier === 'RELATED') {
      paginatedRelated.push(job);
    } else {
      paginatedBest.push(job);
    }
  }

  return {
    bestMatches: paginatedBest,
    relatedOpportunities: paginatedRelated,
    adjacentOpportunities: paginatedAdjacent,
    allJobs: paginatedJobs,
    searchMeta: {
      exactCount: summary.exact,
      closeCount: summary.close,
      relatedCount: summary.related,
      adjacentCount: summary.adjacent,
      totalInDatabase: candidates.searchMeta.totalInDatabase,
      expansionNote,
      tiersUsed: candidates.searchMeta.tiersUsed,
      fallbackTriggered: candidates.searchMeta.fallbackTriggered,
    },
  };
}

// ── Conversion ──────────────────────────────────────────────────────────────

/**
 * Convert a RetrievedCandidate to a JobListing for the API response.
 */
function toJobListing(candidate: RetrievedCandidate): JobListing {
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
    matchScore: 0,  // Will be overridden by personalization scoring
    source: candidate.source as any,
    atsType: candidate.atsType as any,
    applyUrl: candidate.applyUrl,
    postedDate: candidate.postedDate,
    userId: '',
    country: candidate.country,
    description: candidate.description,
    keywords: candidate.keywords,
  } as JobListing & { matchTier: MatchTier; roleFamily?: string };
}

/**
 * Create an empty feed (for zero-results states).
 */
export function createEmptyFeed(query: string): DiscoverFeed {
  return {
    bestMatches: [],
    relatedOpportunities: [],
    adjacentOpportunities: [],
    allJobs: [],
    searchMeta: {
      exactCount: 0,
      closeCount: 0,
      relatedCount: 0,
      adjacentCount: 0,
      totalInDatabase: 0,
      expansionNote: undefined,
      tiersUsed: [],
      fallbackTriggered: false,
    },
  };
}

/**
 * Get a user-friendly summary of the feed.
 */
export function getFeedSummary(feed: DiscoverFeed): string {
  const { exactCount, closeCount, relatedCount, adjacentCount } = feed.searchMeta;
  const bestCount = exactCount + closeCount;

  if (bestCount === 0 && relatedCount === 0 && adjacentCount === 0) {
    return 'No matching jobs found.';
  }

  const parts: string[] = [];
  if (bestCount > 0) parts.push(`${bestCount} strong match${bestCount !== 1 ? 'es' : ''}`);
  if (relatedCount > 0) parts.push(`${relatedCount} related opportunit${relatedCount !== 1 ? 'ies' : 'y'}`);
  if (adjacentCount > 0) parts.push(`${adjacentCount} adjacent role${adjacentCount !== 1 ? 's' : ''}`);

  return parts.join(' + ');
}
