'use strict';

import { getConnection } from '@/lib/database';
import JobApplication from '@/models/JobApplication';
import { DuplicateJobService } from './duplicateJobService';

/**
 * Global Job Service
 * Manages sharing of complete manual/extension jobs across all users.
 * Jobs with source='manual' or source='extension' that have all required fields
 * (title, company, location, description, skills) are shown to all users in Discover.
 */
export class GlobalJobService {
  /**
   * Required fields for a job to be considered "complete" and shareable globally
   */
  private static readonly REQUIRED_FIELDS = [
    'jobTitle',
    'company',
    'location',
    'jobDescription',
  ];

  /**
   * Check if a job is complete enough to be shared globally
   * Requires: title, company, location, description, and at least one skill/keyword
   */
  static isJobComplete(job: any): boolean {
    // Check all required text fields are non-empty
    for (const field of this.REQUIRED_FIELDS) {
      const value = job[field];
      if (!value || (typeof value === 'string' && value.trim().length === 0)) {
        return false;
      }
    }

    // Check description has meaningful content (at least 50 chars)
    if ((job.jobDescription || '').trim().length < 50) {
      return false;
    }

    // Check at least one skill/keyword exists
    const hasSkills = (
      (job.tags && job.tags.length > 0) ||
      (job.matchedSkills && job.matchedSkills.length > 0) ||
      (job.missingKeywords && job.missingKeywords.length > 0)
    );

    return hasSkills;
  }

  /**
   * Get global jobs from all users' complete manual/extension jobs
   * Returns jobs formatted as JobListing[] for the Discover page
   */
  static async getGlobalJobs(options?: {
    excludeUserIds?: string[];
    limit?: number;
    skip?: number;
    portalJobTitles?: string[];
    portalJobCompanies?: string[];
    searchQuery?: string;
    remoteOnly?: boolean;
    countryFilter?: string[];
  }): Promise<any[]> {
    await getConnection();

    const {
      excludeUserIds = [],
      limit = 200,
      skip = 0,
      portalJobTitles = [],
      portalJobCompanies = [],
      searchQuery,
      remoteOnly,
      countryFilter = [],
    } = options || {};

    // Query for complete manual/extension jobs from all users
    const andClauses: Record<string, any>[] = [
      { source: { $in: ['manual', 'extension'] } },
      { isArchived: false },
      // Required fields must be non-empty
      { jobTitle: { $exists: true, $ne: '' } },
      { company: { $exists: true, $ne: '' } },
      { location: { $exists: true, $ne: '' } },
      { jobDescription: { $exists: true, $ne: '' } },
    ];

    // Exclude specific users (e.g., the requesting user's own jobs are shown separately)
    if (excludeUserIds.length > 0) {
      andClauses.push({ userId: { $nin: excludeUserIds } });
    }

    if (searchQuery && searchQuery.trim()) {
      const qClean = searchQuery.trim();
      const qRegex = new RegExp(qClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      andClauses.push({
        $or: [
          { jobTitle: { $regex: qRegex } },
          { company: { $regex: qRegex } },
          { tags: { $in: [qRegex] } },
        ],
      });
    }

    if (remoteOnly) {
      andClauses.push({
        location: { $regex: /remote|work from home|anywhere/i },
      });
    }

    if (countryFilter && countryFilter.length > 0) {
      const countryRegex = new RegExp(countryFilter.map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i');
      andClauses.push({
        location: { $regex: countryRegex },
      });
    }

    const query = andClauses.length === 1 ? andClauses[0] : { $and: andClauses };

    // Fetch candidate jobs
    const candidates = await JobApplication.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 2) // Fetch extra for dedup filtering
      .lean();

    // Filter to only complete jobs
    const completeJobs = candidates.filter(job => this.isJobComplete(job));

    // Fast lookup sets for portal job deduplication
    const portalCompaniesSet = new Set(
      portalJobCompanies.map((c) => (c || '').toLowerCase().trim().replace(/[^a-z0-9]/g, ''))
    );
    const portalJobsForDedup = portalJobTitles.map((title, i) => ({
      jobTitle: title,
      company: portalJobCompanies[i] || '',
      location: '',
      createdAt: new Date().toISOString(),
    }));

    const deduplicatedJobs: any[] = [];
    const seenKeys = new Set<string>();

    for (const job of completeJobs) {
      if (deduplicatedJobs.length >= skip + limit) break;

      // Create a unique key for basic dedup
      const normComp = (job.company || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      const key = `${normComp}::${(job.jobTitle || '').toLowerCase().trim()}::${(job.location || '').toLowerCase().trim()}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      // Only run fuzzy check if the company actually matches one of the portal companies
      if (portalJobsForDedup.length > 0 && portalCompaniesSet.has(normComp)) {
        const candidatePortalJobs = portalJobsForDedup.filter(
          (pj) => (pj.company || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '') === normComp
        );
        if (candidatePortalJobs.length > 0) {
          const duplicateCheck = await DuplicateJobService.checkDuplicate(
            {
              jobTitle: job.jobTitle,
              company: job.company,
              location: job.location,
            },
            candidatePortalJobs,
            { daysThreshold: 90, similarityThreshold: 0.8 }
          );

          // Skip if it's a duplicate of a portal job (portal takes precedence)
          if (duplicateCheck.isDuplicate) continue;
        }
      }

      deduplicatedJobs.push(job);
    }

    // Apply pagination
    const paginatedJobs = deduplicatedJobs.slice(skip, skip + limit);

    // Format as JobListing[] for the Discover page
    return paginatedJobs.map(job => this.formatAsJobListing(job));
  }

  /**
   * Format a JobApplication record as a JobListing for the Discover page
   */
  static formatAsJobListing(job: any): any {
    return {
      _id: job._id?.toString() || job.id,
      title: job.jobTitle,
      company: job.company,
      location: job.location || 'Remote',
      remote: (job.location || '').toLowerCase().includes('remote'),
      matchScore: job.matchScore ?? null,
      source: job.source,
      atsType: job.atsType || 'unknown',
      applyUrl: job.jobUrl || '',
      description: job.jobDescription || '',
      keywords: [
        ...(job.tags || []),
        ...(job.matchedSkills || []),
      ],
      salaryMin: job.salary?.min,
      salaryMax: job.salary?.max,
      salaryCurrency: job.salary?.currency,
      postedDate: job.createdAt,
      // Mark as user-submitted for UI differentiation
      isUserSubmitted: true,
      postedBy: job.userId,
    };
  }

  /**
   * Get count of global jobs for pagination
   */
  static async getGlobalJobsCount(excludeUserId?: string): Promise<number> {
    await getConnection();

    const query: any = {
      source: { $in: ['manual', 'extension'] },
      isArchived: false,
      jobTitle: { $exists: true, $ne: '' },
      company: { $exists: true, $ne: '' },
      location: { $exists: true, $ne: '' },
      jobDescription: { $exists: true, $ne: '' },
    };

    if (excludeUserId) {
      query.userId = { $ne: excludeUserId };
    }

    // We can't efficiently check "completeness" in MongoDB query,
    // so we count candidates and let the application layer filter
    const candidates = await JobApplication.countDocuments(query);
    return candidates;
  }
}
