/**
 * Demand Tracker
 *
 * Records and aggregates search demand for role families.
 * Feeds the ingestion scheduler with prioritized refresh requests.
 *
 * Design: individual search events are aggregated into demand segments
 * (roleFamily + country + remote). We store a sample of user IDs
 * (capped at 50) for debugging, but primarily track counts.
 */

import { getJobDemandModel, buildDemandId, MAX_USER_SAMPLE_SIZE } from '@/models/JobDemand';

// ── Types ───────────────────────────────────────────────────────────────────

export interface DemandRecordParams {
  query: string;
  roleFamily: string;
  country?: string;
  remote?: boolean;
  userId: string;
}

export interface PriorityFactors {
  demandCount: number;
  uniqueUsers: number;
  freshnessAgeMs: number;
  historicalYield: number;
  sourceAvailability: number;
  roleImportance: number;
}

// ── Priority Weights ────────────────────────────────────────────────────────

const PRIORITY_WEIGHTS = {
  DEMAND: 0.35,       // max 35 points from search volume
  USERS: 0.20,        // max 20 points from unique users
  FRESHNESS: 0.20,    // max 20 points from staleness
  YIELD: 0.15,        // max 15 points from historical results
  ROLE_IMPORTANCE: 0.10, // max 10 points from role weight
};

// Role importance weights (higher = more important to maintain fresh)
const ROLE_IMPORTANCE: Record<string, number> = {
  SOFTWARE_ENGINEERING: 95,
  FRONTEND: 90,
  BACKEND: 90,
  FULLSTACK: 88,
  DATA_SCIENCE: 85,
  DATA_ENGINEERING: 83,
  DATA_ANALYTICS: 80,
  ML_ENGINEERING: 85,
  DEVOPS: 82,
  PRODUCT_MANAGEMENT: 80,
  IT_SUPPORT: 78,
  SERVICE_DESK: 75,
  DESKTOP_SUPPORT: 72,
  QA: 70,
  SECURITY: 75,
  MOBILE: 78,
  UX_DESIGN: 72,
  UI_DESIGN: 70,
  PRODUCT_DESIGN: 70,
  DIGITAL_MARKETING: 65,
  CONTENT_MARKETING: 60,
  SEO: 60,
  GROWTH_MARKETING: 65,
  SALES: 60,
  ACCOUNT_EXECUTIVE: 58,
  CUSTOMER_SUCCESS: 55,
  CUSTOMER_SUPPORT: 50,
  OPERATIONS: 55,
  FINANCE: 55,
  ACCOUNTING: 50,
  HR: 50,
  RECRUITING: 50,
  PROJECT_MANAGEMENT: 60,
  BUSINESS_ANALYST: 65,
  NETWORK_SUPPORT: 60,
  EMBEDDED_SYSTEMS: 55,
  GAME_DEVELOPMENT: 45,
  TECHNICAL_WRITER: 40,
  DEVELOPER_ADVOCATE: 45,
  DATA_PLATFORM: 70,
};

// ── Core Operations ─────────────────────────────────────────────────────────

export class DemandTracker {
  /**
   * Record a search event. Aggregates into the demand segment.
   * This is idempotent and safe to call concurrently.
   */
  static async recordSearch(params: DemandRecordParams): Promise<void> {
    const JobDemand = getJobDemandModel();
    const demandId = buildDemandId({
      roleFamily: params.roleFamily,
      country: params.country,
      remote: params.remote,
    });

    const now = new Date();

    try {
      await JobDemand.findOneAndUpdate(
        { _id: demandId },
        {
          $inc: { demandCount: 1 },
          $addToSet: {
            userSample: { $each: params.userId ? [params.userId] : [] },
          },
          $set: {
            lastRequestedAt: now,
            status: 'idle', // reset to idle so scheduler can evaluate
          },
          $setOnInsert: {
            normalizedQuery: params.query,
            roleFamily: params.roleFamily,
            location: params.country || '',
            country: params.country || 'GLOBAL',
            remote: params.remote || false,
          },
        },
        { upsert: true }
      );

      // Enforce user sample cap (update separately to avoid $addToSet growing unbounded)
      const doc = await JobDemand.findById(demandId).lean();
      if (doc && doc.userSample && doc.userSample.length > MAX_USER_SAMPLE_SIZE) {
        await JobDemand.updateOne(
          { _id: demandId },
          { $set: { userSample: doc.userSample.slice(0, MAX_USER_SAMPLE_SIZE) } }
        );
      }
    } catch (err) {
      // Non-blocking: demand recording should never fail the search
      console.warn('[DemandTracker] Failed to record demand:', err);
    }
  }

  /**
   * Calculate a priority score (0-100) for a demand segment.
   */
  static async calculatePriority(demandId: string): Promise<number> {
    const JobDemand = getJobDemandModel();
    const doc = await JobDemand.findById(demandId).lean();
    if (!doc) return 0;

    return DemandTracker.computePriorityScore(doc);
  }

  /**
   * Compute priority score from a demand document.
   */
  static computePriorityScore(doc: {
    demandCount: number;
    uniqueUsers: number;
    lastFetchedAt: Date | null;
    sourcePerformance?: Array<{ lastYield: number }>;
    roleFamily: string;
  }): number {
    // Demand volume (max 35)
    const demandScore = Math.min(35, (doc.demandCount / 20) * 35);

    // Unique users (max 20)
    const userScore = Math.min(20, (doc.uniqueUsers / 10) * 20);

    // Freshness (max 20) - more stale = higher priority
    let freshnessScore = 0;
    if (doc.lastFetchedAt) {
      const ageMs = Date.now() - new Date(doc.lastFetchedAt).getTime();
      const ageHours = ageMs / (1000 * 60 * 60);
      freshnessScore = Math.min(20, (ageHours / 6) * 20); // max at 6 hours stale
    } else {
      freshnessScore = 20; // never fetched = highest freshness priority
    }

    // Historical yield (max 15)
    const avgYield = doc.sourcePerformance?.length
      ? doc.sourcePerformance.reduce((sum, s) => sum + s.lastYield, 0) / doc.sourcePerformance.length
      : 0;
    const yieldScore = Math.min(15, (avgYield / 100) * 15);

    // Role importance (max 10)
    const roleScore = ((ROLE_IMPORTANCE[doc.roleFamily] || 50) / 100) * 10;

    const total = Math.round(
      demandScore * PRIORITY_WEIGHTS.DEMAND +
      userScore * PRIORITY_WEIGHTS.USERS +
      freshnessScore * PRIORITY_WEIGHTS.FRESHNESS +
      yieldScore * PRIORITY_WEIGHTS.YIELD +
      roleScore * PRIORITY_WEIGHTS.ROLE_IMPORTANCE
    );

    return Math.min(100, Math.max(1, total));
  }

  /**
   * Get demand segments that need refreshing, ordered by priority.
   */
  static async getStaleSegments(limit = 10): Promise<any[]> {
    const JobDemand = getJobDemandModel();

    return JobDemand.find({
      status: { $in: ['idle', 'stale'] },
      $or: [
        { lastFetchedAt: null },
        { lastFetchedAt: { $lt: new Date(Date.now() - 30 * 60 * 1000) } }, // 30+ minutes stale
      ],
    })
      .sort({ priority: -1, lastRequestedAt: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Get segments ready for processing by the scheduler.
   */
  static async getSegmentsToProcess(limit = 5): Promise<any[]> {
    const JobDemand = getJobDemandModel();

    return JobDemand.find({
      status: { $in: ['idle', 'stale', 'queued'] },
      $or: [
        { nextEligibleFetchAt: { $lte: new Date() } },
        { nextEligibleFetchAt: null },
      ],
    })
      .sort({ priority: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Mark a segment as being fetched.
   */
  static async claimSegment(demandId: string, runId: string): Promise<boolean> {
    const JobDemand = getJobDemandModel();

    const result = await JobDemand.findOneAndUpdate(
      {
        _id: demandId,
        status: { $in: ['idle', 'stale', 'queued'] },
      },
      {
        $set: {
          status: 'fetching',
          activeRunId: runId,
        },
      }
    );

    return !!result;
  }

  /**
   * Release a segment after fetching completes.
   */
  static async releaseSegment(
    demandId: string,
    runId: string,
    yieldCount: number,
    durationMs: number,
    sourceName?: string
  ): Promise<void> {
    const JobDemand = getJobDemandModel();
    const now = new Date();

    const update: any = {
      $set: {
        status: 'idle',
        activeRunId: null,
        lastFetchedAt: now,
        // Set next eligible fetch based on current priority
        nextEligibleFetchAt: new Date(now.getTime() + 30 * 60 * 1000), // 30 min minimum
      },
    };

    // Update source performance if source is specified
    if (sourceName) {
      update.$push = {
        sourcePerformance: {
          $each: [
            {
              source: sourceName,
              lastYield: yieldCount,
              lastDuration: durationMs,
              lastSuccess: now,
              lastFailure: null,
              consecutiveFailures: 0,
            },
          ],
          $slice: -10, // keep last 10 source entries
        },
      };
    }

    await JobDemand.findOneAndUpdate({ _id: demandId, activeRunId: runId }, update);
  }

  /**
   * Record a failure for a segment.
   */
  static async recordFailure(demandId: string, runId: string, sourceName?: string): Promise<void> {
    const JobDemand = getJobDemandModel();

    const update: any = {
      $set: {
        status: 'idle',
        activeRunId: null,
      },
      $inc: {},
    };

    if (sourceName) {
      // Increment consecutive failures for this source
      update.$inc[`sourcePerformance.$[elem].consecutiveFailures`] = 1;
      update.$set[`sourcePerformance.$[elem].lastFailure`] = new Date();
    }

    const arrayFilters = sourceName ? [{ 'elem.source': sourceName }] : undefined;

    await JobDemand.findOneAndUpdate(
      { _id: demandId, activeRunId: runId },
      update,
      arrayFilters ? { arrayFilters } : {}
    );
  }

  /**
   * Get all demand segments with basic stats.
   */
  static async getAllDemand(options?: {
    status?: string;
    minPriority?: number;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    const JobDemand = getJobDemandModel();
    const filter: any = {};

    if (options?.status) filter.status = options.status;
    if (options?.minPriority) filter.priority = { $gte: options.minPriority };

    return JobDemand.find(filter)
      .sort({ priority: -1, lastRequestedAt: -1 })
      .skip(options?.offset || 0)
      .limit(options?.limit || 100)
      .lean();
  }

  /**
   * Get demand statistics for the admin dashboard.
   */
  static async getStats(): Promise<{
    totalSegments: number;
    totalDemand: number;
    totalUniqueUsers: number;
    staleSegments: number;
    activeSegments: number;
    topDemand: Array<{ roleFamily: string; demandCount: number; uniqueUsers: number; priority: number }>;
  }> {
    const JobDemand = getJobDemandModel();

    const [totalSegments, stats, staleCount, activeCount, topDemand] = await Promise.all([
      JobDemand.countDocuments(),
      JobDemand.aggregate([
        {
          $group: {
            _id: null,
            totalDemand: { $sum: '$demandCount' },
            totalUniqueUsers: { $sum: '$uniqueUsers' },
          },
        },
      ]),
      JobDemand.countDocuments({
        status: { $in: ['idle', 'stale'] },
        $or: [
          { lastFetchedAt: null },
          { lastFetchedAt: { $lt: new Date(Date.now() - 60 * 60 * 1000) } },
        ],
      }),
      JobDemand.countDocuments({ status: 'fetching' }),
      JobDemand.find()
        .sort({ demandCount: -1 })
        .limit(10)
        .select('roleFamily demandCount uniqueUsers priority')
        .lean(),
    ]);

    return {
      totalSegments,
      totalDemand: stats[0]?.totalDemand || 0,
      totalUniqueUsers: stats[0]?.totalUniqueUsers || 0,
      staleSegments: staleCount,
      activeSegments: activeCount,
      topDemand,
    };
  }
}
