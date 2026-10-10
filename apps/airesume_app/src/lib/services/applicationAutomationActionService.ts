import mongoose from 'mongoose';
import JobApplication from '@/models/JobApplication';
import ApplicationQueue from '@/models/ApplicationQueue';
import ApplicationEvent from '@/models/ApplicationEvent';
import Notification from '@/models/Notification';
import { AutoApplyQuotaService } from '@/lib/services/autoApplyQuotaService';
import { estimateQueueEta, type QueueEtaEstimate } from '@/lib/utils/queue-eta';
import { mixedIdFilter } from '@/lib/utils/mixed-id';

/**
 * User-facing controls for a parked/failed application.
 *
 * The pipeline can park an application in three user-visible dead-ends, and
 * until now none of them had a control:
 *
 *   review_required   → documents prepared in review mode, waiting for the
 *                       user to allow automated submission ("approve"),
 *                       or a halt the user resolves themselves ("dismiss").
 *   automation_failed → the run failed / dead-lettered; the user can "retry".
 *   active queued     → idempotent "already running" answer, no double enqueue.
 *
 * Design rules (AGENTS.md §16/§22/§68):
 *   - `approve`/`retry` are explicit user consent for automated submission —
 *     the user IS the quality gate for their own application.
 *   - The one thing never allowed is re-submitting an application that may
 *     ALREADY have gone out unverified ("submitted but no confirmation
 *     evidence") — a second run could double-apply. That park only accepts
 *     `dismiss` (user takes over).
 *   - `dismiss` cancels any queued item so the worker can never submit behind
 *     the user's back, and clears `review_required` so the row stops asking
 *     for approval forever.
 *   - Quota is consumed at original enqueue (auto-apply route consumes the
 *     reservation right after creating the queue item), so re-queueing an
 *     existing item does NOT consume a second unit. A brand-new item (orphan
 *     rows with no queue document at all) reserves like the enqueue path does.
 */

export type AutomationAction = 'approve' | 'dismiss' | 'retry' | 'submit_code';

export type AutomationActionErrorCode =
  | 'NOT_FOUND'
  | 'INVALID_ACTION'
  | 'INVALID_STATE'
  | 'QUOTA_EXCEEDED';

export class AutomationActionError extends Error {
  constructor(
    public code: AutomationActionErrorCode,
    message: string,
    public extra?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AutomationActionError';
  }
}

export interface AutomationActionResult {
  status: 'queued' | 'already_queued' | 'dismissed' | 'code_submitted';
  applicationId: string;
  queueItemId?: string;
  queuePosition?: number;
  etaSeconds?: number;
  message: string;
}

/**
 * A park that says the application may already be out there unverified —
 * re-running automation risks a duplicate submission. Mirrors the badge rule
 * in application-status-badge.ts ("Needs your action", no approve offered).
 */
const MAYBE_ALREADY_SUBMITTED_REASONS = /no confirmation evidence|needs manual verification/i;

const VALID_ACTIONS: AutomationAction[] = ['approve', 'dismiss', 'retry', 'submit_code'];

async function latestReviewReason(applicationId: mongoose.Types.ObjectId): Promise<string> {
  try {
    const event = await ApplicationEvent.findOne({
      applicationId,
      type: 'APPLICATION_REQUIRES_REVIEW',
    })
      .sort({ createdAt: -1 })
      .select({ 'metadata.reason': 1 })
      .lean();
    return String((event as any)?.metadata?.reason || '');
  } catch {
    return '';
  }
}

async function activeEta(applicationId: string): Promise<QueueEtaEstimate | null> {
  try {
    const active = await ApplicationQueue.find({ status: { $in: ['queued', 'processing'] } })
      .select({ applicationId: 1, status: 1, priority: 1, scheduledAt: 1 })
      .lean();
    return estimateQueueEta(active as any, applicationId);
  } catch {
    return null;
  }
}

/**
 * Stores verification code in Redis key ats_sec_code:<applicationId>
 */
async function setAtsSecurityCode(applicationId: string, code: string): Promise<void> {
  try {
    const { getRedisClient } = await import('@/lib/cache/redis-client');
    const redis = await getRedisClient();
    if (redis) {
      // 5 minutes TTL for the verification code
      await redis.setEx(`ats_sec_code:${applicationId}`, 300, code.trim());
    }
  } catch (err) {
    console.warn('[applicationAutomation] Failed to write code to Redis:', err);
  }
}

/**
 * Marks unread "take action" notifications for this application as read —
 * the user just acted on them from the surface that carried the deep link.
 */
async function clearActionNotifications(userId: string, applicationId: string): Promise<void> {
  try {
    await Notification.updateMany(
      {
        userId,
        type: { $in: ['application_approval_required', 'application_automation_failed'] },
        read: false,
        'metadata.applicationId': applicationId,
      },
      { $set: { read: true, readAt: new Date() } }
    );
  } catch {
    // Notification hygiene must never fail the action itself.
  }
}

async function recordDecision(
  app: any,
  userId: string,
  action: AutomationAction,
  fromStatus: string,
  toStatus: string
): Promise<void> {
  try {
    await ApplicationEvent.create({
      applicationId: app._id,
      userId: mongoose.isValidObjectId(userId) ? new mongoose.Types.ObjectId(userId) : userId,
      jobId: app.jobId,
      type: 'APPLICATION_REVIEW_DECIDED',
      previousStatus: fromStatus,
      newStatus: toStatus,
      source: 'user',
      metadata: {
        decision: action,
        applicationId: String(app._id),
      },
    });
  } catch {
    // Audit event only — the state change above already happened.
  }
}

async function enqueueApproved(app: any, userId: string): Promise<string> {
  // `ApplicationQueue.applicationId` is `Schema.Types.Mixed` (uncast). A bare ObjectId here misses
  // any item stored with the string form — and a miss is not harmless: the code below would treat
  // the application as an orphan and `create` a **second** queue item, i.e. a double submission.
  const existing = await ApplicationQueue.findOne({ applicationId: mixedIdFilter(app._id) }).sort({
    createdAt: -1,
  });

  if (existing) {
    // Reuse the queue document: its unique idempotencyKey (and any quota
    // reservation linked to it) already exists — updating in place keeps both.
    await ApplicationQueue.updateOne(
      { _id: existing._id },
      {
        $set: {
          status: 'queued',
          mode: 'auto',
          priority: 90,
          scheduledAt: new Date(),
          attempts: 0,
          lockedAt: null,
          lockedBy: null,
          startedAt: null,
          completedAt: null,
        },
        $unset: { lastError: '' },
      }
    );
    return String(existing._id);
  }

  // Orphan row: no queue document at all (never enqueued, or cleaned up).
  // Reserve quota exactly like POST /api/jobs/auto-apply does.
  const operationId = `aa_${userId}_${String(app._id)}_${Date.now()}`;
  const reservation = await AutoApplyQuotaService.reserve(userId, operationId, {
    jobId: app.jobId,
  });
  if (!reservation.success) {
    throw new AutomationActionError('QUOTA_EXCEEDED', reservation.error || 'Auto-Apply quota exhausted');
  }

  const submitBucket = Math.floor(Date.now() / (60 * 1000));
  const item = await ApplicationQueue.create({
    applicationId: app._id,
    userId,
    jobId: app.jobId || String(app._id),
    status: 'queued',
    mode: 'auto',
    priority: 90,
    scheduledAt: new Date(),
    idempotencyKey: `${userId}_${String(app._id)}_${submitBucket}`,
    reservationId: reservation.reservationId,
  } as any);

  await AutoApplyQuotaService.consumeReservation(reservation.reservationId!, {
    applicationId: String(app._id),
    queueItemId: String((item as any)._id),
  });
  return String((item as any)._id);
}

export async function performAutomationAction(params: {
  userId: string;
  applicationId: string;
  action: AutomationAction;
  code?: string;
}): Promise<AutomationActionResult> {
  const { userId, applicationId, action, code } = params;

  if (!VALID_ACTIONS.includes(action)) {
    throw new AutomationActionError('INVALID_ACTION', `Unknown action "${action}"`);
  }
  if (!mongoose.isValidObjectId(applicationId)) {
    throw new AutomationActionError('NOT_FOUND', 'Application not found');
  }

  const userObjId = mongoose.isValidObjectId(userId) ? new mongoose.Types.ObjectId(userId) : null;
  const app = await JobApplication.findOne({
    _id: applicationId,
    ...(userObjId ? { $or: [{ userId: userObjId }, { userId }] } : { userId }),
  });
  if (!app) {
    throw new AutomationActionError('NOT_FOUND', 'Application not found');
  }
  const appDoc = app as any;
  const internal = String(appDoc.internalStatus || '');

  // ── submit_code ─────────────────────────────────────────────────────
  if (action === 'submit_code') {
    if (!code || code.trim().length < 4) {
      throw new AutomationActionError('INVALID_ACTION', 'Verification code must be at least 4 characters');
    }
    const cleanCode = code.trim();

    // 1. Write to Redis ats_sec_code:<applicationId>
    await setAtsSecurityCode(applicationId, cleanCode);

    // 2. Record application event
    try {
      await ApplicationEvent.create({
        applicationId: app._id,
        userId: mongoose.isValidObjectId(userId) ? new mongoose.Types.ObjectId(userId) : userId,
        jobId: app.jobId,
        type: 'status_update',
        previousStatus: internal,
        newStatus: internal,
        source: 'user',
        metadata: {
          action: 'submit_verification_code',
          codeLength: cleanCode.length,
        },
      });
    } catch {
      // event recording is best-effort
    }

    return {
      status: 'code_submitted',
      applicationId,
      message: 'Verification code submitted! Submitting application now...',
    };
  }

  const activeItem = await ApplicationQueue.findOne({
    applicationId: mixedIdFilter(app._id),
    status: { $in: ['queued', 'processing'] },
  });

  // ── approve / retry ─────────────────────────────────────────────────
  if (action === 'approve' || action === 'retry') {
    if (activeItem) {
      const eta = await activeEta(applicationId);
      return {
        status: 'already_queued',
        applicationId,
        queueItemId: String(activeItem._id),
        queuePosition: eta?.position,
        etaSeconds: eta?.etaSeconds,
        message: 'This application is already queued for processing',
      };
    }

    if (action === 'approve') {
      if (internal !== 'review_required') {
        throw new AutomationActionError(
          'INVALID_STATE',
          'This application is not awaiting approval',
          { internalStatus: internal }
        );
      }
      const reason = await latestReviewReason(app._id);
      if (MAYBE_ALREADY_SUBMITTED_REASONS.test(reason)) {
        throw new AutomationActionError(
          'INVALID_STATE',
          'This application was submitted but not verified — confirm it manually instead of re-submitting.',
          { internalStatus: internal, reason }
        );
      }
    } else {
      const failedish =
        internal === 'automation_failed' || internal === 'automation_unknown' || !!appDoc.deadLetter;
      if (!failedish) {
        throw new AutomationActionError(
          'INVALID_STATE',
          'Nothing to retry — this application is not in a failed state',
          { internalStatus: internal }
        );
      }
    }

    const queueItemId = await enqueueApproved(appDoc, userId);

    await JobApplication.updateOne(
      { _id: app._id },
      {
        $set: { internalStatus: 'queued', automationEnabled: true, deadLetter: false },
        $unset: { deadLetterReason: '', nextRetryAt: '' },
        $push: {
          stageHistory: {
            stage: appDoc.currentStage || 'staging',
            internalStatus: 'queued',
            changedAt: new Date(),
            reason:
              action === 'approve'
                ? 'User approved automated submission'
                : 'User retried after a failed run',
            source: 'user',
          },
        },
      }
    );

    await recordDecision(appDoc, userId, action, internal, 'queued');
    await clearActionNotifications(userId, applicationId);

    const eta = await activeEta(applicationId);
    return {
      status: 'queued',
      applicationId,
      queueItemId,
      queuePosition: eta?.position,
      etaSeconds: eta?.etaSeconds,
      message:
        action === 'approve'
          ? 'Approved — the application will be submitted automatically'
          : 'Retrying — the application was re-queued for submission',
    };
  }

  // ── dismiss ─────────────────────────────────────────────────────────
  // Only a genuinely running item blocks dismissal: Playwright is inside that
  // run and we cannot stop it mid-submit. A merely `queued` item is exactly
  // what dismissal exists to cancel, and a stale active-looking
  // internalStatus with no queue item behind it is what dismissal clears.
  if (activeItem?.status === 'processing') {
    throw new AutomationActionError(
      'INVALID_STATE',
      'A submission run is in progress — wait for it to finish or fail before changing course',
      { internalStatus: internal }
    );
  }

  // Stop the worker from ever picking this up again (queued items only —
  // a `processing` item is impossible here because of the guard above).
  //
  // This is the site where a `Mixed`-path miss is worst: `ApplicationQueue.applicationId` is
  // uncast, so a bare `app._id` leaves any string-stored item `queued`, and the worker then
  // submits the application the user just chose to handle themselves — precisely the outcome
  // the header comment rules out.
  await ApplicationQueue.updateMany(
    { applicationId: mixedIdFilter(app._id), status: 'queued' },
    {
      $set: {
        status: 'cancelled',
        completedAt: new Date(),
        lastError: 'Cancelled by user — applying manually',
      },
    }
  );

  await JobApplication.updateOne(
    { _id: app._id },
    {
      $set: {
        internalStatus: 'automation_dismissed',
        applicationMethod: 'manual',
        automationEnabled: false,
      },
      $push: {
        stageHistory: {
          stage: appDoc.currentStage || 'staging',
          internalStatus: 'automation_dismissed',
          changedAt: new Date(),
          reason: 'User chose to apply manually',
          source: 'user',
        },
      },
    }
  );

  await recordDecision(appDoc, userId, action, internal, 'automation_dismissed');
  await clearActionNotifications(userId, applicationId);

  return {
    status: 'dismissed',
    applicationId,
    message: 'Automation stopped for this application — apply manually and mark it applied when done',
  };
}
