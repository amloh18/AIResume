import { claimNextApplication, completeQueueItem, failQueueItem, releaseStuckItems } from '@/lib/worker/claimNext';
import { processApplication } from '@/lib/worker/processApplication';
import { log } from '@/lib/structured-logger';
import { newCorrelationId, runWithCorrelation } from '@/lib/observability/correlation';

const POLL_INTERVAL_MS = 10_000; // 10 seconds
const STUCK_RELEASE_MINUTES = 30;

let workerTimer: NodeJS.Timeout | null = null;
let isRunning = false;

/**
 * Background application worker.
 * Polls ApplicationQueue, claims next item, processes it.
 * Modeled after the existing emailWorker pattern.
 */
async function workerTick(): Promise<void> {
  if (isRunning) return;
  isRunning = true;

  try {
    const mongoose = (await import('mongoose')).default;
    if (mongoose.connection.readyState !== 1) {
      const { ensureConnection } = await import('@/lib/database');
      await ensureConnection();
    }

    // Release any stuck processing items from previous crashes
    await releaseStuckItems(STUCK_RELEASE_MINUTES);

    // Claim next queued application
    const claimed = await claimNextApplication();
    if (!claimed) return; // Nothing to process

    const { queueItem, jobApplication } = claimed;
    const queueItemId = queueItem._id;
    const applicationId = String(jobApplication._id);

    /*
      Re-open the trace the enqueueing request (or cron run) started.

      `queueItem.correlationId` was written by the producer; everything logged below — ATS
      detection, the Playwright run, the state transitions, the completion — now carries that same
      id, so "user clicked Apply at 14:02" and "worker submitted at 14:05" are one query apart.
      Queue documents written before the field existed simply start a fresh trace here.
    */
    await runWithCorrelation(
      {
        correlationId: queueItem.correlationId || newCorrelationId(),
        applicationId,
        queueItemId: String(queueItemId),
        userId: String(jobApplication.userId),
      },
      async () => {
        log.info(`[ApplicationWorker] Processing ${applicationId} (attempt ${queueItem.attempts}/${queueItem.maxAttempts})`);

        const result = await processApplication({ queueItem, jobApplication });

        if (result.success) {
          await completeQueueItem(queueItemId);
          log.info(`[ApplicationWorker] Completed ${applicationId}: ${result.status}`);
        } else {
          await failQueueItem(queueItemId, result.message, true);
          log.warn(`[ApplicationWorker] Failed ${applicationId}: ${result.message}`);
        }
      }
    );

    // If more items in queue, process next tick immediately
    const ApplicationQueueMod = await import('@/models/ApplicationQueue');
    const ApplicationQueueModel = ApplicationQueueMod.default;
    const morePending = await ApplicationQueueModel.countDocuments({ status: 'queued', scheduledAt: { $lte: new Date() } });
    if (morePending > 0) {
      setImmediate(workerTick);
    }

  } catch (err: any) {
    log.error('[ApplicationWorker] Tick error:', err);
  } finally {
    isRunning = false;
  }
}

/**
 * Starts the application worker polling loop.
 * Called from instrumentation.ts on server boot.
 */
export function startApplicationWorker(): void {
  if (workerTimer) return;
  log.info('[ApplicationWorker] Starting background worker (polling every 10s)');
  workerTimer = setInterval(workerTick, POLL_INTERVAL_MS);
  // Run first tick immediately
  workerTick().catch(() => {});
}

/**
 * Stops the application worker.
 */
export function stopApplicationWorker(): void {
  if (workerTimer) {
    clearInterval(workerTimer);
    workerTimer = null;
    log.info('[ApplicationWorker] Stopped');
  }
}
