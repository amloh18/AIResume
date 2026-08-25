import crypto from 'crypto';
import { Db } from 'mongodb';
import { JobSource } from '../sources/base/JobSource';
import { normalizeRawJob } from '../normalization/normalizeJob';
import { batchProcessor } from './BatchProcessor';
import { circuitBreaker } from '../health/circuitBreaker';
import { SYSTEM_CONSTANTS } from '../config/constants';
import { env } from '../config/env';
import { createSourceLogger } from '../utils/logger';

export class SourceRunner {
  async runSource(db: Db, source: JobSource): Promise<void> {
    const runId = crypto.randomUUID();
    const sourceLogger = createSourceLogger(source.name, runId);

    // 1. Check Circuit Breaker
    if (!circuitBreaker.isAvailable(source.name)) {
      sourceLogger.warn(`Source execution skipped: Circuit Breaker is OPEN for [${source.name}]`);
      return;
    }

    const locksColl = db.collection(SYSTEM_CONSTANTS.COLLECTIONS.JOB_LOCKS);
    const runsColl = db.collection(SYSTEM_CONSTANTS.COLLECTIONS.INGESTION_RUNS);
    const sourcesColl = db.collection(SYSTEM_CONSTANTS.COLLECTIONS.JOB_SOURCES);

    const now = new Date();
    const lockTtlSeconds = env.DISTRIBUTED_LOCK_TTL_SECONDS;
    const lockExpiresAt = new Date(now.getTime() + lockTtlSeconds * 1000);

    // 2. Acquire Distributed Lease Lock
    try {
      await locksColl.updateOne(
        {
          source: source.name,
          $or: [{ expiresAt: { $lte: now } }, { expiresAt: { $exists: false } }],
        },
        {
          $set: {
            source: source.name,
            lockId: runId,
            acquiredAt: now,
            expiresAt: lockExpiresAt,
            workerHost: process.env.HOSTNAME || 'localhost',
          },
        },
        { upsert: true }
      );
    } catch (err: any) {
      if (err.code === 11000) {
        sourceLogger.info(`Source [${source.name}] is currently locked and running on another worker. Skipping.`);
        return;
      }
      sourceLogger.error('Failed to acquire distributed lock:', err);
      return;
    }

    sourceLogger.info(`🚀 Starting Ingestion Run for [${source.displayName}]...`);

    // 3. Create Ingestion Run Record
    await runsColl.insertOne({
      runId,
      source: source.name,
      status: SYSTEM_CONSTANTS.RUN_STATUS.RUNNING,
      startedAt: now,
      finishedAt: null,
      durationMs: null,
      metrics: {
        fetched: 0,
        parsed: 0,
        inserted: 0,
        updated: 0,
        duplicates: 0,
        rejected: 0,
        errors: 0,
      },
      pagesProcessed: 0,
      requestsMade: 0,
      errorSummary: [],
      createdAt: now,
    });

    const metrics = {
      fetched: 0,
      parsed: 0,
      inserted: 0,
      updated: 0,
      duplicates: 0,
      rejected: 0,
      errors: 0,
    };
    let pagesProcessed = 0;
    const errorSummary: any[] = [];

    try {
      // 4. Stream and Process Batches
      for await (const rawBatch of source.fetchJobs({ limit: env.BATCH_SIZE * 5 })) {
        pagesProcessed += 1;
        metrics.fetched += rawBatch.length;

        // Normalize
        const normalizedBatch = [];
        for (const raw of rawBatch) {
          try {
            const normalized = normalizeRawJob(raw);
            normalizedBatch.push(normalized);
            metrics.parsed += 1;
          } catch (normErr: any) {
            metrics.rejected += 1;
            metrics.errors += 1;
          }
        }

        // Batch Upsert
        if (normalizedBatch.length > 0) {
          const res = await batchProcessor.processBatch(db, normalizedBatch, source.name);
          metrics.inserted += res.inserted;
          metrics.updated += res.updated;
          metrics.duplicates += res.duplicates;
          metrics.errors += res.errors;
        }

        sourceLogger.info(
          `Batch processed: ${normalizedBatch.length} jobs (Total: ${metrics.inserted} new, ${metrics.updated} updated, ${metrics.duplicates} dupes)`
        );
      }

      // 5. Mark Run Complete
      const finishedAt = new Date();
      const durationMs = finishedAt.getTime() - now.getTime();

      await runsColl.updateOne(
        { runId },
        {
          $set: {
            status: SYSTEM_CONSTANTS.RUN_STATUS.COMPLETED,
            finishedAt,
            durationMs,
            metrics,
            pagesProcessed,
            errorSummary,
          },
        }
      );

      // Update Source Status
      circuitBreaker.recordSuccess(source.name);
      await sourcesColl.updateOne(
        { name: source.name },
        {
          $set: {
            'status.lastRunAt': now,
            'status.lastSuccessAt': finishedAt,
            'status.health': SYSTEM_CONSTANTS.HEALTH_STATUS.HEALTHY,
            'status.consecutiveFailures': 0,
          },
          $inc: {
            'statistics.totalRuns': 1,
            'statistics.totalJobsFound': metrics.fetched,
            'statistics.totalJobsInserted': metrics.inserted,
            'statistics.totalJobsUpdated': metrics.updated,
          },
        },
        { upsert: true }
      );

      sourceLogger.info(`🏁 Ingestion completed for [${source.displayName}] in ${(durationMs / 1000).toFixed(1)}s`);
    } catch (err: any) {
      sourceLogger.error(`❌ Ingestion failed for [${source.name}]:`, err);
      circuitBreaker.recordFailure(source.name, err);

      const finishedAt = new Date();
      await runsColl.updateOne(
        { runId },
        {
          $set: {
            status: SYSTEM_CONSTANTS.RUN_STATUS.FAILED,
            finishedAt,
            durationMs: finishedAt.getTime() - now.getTime(),
            metrics,
            errorSummary: [{ message: err.message, stack: err.stack, count: 1, timestamp: new Date() }],
          },
        }
      );

      await sourcesColl.updateOne(
        { name: source.name },
        {
          $set: {
            'status.lastRunAt': now,
            'status.lastFailureAt': finishedAt,
            'status.lastErrorMessage': err.message,
            'status.health': circuitBreaker.getState(source.name).health,
          },
          $inc: {
            'status.consecutiveFailures': 1,
            'statistics.totalErrors': 1,
          },
        }
      );
    } finally {
      // 6. Release Distributed Lock
      await locksColl.deleteOne({ source: source.name, lockId: runId }).catch((lockErr) => {
        sourceLogger.warn('Error releasing lock:', undefined, lockErr);
      });
    }
  }
}

export const sourceRunner = new SourceRunner();
