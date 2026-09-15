import { claimNextApplication, completeQueueItem, failQueueItem, releaseStuckItems } from '@/lib/worker/claimNext';
import { processApplication } from '@/lib/worker/processApplication';

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

    console.log(`[ApplicationWorker] Processing ${applicationId} (attempt ${queueItem.attempts}/${queueItem.maxAttempts})`);

    // Process the application
    const result = await processApplication({ queueItem, jobApplication });

    if (result.success) {
      await completeQueueItem(queueItemId);
      console.log(`[ApplicationWorker] Completed ${applicationId}: ${result.status}`);
    } else {
      await failQueueItem(queueItemId, result.message, true);
      console.warn(`[ApplicationWorker] Failed ${applicationId}: ${result.message}`);
    }

    // If more items in queue, process next tick immediately
    const ApplicationQueueMod = await import('@/models/ApplicationQueue');
    const ApplicationQueueModel = ApplicationQueueMod.default;
    const morePending = await ApplicationQueueModel.countDocuments({ status: 'queued', scheduledAt: { $lte: new Date() } });
    if (morePending > 0) {
      setImmediate(workerTick);
    }

  } catch (err: any) {
    console.error('[ApplicationWorker] Tick error:', err.message);
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
  console.log('[ApplicationWorker] Starting background worker (polling every 10s)');
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
    console.log('[ApplicationWorker] Stopped');
  }
}
