import { Db } from 'mongodb';
import { ALL_JOB_SOURCES, getSourceByName } from '../sources';
import { sourceRunner } from './SourceRunner';
import { SYSTEM_CONSTANTS } from '../config/constants';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export class IngestionManager {
  /**
   * Run a specific source by its name
   */
  async runSource(db: Db, sourceName: string): Promise<boolean> {
    const source = getSourceByName(sourceName);
    if (!source) {
      logger.error(`Cannot run unknown source: ${sourceName}`);
      return false;
    }

    await sourceRunner.runSource(db, source);
    return true;
  }

  /**
   * Run all registered sources in parallel with controlled concurrency
   */
  async runAll(db: Db): Promise<void> {
    logger.info('🎬 IngestionManager: Triggering all registered job sources...');

    for (const source of ALL_JOB_SOURCES) {
      // Run asynchronously so fast sources don't block slow ones
      sourceRunner.runSource(db, source).catch((err) => {
        logger.error(`Error in background runner for [${source.name}]:`, err);
      });
    }
  }

  /**
   * Reconcile stale and expired jobs
   */
  async reconcileStaleJobs(db: Db): Promise<{ markedStale: number; markedExpired: number }> {
    logger.info('🧹 Running stale and expired job reconciliation...');
    const jobsColl = db.collection(SYSTEM_CONSTANTS.COLLECTIONS.JOBS);
    const now = new Date();

    const staleDays = env.STALE_THRESHOLD_DAYS;
    const expirationDays = env.EXPIRATION_THRESHOLD_DAYS;

    const staleThresholdDate = new Date(now.getTime() - staleDays * 24 * 60 * 60 * 1000);
    const expirationThresholdDate = new Date(now.getTime() - expirationDays * 24 * 60 * 60 * 1000);

    // 1. Mark stale: active jobs not seen for > STALE_THRESHOLD_DAYS
    const staleRes = await jobsColl.updateMany(
      {
        status: SYSTEM_CONSTANTS.STATUS.ACTIVE,
        'ingestion.lastSeenAt': { $lt: staleThresholdDate },
      },
      {
        $set: {
          status: SYSTEM_CONSTANTS.STATUS.STALE,
          updatedAt: now,
        },
      }
    );

    // 2. Mark expired: stale jobs not seen for > EXPIRATION_THRESHOLD_DAYS
    const expiredRes = await jobsColl.updateMany(
      {
        status: { $in: [SYSTEM_CONSTANTS.STATUS.ACTIVE, SYSTEM_CONSTANTS.STATUS.STALE] },
        'ingestion.lastSeenAt': { $lt: expirationThresholdDate },
      },
      {
        $set: {
          status: SYSTEM_CONSTANTS.STATUS.EXPIRED,
          expiresAt: now,
          updatedAt: now,
        },
      }
    );

    const markedStale = staleRes.modifiedCount || 0;
    const markedExpired = expiredRes.modifiedCount || 0;

    logger.info(`🧹 Reconciliation complete: ${markedStale} marked stale, ${markedExpired} marked expired.`);
    return { markedStale, markedExpired };
  }
}

export const ingestionManager = new IngestionManager();
