/**
 * Email Worker
 *
 * Processes ApplicationEmailQueue and sends emails asynchronously.
 * Uses atomic MongoDB locking for safe concurrent processing.
 *
 * Architecture:
 * ApplicationEmailQueue → Email Worker → Nodemailer → Stalwart → Employer
 */

import mongoose from 'mongoose';
import { sendApplicationEmail, wasApplicationEmailSent } from '@/lib/services/applicationEmailService';
import ApplicationEmailQueue from '@/models/ApplicationEmailQueue';
import { log } from '@/lib/structured-logger';
import { newCorrelationId, runWithCorrelation } from '@/lib/observability/correlation';

// ============================================================================
// Configuration
// ============================================================================

const WORKER_CONFIG = {
  // Polling interval in milliseconds
  POLL_INTERVAL_MS: 5000, // 5 seconds

  // Maximum concurrent emails
  MAX_CONCURRENT: 2,

  // Lock timeout in milliseconds (5 minutes)
  LOCK_TIMEOUT_MS: 5 * 60 * 1000,

  // Retry delays (exponential backoff)
  RETRY_DELAYS_MS: [1000, 5000, 15000, 60000], // 1s, 5s, 15s, 1m

  // Maximum retry attempts
  MAX_RETRIES: 3,
};

// ============================================================================
// Worker State
// ============================================================================

let isRunning = false;
let pollTimer: NodeJS.Timeout | null = null;
const activeJobs = new Set<string>();

// ============================================================================
// Queue Processing
// ============================================================================

/**
 * Claim a queue item atomically.
 *
 * Exported so the claim predicate can be asserted directly in tests — it is the piece that decides
 * whether `retrying` items are ever picked up again.
 */
export async function claimQueueItem(): Promise<any | null> {
  const now = new Date();
  const lockExpiry = new Date(now.getTime() - WORKER_CONFIG.LOCK_TIMEOUT_MS);

  try {
    /*
      Claim either a fresh item or one whose retry backoff has elapsed.

      The query used to match `status: 'queued'` only, but `markAsFailed` parks retryable failures in
      `status: 'retrying'` with a `nextRetryAt`. Those items were therefore never claimed again — the
      `retrying` state existed in the schema and was written to, yet was a dead end from which no email
      ever recovered. `retrying` is now a live state on the same claim path as `queued`.
    */
    const result = await ApplicationEmailQueue.findOneAndUpdate(
      {
        $or: [
          {
            status: 'queued',
            scheduledAt: { $lte: now },
          },
          {
            status: 'retrying',
            nextRetryAt: { $lte: now },
          },
        ],
        $and: [
          {
            $or: [
              { lockedAt: null },
              { lockedAt: { $lt: lockExpiry } }, // Lock expired
            ],
          },
        ],
      },
      {
        $set: {
          status: 'sending',
          lockedAt: now,
          lockedBy: `email-worker-${process.pid}`,
          startedAt: now,
        },
        $inc: { attempts: 1 },
      },
      {
        new: true,
        sort: { priority: -1, scheduledAt: 1 }, // Highest priority first
      }
    );

    return result;
  } catch (error) {
    log.error('Failed to claim queue item:', error as Error);
    return null;
  }
}

/**
 * Release a queue item lock
 */
async function releaseLock(queueItemId: string): Promise<void> {
  try {
    await ApplicationEmailQueue.updateOne(
      { _id: queueItemId },
      {
        $set: {
          lockedAt: null,
          lockedBy: null,
        },
      }
    );
  } catch (error) {
    log.error('Failed to release lock:', error as Error);
  }
}

/**
 * Mark queue item as sent
 */
async function markAsSent(queueItemId: string, messageId?: string): Promise<void> {
  try {
    await ApplicationEmailQueue.updateOne(
      { _id: queueItemId },
      {
        $set: {
          status: 'sent',
          completedAt: new Date(),
          lockedAt: null,
          lockedBy: null,
        },
      }
    );
    log.info(`✅ Email sent successfully: ${queueItemId}`);
  } catch (error) {
    log.error('Failed to mark as sent:', error as Error);
  }
}

/**
 * Mark queue item as failed
 */
async function markAsFailed(queueItemId: string, error: string, retryable: boolean): Promise<void> {
  try {
    const queueItem = await ApplicationEmailQueue.findById(queueItemId);
    if (!queueItem) return;

    const shouldRetry = retryable && queueItem.attempts < WORKER_CONFIG.MAX_RETRIES;

    if (shouldRetry) {
      // Calculate next retry delay with exponential backoff
      const delayIndex = Math.min(queueItem.retryCount, WORKER_CONFIG.RETRY_DELAYS_MS.length - 1);
      const delayMs = WORKER_CONFIG.RETRY_DELAYS_MS[delayIndex];
      const nextRetryAt = new Date(Date.now() + delayMs);

      await ApplicationEmailQueue.updateOne(
        { _id: queueItemId },
        {
          $set: {
            status: 'retrying',
            lastError: error,
            nextRetryAt,
            lockedAt: null,
            lockedBy: null,
          },
          $inc: { retryCount: 1 },
        }
      );
      log.info(`⏳ Email will retry at ${nextRetryAt}: ${error}`);
    } else {
      await ApplicationEmailQueue.updateOne(
        { _id: queueItemId },
        {
          $set: {
            status: 'failed',
            completedAt: new Date(),
            lastError: error,
            lockedAt: null,
            lockedBy: null,
          },
        }
      );
      log.info(`❌ Email permanently failed: ${error}`);
    }
  } catch (err) {
    log.error('Failed to mark as failed:', err as Error);
  }
}

/**
 * Process a single queue item
 */
async function processQueueItem(queueItem: any): Promise<void> {
  const itemId = queueItem._id.toString();

  // Prevent duplicate processing
  if (activeJobs.has(itemId)) {
    log.info(`⏭️ Skipping already active job: ${itemId}`);
    await releaseLock(itemId);
    return;
  }

  activeJobs.add(itemId);

  /*
    Re-open the trace written by the request that enqueued this email (`queueItem.correlationId`):
    the idempotency check, the SMTP attempt and the final status write all log under the same id as
    the click that produced them. Queue documents written before the field existed start a fresh
    trace here rather than logging uncorrelated.
  */
  await runWithCorrelation(
    {
      correlationId: queueItem.correlationId || newCorrelationId(),
      queueItemId: itemId,
      applicationId: queueItem.applicationId,
      userId: queueItem.userId,
    },
    () => sendQueuedEmail(queueItem, itemId)
  );
}

/** Send one claimed queue item. Runs inside that item's correlation context. */
async function sendQueuedEmail(queueItem: any, itemId: string): Promise<void> {
  try {
    // Check idempotency — was *this* email (same application, same subject) already sent?
    // Scoped by subject so a distinct follow-up on the same application is not skipped.
    const alreadySent = await wasApplicationEmailSent(
      queueItem.applicationId,
      'application',
      queueItem.emailData?.subject
    );

    if (alreadySent) {
      log.info(`⏭️ Email already sent for application: ${queueItem.applicationId}`);
      await markAsSent(itemId);
      return;
    }

    // Send the email
    const result = await sendApplicationEmail(queueItem.emailData);

    if (result.success) {
      await markAsSent(itemId, result.messageId);
    } else {
      await markAsFailed(itemId, result.error || 'Unknown error', result.retryable || false);
    }
  } catch (error: any) {
    log.error(`Error processing queue item ${itemId}:`, error);
    await markAsFailed(itemId, error.message, true);
  } finally {
    activeJobs.delete(itemId);
  }
}

/**
 * Main worker loop
 */
async function workerLoop(): Promise<void> {
  if (!isRunning) return;

  try {
    // Wait for MongoDB to be connected before processing
    if (mongoose.connection.readyState !== 1) {
      const { ensureConnection } = await import('@/lib/database');
      await ensureConnection();
    }

    // Check if we can process more jobs
    if (activeJobs.size >= WORKER_CONFIG.MAX_CONCURRENT) {
      log.info(`⏳ At max concurrency (${activeJobs.size}/${WORKER_CONFIG.MAX_CONCURRENT})`);
      return;
    }

    // Claim a queue item
    const queueItem = await claimQueueItem();
    if (!queueItem) {
      // No items to process
      return;
    }

    // Process the item
    await processQueueItem(queueItem);
  } catch (error) {
    log.error('Worker loop error:', error as Error);
  }
}

// ============================================================================
// Worker Lifecycle
// ============================================================================

/**
 * Start the email worker
 */
export function startEmailWorker(): void {
  if (isRunning) {
    log.info('⚠️ Email worker already running');
    return;
  }

  log.info('🚀 Starting email worker...');
  isRunning = true;

  // Start the polling loop
  pollTimer = setInterval(workerLoop, WORKER_CONFIG.POLL_INTERVAL_MS);

  // Run after a short delay to allow MongoDB connection to establish
  setTimeout(() => {
    if (isRunning) {
      workerLoop();
    }
  }, 3000);

  log.info(`✅ Email worker started (poll interval: ${WORKER_CONFIG.POLL_INTERVAL_MS}ms)`);
}

/**
 * Stop the email worker
 */
export function stopEmailWorker(): void {
  if (!isRunning) {
    log.info('⚠️ Email worker not running');
    return;
  }

  log.info('🛑 Stopping email worker...');
  isRunning = false;

  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }

  // Wait for active jobs to complete
  const maxWait = 30000; // 30 seconds
  const startTime = Date.now();

  const waitForCompletion = () => {
    if (activeJobs.size === 0 || Date.now() - startTime > maxWait) {
      log.info(`✅ Email worker stopped (active jobs: ${activeJobs.size})`);
      return;
    }
    setTimeout(waitForCompletion, 1000);
  };

  waitForCompletion();
}

/**
 * Get worker status
 */
export function getWorkerStatus(): {
  isRunning: boolean;
  activeJobs: number;
  maxConcurrent: number;
} {
  return {
    isRunning,
    activeJobs: activeJobs.size,
    maxConcurrent: WORKER_CONFIG.MAX_CONCURRENT,
  };
}

// ============================================================================
// Process Management
// ============================================================================

// Handle graceful shutdown
process.on('SIGTERM', () => {
  log.info('Received SIGTERM, stopping email worker...');
  stopEmailWorker();
  process.exit(0);
});

process.on('SIGINT', () => {
  log.info('Received SIGINT, stopping email worker...');
  stopEmailWorker();
  process.exit(0);
});

export default {
  startEmailWorker,
  stopEmailWorker,
  getWorkerStatus,
  claimQueueItem,
};
