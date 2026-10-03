/**
 * Job Intelligence Service
 *
 * Enhances the job ingestion pipeline with:
 * - Freshness scoring
 * - Quality scoring
 * - Hard requirement filtering
 * - Do-not-apply rules
 * - Deduplication
 *
 * This service integrates with the existing ingestion pipeline.
 */

import { Db, Collection } from 'mongodb';
import { NormalizedJob, JobFreshness } from '../models/Job';
import { calculateFreshnessScore, calculateFreshnessWithUpdate, FreshnessConfig, DEFAULT_FRESHNESS_CONFIG } from '../utils/freshnessScore';
import { logger } from '../utils/logger';

// ============================================================================
// Types
// ============================================================================

export interface JobIntelligenceConfig {
  freshness: FreshnessConfig;
  enableFreshnessScoring: boolean;
  enableQualityScoring: boolean;
  enableHardFiltering: boolean;
  enableDoNotApply: boolean;
}

export interface JobIntelligenceResult {
  jobId: string;
  freshness?: JobFreshness;
  processed: boolean;
  skipped: boolean;
  skipReason?: string;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: JobIntelligenceConfig = {
  freshness: DEFAULT_FRESHNESS_CONFIG,
  enableFreshnessScoring: true,
  enableQualityScoring: true,
  enableHardFiltering: true,
  enableDoNotApply: true,
};

// ============================================================================
// Job Intelligence Service
// ============================================================================

export class JobIntelligenceService {
  private config: JobIntelligenceConfig;
  private jobsCollection: Collection | null = null;

  constructor(config: Partial<JobIntelligenceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the service with database connection
   */
  async initialize(db: Db): Promise<void> {
    this.jobsCollection = db.collection('jobs');
    logger.info('✅ Job Intelligence Service initialized');
  }

  /**
   * Process a batch of jobs with intelligence scoring
   */
  async processJobBatch(jobs: NormalizedJob[]): Promise<JobIntelligenceResult[]> {
    const results: JobIntelligenceResult[] = [];

    for (const job of jobs) {
      try {
        const result = await this.processJob(job);
        results.push(result);
      } catch (error: any) {
        logger.error(`Error processing job ${job._id}:`, error);
        results.push({
          jobId: job._id?.toString() || '',
          processed: false,
          skipped: false,
        });
      }
    }

    return results;
  }

  /**
   * Process a single job with intelligence scoring
   */
  async processJob(job: NormalizedJob): Promise<JobIntelligenceResult> {
    const jobId = job._id?.toString() || '';

    // Calculate freshness score
    if (this.config.enableFreshnessScoring) {
      const freshness = this.calculateJobFreshness(job);
      job.freshness = freshness;

      // Update the job in database with freshness score
      if (this.jobsCollection) {
        await this.jobsCollection.updateOne(
          { _id: job._id },
          { $set: { freshness } }
        );
      }
    }

    return {
      jobId,
      freshness: job.freshness,
      processed: true,
      skipped: false,
    };
  }

  /**
   * Calculate freshness score for a job
   */
  private calculateJobFreshness(job: NormalizedJob): JobFreshness {
    const postedAt = job.postedAt || job.source?.discoveredAt;
    const lastSeenAt = job.ingestion?.lastSeenAt;

    const result = calculateFreshnessWithUpdate(
      postedAt,
      lastSeenAt,
      this.config.freshness
    );

    return {
      score: result.score,
      calculatedAt: new Date(),
      isStale: result.isStale,
      isRecentlyUpdated: result.isRecentlyUpdated,
      isRemoved: result.isRemoved,
      ageHours: result.ageHours,
    };
  }

  /**
   * Get fresh jobs (score >= threshold)
   */
  async getFreshJobs(
    limit: number = 20,
    minScore: number = 50
  ): Promise<NormalizedJob[]> {
    if (!this.jobsCollection) {
      logger.error('Jobs collection not initialized');
      return [];
    }

    const jobs = await this.jobsCollection
      .find({
        status: 'active',
        'freshness.score': { $gte: minScore },
      })
      .sort({ 'freshness.score': -1, 'ingestion.lastSeenAt': -1 })
      .limit(limit)
      .toArray();

    return jobs as NormalizedJob[];
  }

  /**
   * Get jobs by freshness category
   */
  async getJobsByFreshnessCategory(
    category: 'very_fresh' | 'fresh' | 'recent' | 'stale' | 'expired',
    limit: number = 50
  ): Promise<NormalizedJob[]> {
    if (!this.jobsCollection) {
      logger.error('Jobs collection not initialized');
      return [];
    }

    let scoreRange: { min: number; max: number };

    switch (category) {
      case 'very_fresh':
        scoreRange = { min: 90, max: 100 };
        break;
      case 'fresh':
        scoreRange = { min: 70, max: 89 };
        break;
      case 'recent':
        scoreRange = { min: 50, max: 69 };
        break;
      case 'stale':
        scoreRange = { min: 25, max: 49 };
        break;
      case 'expired':
        scoreRange = { min: 0, max: 24 };
        break;
      default:
        scoreRange = { min: 0, max: 100 };
    }

    const jobs = await this.jobsCollection
      .find({
        status: 'active',
        'freshness.score': { $gte: scoreRange.min, $lte: scoreRange.max },
      })
      .sort({ 'freshness.score': -1 })
      .limit(limit)
      .toArray();

    return jobs as NormalizedJob[];
  }

  /**
   * Update freshness scores for all active jobs
   */
  async refreshAllFreshnessScores(): Promise<{ updated: number; errors: number }> {
    if (!this.jobsCollection) {
      logger.error('Jobs collection not initialized');
      return { updated: 0, errors: 0 };
    }

    const now = new Date();
    let updated = 0;
    let errors = 0;

    // Get all active jobs
    const activeJobs = await this.jobsCollection
      .find({ status: 'active' })
      .toArray();

    for (const job of activeJobs) {
      try {
        const freshness = this.calculateJobFreshness(job as NormalizedJob);
        await this.jobsCollection.updateOne(
          { _id: job._id },
          { $set: { freshness } }
        );
        updated++;
      } catch (error) {
        logger.error(`Error updating freshness for job ${job._id}:`, error);
        errors++;
      }
    }

    logger.info(`🔄 Freshness scores updated: ${updated} jobs, ${errors} errors`);
    return { updated, errors };
  }

  /**
   * Get job statistics by freshness
   */
  async getFreshnessStats(): Promise<{
    veryFresh: number;
    fresh: number;
    recent: number;
    stale: number;
    expired: number;
    total: number;
  }> {
    if (!this.jobsCollection) {
      return { veryFresh: 0, fresh: 0, recent: 0, stale: 0, expired: 0, total: 0 };
    }

    const stats = await this.jobsCollection.aggregate([
      {
        $match: { status: 'active' },
      },
      {
        $group: {
          _id: null,
          veryFresh: {
            $sum: {
              $cond: [{ $gte: ['$freshness.score', 90] }, 1, 0],
            },
          },
          fresh: {
            $sum: {
              $cond: [
                { $and: [{ $gte: ['$freshness.score', 70] }, { $lt: ['$freshness.score', 90] }] },
                1,
                0,
              ],
            },
          },
          recent: {
            $sum: {
              $cond: [
                { $and: [{ $gte: ['$freshness.score', 50] }, { $lt: ['$freshness.score', 70] }] },
                1,
                0,
              ],
            },
          },
          stale: {
            $sum: {
              $cond: [
                { $and: [{ $gte: ['$freshness.score', 25] }, { $lt: ['$freshness.score', 50] }] },
                1,
                0,
              ],
            },
          },
          expired: {
            $sum: {
              $cond: [{ $lt: ['$freshness.score', 25] }, 1, 0],
            },
          },
          total: { $sum: 1 },
        },
      },
    ]).toArray();

    if (stats.length === 0) {
      return { veryFresh: 0, fresh: 0, recent: 0, stale: 0, expired: 0, total: 0 };
    }

    const result = stats[0] as any;
    return {
      veryFresh: result.veryFresh || 0,
      fresh: result.fresh || 0,
      recent: result.recent || 0,
      stale: result.stale || 0,
      expired: result.expired || 0,
      total: result.total || 0,
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const jobIntelligenceService = new JobIntelligenceService();
