/**
 * Ingestion Scheduler
 *
 * Priority-based scheduler that processes demand segments.
 * Works with the ingestion engine to refresh job data based on:
 * - User demand (search volume, unique users)
 * - Freshness (how stale is the catalogue)
 * - Source performance (historical yield)
 * - Role importance (weights for high-demand roles)
 *
 * Integrates with:
 * - DemandTracker (reads demand segments)
 * - IngestionLock (prevents duplicate runs)
 * - engine.ts (executeSourceRun for actual fetching)
 */

import { getConnection } from '@/lib/database';
import mongoose from 'mongoose';
import { DemandTracker } from '@/lib/demand/demandTracker';
import { IngestionLock, buildSegmentKey } from '@/lib/ingestion/ingestionLock';
import {
  createRun,
  executeSourceRun,
  completeRun,
  checkSourceConfig,
  SOURCE_REGISTRY,
  type SourceProgress,
} from '@/lib/ingestion/engine';
import { ROLE_TAXONOMY } from '@/lib/taxonomy/roleTaxonomy';

// ── Types ───────────────────────────────────────────────────────────────────

export interface SchedulerResult {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  details: Array<{
    demandId: string;
    roleFamily: string;
    status: 'success' | 'failed' | 'skipped';
    runId?: string;
    jobsFound?: number;
    error?: string;
  }>;
}

export interface SourceHealthStatus {
  source: string;
  enabled: boolean;
  healthy: boolean;
  healthStatus: 'healthy' | 'degraded' | 'stale' | 'failed' | 'config_error' | 'not_initialized' | 'running' | 'paused' | 'disabled';
  lastRunAt: Date | null;
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
  consecutiveFailures: number;
  avgYield: number;
  avgDuration: number;
  nextEligibleRun: Date;
}

// ── Scheduler ───────────────────────────────────────────────────────────────

export class IngestionScheduler {
  /**
   * Process the demand queue: pick highest-priority segments and refresh them.
   */
  static async processDemandQueue(maxSegments = 3): Promise<SchedulerResult> {
    await getConnection();
    const db = mongoose.connection.db!;
    const segments = await DemandTracker.getSegmentsToProcess(maxSegments);
    const result: SchedulerResult = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      details: [],
    };

    for (const segment of segments) {
      result.processed++;

      // Build segment key for locking
      const segmentKey = buildSegmentKey({
        roleFamily: segment.roleFamily,
        country: segment.country,
        remote: segment.remote,
      });

      // Try to acquire lock
      const runId = `demand-${segment._id}-${Date.now()}`;
      const acquired = await IngestionLock.acquire({
        segmentKey,
        runId,
        ttlSeconds: 600, // 10 minutes
      });

      if (!acquired) {
        result.skipped++;
        result.details.push({
          demandId: segment._id,
          roleFamily: segment.roleFamily,
          status: 'skipped',
          error: 'Lock already held by another worker',
        });
        continue;
      }

      // Claim the segment
      const claimed = await DemandTracker.claimSegment(segment._id, runId);
      if (!claimed) {
        await IngestionLock.release(segmentKey, runId);
        result.skipped++;
        result.details.push({
          demandId: segment._id,
          roleFamily: segment.roleFamily,
          status: 'skipped',
          error: 'Segment already being processed',
        });
        continue;
      }

      try {
        // Determine which sources to run based on demand
        const sources = IngestionScheduler.selectSourcesForSegment(segment);
        let totalJobsFound = 0;
        let hasError = false;

        for (const sourceName of sources) {
          const config = checkSourceConfig(sourceName);
          if (!config.ready) continue;

          // Create a run for this source
          const { runId: sourceRunId } = await createRun(db, sourceName, `${runId}-${sourceName}`);

          // Execute — pass region context for LinkedIn
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5 * 60 * 1000); // 5 min timeout

          try {
            // Build fetch options for region-aware sources
            const fetchOptions: Record<string, any> = {};
            if (sourceName === 'linkedin' && segment.country) {
              // Use the demand segment's country to determine LinkedIn search region
              fetchOptions.regions = [segment.country];
              fetchOptions.keyword = segment.roleFamily
                ? segment.roleFamily.replace(/_/g, ' ')
                : undefined;
              console.log('[SCHEDULER]', `LinkedIn: will search region=${segment.country}, keyword=${fetchOptions.keyword || 'default'}`);
            }

            const progress = await executeSourceRun(db, sourceName, sourceRunId, controller.signal, fetchOptions);
            totalJobsFound += progress.fetched;

            if (progress.status === 'failed') {
              hasError = true;
              await DemandTracker.recordFailure(segment._id, runId, sourceName);
            } else {
              await DemandTracker.releaseSegment(segment._id, runId, progress.fetched, progress.durationMs || 0, sourceName);
            }
          } finally {
            clearTimeout(timeout);
          }
        }

        if (hasError) {
          result.failed++;
          result.details.push({
            demandId: segment._id,
            roleFamily: segment.roleFamily,
            status: 'failed',
            runId,
            jobsFound: totalJobsFound,
            error: 'One or more sources failed',
          });
        } else {
          result.succeeded++;
          result.details.push({
            demandId: segment._id,
            roleFamily: segment.roleFamily,
            status: 'success',
            runId,
            jobsFound: totalJobsFound,
          });
        }
      } catch (err: any) {
        result.failed++;
        result.details.push({
          demandId: segment._id,
          roleFamily: segment.roleFamily,
          status: 'failed',
          runId,
          error: err.message,
        });
        await IngestionLock.release(segmentKey, runId);
      }
    }

    return result;
  }

  /**
   * Select which sources to run for a demand segment.
   * Uses role family to determine relevant sources.
   */
  static selectSourcesForSegment(segment: { roleFamily: string; country: string }): string[] {
    const sources: string[] = [];

    // Always include public API sources (Greenhouse, Lever, Ashby)
    // They cover a wide range of roles
    for (const source of ['greenhouse', 'lever', 'ashby']) {
      const config = checkSourceConfig(source);
      if (config.ready) sources.push(source);
    }

    // Include Workday for enterprise roles
    const workdayConfig = checkSourceConfig('workday');
    if (workdayConfig.ready) sources.push('workday');

    // Include Adzuna if configured (covers many countries)
    const adzunaConfig = checkSourceConfig('adzuna');
    if (adzunaConfig.ready) sources.push('adzuna');

    // Include JobSpy for broad coverage (but it's slow)
    // Only include for high-priority segments
    const priority = DemandTracker.computePriorityScore({
      demandCount: segment.roleFamily ? 10 : 1,
      uniqueUsers: 5,
      lastFetchedAt: null,
      roleFamily: segment.roleFamily,
      sourcePerformance: [],
    });

    if (priority >= 70) {
      const jobspyConfig = checkSourceConfig('jobspy');
      if (jobspyConfig.ready) sources.push('jobspy');
    }

    // Include LinkedIn for high-priority segments (if enabled)
    if (priority >= 80) {
      const linkedinConfig = checkSourceConfig('linkedin');
      if (linkedinConfig.ready) sources.push('linkedin');
    }

    return sources;
  }

  /**
   * Get the next scheduled run time for a source based on baseline schedule.
   */
  static getNextScheduledRun(sourceName: string, lastRunAt: Date | null): Date {
    const intervals: Record<string, number> = {
      greenhouse: 3 * 60 * 60 * 1000,  // 3 hours
      lever: 3 * 60 * 60 * 1000,       // 3 hours
      ashby: 3 * 60 * 60 * 1000,       // 3 hours
      workday: 6 * 60 * 60 * 1000,     // 6 hours
      adzuna: 6 * 60 * 60 * 1000,      // 6 hours
      jobspy: 8 * 60 * 60 * 1000,      // 8 hours
      remotive: 8 * 60 * 60 * 1000,    // 8 hours
      remoteok: 8 * 60 * 60 * 1000,    // 8 hours
      linkedin: 12 * 60 * 60 * 1000,   // 12 hours
    };

    const interval = intervals[sourceName] || 6 * 60 * 60 * 1000;
    const lastRun = lastRunAt ? new Date(lastRunAt).getTime() : 0;
    return new Date(lastRun + interval);
  }

  /**
   * Get health status for all sources.
   * Health is determined by:
   * - Whether the source is configured
   * - Whether the last run succeeded
   * - Whether there are consecutive failures
   * - Whether the source is stale (hasn't run in a while)
   */
  static async getSourceHealth(): Promise<SourceHealthStatus[]> {
    await getConnection();
    const db = mongoose.connection.db!;
    const sourcesColl = db.collection('jobSources');
    const sources = await sourcesColl.find({}).toArray();

    const healthStatuses: SourceHealthStatus[] = [];

    for (const source of sources) {
      const name = source.name;
      const def = SOURCE_REGISTRY[name];

      // Determine health status
      const healthStatus = IngestionScheduler.determineHealthStatus(source, def);

      healthStatuses.push({
        source: name,
        enabled: def?.enabled ?? false,
        healthy: healthStatus === 'healthy',
        healthStatus,
        lastRunAt: source.status?.lastRunAt || null,
        lastSuccessAt: source.status?.lastSuccessAt || null,
        lastFailureAt: source.status?.lastFailureAt || null,
        consecutiveFailures: source.status?.consecutiveFailures || 0,
        avgYield: source.statistics?.avgYield || 0,
        avgDuration: source.statistics?.avgDuration || 0,
        nextEligibleRun: IngestionScheduler.getNextScheduledRun(name, source.status?.lastRunAt),
      });
    }

    // Add sources that exist in registry but not in DB
    for (const [name, def] of Object.entries(SOURCE_REGISTRY)) {
      if (!healthStatuses.find((h) => h.source === name)) {
        healthStatuses.push({
          source: name,
          enabled: def.enabled,
          healthy: false,
          healthStatus: def.enabled ? 'not_initialized' : 'disabled',
          lastRunAt: null,
          lastSuccessAt: null,
          lastFailureAt: null,
          consecutiveFailures: 0,
          avgYield: 0,
          avgDuration: 0,
          nextEligibleRun: new Date(),
        });
      }
    }

    return healthStatuses;
  }

  /**
   * Determine the health status of a source based on its run history.
   */
  static determineHealthStatus(
    source: any,
    def: any
  ): 'healthy' | 'degraded' | 'stale' | 'failed' | 'config_error' | 'not_initialized' | 'running' | 'paused' | 'disabled' {
    // Disabled source
    if (!def?.enabled) return 'disabled';

    // Check if currently running
    if (source.status?.health === 'running') return 'running';

    // Not configured
    const config = checkSourceConfig(source.name);
    if (!config.ready) return 'config_error';

    // Never run
    if (!source.status?.lastRunAt) return 'not_initialized';

    // Has consecutive failures
    if (source.status?.consecutiveFailures > 0) {
      if (source.status.consecutiveFailures >= 5) return 'failed';
      return 'degraded';
    }

    // Last run was successful
    if (source.status?.lastSuccessAt) {
      const lastSuccess = new Date(source.status.lastSuccessAt).getTime();
      const hoursSinceSuccess = (Date.now() - lastSuccess) / (1000 * 60 * 60);

      // Stale if hasn't run in 2x the refresh interval
      if (def?.refreshIntervalMs) {
        const staleThreshold = (def.refreshIntervalMs * 2) / (1000 * 60 * 60);
        if (hoursSinceSuccess > staleThreshold) return 'stale';
      }

      return 'healthy';
    }

    // Has run but never succeeded
    if (source.status?.lastFailureAt) return 'degraded';

    return 'not_initialized';
  }
}
