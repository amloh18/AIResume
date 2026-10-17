import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth-config';
import { getConnection } from '@/lib/database';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import JobApplication from '@/models/JobApplication';
import { checkForDuplicate } from '@/lib/jobs/deduplicate';
import { normalizeRawJob, batchUpsert } from '@/lib/ingestion/engine';
import {
  captureToRawJob,
  captureToTrackerPayload,
  isCatalogPublishable,
  sanitizeCapturedJob,
} from '@/lib/jobs/captureJob';

export const dynamic = 'force-dynamic';

/**
 * POST /api/jobs/capture
 *
 * The browser extension's capture endpoint. Takes a job page the user is
 * looking at — any job board, any company careers page — and does two things in
 * one round trip:
 *
 *   1. Adds it to *their* tracker, in the `saved` stage (the same stage the web
 *      app's Save button uses). Moving it on to Staging stays an explicit choice
 *      because that is what triggers document generation.
 *   2. Publishes it to the shared `jobs` catalog, so the posting is available to
 *      every other user in Discover. This is the path that lets a job the
 *      scheduled ingestion workers never see (a niche board, a small company's
 *      own careers page) still reach the whole user base.
 *
 * Both steps reuse the existing, tested machinery: `checkForDuplicate` for the
 * user's tracker and the ingestion engine's own `normalizeRawJob` + `batchUpsert`
 * for the catalog, so a capture dedups against worker-fetched rows instead of
 * duplicating them.
 *
 * Auth: extension JWT (Bearer) or the website session cookie.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    let userId = auth?.userId;
    if (!userId) {
      const session = await getServerSession(authOptions);
      userId = (session?.user as any)?.id;
    }
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Please sign in to save this job.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = sanitizeCapturedJob(body);
    if (!parsed.ok) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: parsed.error },
        { status: parsed.status }
      );
    }
    const capture = parsed.job;

    await getConnection();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'DATABASE_CONNECTION_ERROR', message: 'Database connection failed' },
        { status: 503 }
      );
    }

    let userObjId: any = userId;
    if (mongoose.Types.ObjectId.isValid(userId)) {
      userObjId = new mongoose.Types.ObjectId(userId);
    }

    // ── 1. Shared catalog (every user) ─────────────────────────────────────
    // Published first so the tracker row can carry the catalog identity even
    // when the user already has this job saved (a re-capture refreshes the
    // catalog's `lastSeenAt` without touching their stage).
    let catalog: {
      status: 'inserted' | 'updated' | 'skipped' | 'error';
      canonicalId?: string;
      jobId?: string;
      reason?: string;
    } = { status: 'skipped' };

    if (isCatalogPublishable(capture)) {
      try {
        const rawJob = captureToRawJob(capture, String(userId));
        const normalized = normalizeRawJob(rawJob);
        // batchUpsert returns counters ({ inserted, updated, duplicates }), not
        // the raw bulkWrite result — a posting that was already in the catalog
        // (e.g. a worker fetched it first) counts as `duplicates` and only has
        // its lastSeenAt refreshed.
        const summary: any = await batchUpsert(db as any, [normalized], 'extension-capture');
        const inserted = Number(summary?.inserted || 0) > 0;
        const updated = Number(summary?.updated || 0) > 0;
        catalog = {
          status: inserted ? 'inserted' : updated ? 'updated' : 'skipped',
          canonicalId: normalized.canonicalId,
          reason: inserted || updated ? undefined : 'already in the shared catalog (refreshed)',
        };

        // The public job card links to /explore/jobs/<canonicalId>, so the same
        // identifier is what the tracker row hands to the dashboard.
        const catalogDoc = await db
          .collection('jobs')
          .findOne({ canonicalId: normalized.canonicalId }, { projection: { _id: 1 } });
        if (catalogDoc?._id) catalog.jobId = String(catalogDoc._id);
      } catch (catalogError: any) {
        // A catalog failure must not cost the user their saved job — report it
        // and carry on, the row is the part they asked for.
        console.error('Capture: catalog publish failed:', catalogError);
        catalog = { status: 'error', reason: catalogError?.message || 'catalog publish failed' };
      }
    } else {
      catalog = { status: 'skipped', reason: 'description too short to publish to the shared catalog' };
    }

    // ── 2. The user's tracker ──────────────────────────────────────────────
    const dedup = await checkForDuplicate(userObjId, capture.jobTitle, capture.company, capture.jobUrl);
    if (dedup.isDuplicate && dedup.existingJob) {
      return NextResponse.json(
        {
          success: false,
          duplicate: true,
          existingJob: dedup.existingJob,
          matchType: dedup.matchType,
          catalog,
          message: `This job is already in your tracker (${
            dedup.matchType === 'url' ? 'matched by URL' : 'matched by title + company'
          }).`,
        },
        { status: 409 }
      );
    }

    const trackerPayload = captureToTrackerPayload(capture);
    const newJob = await JobApplication.create({
      userId: userObjId,
      ...trackerPayload,
      status: 'saved',
      priority: 'medium',
      source: capture.source,
      jobId: catalog.canonicalId || undefined,
      // The tracker records history in `stageHistory` (the state machine's own
      // path). `statusHistory` is NOT declared on JobApplication, and Mongoose
      // strict mode drops undeclared paths silently — writing it there would
      // look like it worked and record nothing.
      currentStage: 'saved',
      internalStatus: 'saved',
      stageHistory: [
        {
          stage: 'saved',
          internalStatus: 'saved',
          changedAt: new Date(),
          reason: `Saved from ${capture.siteName || 'the browser extension'}`,
          source: 'user',
        },
      ],
    });

    return NextResponse.json({
      success: true,
      job: newJob,
      catalog,
      message: catalog.status === 'skipped'
        ? 'Job saved to your tracker.'
        : 'Job saved to your tracker and added to the shared job catalog.',
    });
  } catch (err: any) {
    console.error('POST /api/jobs/capture Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Failed to save job' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
