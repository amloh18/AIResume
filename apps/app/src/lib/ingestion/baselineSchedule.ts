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
  getSourceEnabled,
  SOURCE_REGISTRY,
  recoverStaleRuns,
  getCachedSettings,
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

    // Read live settings from DB cache — allows runtime changes without redeploy
    const settings = getCachedSettings();

    for (const schedule of BASELINE_SCHEDULES) {
      // Use dynamic enabled check (env var may override DB/registry defaults)
      const effectiveEnabled = getSourceEnabled(schedule.source);
      const sourceSettings = settings?.sources?.[schedule.source];
      const effectiveInterval = sourceSettings?.refreshIntervalMs ?? schedule.intervalMs;
      const effectiveDuration = sourceSettings?.maxDurationMs ?? schedule.maxDurationMs;

      if (!effectiveEnabled) {
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
        if (elapsed < effectiveInterval) {
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
        const timeout = setTimeout(() => controller.abort(), effectiveDuration);

        try {
          // Build fetch options for region-aware sources
          const fetchOptions: Record<string, any> = {};
          if (schedule.source === 'linkedin') {
            // Use round-robin rotation across configured regions
            const li = settings?.linkedin || {};
            const allRegions = (li.regions && li.regions.length > 0)
              ? li.regions
              : ['US', 'CA', 'GB', 'IN', 'AU'];
            const maxRegions = li.maxRegionsPerRun || 3;

            // Simple rotation: use current timestamp to pick regions
            const runIndex = Math.floor(Date.now() / (12 * 60 * 60 * 1000)); // changes every 12h
            const start = (runIndex * maxRegions) % allRegions.length;
            const selectedRegions = [];
            for (let i = 0; i < maxRegions; i++) {
              selectedRegions.push(allRegions[(start + i) % allRegions.length]);
            }

            fetchOptions.regions = selectedRegions;
            fetchOptions.runIndex = runIndex;
            console.log(`[BaselineScheduler] LinkedIn: rotating to regions [${selectedRegions.join(', ')}] (run #${runIndex})`);
          }

          const progress = await executeSourceRun(db, schedule.source, createdRunId, controller.signal, fetchOptions);

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
      if (!getSourceEnabled(schedule.source)) continue;

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
        enabled: getSourceEnabled(schedule.source),
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
