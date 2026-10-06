import { Db } from 'mongodb';
import { ALL_JOB_SOURCES } from '../sources';
import { ingestionManager } from '../ingestion/IngestionManager';
import { logger } from '../utils/logger';

export class IngestionScheduler {
  private isRunning = false;
  private intervals: NodeJS.Timeout[] = [];

  start(db: Db): void {
    if (this.isRunning) {
      logger.warn('Scheduler already running.');
      return;
    }

    logger.info('⏰ Initializing IngestionScheduler interval schedules...');

    // 1. Schedule each source independently
    for (const source of ALL_JOB_SOURCES) {
      const schedule = source.getDefaultSchedule();
      const intervalMs = Math.max(1, schedule.frequencyMinutes) * 60 * 1000;

      const timer = setInterval(() => {
        logger.info(`⏰ Triggered schedule for source [${source.name}] (every ${schedule.frequencyMinutes}m)`);
        ingestionManager.runSource(db, source.name).catch((err) => {
          logger.error(`Scheduled run failed for [${source.name}]:`, err);
        });
      }, intervalMs);

      this.intervals.push(timer);
      logger.info(`  • Scheduled [${source.displayName}] => every ${schedule.frequencyMinutes} minutes`);
    }

    // 2. Schedule Stale Job Reconciliation (every 6 hours)
    const reconciliationIntervalMs = 6 * 60 * 60 * 1000;
    const reconTimer = setInterval(() => {
      ingestionManager.reconcileStaleJobs(db).catch((err) => {
        logger.error('Scheduled reconciliation failed:', err);
      });
    }, reconciliationIntervalMs);
    this.intervals.push(reconTimer);

    // 3. Schedule Freshness Score Refresh (every hour)
    const freshnessIntervalMs = 60 * 60 * 1000; // 1 hour
    const freshnessTimer = setInterval(() => {
      ingestionManager.refreshFreshnessScores(db).catch((err) => {
        logger.error('Scheduled freshness refresh failed:', err);
      });
    }, freshnessIntervalMs);
    this.intervals.push(freshnessTimer);

    this.isRunning = true;
    logger.info(`✅ Scheduler initialized with ${this.intervals.length} active triggers.`);
  }

  stop(): void {
    logger.info('⏹ Stopping IngestionScheduler...');
    for (const timer of this.intervals) {
      clearInterval(timer);
    }
    this.intervals = [];
    this.isRunning = false;
    logger.info('✅ IngestionScheduler stopped.');
  }

  isSchedulerRunning(): boolean {
    return this.isRunning;
  }
}

export const ingestionScheduler = new IngestionScheduler();
