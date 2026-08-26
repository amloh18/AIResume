/**
 * RecommendedJobsService — queries the ingested `jobs` collection
 * and scores them against a user's JobSearchProfile.
 *
 * This is the primary feed for the job discovery UI.
 */

import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { computeSmartMatch, type SmartMatchResult } from '@/lib/services/smartSkillMatcher';

// ── Types ──────────────────────────────────────────────────────────────

export interface RecommendedJob {
  _id: string;
  title: string;
  normalizedTitle: string;
  company: { name: string; normalizedName: string; domain?: string; logoUrl?: string };
  description: string;
  descriptionText: string;
  location: { city: string; state?: string; country: string; countryCode: string; remote: boolean; remoteType?: string };
  department?: string;
  category?: string;
  employmentType: string;
  seniority?: string;
  salary: { min?: number; max?: number; currency?: string; period?: string };
  skills: string[];
  postedAt: Date;
  source: { primary: string; secondary?: string; sourceUrl: string; applicationUrl: string };
  matchScore: number;
  matchBreakdown?: {
    skills: number;
    title: number;
    location: number;
    recency: number;
  };
  userInteractions?: {
    saved: boolean;
    applied: boolean;
    dismissed: boolean;
  };
}

export interface RecommendedJobsResult {
  jobs: RecommendedJob[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  facets: {
    sources: Array<{ name: string; count: number }>;
    seniorities: Array<{ name: string; count: number }>;
    locations: Array<{ name: string; count: number }>;
    departments: Array<{ name: string; count: number }>;
  };
}

export interface RecommendedJobsQuery {
  userId?: string;
  page?: number;
  pageSize?: number;
  // Filters
  search?: string;
  sources?: string[];
  seniorities?: string[];
  locations?: string[];
  departments?: string[];
  remoteOnly?: boolean;
  minSalary?: number;
  // Sorting
  sortBy?: 'matchScore' | 'postedAt' | 'company';
  sortOrder?: 'asc' | 'desc';
}

// ── Service ────────────────────────────────────────────────────────────

export class RecommendedJobsService {
  /**
   * Get recommended jobs for a user, scored against their profile.
   */
  static async getRecommended(query: RecommendedJobsQuery): Promise<RecommendedJobsResult> {
    const db = await getDb();
    const jobsColl = db.collection('jobs');
    const page = Math.max(query.page || 1, 1);
    const pageSize = Math.min(Math.max(query.pageSize || 20, 1), 100);
    const skip = (page - 1) * pageSize;

    // Build MongoDB filter
    const filter: any = {
      status: { $in: ['active', 'new'] },
    };

    if (query.search) {
      const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$text = { $search: query.search };
    }

    if (query.sources?.length) {
      filter['source.primary'] = { $in: query.sources };
    }

    if (query.seniorities?.length) {
      filter.seniority = { $in: query.seniorities };
    }

    if (query.locations?.length) {
      filter['location.countryCode'] = { $in: query.locations };
    }

    if (query.departments?.length) {
      filter.department = { $in: query.departments };
    }

    if (query.remoteOnly) {
      filter['location.remote'] = true;
    }

    if (query.minSalary) {
      filter['salary.max'] = { $gte: query.minSalary };
    }

    // Sort
    const sort: any = {};
    if (query.search && !query.sortBy) {
      // Text search defaults to text score
      sort.score = { $meta: 'textScore' };
    } else if (query.sortBy === 'postedAt') {
      sort.postedAt = query.sortOrder === 'asc' ? 1 : -1;
    } else if (query.sortBy === 'company') {
      sort['company.normalizedName'] = query.sortOrder === 'asc' ? 1 : -1;
    } else {
      // Default: postedAt descending (freshest first)
      sort.postedAt = -1;
    }

    // Execute query
    const projection = query.search ? { score: { $meta: 'textScore' } } : {};

    const [rawJobs, total] = await Promise.all([
      jobsColl
        .find(filter)
        .project(projection)
        .sort(sort)
        .skip(skip)
        .limit(pageSize + 1) // fetch one extra to check hasMore
        .toArray(),
      jobsColl.countDocuments(filter),
    ]);

    const hasMore = rawJobs.length > pageSize;
    const jobsToScore = hasMore ? rawJobs.slice(0, pageSize) : rawJobs;

    // Score against user profile
    let scoredJobs: RecommendedJob[];
    if (query.userId) {
      scoredJobs = await this.scoreJobs(jobsToScore, query.userId);
    } else {
      // Unauthenticated: return jobs without scores
      scoredJobs = jobsToScore.map((job) => this.mapToRecommended(job, 0, undefined));
    }

    // Fetch user interactions if authenticated
    if (query.userId) {
      await this.enrichWithInteractions(scoredJobs, query.userId);

      // Exclude dismissed jobs from feed
      const db = await getDb();
      const passedColl = db.collection('passed_jobs');
      const passedDocs = await passedColl.find({
        userId: new ObjectId(query.userId),
      }).project({ jobId: 1 }).toArray().catch(() => []);
      const passedIds = new Set(passedDocs.map((d: any) => d.jobId?.toString()));
      const beforeFilter = scoredJobs.length;
      scoredJobs = scoredJobs.filter(j => !passedIds.has(j._id));
      if (beforeFilter !== scoredJobs.length) {
        console.log(`[RECOMMEND] Filtered ${beforeFilter - scoredJobs.length} dismissed jobs`);
      }
    }

    // Compute facets from total (using aggregation on a sample for performance)
    const facets = await this.computeFacets(filter);

    return {
      jobs: scoredJobs,
      total,
      page,
      pageSize,
      hasMore,
      facets,
    };
  }

  /**
   * Score jobs against a user's profile using SmartSkillMatcher.
   */
  private static async scoreJobs(rawJobs: any[], userId: string): Promise<RecommendedJob[]> {
    const { JobSearchProfileService } = await import('@/lib/services/jobSearchProfileService');
    const profile = await JobSearchProfileService.getProfile(userId);

    if (!profile) {
      return rawJobs.map((job) => this.mapToRecommended(job, 0, undefined));
    }

    // Extract user skills from primary CV (if available)
    let userSkills: string[] = [];
    try {
      const { extractUserSkills } = await import('@/lib/services/smartSkillMatcher');
      const { default: CV } = await import('@/models/CV');
      const primaryCv = await CV.findOne({ userId: new ObjectId(userId), isMaster: true }).lean() as any;
      if (primaryCv) {
        userSkills = extractUserSkills(primaryCv.cvData || primaryCv);
      }
    } catch {
      // CV may not exist yet
    }

    const userTitles = profile.targetRoles || [];
    const userLocations = profile.locations || [];
    const userRemoteOnly = profile.remoteOnly || false;

    return rawJobs.map((job) => {
      const jobSkills = job.skills || [];
      const jobTitle = job.title || '';
      const jobLocation = job.location
        ? `${job.location.city || ''}, ${job.location.country || ''}`
        : '';
      const jobRemote = job.location?.remote || false;

      const result: SmartMatchResult = computeSmartMatch(
        userSkills,
        jobSkills,
        userTitles,
        jobTitle,
        jobLocation,
        userLocations,
        jobRemote,
        userRemoteOnly,
        job.postedAt
      );

      return this.mapToRecommended(job, result.overallScore, {
        skills: result.breakdown.skills,
        title: result.breakdown.title,
        location: result.breakdown.location,
        recency: result.breakdown.recency,
      });
    });
  }

  /**
   * Enrich jobs with user interaction status (saved, applied, dismissed).
   */
  private static async enrichWithInteractions(jobs: RecommendedJob[], userId: string): Promise<void> {
    const db = await getDb();
    const jobIds = jobs.map((j) => new ObjectId(j._id));

    const [savedDocs, appliedDocs, passedDocs] = await Promise.all([
      db.collection('jobs').countDocuments({
        _id: { $in: jobIds },
        userId: new ObjectId(userId),
        status: 'saved',
      }).catch(() => 0),
      db.collection('applications').find({
        userId: new ObjectId(userId),
        jobId: { $in: jobIds },
      }).project({ jobId: 1 }).toArray().catch(() => []),
      db.collection('passed_jobs').find({
        userId: new ObjectId(userId),
        jobId: { $in: jobIds },
      }).project({ jobId: 1 }).toArray().catch(() => []),
    ]);

    const appliedSet = new Set(appliedDocs.map((d: any) => d.jobId?.toString()));
    const passedSet = new Set(passedDocs.map((d: any) => d.jobId?.toString()));

    for (const job of jobs) {
      job.userInteractions = {
        saved: false, // TODO: check saved_jobs collection
        applied: appliedSet.has(job._id),
        dismissed: passedSet.has(job._id),
      };
    }
  }

  /**
   * Compute facets for filter UI.
   */
  private static async computeFacets(baseFilter: any): Promise<RecommendedJobsResult['facets']> {
    const db = await getDb();
    const jobsColl = db.collection('jobs');

    const facetFilter = { ...baseFilter };

    const [sourceFacets, seniorityFacets, locationFacets, departmentFacets] = await Promise.all([
      jobsColl.aggregate([
        { $match: facetFilter },
        { $group: { _id: '$source.primary', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]).toArray(),
      jobsColl.aggregate([
        { $match: facetFilter },
        { $group: { _id: '$seniority', count: { $sum: 1 } } },
        { $match: { _id: { $ne: null } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]).toArray(),
      jobsColl.aggregate([
        { $match: facetFilter },
        { $group: { _id: '$location.countryCode', count: { $sum: 1 } } },
        { $match: { _id: { $ne: null } } },
        { $sort: { count: -1 } },
        { $limit: 15 },
      ]).toArray(),
      jobsColl.aggregate([
        { $match: facetFilter },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $match: { _id: { $ne: null } } },
        { $sort: { count: -1 } },
        { $limit: 15 },
      ]).toArray(),
    ]);

    return {
      sources: sourceFacets.map((f: any) => ({ name: f._id || 'unknown', count: f.count })),
      seniorities: seniorityFacets.map((f: any) => ({ name: f._id, count: f.count })),
      locations: locationFacets.map((f: any) => ({ name: f._id, count: f.count })),
      departments: departmentFacets.map((f: any) => ({ name: f._id, count: f.count })),
    };
  }

  /**
   * Map a raw MongoDB document to a RecommendedJob.
   */
  private static mapToRecommended(
    doc: any,
    matchScore: number,
    matchBreakdown?: { skills: number; title: number; location: number; recency: number }
  ): RecommendedJob {
    return {
      _id: doc._id.toString(),
      title: doc.title,
      normalizedTitle: doc.normalizedTitle,
      company: doc.company,
      description: doc.description,
      descriptionText: doc.descriptionText,
      location: doc.location,
      department: doc.department,
      category: doc.category,
      employmentType: doc.employmentType,
      seniority: doc.seniority,
      salary: doc.salary,
      skills: doc.skills || [],
      postedAt: doc.postedAt,
      source: {
        primary: doc.source?.primary || 'unknown',
        secondary: doc.source?.secondary,
        sourceUrl: doc.source?.sourceUrl || '',
        applicationUrl: doc.source?.applicationUrl || '',
      },
      matchScore,
      matchBreakdown,
    };
  }
}
