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
 */
export async function releaseStuckItems(maxProcessingMinutes: number = 30): Promise<number> {
  const threshold = new Date(Date.now() - maxProcessingMinutes * 60 * 1000);
  const result = await ApplicationQueue.updateMany(
    {
      status: 'processing',
      lockedAt: { $lt: threshold },
    },
    {
      $set: {
        status: 'queued',
        lockedAt: null,
        lockedBy: null,
      },
    }
  );
  return result.modifiedCount;
}
