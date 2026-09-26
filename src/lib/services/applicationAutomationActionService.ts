import mongoose from 'mongoose';
import JobApplication from '@/models/JobApplication';
import ApplicationQueue from '@/models/ApplicationQueue';
import ApplicationEvent from '@/models/ApplicationEvent';
import Notification from '@/models/Notification';
import { AutoApplyQuotaService } from '@/lib/services/autoApplyQuotaService';
import { estimateQueueEta, type QueueEtaEstimate } from '@/lib/utils/queue-eta';

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

export type AutomationAction = 'approve' | 'dismiss' | 'retry';

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
  status: 'queued' | 'already_queued' | 'dismissed';
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

const VALID_ACTIONS: AutomationAction[] = ['approve', 'dismiss', 'retry'];

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
  const existing = await ApplicationQueue.findOne({ applicationId: app._id }).sort({ createdAt: -1 });

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
}): Promise<AutomationActionResult> {
  const { userId, applicationId, action } = params;

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

  const activeItem = await ApplicationQueue.findOne({
    applicationId: app._id,
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
  await ApplicationQueue.updateMany(
    { applicationId: app._id, status: 'queued' },
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
