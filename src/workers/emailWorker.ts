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
let activeJobs = new Set<string>();

// ============================================================================
// Queue Processing
// ============================================================================

/**
 * Claim a queue item atomically
 */
async function claimQueueItem(): Promise<any | null> {
  const now = new Date();
  const lockExpiry = new Date(now.getTime() - WORKER_CONFIG.LOCK_TIMEOUT_MS);

  try {
    // Find and lock a queued item
    const result = await ApplicationEmailQueue.findOneAndUpdate(
      {
        status: 'queued',
        scheduledAt: { $lte: now },
        $or: [
          { lockedAt: null },
          { lockedAt: { $lt: lockExpiry } }, // Lock expired
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
    console.error('Failed to claim queue item:', error);
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
    console.error('Failed to release lock:', error);
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
    console.log(`✅ Email sent successfully: ${queueItemId}`);
  } catch (error) {
    console.error('Failed to mark as sent:', error);
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
      console.log(`⏳ Email will retry at ${nextRetryAt}: ${error}`);
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
      console.log(`❌ Email permanently failed: ${error}`);
    }
  } catch (err) {
    console.error('Failed to mark as failed:', err);
  }
}

/**
 * Process a single queue item
 */
async function processQueueItem(queueItem: any): Promise<void> {
  const itemId = queueItem._id.toString();

  // Prevent duplicate processing
  if (activeJobs.has(itemId)) {
    console.log(`⏭️ Skipping already active job: ${itemId}`);
    await releaseLock(itemId);
    return;
  }

  activeJobs.add(itemId);

  try {
    // Check idempotency - was this email already sent?
    const alreadySent = await wasApplicationEmailSent(
      queueItem.applicationId,
      'application'
    );

    if (alreadySent) {
      console.log(`⏭️ Email already sent for application: ${queueItem.applicationId}`);
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
    console.error(`Error processing queue item ${itemId}:`, error);
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
      return;
    }

    // Check if we can process more jobs
    if (activeJobs.size >= WORKER_CONFIG.MAX_CONCURRENT) {
      console.log(`⏳ At max concurrency (${activeJobs.size}/${WORKER_CONFIG.MAX_CONCURRENT})`);
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
    console.error('Worker loop error:', error);
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
    console.log('⚠️ Email worker already running');
    return;
  }

  console.log('🚀 Starting email worker...');
  isRunning = true;

  // Start the polling loop
  pollTimer = setInterval(workerLoop, WORKER_CONFIG.POLL_INTERVAL_MS);

  // Run after a short delay to allow MongoDB connection to establish
  setTimeout(() => {
    if (isRunning) {
      workerLoop();
    }
  }, 3000);

  console.log(`✅ Email worker started (poll interval: ${WORKER_CONFIG.POLL_INTERVAL_MS}ms)`);
}

/**
 * Stop the email worker
 */
export function stopEmailWorker(): void {
  if (!isRunning) {
    console.log('⚠️ Email worker not running');
    return;
  }

  console.log('🛑 Stopping email worker...');
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
      console.log(`✅ Email worker stopped (active jobs: ${activeJobs.size})`);
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
  console.log('Received SIGTERM, stopping email worker...');
  stopEmailWorker();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, stopping email worker...');
  stopEmailWorker();
  process.exit(0);
});

export default {
  startEmailWorker,
  stopEmailWorker,
  getWorkerStatus,
};
