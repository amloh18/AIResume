import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { getConnection } from '@/lib/database';
import JobApplication from '@/models/JobApplication';
import ApplicationJourney from '@/models/ApplicationJourney';
import ApplicationQueue from '@/models/ApplicationQueue';
import ApplicationEvent from '@/models/ApplicationEvent';
import { estimateQueueEta } from '@/lib/utils/queue-eta';
import {
  deriveApplicationProgress,
  type ApplicationProgress,
} from '@/lib/applications/live-progress';
import { log } from '@/lib/structured-logger';

/**
 * GET /api/applications/progress
 *
 * ONE payload for every surface that shows an application moving: the Discover
 * feed cards, the dashboard Top-matches carousel, the tracker list/kanban and
 * the journey sidebar. They all read the same map, so they cannot disagree,
 * and they all poll the same query key, so they advance together.
 *
 * Replaces the client-only zustand timeline (`jobLiveStatusStore`), which knew
 * only about steps the *browser* performed — document creation — and invented
 * its percentages with `setTimeout`. The execution half (form detection, field
 * fill, document attach, submit, confirmation) happens on the worker and was
 * therefore invisible.
 *
 * Query params:
 *   ?ids=<applicationId,applicationId>  — restrict to these applications.
 *   ?activeOnly=1                       — only rows with a run in flight or a
 *                                         park waiting on the user (default when
 *                                         `ids` is absent).
 *
 * Response:
 *   { progress: { [applicationId]: ApplicationProgress },
 *     byJobId:  { [jobId]: ApplicationProgress },
 *     activeCount, runningCount, updatedAt }
 *
 * `no-store` on purpose: this is a live view, and a cached poll is worse than
 * no poll at all.
 */

export const dynamic = 'force-dynamic';

/** Rows that can still move (or are parked waiting on the user). */
const IN_FLIGHT_STATUSES = [
  'staging_cv_generating',
  'staging_cover_letter_generating',
  'staging_ready',
  'queued',
  'processing',
  'form_detected',
  'submitting',
  'verification',
  'review_required',
  'automation_failed',
  'automation_unknown',
];

/** Safety cap — a single user never has thousands of live runs. */
const MAX_ROWS = 200;

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getConnection();

    /*
      `JobApplication.userId` is `Schema.Types.Mixed`, so a string query never
      matches a stored ObjectId (documented trap). Query both shapes.
    */
    const userId = auth.userId;
    const userIdFilter = mongoose.Types.ObjectId.isValid(userId)
      ? { $in: [userId, new mongoose.Types.ObjectId(userId)] }
      : userId;

    const idsParam = request.nextUrl.searchParams.get('ids');
    const requestedIds = (idsParam || '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => mongoose.Types.ObjectId.isValid(s))
      .slice(0, MAX_ROWS);

    const activeOnly = request.nextUrl.searchParams.get('activeOnly') === '1' || requestedIds.length === 0;

    const query: Record<string, unknown> = { userId: userIdFilter };

    if (requestedIds.length > 0) {
      query._id = { $in: requestedIds.map((id) => new mongoose.Types.ObjectId(id)) };
    } else if (activeOnly) {
      query.internalStatus = { $in: IN_FLIGHT_STATUSES };
    }

    const applications = await JobApplication.find(query)
      .select({
        _id: 1,
        jobId: 1,
        jobTitle: 1,
        company: 1,
        status: 1,
        currentStage: 1,
        internalStatus: 1,
        deadLetter: 1,
        artifacts: 1,
        updatedAt: 1,
      })
      .sort({ updatedAt: -1 })
      .limit(MAX_ROWS)
      .lean();

    if (applications.length === 0) {
      return NextResponse.json(
        { success: true, progress: {}, byJobId: {}, activeCount: 0, runningCount: 0, updatedAt: new Date().toISOString() },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const appIds = applications.map((a: any) => String(a._id));

    // ── Journey (document) state, keyed by the JobApplication id ────────
    const journeys = await ApplicationJourney.find({
      $or: [{ userId: String(userId) }, { userId }],
      jobId: { $in: appIds },
    })
      .select({ jobId: 1, status: 1, cvId: 1, coverLetterId: 1 })
      .lean();

    const journeyMap = new Map<string, any>();
    for (const j of journeys as any[]) {
      if (j.jobId) journeyMap.set(String(j.jobId), j);
    }

    // ── Active queue items (for status + ETA) ───────────────────────────
    /*
      `ApplicationQueue.applicationId` is `Schema.Types.Mixed`, so it is not
      cast for us: an ObjectId filter will not match a value that was written
      as a string, and vice versa. Match both shapes.
    */
    const appObjectIds = applications.map((a: any) => a._id);
    const appIdShapes = [...appObjectIds, ...appIds];

    const activeQueueItems = await ApplicationQueue.find({
      applicationId: { $in: appIdShapes },
      status: { $in: ['queued', 'processing'] },
    })
      .select({ applicationId: 1, status: 1, priority: 1, scheduledAt: 1, createdAt: 1 })
      .lean();

    const now = Date.now();
    const queueByApp = new Map<
      string,
      {
        status: 'queued' | 'processing';
        etaSeconds?: number;
        position?: number;
        queuedForSeconds?: number;
      }
    >();
    for (const item of activeQueueItems as any[]) {
      const appId = String(item.applicationId);
      const eta = estimateQueueEta(activeQueueItems as any, appId);
      // How long this row has waited, so the UI can tell "busy queue" from
      // "nothing is draining the queue" (see QUEUE_STALL_SECONDS).
      const createdAt = item.createdAt ? new Date(item.createdAt).getTime() : NaN;
      queueByApp.set(appId, {
        status: item.status,
        etaSeconds: eta?.etaSeconds,
        position: eta?.position,
        queuedForSeconds:
          item.status === 'queued' && Number.isFinite(createdAt)
            ? Math.max(0, (now - createdAt) / 1000)
            : undefined,
      });
    }

    // ── Latest park reason for `review_required` rows ───────────────────
    const reviewIds = applications
      .filter((a: any) => a.internalStatus === 'review_required')
      .map((a: any) => a._id);
    const reviewReasons = new Map<string, string>();
    if (reviewIds.length > 0) {
      const latest = await ApplicationEvent.aggregate([
        { $match: { applicationId: { $in: reviewIds }, type: 'APPLICATION_REQUIRES_REVIEW' } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$applicationId', reason: { $first: '$metadata.reason' } } },
      ]);
      for (const r of latest as any[]) {
        if (r.reason) reviewReasons.set(String(r._id), String(r.reason));
      }
    }

    // ── Derive ──────────────────────────────────────────────────────────
    const progress: Record<string, ApplicationProgress> = {};
    const byJobId: Record<string, ApplicationProgress> = {};

    for (const app of applications as any[]) {
      const appId = String(app._id);
      const journey = journeyMap.get(appId);
      const queue = queueByApp.get(appId);

      const derived = deriveApplicationProgress({
        applicationId: appId,
        jobId: app.jobId ? String(app.jobId) : undefined,
        currentStage: app.currentStage,
        status: app.status,
        internalStatus: app.internalStatus,
        deadLetter: Boolean(app.deadLetter),
        reviewReason: reviewReasons.get(appId),
        queueStatus: queue?.status ?? null,
        queueEtaSeconds: queue?.etaSeconds,
        queuePosition: queue?.position,
        queuedForSeconds: queue?.queuedForSeconds,
        journeyStatus: journey?.status,
        hasCV: Boolean(journey?.cvId),
        hasCoverLetter: Boolean(journey?.coverLetterId),
        artifacts: app.artifacts || null,
        updatedAt: app.updatedAt,
      });

      progress[appId] = derived;
      // Keyed by the *external* job id too, because the Discover feed and the
      // Top-matches carousel only know that one. `resolveApplicationId` maps
      // listing → application; this is the reverse direction for free.
      if (app.jobId) byJobId[String(app.jobId)] = derived;
    }

    const list = Object.values(progress);

    return NextResponse.json(
      {
        success: true,
        progress,
        byJobId,
        activeCount: list.filter((p) => p.isActive).length,
        runningCount: list.filter((p) => p.state === 'running').length,
        updatedAt: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err: any) {
    log.error('Error deriving application progress:', err?.message || err);
    return NextResponse.json({ error: 'Failed to load application progress' }, { status: 500 });
  }
}
