import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { getConnection } from '@/lib/database';
import { sanitizeJobApplicationSource } from '@/lib/jobs/jobApplicationSource';
import type { ATSType } from '@/types/automation-schema';

/**
 * POST /api/jobs/auto-apply
 * ENQUEUE-ONLY endpoint. Creates/updates JobApplication + ApplicationQueue item.
 * The applicationWorker processes items in the background.
 *
 * Previously this endpoint called UnifiedApplyService.apply() inline,
 * causing 10-30s response times. Now it returns immediately.
 */
export async function POST(request: NextRequest) {
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

    // Check centralized canonical entitlements
    const { EntitlementService } = await import('@/lib/services/entitlement-service');
    const entitlementCheck = await EntitlementService.checkAndConsume(auth.userId, 'auto_apply');

    if (!entitlementCheck.allowed) {
      const isNotIncluded = !entitlementCheck.entitlements.autoApply.enabled;
      const code = isNotIncluded ? 'AUTO_APPLY_NOT_INCLUDED' : 'AUTO_APPLY_LIMIT_REACHED';
      const message =
        entitlementCheck.errorReason ||
        (isNotIncluded
          ? "Auto-Apply isn't included in your Starter plan. Automatic submission is available on Focused."
          : `Today's Auto-Apply limit is reached (${entitlementCheck.entitlements.autoApply.limit}/${entitlementCheck.entitlements.autoApply.limit}). Your limit resets tomorrow.`);

      return NextResponse.json(
        {
          code,
          error: message,
          message,
          plan: entitlementCheck.entitlements.plan,
          entitlements: entitlementCheck.entitlements,
          recommendation: entitlementCheck.recommendation,
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
        priority: decision.mode === 'auto' ? 90 : decision.mode === 'review' ? 60 : 30,
        scheduledAt: new Date(),
        idempotencyKey,
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
      mode: decision.mode,
      matchScore: decision.matchScore,
      riskLevel: decision.risk?.riskLevel,
      message: `Application queued for ${decision.mode} processing`,
      warnings: decision.warnings,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error enqueueing auto-apply:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to enqueue application' },
      { status: 500 }
    );
  }
}
