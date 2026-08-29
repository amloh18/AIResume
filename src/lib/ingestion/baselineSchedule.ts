/**
 * Baseline Schedule
 *
 * Non-demand-driven ingestion schedule.
 * Ensures all sources are refreshed periodically regardless of user demand.
 * Staggered to avoid all sources firing simultaneously.
 */

import { getConnection } from '@/lib/database';
import mongoose from 'mongoose';
import {
  createRun,
  executeSourceRun,
  completeRun,
  checkSourceConfig,
  SOURCE_REGISTRY,
  recoverStaleRuns,
} from '@/lib/ingestion/engine';

// ── Schedule Configuration ──────────────────────────────────────────────────

export interface SourceSchedule {
  source: string;
  intervalMs: number;
  maxDurationMs: number;
  enabled: boolean;
}

export const BASELINE_SCHEDULES: SourceSchedule[] = [
  { source: 'greenhouse', intervalMs: 3 * 60 * 60 * 1000, maxDurationMs: 5 * 60 * 1000, enabled: true },
  { source: 'lever', intervalMs: 3 * 60 * 60 * 1000, maxDurationMs: 5 * 60 * 1000, enabled: true },
  { source: 'ashby', intervalMs: 3 * 60 * 60 * 1000, maxDurationMs: 5 * 60 * 1000, enabled: true },
  { source: 'workday', intervalMs: 6 * 60 * 60 * 1000, maxDurationMs: 10 * 60 * 1000, enabled: true },
  { source: 'adzuna', intervalMs: 6 * 60 * 60 * 1000, maxDurationMs: 10 * 60 * 1000, enabled: true },
  { source: 'jobspy', intervalMs: 8 * 60 * 60 * 1000, maxDurationMs: 10 * 60 * 1000, enabled: true },
  { source: 'remotive', intervalMs: 8 * 60 * 60 * 1000, maxDurationMs: 3 * 60 * 1000, enabled: true },
  { source: 'remoteok', intervalMs: 8 * 60 * 60 * 1000, maxDurationMs: 3 * 60 * 1000, enabled: true },
  { source: 'linkedin', intervalMs: 12 * 60 * 60 * 1000, maxDurationMs: 15 * 60 * 1000, enabled: false },
];

// ── Stagger Offset (minutes) ───────────────────────────────────────────────
// Each source starts at a different offset to avoid simultaneous execution
const STAGGER_OFFSETS: Record<string, number> = {
  greenhouse: 0,
  lever: 5,
  ashby: 10,
  workday: 15,
  adzuna: 20,
  jobspy: 25,
  remotive: 30,
  remoteok: 35,
};

// ── Baseline Scheduler ──────────────────────────────────────────────────────

export class BaselineScheduler {
  /**
   * Check which sources need refreshing and run them.
   * This is the main entry point called by the cron job.
   */
  static async runBaselineCycle(): Promise<{
    ran: string[];
    skipped: string[];
    failed: string[];
  }> {
    await getConnection();
    const db = mongoose.connection.db!;
    const sourcesColl = db.collection('jobSources');
    const result = { ran: [] as string[], skipped: [] as string[], failed: [] as string[] };

    // First, recover any stale runs
    await recoverStaleRuns(db);

    for (const schedule of BASELINE_SCHEDULES) {
      if (!schedule.enabled) {
        result.skipped.push(schedule.source);
        continue;
      }

      const config = checkSourceConfig(schedule.source);
      if (!config.ready) {
        result.skipped.push(schedule.source);
        continue;
      }

      // Check if this source is eligible to run
      const sourceDoc = await sourcesColl.findOne({ name: schedule.source });
      const lastRunAt = sourceDoc?.status?.lastRunAt;

      if (lastRunAt) {
        const elapsed = Date.now() - new Date(lastRunAt).getTime();
        if (elapsed < schedule.intervalMs) {
          result.skipped.push(schedule.source);
          continue;
        }
      }

      // Check stagger offset
      const offsetMinutes = STAGGER_OFFSETS[schedule.source] || 0;
      const now = new Date();
      const currentMinute = now.getHours() * 60 + now.getMinutes();
      if (currentMinute % 60 < offsetMinutes) {
        result.skipped.push(schedule.source);
        continue;
      }

      // Run the source
      try {
        const runId = `baseline-${schedule.source}-${Date.now()}`;
        const { runId: createdRunId } = await createRun(db, schedule.source, runId);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), schedule.maxDurationMs);

        try {
          const progress = await executeSourceRun(db, schedule.source, createdRunId, controller.signal);

          if (progress.status === 'completed' || progress.status === 'not_configured') {
            result.ran.push(schedule.source);
          } else {
            result.failed.push(schedule.source);
          }
        } finally {
          clearTimeout(timeout);
        }
      } catch (err) {
        console.error(`[BaselineScheduler] Failed to run ${schedule.source}:`, err);
        result.failed.push(schedule.source);
      }
    }

    return result;
  }

  /**
   * Get the next source that needs refreshing.
   */
  static async getNextDueSource(): Promise<SourceSchedule | null> {
    await getConnection();
    const db = mongoose.connection.db!;
    const sourcesColl = db.collection('jobSources');

    for (const schedule of BASELINE_SCHEDULES) {
      if (!schedule.enabled) continue;

      const config = checkSourceConfig(schedule.source);
      if (!config.ready) continue;

      const sourceDoc = await sourcesColl.findOne({ name: schedule.source });
      const lastRunAt = sourceDoc?.status?.lastRunAt;

      if (!lastRunAt) return schedule;

      const elapsed = Date.now() - new Date(lastRunAt).getTime();
      if (elapsed >= schedule.intervalMs) return schedule;
    }

    return null;
  }

  /**
   * Get the baseline schedule status for all sources.
   */
  static async getScheduleStatus(): Promise<Array<{
    source: string;
    enabled: boolean;
    intervalMs: number;
    lastRunAt: Date | null;
    nextEligibleRun: Date | null;
    isDue: boolean;
    isConfigured: boolean;
  }>> {
    await getConnection();
    const db = mongoose.connection.db!;
    const sourcesColl = db.collection('jobSources');

    const statuses = [];

    for (const schedule of BASELINE_SCHEDULES) {
      const sourceDoc = await sourcesColl.findOne({ name: schedule.source });
      const lastRunAt = sourceDoc?.status?.lastRunAt || null;
      const config = checkSourceConfig(schedule.source);

      const nextEligibleRun = lastRunAt
        ? new Date(new Date(lastRunAt).getTime() + schedule.intervalMs)
        : new Date();

      statuses.push({
        source: schedule.source,
        enabled: schedule.enabled,
        intervalMs: schedule.intervalMs,
        lastRunAt,
        nextEligibleRun,
        isDue: nextEligibleRun <= new Date(),
        isConfigured: config.ready,
      });
    }

    return statuses;
  }
}
