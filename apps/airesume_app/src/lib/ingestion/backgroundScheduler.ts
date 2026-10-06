/**
 * Background Scheduler
 *
 * Orchestrates the complete ingestion pipeline:
 * 1. Process demand-driven segments (highest priority first)
 * 2. Run baseline schedule (non-demand-driven refresh)
 * 3. Recover stale runs
 * 4. Cleanup expired locks
 *
 * Designed to be called by a Vercel cron job or similar scheduler.
 * Each invocation processes a bounded amount of work to stay within
 * serverless function time limits.
 */

import { getConnection } from '@/lib/database';
import mongoose from 'mongoose';
import { IngestionScheduler } from './scheduler';
import { BaselineScheduler } from './baselineSchedule';
import { IngestionLock } from './ingestionLock';
import { DemandTracker } from '@/lib/demand/demandTracker';
import { recoverStaleRuns } from './engine';

// ── Types ───────────────────────────────────────────────────────────────────

export interface SchedulerRunResult {
  timestamp: string;
  duration: number;
  steps: {
    lockCleanup: { cleaned: number };
    staleRecovery: { recovered: number };
    demandProcessing: {
      processed: number;
      succeeded: number;
      failed: number;
      skipped: number;
    };
    baselineSchedule: {
      ran: string[];
      skipped: string[];
      failed: string[];
    };
  };
  errors: string[];
}

// ── Orchestrator ────────────────────────────────────────────────────────────

export class BackgroundScheduler {
  /**
   * Run a complete scheduler cycle.
   * Bounded execution to stay within serverless time limits.
   */
  static async run(): Promise<SchedulerRunResult> {
    const startTime = Date.now();
    const result: SchedulerRunResult = {
      timestamp: new Date().toISOString(),
      duration: 0,
      steps: {
        lockCleanup: { cleaned: 0 },
        staleRecovery: { recovered: 0 },
        demandProcessing: { processed: 0, succeeded: 0, failed: 0, skipped: 0 },
        baselineSchedule: { ran: [], skipped: [], failed: [] },
      },
      errors: [],
    };

    try {
      await getConnection();
    } catch (err: any) {
      result.errors.push(`Database connection failed: ${err.message}`);
      result.duration = Date.now() - startTime;
      return result;
    }

    // ── Step 1: Cleanup stale locks ──────────────────────────────────────
    try {
      result.steps.lockCleanup.cleaned = await IngestionLock.cleanupStale(30 * 60 * 1000);
    } catch (err: any) {
      result.errors.push(`Lock cleanup failed: ${err.message}`);
    }

    // ── Step 2: Recover stale runs ───────────────────────────────────────
    try {
      await recoverStaleRuns(mongoose.connection.db!);
      const runsColl = mongoose.connection.db!.collection('ingestionRuns');
      const staleCount = await runsColl.countDocuments({
        status: 'failed',
        errorCode: 'STALE_RUN',
        finishedAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
      });
      result.steps.staleRecovery.recovered = staleCount;
    } catch (err: any) {
      result.errors.push(`Stale run recovery failed: ${err.message}`);
    }

    // ── Step 3: Process demand queue ─────────────────────────────────────
    // Limit to 2 segments per cycle to stay within time limits
    try {
      const demandResult = await IngestionScheduler.processDemandQueue(2);
      result.steps.demandProcessing = {
        processed: demandResult.processed,
        succeeded: demandResult.succeeded,
        failed: demandResult.failed,
        skipped: demandResult.skipped,
      };
    } catch (err: any) {
      result.errors.push(`Demand processing failed: ${err.message}`);
    }

    // ── Step 4: Run baseline schedule ────────────────────────────────────
    // Only run if we have time left (Vercel cron has 60s limit by default)
    const elapsed = Date.now() - startTime;
    if (elapsed < 45000) { // 45 seconds budget
      try {
        const baselineResult = await BaselineScheduler.runBaselineCycle();
        result.steps.baselineSchedule = baselineResult;
      } catch (err: any) {
        result.errors.push(`Baseline schedule failed: ${err.message}`);
      }
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Quick health check - returns system status without running anything.
   */
  static async healthCheck(): Promise<{
    locks: { active: number; stale: number };
    demand: { total: number; stale: number; fetching: number };
    sources: { total: number; healthy: number; unhealthy: number };
  }> {
    try {
      await getConnection();
    } catch {
      return {
        locks: { active: 0, stale: 0 },
        demand: { total: 0, stale: 0, fetching: 0 },
        sources: { total: 0, healthy: 0, unhealthy: 0 },
      };
    }

    const db = mongoose.connection.db!;

    const [activeLocks, staleLocks, totalDemand, staleDemand, fetchingDemand, sources] = await Promise.all([
      IngestionLock.getActiveCount(),
      db.collection('ingestionLocks').countDocuments({
        expiresAt: { $lt: new Date() },
      }),
      db.collection('jobDemand').countDocuments(),
      db.collection('jobDemand').countDocuments({
        status: { $in: ['idle', 'stale'] },
        $or: [
          { lastFetchedAt: null },
          { lastFetchedAt: { $lt: new Date(Date.now() - 60 * 60 * 1000) } },
        ],
      }),
      db.collection('jobDemand').countDocuments({ status: 'fetching' }),
      db.collection('jobSources').find().toArray(),
    ]);

    const healthySources = sources.filter((s: any) => s.status?.health === 'healthy').length;

    return {
      locks: { active: activeLocks, stale: staleLocks },
      demand: { total: totalDemand, stale: staleDemand, fetching: fetchingDemand },
      sources: {
        total: sources.length,
        healthy: healthySources,
        unhealthy: sources.length - healthySources,
      },
    };
  }
}
