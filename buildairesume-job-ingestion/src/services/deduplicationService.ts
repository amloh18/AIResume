import { Db, ObjectId } from 'mongodb';
import { createHash } from 'crypto';
import { logger } from '../utils/logger';
import { NormalizedJob } from '../models/Job';

export interface DeduplicationResult {
  isDuplicate: boolean;
  existingJobId?: string;
  mergeStrategy?: 'skip' | 'update_provenance' | 'merge';
  confidence: number;
}

export interface DeduplicationStats {
  totalChecked: number;
  duplicatesFound: number;
  skipped: number;
  updated: number;
  merged: number;
}

/**
 * Service for cross-source job deduplication
 * 
 * Identity priority:
 * 1. ATS requisition/source ID (strongest)
 * 2. Canonical application URL
 * 3. Normalized company + title + location
 * 4. Fingerprint fallback (content hash)
 */
export class DeduplicationService {
  private db: Db | null = null;

  initialize(db: Db): void {
    this.db = db;
  }

  /**
   * Check if a job is a duplicate of an existing job
   */
  async checkDuplicate(job: NormalizedJob): Promise<DeduplicationResult> {
    if (!this.db) {
      throw new Error('DeduplicationService not initialized');
    }

    const jobsCollection = this.db.collection('discoveredjobs');

    // Strategy 1: Check by source + sourceJobId (strongest match)
    const bySourceId = await this.checkBySourceId(jobsCollection, job);
    if (bySourceId.isDuplicate) {
      return bySourceId;
    }

    // Strategy 2: Check by canonical application URL
    if (job.source.applicationUrl) {
      const byUrl = await this.checkByApplicationUrl(jobsCollection, job);
      if (byUrl.isDuplicate) {
        return byUrl;
      }
    }

    // Strategy 3: Check by normalized company + title + location
    const byNormalized = await this.checkByNormalizedFields(jobsCollection, job);
    if (byNormalized.isDuplicate) {
      return byNormalized;
    }

    // Strategy 4: Check by content fingerprint
    const byFingerprint = await this.checkByFingerprint(jobsCollection, job);
    if (byFingerprint.isDuplicate) {
      return byFingerprint;
    }

    return { isDuplicate: false, confidence: 0 };
  }

  /**
   * Check by source + sourceJobId
   * This is the strongest match - same source, same ID
   */
  private async checkBySourceId(
    collection: any,
    job: NormalizedJob
  ): Promise<DeduplicationResult> {
    const existing = await collection.findOne({
      'source.primary': job.source.primary,
      'source.sourceJobId': job.source.sourceJobId,
    });

    if (existing) {
      return {
        isDuplicate: true,
        existingJobId: existing._id.toString(),
        mergeStrategy: 'update_provenance',
        confidence: 1.0,
      };
    }

    return { isDuplicate: false, confidence: 0 };
  }

  /**
   * Check by canonical application URL
   * Different sources may link to the same application
   */
  private async checkByApplicationUrl(
    collection: any,
    job: NormalizedJob
  ): Promise<DeduplicationResult> {
    if (!job.source.applicationUrl) {
      return { isDuplicate: false, confidence: 0 };
    }

    // Normalize URL for comparison
    const normalizedUrl = this.normalizeUrl(job.source.applicationUrl);
    
    const existing = await collection.findOne({
      'source.applicationUrl': { $regex: new RegExp(`^${this.escapeRegex(normalizedUrl)}$`, 'i') },
    });

    if (existing) {
      return {
        isDuplicate: true,
        existingJobId: existing._id.toString(),
        mergeStrategy: 'update_provenance',
        confidence: 0.95,
      };
    }

    return { isDuplicate: false, confidence: 0 };
  }

  /**
   * Check by normalized company + title + location
   * Catches same job posted across multiple sources
   */
  private async checkByNormalizedFields(
    collection: any,
    job: NormalizedJob
  ): Promise<DeduplicationResult> {
    const normalizedTitle = this.normalizeTitle(job.title);
    const normalizedCompany = this.normalizeCompany(job.company.normalizedName);
    const normalizedLocation = job.search?.normalizedLocation || this.normalizeLocation(job.location);

    const existing = await collection.findOne({
      'normalizedTitle': normalizedTitle,
      'company.normalizedName': normalizedCompany,
      'search.normalizedLocation': normalizedLocation,
      status: { $in: ['active', 'updated'] }, // Only match active jobs
    });

    if (existing) {
      return {
        isDuplicate: true,
        existingJobId: existing._id.toString(),
        mergeStrategy: 'update_provenance',
        confidence: 0.85,
      };
    }

    return { isDuplicate: false, confidence: 0 };
  }

  /**
   * Check by content fingerprint
   * Fallback for jobs with similar descriptions
   */
  private async checkByFingerprint(
    collection: any,
    job: NormalizedJob
  ): Promise<DeduplicationResult> {
    const fingerprint = this.generateFingerprint(job);
    
    const existing = await collection.findOne({
      fingerprint,
      status: { $in: ['active', 'updated'] },
    });

    if (existing) {
      return {
        isDuplicate: true,
        existingJobId: existing._id.toString(),
        mergeStrategy: 'update_provenance',
        confidence: 0.7,
      };
    }

    return { isDuplicate: false, confidence: 0 };
  }

  /**
   * Merge a duplicate job into an existing job
   * Updates provenance and potentially the job details
   */
  async mergeJob(
    existingJobId: string,
    newJob: NormalizedJob
  ): Promise<boolean> {
    if (!this.db) {
      throw new Error('DeduplicationService not initialized');
    }

    const jobsCollection = this.db.collection('discoveredjobs');

    try {
      // Add new source to provenance
      const sourceEntry = {
        name: newJob.source.primary,
        sourceJobId: newJob.source.sourceJobId,
        url: newJob.source.sourceUrl,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      };

      // Update the existing job
      const objectId = typeof existingJobId === 'string' 
        ? new ObjectId(existingJobId) 
        : existingJobId;
      
      const result = await jobsCollection.updateOne(
        { _id: objectId },
        {
          $addToSet: { sources: sourceEntry },
          $set: {
            'ingestion.lastSeenAt': new Date(),
            updatedAt: new Date(),
          },
          $inc: {
            'ingestion.updateCount': 1,
          },
        }
      );

      if (result.modifiedCount > 0) {
        logger.info(`Merged job ${newJob.source.primary}:${newJob.source.sourceJobId} into ${existingJobId}`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`Failed to merge job into ${existingJobId}:`, error);
      return false;
    }
  }

  /**
   * Process a batch of jobs for deduplication
   * Returns stats and the list of unique jobs
   */
  async processBatch(
    jobs: NormalizedJob[]
  ): Promise<{
    uniqueJobs: NormalizedJob[];
    stats: DeduplicationStats;
  }> {
    const stats: DeduplicationStats = {
      totalChecked: jobs.length,
      duplicatesFound: 0,
      skipped: 0,
      updated: 0,
      merged: 0,
    };

    const uniqueJobs: NormalizedJob[] = [];
    const seenIds = new Set<string>();

    for (const job of jobs) {
      const dedupResult = await this.checkDuplicate(job);

      if (dedupResult.isDuplicate && dedupResult.existingJobId) {
        stats.duplicatesFound++;

        // Merge provenance into existing job
        const merged = await this.mergeJob(dedupResult.existingJobId, job);
        if (merged) {
          stats.merged++;
        } else {
          stats.updated++;
        }
      } else {
        // New job, add to unique list
        // Also check against other jobs in this batch
        const batchKey = this.getBatchKey(job);
        if (!seenIds.has(batchKey)) {
          seenIds.add(batchKey);
          uniqueJobs.push(job);
        } else {
          stats.skipped++;
        }
      }
    }

    logger.info(`Deduplication complete: ${stats.duplicatesFound} duplicates found, ${uniqueJobs.length} unique jobs`);
    return { uniqueJobs, stats };
  }

  /**
   * Generate a fingerprint for a job based on content
   */
  private generateFingerprint(job: NormalizedJob): string {
    const content = [
      job.title,
      job.company.normalizedName,
      job.descriptionText?.substring(0, 500) || '',
      job.search?.normalizedLocation || '',
    ].join('|');

    return createHash('sha256').update(content.toLowerCase()).digest('hex');
  }

  /**
   * Get a batch-unique key for a job
   */
  private getBatchKey(job: NormalizedJob): string {
    return `${job.source.primary}:${job.source.sourceJobId}`;
  }

  /**
   * Normalize URL for comparison
   */
  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Remove trailing slash, normalize protocol, remove www
      return `${parsed.protocol}//${parsed.hostname.replace(/^www\./, '')}${parsed.pathname}`.toLowerCase();
    } catch {
      return url.toLowerCase().trim();
    }
  }

  /**
   * Normalize job title for comparison
   */
  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, '') // Remove special chars
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\b(senior|sr\.?|junior|jr\.?|lead|principal|staff|chief)\b/g, '') // Remove seniority
      .trim();
  }

  /**
   * Normalize company name for comparison
   */
  private normalizeCompany(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/\b(inc|llc|ltd|corp|co|company|technologies|tech|labs|systems)\b/g, '')
      .trim();
  }

  /**
   * Normalize location for comparison
   */
  private normalizeLocation(location: any): string {
    if (!location) return '';
    
    const parts = [
      location.city,
      location.state,
      location.country,
    ].filter(Boolean);

    return parts
      .join(', ')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s,]/g, '')
      .replace(/\s+/g, ' ');
  }

  /**
   * Escape regex special characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

export const deduplicationService = new DeduplicationService();
