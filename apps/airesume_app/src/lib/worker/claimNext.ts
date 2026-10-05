import mongoose from 'mongoose';
import ApplicationQueue from '@/models/ApplicationQueue';
import JobApplication from '@/models/JobApplication';

const WORKER_ID = `worker-${process.pid}`;

/**
 * Atomically claims the next queued item from ApplicationQueue.
 * Uses findOneAndUpdate to prevent double-claiming across workers.
 */
export async function claimNextApplication(): Promise<{
  queueItem: any;
  jobApplication: any;
} | null> {
  const { ensureConnection } = await import('@/lib/database');
  await ensureConnection();
  const now = new Date();

  // Atomic claim: find + lock in one operation
  const queueItem = await ApplicationQueue.findOneAndUpdate(
    {
      status: 'queued',
      scheduledAt: { $lte: now },
      lockedAt: null,
    },
    {
      $set: {
        status: 'processing',
        lockedAt: now,
        lockedBy: WORKER_ID,
        startedAt: now,
      },
      $inc: { attempts: 1 },
    },
    {
      new: true,
      sort: { priority: -1, scheduledAt: 1 },
    }
  );

  if (!queueItem) return null;

  const queueItemDoc = queueItem as any;

  // Load the full JobApplication
  const jobApplication = await JobApplication.findById(queueItemDoc.applicationId);
  if (!jobApplication) {
    // Orphaned queue item — mark as failed
    await ApplicationQueue.findByIdAndUpdate(queueItemDoc._id, {
      status: 'failed',
      lastError: 'JobApplication not found',
      completedAt: new Date(),
    });
    return null;
  }

  return { queueItem: queueItemDoc, jobApplication };
}

/**
 * Marks a queue item as completed.
 */
export async function completeQueueItem(queueItemId: string | mongoose.Types.ObjectId): Promise<void> {
  await ApplicationQueue.findByIdAndUpdate(queueItemId, {
    status: 'completed',
    completedAt: new Date(),
    lockedAt: null,
    lockedBy: null,
  });
}

/**
 * Marks a queue item as failed and optionally schedules retry.
 */
export async function failQueueItem(
  queueItemId: string | mongoose.Types.ObjectId,
  error: string,
  retryable: boolean = true
): Promise<void> {
  const item = await ApplicationQueue.findById(queueItemId) as any;
  if (!item) return;

  if (retryable && item.attempts < (item.maxAttempts || 3)) {
    // Exponential backoff: 60s * 2^attempt
    const backoffMs = 60000 * Math.pow(2, item.attempts);
    await ApplicationQueue.findByIdAndUpdate(queueItemId, {
      status: 'queued',
      lastError: error,
      lockedAt: null,
      lockedBy: null,
      scheduledAt: new Date(Date.now() + backoffMs),
    });
  } else {
    // Dead letter
    await ApplicationQueue.findByIdAndUpdate(queueItemId, {
      status: 'dead_letter',
      lastError: error,
      completedAt: new Date(),
      lockedAt: null,
      lockedBy: null,
    });
  }
}

/**
 * Releases a stuck processing item back to queued (for recovery).
 *
 * Releases used to bypass `failQueueItem`'s dead-letter gate entirely: an item
 * whose run kept *throwing* (rather than returning a failure) was requeued every
 * cycle without ever counting against `maxAttempts` — observed live as
 * `attempts=55` next to `maxAttempts=3`, ~30-minute cycles for over a day.
 * Two invariants now hold:
 *   1. a release counts as an attempt (`$inc`), so the counter terminates;
 *   2. an item with no attempts left dead-letters on release instead of looping.
 * A successful run still wins: completion never consults `attempts`.
 */
export async function releaseStuckItems(maxProcessingMinutes: number = 30): Promise<number> {
  const { ensureConnection } = await import('@/lib/database');
  await ensureConnection();
  const threshold = new Date(Date.now() - maxProcessingMinutes * 60 * 1000);
  const stuck = { status: 'processing', lockedAt: { $lt: threshold } };
  const maxAttemptsExpr = { $ifNull: ['$maxAttempts', 3] };

  // 1. Exhausted → dead letter.
  await ApplicationQueue.updateMany(
    { ...stuck, $expr: { $gte: ['$attempts', maxAttemptsExpr] } },
    {
      $set: {
        status: 'dead_letter',
        lastError: `Stuck in processing over ${maxProcessingMinutes}m with no attempts left`,
        completedAt: new Date(),
        lockedAt: null,
        lockedBy: null,
      },
    }
  );

  // 2. Still has attempts → count this release and requeue.
  const result = await ApplicationQueue.updateMany(
    { ...stuck, $expr: { $lt: ['$attempts', maxAttemptsExpr] } },
    {
      $set: {
        status: 'queued',
        lockedAt: null,
        lockedBy: null,
      },
      $inc: { attempts: 1 },
    }
  );
  return result.modifiedCount;
}
