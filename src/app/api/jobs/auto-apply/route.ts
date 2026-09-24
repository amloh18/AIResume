import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { getConnection } from '@/lib/database';
import { sanitizeJobApplicationSource } from '@/lib/jobs/jobApplicationSource';
import { AutoApplyQuotaService } from '@/lib/services/autoApplyQuotaService';
import type { ATSType } from '@/types/automation-schema';
import { log } from '@/lib/structured-logger';
import {
  CORRELATION_HEADER,
  getCorrelationId,
  resolveCorrelationId,
  runWithCorrelation,
} from '@/lib/observability/correlation';

/**
 * POST /api/jobs/auto-apply
 * ENQUEUE-ONLY endpoint. Creates/updates JobApplication + ApplicationQueue item.
 * The applicationWorker processes items in the background.
 *
 * Uses the unified AutoApplyQuotaService for atomic quota reservation.
 * Each request creates a reservation with a unique operationId for idempotency.
 */
export async function POST(request: NextRequest) {
  /*
    Correlation: one id for the whole enqueue, echoed on the response and persisted on the queue
    document, so the worker run that eventually submits this application can be joined back to this
    request. The handler body is unchanged — only the ambient context around it is new.
  */
  const correlationId = resolveCorrelationId(request.headers.get(CORRELATION_HEADER));
  const response = await runWithCorrelation({ correlationId }, () => enqueueAutoApply(request));
  response.headers.set(CORRELATION_HEADER, correlationId);
  return response;
}

async function enqueueAutoApply(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      jobId,
      title,
      company,
      jobUrl,
      description,
      location,
      salary,
      atsType,
      source,
      screeningQuestions = [],
      mode: requestedMode,
    } = body;

    if (!title || !company) {
      return NextResponse.json(
        { error: 'Job title and company are required' },
        { status: 400 }
      );
    }

    // Validate atsType
    const validAtsTypes: ATSType[] = ['greenhouse', 'lever', 'workable', 'naukri', 'indeed', 'adzuna', 'ashby', 'workday', 'unknown'];
    const resolvedAtsType: ATSType = validAtsTypes.includes(atsType) ? atsType : 'unknown';

    await getConnection();

    // Generate operationId for idempotency (deterministic from request data)
    const operationId = `aa_${auth.userId}_${jobId || title}_${Date.now()}`;

    // Atomic quota reservation using the unified AutoApplyQuotaService
    const reservation = await AutoApplyQuotaService.reserve(auth.userId, operationId, {
      jobId,
    });

    if (!reservation.success) {
      const quota = await AutoApplyQuotaService.checkQuota(auth.userId);
      const isLifetimeReached = quota.plan === 'free' && (quota.lifetimeUsed ?? 0) >= (quota.lifetimeLimit ?? 10);
      const code = isLifetimeReached ? 'AUTO_APPLY_LIFETIME_REACHED' : 'AUTO_APPLY_LIMIT_REACHED';
      const message = reservation.error || quota.reason || 'Auto-Apply quota exhausted';

      return NextResponse.json(
        {
          code,
          error: message,
          message,
          plan: quota.plan,
          usage: {
            used: quota.used,
            reserved: quota.reserved,
            limit: quota.limit,
            remaining: quota.remaining,
          },
          resetAt: quota.resetAt,
          lifetimeUsed: quota.lifetimeUsed,
          lifetimeLimit: quota.lifetimeLimit,
          recommendation: null,
          fallbackUrl: jobUrl || '',
        },
        { status: 403 }
      );
    }

    // Check per-source daily limits
    const User = (await import('@/models/User')).default;
    const user = await User.findById(auth.userId);
    const sourceName = source || resolvedAtsType;
    let sourceDailyLimit = 25;
    if (sourceName === 'naukri' && (user as any)?.naukriIntegration?.preferences?.dailyLimit) {
      sourceDailyLimit = (user as any).naukriIntegration.preferences.dailyLimit;
    } else if (sourceName === 'indeed' && (user as any)?.indeedIntegration?.preferences?.dailyLimit) {
      sourceDailyLimit = (user as any).indeedIntegration.preferences.dailyLimit;
    }

    const today = new Date().toISOString().split('T')[0];
    const todayStart = new Date(today + 'T00:00:00Z');
    const JobApplication = (await import('@/models/JobApplication')).default;
    const todayCount = await JobApplication.countDocuments({
      userId: auth.userId,
      source: sourceName,
      applicationDate: { $gte: todayStart },
    });

    if (todayCount >= sourceDailyLimit) {
      return NextResponse.json(
        {
          error: `Daily limit for ${sourceName} reached (${sourceDailyLimit}/${sourceDailyLimit}). Try again tomorrow.`,
          limitInfo: { source: sourceName, dailyLimit: sourceDailyLimit, used: todayCount },
        },
        { status: 429 }
      );
    }

    const sanitizedSource = sanitizeJobApplicationSource(source || resolvedAtsType);

    // ── Decision Engine: evaluate before enqueuing ───────────────────
    const { makeApplicationDecision } = await import('@/lib/decision/engine');
    const decision = await makeApplicationDecision({
      userId: auth.userId,
      // An explicit `mode: 'auto'` in the body is the user's own approval (the "Approve & submit"
      // action on a staged application). The engine treats it as an override, which is what lets a
      // `review`-mode item be re-queued for real submission after the user has looked at it.
      requestedMode:
        requestedMode === 'auto' || requestedMode === 'manual' ? requestedMode : undefined,
      job: {
        title,
        company,
        jobUrl,
        jobDescription: description,
        location,
        salary,
        atsType: resolvedAtsType,
      },
    });

    if (decision.mode === 'skip') {
      return NextResponse.json({
        success: false,
        status: 'skipped',
        message: decision.reason,
        warnings: decision.warnings,
      }, { status: 200 });
    }

    // ── Find or Create JobApplication ────────────────────────────────
    let userObjId: any = auth.userId;
    try {
      const mongoose = await import('mongoose');
      if (mongoose.default.Types.ObjectId.isValid(auth.userId)) {
        userObjId = new mongoose.default.Types.ObjectId(auth.userId);
      }
    } catch { /* use string */ }

    let jobApp;
    const existingByTitle = await JobApplication.findOne({
      $or: [{ userId: userObjId }, { userId: String(auth.userId) }],
      company: { $regex: new RegExp(`^${company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      jobTitle: { $regex: new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });

    if (existingByTitle) {
      jobApp = existingByTitle;
    } else {
      jobApp = await JobApplication.create({
        userId: userObjId,
        jobId: jobId || `job_${Date.now()}`,
        jobTitle: title,
        company,
        jobUrl: jobUrl || '',
        jobDescription: description || '',
        location: location || 'Remote',
        source: sanitizedSource,
        atsType: resolvedAtsType,
        status: 'created',
        currentStage: 'saved',
        internalStatus: 'saved',
        applicationMethod: 'auto',
        automationEnabled: true,
        priority: 'high',
        salary: salary || undefined,
        matchScore: decision.matchScore,
        stageHistory: [{
          stage: 'saved',
          internalStatus: 'saved',
          changedAt: new Date(),
          reason: 'Enqueued for auto-apply',
          source: 'automation',
        }],
      });
    }

    // ── Enqueue into ApplicationQueue ────────────────────────────────
    const ApplicationQueue = (await import('@/models/ApplicationQueue')).default;

    /**
     * Deduplicate before enqueueing.
     *
     * The previous key was `${userId}_${jobApp._id}_${Date.now()}`. Because
     * `Date.now()` makes every call unique, the unique index on
     * `idempotencyKey` never deduped anything, so each repeated click enqueued
     * another row and the user saw the "application submitted" notification
     * several times for one job.
     *
     * Two layers now: an explicit active-queue lookup (the common case — a
     * double-click), and a coarse time-bucketed key so two requests that race
     * past each other still collide on the unique index. The bucket is
     * deliberately wide enough to absorb a double-submit but short enough that
     * a genuine re-apply later is still allowed.
     */
    const activeQueueItem = await ApplicationQueue.findOne({
      applicationId: jobApp._id,
      status: { $in: ['queued', 'processing'] },
    }).select('_id status');

    if (activeQueueItem) {
      return NextResponse.json({
        success: true,
        status: 'already_queued',
        applicationId: jobApp._id.toString(),
        queueItemId: activeQueueItem._id.toString(),
        mode: decision.mode,
        matchScore: decision.matchScore,
        message: 'This application is already queued for processing',
        warnings: decision.warnings,
      }, { status: 200 });
    }

    const submitBucket = Math.floor(Date.now() / (60 * 1000));
    const idempotencyKey = `${auth.userId}_${jobApp._id}_${submitBucket}`;

    let queueItem;
    try {
      queueItem = await ApplicationQueue.create({
        applicationId: jobApp._id,
        userId: auth.userId,
        jobId: jobApp.jobId || jobApp._id.toString(),
        status: 'queued',
        // The execution gate travels with the queue item. Priority alone cannot express it: a
        // `manual` decision and a `review` decision both got priority 30, and the worker had no way
        // to tell either apart from an `auto` application that was allowed to run Playwright.
        mode: decision.mode,
        // …and so does the trace id, for the same reason: without it the worker's logs could not be
        // joined to the request (or cron run) that queued this application.
        correlationId: getCorrelationId(),
        priority: decision.mode === 'auto' ? 90 : decision.mode === 'review' ? 60 : 30,
        scheduledAt: new Date(),
        idempotencyKey,
        // Link reservation to queue item
        reservationId: reservation.reservationId,
      } as any);

      /*
        Mirror the enqueue onto the tracker document. Nothing was writing `internalStatus: 'queued'`
        anywhere, so the watchdog's queued-stuck scan could never match a freshly enqueued application
        — an item lost in ApplicationQueue stayed invisible (it just looked `saved`). The worker's own
        `processing` transition overwrites this on claim.
      */
      await JobApplication.findByIdAndUpdate(jobApp._id, { internalStatus: 'queued' });

      // Link reservation to queue item
      await AutoApplyQuotaService.consumeReservation(reservation.reservationId!, {
        applicationId: jobApp._id.toString(),
        queueItemId: queueItem._id.toString(),
      });
    } catch (queueErr: any) {
      // Duplicate key ⇒ a concurrent request won the race and already
      // enqueued this application. That is the desired outcome, not an error.
      if (queueErr?.code === 11000) {
        const existing = await ApplicationQueue.findOne({ idempotencyKey }).select('_id');
        return NextResponse.json({
          success: true,
          status: 'already_queued',
          applicationId: jobApp._id.toString(),
          queueItemId: existing?._id?.toString(),
          mode: decision.mode,
          matchScore: decision.matchScore,
          message: 'This application is already queued for processing',
          warnings: decision.warnings,
        }, { status: 200 });
      }
      throw queueErr;
    }

    return NextResponse.json({
      success: true,
      status: 'queued',
      applicationId: jobApp._id.toString(),
      queueItemId: queueItem._id.toString(),
      operationId,
      reservationId: reservation.reservationId,
      mode: decision.mode,
      matchScore: decision.matchScore,
      riskLevel: decision.risk?.riskLevel,
      message: `Application queued for ${decision.mode} processing`,
      warnings: decision.warnings,
      usage: reservation.usage,
    }, { status: 200 });

  } catch (error: any) {
    log.error('Error enqueueing auto-apply:', error, {
      correlationId: getCorrelationId(),
    });
    return NextResponse.json(
      { error: error.message || 'Failed to enqueue application' },
      { status: 500 }
    );
  }
}
