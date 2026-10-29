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
import { scoreJobForCandidate } from '@/matching/deterministicScoring';
import { extractCandidateProfile } from '@/matching/candidateProfileExtractor';
import { normalizeScoringProfile } from '@/matching/scoringProfile';
import { getOrComputeProfile } from '@/lib/search/userProfileCache';
import type { NormalizedUserProfile } from '@/lib/search/userProfileCache';
import { resolveFeedRemoteOnly } from '@/lib/jobs/workplace';
import { buildDiscoverFeedPage } from '@/lib/jobs/discoverFeed';

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
  /** Recommended was requested but the profile has no target roles to curate on. */
  needsProfile?: boolean;
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
    const unpersonalized = searchParams.get('unpersonalized') === 'true';
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
    const easyApplyOnly = searchParams.get('easyApplyOnly') === 'true';
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
        candidateProfile = normalizeScoringProfile(candidateProfile);
      } catch (err) {
        console.warn('[Discover] Failed to load user profile:', err);
      }
    }

    // ── Get exclude set (passed/dismissed & saved jobs) ───────────────────
    const excludeJobIds = new Set<string>();
    const savedIds = new Set<string>();
    const savedJobUrls = new Set<string>();
    const savedCompanyTitleKeys = new Set<string>();
    if (userId) {
      // Parallelize all three collection queries for performance
      const userObjId = ObjectId.isValid(userId) ? new ObjectId(userId) : null;
      const trackerQuery = userObjId
        ? { $or: [{ userId: userObjId }, { userId: String(userId) }] }
        : { userId: String(userId) };

      const [passedDocs, savedDocs, appDocs] = await Promise.allSettled([
        db.collection('passed_jobs').find({ userId: new ObjectId(userId) }).toArray(),
        db.collection('saved_jobs').find({ userId: new ObjectId(userId) }).toArray(),
        db.collection('jobapplications').find({ ...trackerQuery, status: 'saved' })
          .project({ _id: 1, jobId: 1, externalId: 1, jobUrl: 1, company: 1, jobTitle: 1 })
          .toArray(),
      ]);

      if (passedDocs.status === 'fulfilled') {
        for (const d of passedDocs.value) {
          if (d.externalId) excludeJobIds.add(d.externalId);
          if (d.jobId) excludeJobIds.add(d.jobId.toString());
        }
      }
      if (savedDocs.status === 'fulfilled') {
        for (const d of savedDocs.value) {
          if (d.externalId) savedIds.add(d.externalId);
          if (d.jobId) savedIds.add(d.jobId.toString());
          if (d._id) savedIds.add(d._id.toString());
          if (d.jobUrl) savedJobUrls.add(d.jobUrl.trim().toLowerCase());
          if (d.company && (d.jobTitle || d.title)) {
            const comp = (d.company || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
            const tit = ((d.jobTitle || d.title) || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
            savedCompanyTitleKeys.add(`${comp}___${tit}`);
          }
        }
      }
      if (appDocs.status === 'fulfilled') {
        for (const a of appDocs.value) {
          if (a.externalId) savedIds.add(a.externalId);
          if (a.jobId) savedIds.add(a.jobId.toString());
          if (a._id) savedIds.add(a._id.toString());
          if (a.jobUrl) savedJobUrls.add(a.jobUrl.trim().toLowerCase());
          if (a.company && (a.jobTitle || a.title)) {
            const comp = (a.company || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
            const tit = ((a.jobTitle || a.title) || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
            savedCompanyTitleKeys.add(`${comp}___${tit}`);
          }
        }
      }

      // If not viewing the Saved feed, exclude all saved jobs from all other feeds
      if (!savedOnlyFilter) {
        for (const id of savedIds) {
          excludeJobIds.add(id);
        }
      }
    }

    // ── Saved-Only: dedicated path bypasses role-based retrieval ────────────
    // When savedOnly=true, query jobapplications directly instead of searching
    // by role — role-based retrieval cannot find saved jobs that don't match
    // the current target roles.
    if (savedOnlyFilter && userId) {
      const userObjId = ObjectId.isValid(userId) ? new ObjectId(userId) : null;
      const trackerQuery = userObjId
        ? { $or: [{ userId: userObjId }, { userId: String(userId) }] }
        : { userId: String(userId) };

      // Fetch saved-status jobapplications + saved_jobs collection entries
      const [trackerDocs, savedCollectionDocs] = await Promise.allSettled([
        db.collection('jobapplications')
          .find({ ...trackerQuery, status: 'saved' })
          .project({ _id: 1, jobId: 1, externalId: 1, jobUrl: 1, company: 1, jobTitle: 1, matchScore: 1, atsScore: 1 })
          .toArray(),
        db.collection('saved_jobs')
          .find({ userId: new ObjectId(userId) })
          .toArray(),
      ]);

      // Build unified saved job lookup keys
      const savedEntries: Array<{ _id: string; jobId?: string; externalId?: string; jobUrl?: string; company?: string; jobTitle?: string; matchScore?: number; atsScore?: number; source: 'tracker' | 'saved_jobs' }> = [];

      if (trackerDocs.status === 'fulfilled') {
        for (const doc of trackerDocs.value) {
          savedEntries.push({
            _id: doc._id?.toString() || '',
            jobId: doc.jobId?.toString() || undefined,
            externalId: doc.externalId || undefined,
            jobUrl: doc.jobUrl || undefined,
            company: doc.company || undefined,
            jobTitle: doc.jobTitle || undefined,
            matchScore: typeof doc.matchScore === 'number' ? doc.matchScore : undefined,
            atsScore: typeof doc.atsScore === 'number' ? doc.atsScore : undefined,
            source: 'tracker',
          });
        }
      }
      if (savedCollectionDocs.status === 'fulfilled') {
        for (const doc of savedCollectionDocs.value) {
          const key = doc.externalId || doc.jobId?.toString() || doc._id?.toString();
          // Deduplicate with tracker entries
          if (savedEntries.some(e => e.jobId === key || e.externalId === key || e._id === key)) continue;
          savedEntries.push({
            _id: doc._id?.toString() || '',
            jobId: doc.jobId?.toString() || undefined,
            externalId: doc.externalId || undefined,
            jobUrl: doc.jobUrl || undefined,
            company: doc.company || undefined,
            jobTitle: doc.jobTitle || doc.title || undefined,
            matchScore: typeof doc.matchScore === 'number' ? doc.matchScore : undefined,
            atsScore: typeof doc.atsScore === 'number' ? doc.atsScore : undefined,
            source: 'saved_jobs',
          });
        }
      }

      // Enrich saved entries with job data from the jobs collection
      const jobIdsToLookup = new Set<string>();
      for (const entry of savedEntries) {
        if (entry.jobId && ObjectId.isValid(entry.jobId)) jobIdsToLookup.add(entry.jobId);
        if (entry.externalId && ObjectId.isValid(entry.externalId)) jobIdsToLookup.add(entry.externalId);
      }

      const jobsMap = new Map<string, any>();
      if (jobIdsToLookup.size > 0) {
        const objectIds = Array.from(jobIdsToLookup).map(id => new ObjectId(id));
        const jobsDocs = await db.collection('jobs')
          .find({ _id: { $in: objectIds } })
          .toArray();
        for (const job of jobsDocs) {
          jobsMap.set(job._id.toString(), job);
        }
      }

      // Build final listings from saved entries + enriched job data
      let savedListings: (JobListing & { matchTier: string })[] = [];

      for (const entry of savedEntries) {
        const enrichedJob = (entry.jobId && jobsMap.get(entry.jobId)) ||
                           (entry.externalId && jobsMap.get(entry.externalId));

        if (enrichedJob) {
          // Compute match score if we have a candidate profile
          let matchScore = entry.matchScore || 45;
          if (candidateProfile) {
            try {
              const scoreResult = scoreJobForCandidate(
                {
                  title: enrichedJob.title,
                  normalizedTitle: enrichedJob.normalizedTitle,
                  skills: enrichedJob.keywords || enrichedJob.skills,
                  location: { city: enrichedJob.location, country: enrichedJob.country, remote: enrichedJob.remote },
                  salary: { min: enrichedJob.salaryMin, max: enrichedJob.salaryMax, currency: enrichedJob.salaryCurrency },
                  experience: { level: enrichedJob.seniority },
                  roleFamily: enrichedJob.roleFamily,
                  seniority: enrichedJob.seniority,
                  description: enrichedJob.description,
                },
                candidateProfile
              );
              matchScore = Math.min(98, Math.max(5, scoreResult.score));
            } catch { /* keep existing matchScore */ }
          }

          savedListings.push({
            _id: enrichedJob._id?.toString() || entry._id,
            title: enrichedJob.title || entry.jobTitle || 'Untitled',
            company: enrichedJob.company || entry.company || 'Unknown',
            companyLogo: enrichedJob.companyLogo,
            location: enrichedJob.location || 'Remote',
            remote: enrichedJob.remote,
            salaryMin: enrichedJob.salaryMin,
            salaryMax: enrichedJob.salaryMax,
            salaryCurrency: enrichedJob.salaryCurrency,
            matchScore,
            atsScore: entry.atsScore,
            source: enrichedJob.source as any,
            atsType: enrichedJob.atsType as any,
            applyUrl: enrichedJob.applyUrl || entry.jobUrl,
            postedDate: enrichedJob.postedDate,
            userId,
            country: enrichedJob.country,
            description: enrichedJob.description,
            keywords: enrichedJob.keywords,
            matchTier: matchScore >= 80 ? 'STRONG' : matchScore >= 60 ? 'GOOD' : matchScore >= 40 ? 'MODERATE' : 'WEAK',
          } as JobListing & { matchTier: string });
        } else {
          // Fallback: construct listing from saved entry data only
          savedListings.push({
            _id: entry._id,
            title: entry.jobTitle || 'Untitled',
            company: entry.company || 'Unknown',
            location: 'Not specified',
            matchScore: entry.matchScore || 50,
            atsScore: entry.atsScore,
            applyUrl: entry.jobUrl,
            userId,
            matchTier: 'MODERATE',
            remote: false,
            source: 'manual' as any,
            atsType: 'unknown' as any,
          } as JobListing & { matchTier: string });
        }
      }

      // Apply post-retrieval filters (company, location, etc.)
      if (companyFilter.length > 0) {
        savedListings = savedListings.filter((job) =>
          companyFilter.some((c) => (job.company || '').toLowerCase().includes(c.toLowerCase()))
        );
      }
      if (locationFilter.length > 0) {
        savedListings = savedListings.filter((job) =>
          locationFilter.some((loc) => (job.location || '').toLowerCase().includes(loc.toLowerCase()))
        );
      }
      if (matchScoreMin > 0 || matchScoreMax < 100) {
        savedListings = savedListings.filter((job) =>
          (job.matchScore || 0) >= matchScoreMin && (job.matchScore || 0) <= matchScoreMax
        );
      }

      // Sort
      const dir = sortOrder === 'asc' ? 1 : -1;
      savedListings.sort((a, b) => {
        if (sortBy === 'postedDate') {
          const tA = a.postedDate ? new Date(a.postedDate).getTime() : 0;
          const tB = b.postedDate ? new Date(b.postedDate).getTime() : 0;
          return (tB - tA) * (sortOrder === 'asc' ? -1 : 1);
        }
        return ((b.matchScore || 0) - (a.matchScore || 0)) * dir;
      });

      const total = savedListings.length;
      const start = (page - 1) * limit;
      const paginated = savedListings.slice(start, start + limit);

      return NextResponse.json({
        jobs: paginated,
        total,
        page,
        pageSize: limit,
        hasMore: page * limit < total,
        profileUsed: !!candidateProfile,
        suggestedSearches: [],
      } as DiscoverResponse);
    }

    // ── Feed ──────────────────────────────────────────────────────────────
    // One pipeline for both views. "Recommended" adds the profile target roles
    // to the query; "All" does not. Both paginate in MongoDB, so `total` and
    // the returned rows describe the same set (see lib/jobs/discoverFeed.ts).
    const { getDb: getDbFn } = await import("@/lib/db");
    const dbConn = await getDbFn();

    const poolRemoteOnly = resolveFeedRemoteOnly({
      remoteOnlyParam: remoteOnly,
      workplaceFilter,
      profileRemoteOnly: userProfile?.hardConstraints?.remoteOnly ?? false,
    });

    const feed = await buildDiscoverFeedPage({
      db: dbConn,
      userId,
      profile: userProfile,
      excludeJobIds,
      page,
      limit,
      unpersonalized,
      searchQuery,
      keywords,
      remoteOnly: poolRemoteOnly,
      countries: countryList,
      companies: companyFilter,
      locations: locationFilter,
      sources: sourceFilter,
      atsTypes: atsFilter,
      workplaceTypes: workplaceFilter,
      roles: roleFilter,
      jobTypes: jobTypeFilter,
      experienceLevels: experienceFilter,
      datePosted: datePostedFilter,
      sponsorsVisa: sponsorsVisaFilter,
      easyApplyOnly,
      matchScoreMin,
      matchScoreMax,
      sortBy,
      sortOrder,
    });

    const response: DiscoverResponse = {
      jobs: feed.jobs,
      total: feed.total,
      page,
      pageSize: limit,
      hasMore: feed.hasMore,
      tiers: { exact: feed.total, close: 0, related: 0, adjacent: 0 },
      profileUsed: feed.profileUsed,
      needsProfile: feed.needsProfile,
      suggestedSearches: feed.suggestedSearches ?? [],
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
      },
    });

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
