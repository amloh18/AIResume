/**
 * Discover API
 *
 * The primary endpoint for the personalized job discovery feed.
 *
 * Uses the multi-stage candidate retrieval pipeline:
 *   1. Query normalization (abbreviation expansion, role family resolution)
 *   2. Tiered candidate retrieval (exact → role family → related → adjacent)
 *   3. Personalized scoring (role alignment, skills, experience, location, etc.)
 *   4. Tier-aware feed construction
 *   5. Demand recording (fire-and-forget)
 *
 * Replaces the old "fetch 500 jobs → filter in-memory" approach.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import type { JobListing, PaginatedJobsResponse } from '@/types/automation-schema';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { GlobalJobService } from '@/lib/services/globalJobService';
import { retrieveCandidates, flattenTieredCandidates, getTierSummary } from '@/lib/search/candidateRetrieval';
import { buildDiscoverFeed } from '@/lib/search/feedBuilder';
import { scoreJobForCandidate } from '@/matching/deterministicScoring';
import { extractCandidateProfile } from '@/matching/candidateProfileExtractor';
import { getOrComputeProfile } from '@/lib/search/userProfileCache';
import type { NormalizedUserProfile } from '@/lib/search/userProfileCache';

// ── Types ───────────────────────────────────────────────────────────────────

interface DiscoverResponse extends PaginatedJobsResponse {
  tiers?: {
    exact: number;
    close: number;
    related: number;
    adjacent: number;
  };
  expansionNote?: string;
  profileUsed?: boolean;
  suggestedSearches?: string[];
}

// ── Handler ─────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100);

    // Search query (new) or keywords (legacy)
    const searchQuery = searchParams.get('q') || '';
    const keywords = searchParams
      .get('keywords')
      ?.split(',')
      .map((k) => k.trim())
      .filter(Boolean) || [];

    const remoteOnly = searchParams.get('remoteOnly') === 'true';
    const countriesParam = searchParams.get('countries');
    const countryList = countriesParam ? countriesParam.split(',').map((c) => c.trim()).filter(Boolean) : [];

    // Post-retrieval filters
    const companyFilter = searchParams.get('companies')?.split(',').filter(Boolean) || [];
    const locationFilter = searchParams.get('locations')?.split(',').filter(Boolean) || [];
    const sourceFilter = searchParams.get('sources')?.split(',').filter(Boolean) || [];
    const atsFilter = searchParams.get('atsTypes')?.split(',').filter(Boolean) || [];
    const workplaceFilter = searchParams.get('workplaceType')?.split(',').filter(Boolean) || [];
    const roleFilter = searchParams.get('roles')?.split(',').filter(Boolean) || [];
    const jobTypeFilter = searchParams.get('jobTypes')?.split(',').filter(Boolean) || [];
    const experienceFilter = searchParams.get('experienceLevel')?.split(',').filter(Boolean) || [];
    const datePostedFilter = searchParams.get('datePosted');
    const sponsorsVisaFilter = searchParams.get('sponsorsVisa') === 'true';
    const matchScoreMax = parseInt(searchParams.get('matchScoreMax') || '100');
    const matchScoreMin = parseInt(searchParams.get('matchScoreMin') || '0');
    const sortBy = (searchParams.get('sortBy') || 'matchScore') as string;
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
    const savedOnlyFilter = searchParams.get('savedOnly') === 'true';

    // Auth
    const auth = await authenticateRequest(request);
    const userId = auth?.userId;

    const { getDb } = await import('@/lib/db');
    const db = await getDb();

    // ── Determine search strategy ─────────────────────────────────────────
    // If a search query is provided, use the multi-stage retrieval
    // If no query, fall back to a broad feed (user's role family or recent jobs)
    const hasSearchQuery = searchQuery.length > 0 || keywords.length > 0;
    const effectiveQuery = searchQuery || keywords.join(' ');

    // ── Get user profile for personalization (cached) ────────────────────
    let userProfile: NormalizedUserProfile | null = null;
    let candidateProfile: any = null;

    if (userId) {
      try {
        userProfile = await getOrComputeProfile(userId, async () => {
          candidateProfile = await extractCandidateProfile(db, userId);
          if (candidateProfile) {
            return {
              userId,
              targetRoles: candidateProfile.targetRoles,
              roleFamilies: candidateProfile.roleFamilies,
              skills: candidateProfile.skills,
              seniority: candidateProfile.experienceLevel,
              experienceYears: candidateProfile.experienceYears,
              locations: candidateProfile.targetLocations,
              remoteOnly: candidateProfile.hardConstraints.remoteOnly,
              workplacePreference: candidateProfile.workplacePreference,
              minSalary: candidateProfile.minSalary,
              salaryCurrency: candidateProfile.salaryCurrency,
              industries: candidateProfile.preferredIndustries,
              availability: '',
              hardConstraints: candidateProfile.hardConstraints,
              softPreferences: candidateProfile.softPreferences,
              computedAt: new Date(),
            };
          }
          // Fallback: return a minimal profile if extraction fails
          return {
            userId,
            targetRoles: [],
            roleFamilies: [],
            skills: [],
            seniority: '',
            experienceYears: 0,
            locations: [],
            remoteOnly: false,
            workplacePreference: 'any' as const,
            minSalary: 0,
            salaryCurrency: 'USD',
            industries: [],
            availability: '',
            hardConstraints: {
              remoteOnly: false,
              minSalary: 0,
              locations: [],
              visaRequired: false,
            },
            softPreferences: {
              preferredIndustries: [],
              preferredCompanySizes: [],
              preferredWorkplace: 'any',
            },
            computedAt: new Date(),
          };
        });
        if (!candidateProfile) {
          candidateProfile = userProfile; // Use cached profile as candidateProfile
        }
      } catch (err) {
        console.warn('[Discover] Failed to load user profile:', err);
      }
    }

    // ── Get exclude set (passed/dismissed jobs) ───────────────────────────
    const excludeJobIds = new Set<string>();
    const savedIds = new Set<string>();
    if (userId) {
      try {
        const passedDocs = await db
          .collection('passed_jobs')
          .find({ userId: new ObjectId(userId) })
          .toArray();
        for (const d of passedDocs) {
          if (d.externalId) excludeJobIds.add(d.externalId);
          if (d.jobId) excludeJobIds.add(d.jobId.toString());
        }
      } catch {
        // Ignore
      }
      try {
        const savedDocs = await db
          .collection('saved_jobs')
          .find({ userId: new ObjectId(userId) })
          .toArray();
        for (const d of savedDocs) {
          if (d.externalId) savedIds.add(d.externalId);
          if (d.jobId) savedIds.add(d.jobId.toString());
          if (d._id) savedIds.add(d._id.toString());
        }
      } catch {
        // Ignore
      }
    }

    // ── Candidate Retrieval ────────────────────────────────────────────────
    let candidates;
    const effectiveSearch: string | string[] = hasSearchQuery
      ? effectiveQuery
      : (userProfile?.targetRoles && userProfile.targetRoles.length > 0
          ? userProfile.targetRoles
          : (userProfile?.roleFamilies && userProfile.roleFamilies.length > 0
              ? userProfile.roleFamilies
              : 'Software Engineer'));

    if (hasSearchQuery || userProfile) {
      candidates = await retrieveCandidates(effectiveSearch, {
        limit: Math.min(limit * 3, 150), // Fetch more than needed for scoring
        remoteOnly: userProfile?.hardConstraints?.remoteOnly || remoteOnly,
        countryFilter: countryList.length > 0 ? countryList : undefined,
        excludeJobIds,
      });
    } else {
      // No query, no profile: broad feed from recent jobs
      const { getDb: getDbFn } = await import('@/lib/db');
      const dbConn = await getDbFn();
      const jobsColl = dbConn.collection('jobs');
      const { buildLocationAndCountryFilter, mapToCandidate } = await import('@/lib/search/candidateRetrieval');

      const locationClauses = buildLocationAndCountryFilter({
        limit,
        countryFilter: countryList.length > 0 ? countryList : undefined,
        remoteOnly,
      });

      const rawJobs = await jobsColl
        .find({
          $or: [
            { status: { $in: ['new', 'active'] } },
            { status: { $exists: false } },
          ],
          ...(locationClauses.length > 0 ? { $and: locationClauses } : {}),
        })
        .sort({ postedAt: -1, postedDate: -1, createdAt: -1 })
        .limit(limit * 2)
        .toArray();

      // Convert to candidates with EXACT tier (they're all "broad match")
      candidates = {
        exact: rawJobs.map((j: any) => mapToCandidate(j, 'EXACT')),
        close: [],
        related: [],
        adjacent: [],
        totalCandidates: rawJobs.length,
        searchMeta: {
          query: {
            original: '',
            normalized: '',
            tokens: [],
            roleFamily: null,
            relatedFamilies: [],
            keywords: [],
            isExactRoleMatch: false,
            matchTier: 'EXACT' as const,
          },
          tiersUsed: ['broad'],
          fallbackTriggered: false,
          totalInDatabase: rawJobs.length,
        },
      };
    }

    // ── Personalized Scoring ───────────────────────────────────────────────
    const flatCandidates = flattenTieredCandidates(candidates);

    const scoredListings: (JobListing & { matchTier: string })[] = flatCandidates.map((candidate) => {
      let matchScore = 45; // default for unauthenticated

      if (candidateProfile) {
        try {
          const scoreResult = scoreJobForCandidate(
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
            },
            candidateProfile
          );
          matchScore = Math.min(98, Math.max(5, scoreResult.score));
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
        source: candidate.source as any,
        atsType: candidate.atsType as any,
        applyUrl: candidate.applyUrl,
        postedDate: candidate.postedDate,
        userId: userId || '',
        country: candidate.country,
        description: candidate.description,
        keywords: candidate.keywords,
        matchTier: candidate.matchTier,
      } as JobListing & { matchTier: string };
    });

    // ── Build Tiered Feed ──────────────────────────────────────────────────
    const feed = buildDiscoverFeed(candidates, { limit, page });

    // Apply post-retrieval filters
    let filteredListings = scoredListings;

    if (companyFilter.length > 0) {
      filteredListings = filteredListings.filter((job) =>
        companyFilter.some((c) => job.company.toLowerCase().includes(c.toLowerCase()))
      );
    }

    if (locationFilter.length > 0) {
      filteredListings = filteredListings.filter((job) =>
        locationFilter.some((loc) => job.location.toLowerCase().includes(loc.toLowerCase()))
      );
    }

    if (sourceFilter.length > 0) {
      filteredListings = filteredListings.filter((job) => sourceFilter.includes(job.source));
    }

    if (atsFilter.length > 0) {
      filteredListings = filteredListings.filter((job) => atsFilter.includes(job.atsType));
    }

    if (workplaceFilter.length > 0) {
      filteredListings = filteredListings.filter((job) => {
        const isRemote = job.remote;
        return workplaceFilter.some((wf) => {
          if (wf === 'remote') return isRemote;
          if (wf === 'onsite') return !isRemote;
          return true;
        });
      });
    }

    if (roleFilter.length > 0) {
      filteredListings = filteredListings.filter((job) => {
        const titleLower = (job.title || '').toLowerCase();
        return roleFilter.some((role) => titleLower.includes(role.toLowerCase()));
      });
    }

    if (datePostedFilter && datePostedFilter !== 'all') {
      const now = Date.now();
      const maxAgeMs =
        datePostedFilter === '24h' ? 24 * 60 * 60 * 1000 :
        datePostedFilter === '7d' ? 7 * 24 * 60 * 60 * 1000 :
        30 * 24 * 60 * 60 * 1000;

      filteredListings = filteredListings.filter((job) => {
        const raw = job.postedDate;
        if (!raw) return true;
        const postedTime = new Date(raw).getTime();
        if (isNaN(postedTime)) return true;
        return now - postedTime <= maxAgeMs;
      });
    }

    // Match score filter
    filteredListings = filteredListings.filter(
      (job) => job.matchScore >= matchScoreMin && job.matchScore <= matchScoreMax
    );

    // Job type filter (employment type)
    if (jobTypeFilter.length > 0) {
      filteredListings = filteredListings.filter((job) => {
        const jobType = (job as any).employmentType || (job as any).jobType || '';
        return jobTypeFilter.some((jt) => jobType.toLowerCase().includes(jt.toLowerCase()));
      });
    }

    // Experience level filter
    if (experienceFilter.length > 0) {
      filteredListings = filteredListings.filter((job) => {
        const level = (job as any).experienceLevel || (job as any).seniority || '';
        return experienceFilter.some((ef) => level.toLowerCase().includes(ef.toLowerCase()));
      });
    }

    // Visa sponsorship filter
    if (sponsorsVisaFilter) {
      filteredListings = filteredListings.filter((job) => {
        const sponsors = (job as any).sponsorsVisa ?? (job as any).visaSponsorship;
        return sponsors === true || sponsors === 'true';
      });
    }

    // Saved only filter
    if (savedOnlyFilter && userId) {
      filteredListings = filteredListings.filter((job) => {
        return savedIds.has(job._id) || savedIds.has((job as any).id);
      });
    }

    // Sort
    const dir = sortOrder === 'asc' ? 1 : -1;
    filteredListings.sort((a, b) => {
      if (sortBy === 'postedDate') {
        const tA = a.postedDate ? new Date(a.postedDate).getTime() : 0;
        const tB = b.postedDate ? new Date(b.postedDate).getTime() : 0;
        return (tB - tA) * (sortOrder === 'asc' ? -1 : 1);
      }
      if (sortBy === 'salary') {
        const salA = a.salaryMax || a.salaryMin || 0;
        const salB = b.salaryMax || b.salaryMin || 0;
        return (salB - salA) * (sortOrder === 'asc' ? -1 : 1);
      }
      if (sortBy === 'company') {
        return (a.company || '').localeCompare(b.company || '') * dir;
      }
      return (b.matchScore - a.matchScore) * (sortOrder === 'asc' ? -1 : 1);
    });

    // ── Global Jobs ────────────────────────────────────────────────────────
    try {
      const globalJobs = await GlobalJobService.getGlobalJobs({
        excludeUserIds: userId ? [userId] : [],
        limit: 50,
        portalJobTitles: filteredListings.map(j => j.title),
        portalJobCompanies: filteredListings.map(j => j.company),
      });
      filteredListings = [...filteredListings, ...globalJobs];
    } catch {
      // Ignore global jobs errors
    }

    // ── Pagination ─────────────────────────────────────────────────────────
    const total = filteredListings.length;
    const start = (page - 1) * limit;
    const paginated = filteredListings.slice(start, start + limit);

    // ── Demand Recording (fire-and-forget) ─────────────────────────────────
    if (hasSearchQuery && candidates.searchMeta.query.roleFamily) {
      import('@/lib/demand/demandTracker').then(({ DemandTracker }) => {
        DemandTracker.recordSearch({
          query: effectiveQuery,
          roleFamily: candidates!.searchMeta.query.roleFamily!,
          country: countryList[0],
          remote: remoteOnly,
          userId: userId || 'anonymous',
        }).catch(() => {});
      }).catch(() => {});
    }

    // ── Response ───────────────────────────────────────────────────────────
    const tierSummary = getTierSummary(candidates);

    // Generate suggested searches when results are sparse
    let suggestedSearches: string[] | undefined;
    if (total === 0 && hasSearchQuery) {
      try {
        const { resolveRoleFamily, getRelatedFamilies } = await import('@/lib/taxonomy/roleTaxonomy');
        const { normalizeQuery } = await import('@/lib/search/queryNormalizer');
        const normalized = normalizeQuery(effectiveQuery);
        const roleFamily = resolveRoleFamily(normalized.normalized);
        if (roleFamily) {
          const related = getRelatedFamilies(roleFamily);
          suggestedSearches = related.slice(0, 4).map((r: string) =>
            r.replace(/_/g, ' ').toLowerCase()
          );
        }
        // Fallback: suggest broad categories
        if (!suggestedSearches || suggestedSearches.length === 0) {
          suggestedSearches = ['software engineer', 'product manager', 'data analyst', 'designer'];
        }
      } catch {
        suggestedSearches = ['software engineer', 'product manager', 'data analyst', 'designer'];
      }
    }

    const response: DiscoverResponse = {
      jobs: paginated,
      total,
      page,
      pageSize: limit,
      hasMore: start + limit < total,
      tiers: tierSummary,
      expansionNote: feed.searchMeta.expansionNote,
      profileUsed: !!candidateProfile,
      suggestedSearches,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[API] GET /api/jobs/discover error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to fetch jobs',
        },
      },
      { status: 500 }
    );
  }
}
