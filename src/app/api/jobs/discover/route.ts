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
import { resolveFeedRemoteOnly } from '@/lib/jobs/workplace';
import { AUTO_APPLY_SUPPORTED_ATS, isAutoApplySupported } from '@/lib/jobs/autoApplySupport';

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
        db.collection('jobapplications').find(trackerQuery)
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

    // ── Determine Mode: All (Catalog Mode) vs Recommended (Personalized Tiered Mode) ──
    const isAllMode = unpersonalized || (!hasSearchQuery && (!userProfile || !userProfile.targetRoles?.length));

    if (isAllMode) {
      const { getDb: getDbFn } = await import('@/lib/db');
      const dbConn = await getDbFn();
      const jobsColl = dbConn.collection('jobs');
      const { buildLocationAndCountryFilter, mapToCandidate } = await import('@/lib/search/candidateRetrieval');

      const andClauses: Record<string, any>[] = [
        {
          $or: [
            { status: { $in: ['new', 'active'] } },
            { status: { $exists: false } },
          ],
        },
      ];

      // Location & Country filter
      const locationClauses = buildLocationAndCountryFilter({
        limit,
        countryFilter: countryList.length > 0 ? countryList : undefined,
        remoteOnly,
      });
      if (locationClauses.length > 0) {
        andClauses.push(...locationClauses);
      }

      // Exclude passed/dismissed and saved jobs (when in All, Recommended, or Latest mode)
      if (excludeJobIds.size > 0) {
        const validExcludeObjectIds = Array.from(excludeJobIds)
          .filter((id) => ObjectId.isValid(id))
          .map((id) => new ObjectId(id));
        if (validExcludeObjectIds.length > 0) {
          andClauses.push({ _id: { $nin: validExcludeObjectIds } });
        }
      }

      // Saved only filter
      if (savedOnlyFilter && userId) {
        const validSavedObjectIds = Array.from(savedIds)
          .filter((id) => ObjectId.isValid(id))
          .map((id) => new ObjectId(id));
        if (validSavedObjectIds.length > 0) {
          andClauses.push({ _id: { $in: validSavedObjectIds } });
        } else {
          andClauses.push({ _id: null });
        }
      }

      // Search text / keywords filter
      if (effectiveQuery.trim()) {
        const searchPattern = effectiveQuery.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const searchRegex = new RegExp(searchPattern, 'i');
        andClauses.push({
          $or: [
            { title: { $regex: searchRegex } },
            { normalizedTitle: { $regex: searchRegex } },
            { company: { $regex: searchRegex } },
            { 'company.name': { $regex: searchRegex } },
            { keywords: { $in: [searchRegex] } },
            { skills: { $in: [searchRegex] } },
            { description: { $regex: searchRegex } },
            { descriptionText: { $regex: searchRegex } },
          ],
        });
      }

      // Company filter
      if (companyFilter.length > 0) {
        const compRegex = new RegExp(companyFilter.map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i');
        andClauses.push({
          $or: [
            { company: { $regex: compRegex } },
            { 'company.name': { $regex: compRegex } },
          ],
        });
      }

      // Location filter
      if (locationFilter.length > 0) {
        const locRegex = new RegExp(locationFilter.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i');
        andClauses.push({
          $or: [
            { location: { $regex: locRegex } },
            { 'location.city': { $regex: locRegex } },
            { country: { $regex: locRegex } },
          ],
        });
      }

      // Source filter
      if (sourceFilter.length > 0) {
        andClauses.push({
          $or: [
            { source: { $in: sourceFilter } },
            { 'source.primary': { $in: sourceFilter } },
            { atsType: { $in: sourceFilter } },
          ],
        });
      }

      // ATS filter
      if (atsFilter.length > 0) {
        andClauses.push({ atsType: { $in: atsFilter } });
      }

      // Workplace filter
      if (workplaceFilter.length > 0) {
        const wpClauses: any[] = [];
        if (workplaceFilter.includes('remote')) {
          wpClauses.push(
            { remote: true },
            { 'location.remote': true },
            { location: { $regex: 'remote', $options: 'i' } }
          );
        }
        if (workplaceFilter.includes('onsite')) {
          wpClauses.push({
            remote: false,
            'location.remote': { $ne: true },
            location: { $not: { $regex: 'remote', $options: 'i' } },
          });
        }
        if (workplaceFilter.includes('hybrid')) {
          wpClauses.push(
            { location: { $regex: 'hybrid', $options: 'i' } },
            { workplaceType: 'hybrid' }
          );
        }
        if (wpClauses.length > 0) {
          andClauses.push({ $or: wpClauses });
        }
      }

      // Role filter
      if (roleFilter.length > 0) {
        const roleRegex = new RegExp(roleFilter.map((r) => r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i');
        andClauses.push({
          $or: [
            { title: { $regex: roleRegex } },
            { normalizedTitle: { $regex: roleRegex } },
          ],
        });
      }

      // Job type filter
      if (jobTypeFilter.length > 0) {
        const jtRegex = new RegExp(jobTypeFilter.map((j) => j.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i');
        andClauses.push({
          $or: [
            { employmentType: { $regex: jtRegex } },
            { jobType: { $regex: jtRegex } },
          ],
        });
      }

      // Experience level filter
      if (experienceFilter.length > 0) {
        const expRegex = new RegExp(experienceFilter.map((e) => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i');
        andClauses.push({
          $or: [
            { experienceLevel: { $regex: expRegex } },
            { seniority: { $regex: expRegex } },
          ],
        });
      }

      // Date posted filter
      if (datePostedFilter && datePostedFilter !== 'all') {
        const now = Date.now();
        const maxAgeMs =
          datePostedFilter === '24h' ? 24 * 60 * 60 * 1000 :
          datePostedFilter === '7d' ? 7 * 24 * 60 * 60 * 1000 :
          30 * 24 * 60 * 60 * 1000;
        const cutoff = new Date(now - maxAgeMs);
        andClauses.push({
          $or: [
            { postedDate: { $gte: cutoff } },
            { postedAt: { $gte: cutoff } },
            { createdAt: { $gte: cutoff } },
          ],
        });
      }

      // Visa sponsorship filter
      if (sponsorsVisaFilter) {
        andClauses.push({
          $or: [
            { sponsorsVisa: true },
            { visaSponsorship: true },
            { sponsorsVisa: 'true' },
            { visaSponsorship: 'true' },
          ],
        });
      }

      // Auto-Apply supported filter (ATS types with an automation adapter)
      if (easyApplyOnly) {
        andClauses.push({
          $or: [
            { atsType: { $in: AUTO_APPLY_SUPPORTED_ATS } },
            { 'source.primary': { $in: AUTO_APPLY_SUPPORTED_ATS } },
            { source: { $in: AUTO_APPLY_SUPPORTED_ATS } },
          ],
        });
      }

      const mongoFilter = andClauses.length === 1 ? andClauses[0] : { $and: andClauses };

      // Count the TRUE total from MongoDB
      const total = await jobsColl.countDocuments(mongoFilter);

      // Sorting
      let sortObj: any = { postedAt: -1, postedDate: -1, createdAt: -1 };
      if (sortBy === 'postedDate') {
        sortObj = { postedAt: sortOrder === 'asc' ? 1 : -1, postedDate: sortOrder === 'asc' ? 1 : -1, createdAt: sortOrder === 'asc' ? 1 : -1 };
      } else if (sortBy === 'salary') {
        sortObj = { salaryMax: sortOrder === 'asc' ? 1 : -1, salaryMin: sortOrder === 'asc' ? 1 : -1 };
      } else if (sortBy === 'company') {
        sortObj = { company: sortOrder === 'asc' ? 1 : -1 };
      }

      const rawJobs = await jobsColl
        .find(mongoFilter)
        .sort(sortObj)
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray();

      const flatCandidates = rawJobs.map((j: any) => mapToCandidate(j, 'EXACT'));

      const scoredListings: (JobListing & { matchTier: string })[] = flatCandidates.map((candidate) => {
        let matchScore = 50;
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
            matchScore = 50;
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

      // Boost match scores for companies on the user's watchlist
      if (userId) {
        try {
          const CompanyWatchlist = (await import('@/models/CompanyWatchlist')).default;
          const watchlistEntries = await CompanyWatchlist.find({
            userId: userId,
            isActive: true,
          }).select({ company: 1 }).lean();
          const watchedCompanies = new Set(
            watchlistEntries.map((w: any) => (w.company || '').toLowerCase().trim())
          );
          if (watchedCompanies.size > 0) {
            for (const job of scoredListings) {
              if (watchedCompanies.has((job.company || '').toLowerCase().trim())) {
                job.matchScore = Math.min(98, (job.matchScore || 50) + 15);
              }
            }
            // Re-sort by boosted matchScore
            scoredListings.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
          }
        } catch {
          // Watchlist boost is best-effort
        }
      }

      const response: DiscoverResponse = {
        jobs: scoredListings,
        total,
        page,
        pageSize: limit,
        hasMore: page * limit < total,
        tiers: {
          exact: total,
          close: 0,
          related: 0,
          adjacent: 0,
        },
        profileUsed: !!candidateProfile,
        suggestedSearches: [],
      };

      return NextResponse.json(response);
    }

    // ── Candidate Retrieval (Recommended / Role-targeted Mode) ────────────
    let candidates;
    const effectiveSearch: string | string[] = hasSearchQuery
      ? effectiveQuery
      : (userProfile?.targetRoles && userProfile.targetRoles.length > 0
          ? userProfile.targetRoles
          : (userProfile?.roleFamilies && userProfile.roleFamilies.length > 0
              ? userProfile.roleFamilies
              : 'Software Engineer'));

    // ── Determine remote-only retrieval pool ─────────────────────────────
    // Explicit feed filters ALWAYS win over the standing job-search profile
    // (see resolveFeedRemoteOnly in @/lib/jobs/workplace).
    const poolRemoteOnly = resolveFeedRemoteOnly({
      remoteOnlyParam: remoteOnly,
      workplaceFilter,
      profileRemoteOnly: userProfile?.hardConstraints?.remoteOnly ?? false,
    });

    candidates = await retrieveCandidates(effectiveSearch, {
      limit: Math.max(limit * 8, 250), // Fetch a rich candidate pool for personalized scoring
      remoteOnly: poolRemoteOnly,
      countryFilter: countryList.length > 0 ? countryList : undefined,
      excludeJobIds,
    });

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
      // Matches the semantics used in All (catalog) mode: a job is hybrid when
      // it isn't flagged remote but is labeled hybrid; onsite = not remote and
      // not hybrid. Previously 'hybrid' matched everything and 'onsite' leaked
      // hybrid-labeled jobs through.
      filteredListings = filteredListings.filter((job) => {
        const isRemote = job.remote;
        const locationStr = (job.location || '').toLowerCase();
        const isHybrid =
          !isRemote &&
          (locationStr.includes('hybrid') ||
            (job as any).workplaceType === 'hybrid' ||
            (Array.isArray((job as any).workplaceTypes) && (job as any).workplaceTypes.includes('hybrid')));
        return workplaceFilter.some((wf) => {
          if (wf === 'remote') return isRemote;
          if (wf === 'hybrid') return isHybrid;
          if (wf === 'onsite') return !isRemote && !isHybrid;
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

    // Auto-Apply supported filter
    if (easyApplyOnly) {
      filteredListings = filteredListings.filter((job) =>
        isAutoApplySupported(job.atsType || (job as any).source || '')
      );
    }

    // Saved only filter vs Exclude saved jobs from other feeds
    if (savedOnlyFilter && userId) {
      filteredListings = filteredListings.filter((job) => {
        if (savedIds.has(job._id) || savedIds.has((job as any).id) || savedIds.has((job as any).externalId)) return true;
        const jobUrl = (job as any).applyUrl || (job as any).source?.applicationUrl || '';
        if (jobUrl && savedJobUrls.has(jobUrl.trim().toLowerCase())) return true;
        const comp = ((job as any).company || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
        const tit = ((job as any).title || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
        if (comp && tit && savedCompanyTitleKeys.has(`${comp}___${tit}`)) return true;
        return false;
      });
    } else if (userId && savedIds.size > 0) {
      filteredListings = filteredListings.filter((job) => {
        if (savedIds.has(job._id) || savedIds.has((job as any).id) || savedIds.has((job as any).externalId)) return false;
        const jobUrl = (job as any).applyUrl || (job as any).source?.applicationUrl || '';
        if (jobUrl && savedJobUrls.has(jobUrl.trim().toLowerCase())) return false;
        const comp = ((job as any).company || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
        const tit = ((job as any).title || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
        if (comp && tit && savedCompanyTitleKeys.has(`${comp}___${tit}`)) return false;
        return true;
      });
    }

    // Cross-source deduplication: keep best match per company+title+location
    const dedupMap = new Map<string, typeof filteredListings[0]>();
    for (const job of filteredListings) {
      const comp = (job.company || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      const tit = (job.title || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      const loc = (job.location || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      const key = `${comp}___${tit}___${loc}`;
      if (!dedupMap.has(key) || (job.matchScore || 0) > (dedupMap.get(key)?.matchScore || 0)) {
        dedupMap.set(key, job);
      }
    }
    filteredListings = Array.from(dedupMap.values());

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
