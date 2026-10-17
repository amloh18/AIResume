import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth-config';
import { getConnection } from '@/lib/database';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { createRateLimit } from '@/lib/rate-limiter';
import { normalizeRawJob, batchUpsert } from '@/lib/ingestion/engine';
import { captureToRawJob, isCatalogPublishable, sanitizeCapturedJob } from '@/lib/jobs/captureJob';

export const dynamic = 'force-dynamic';

/*
  Contribute a posting to the shared catalog, and to nothing else.

  The extension reads job pages as the user browses; when it got a *complete*
  posting (title, company and a real description) it offers it here so the
  shared catalog grows from real browsing. The tracker write stays a deliberate
  user action via /api/jobs/capture — this endpoint exists so the two can never
  be confused: it does not create, update or touch a `JobApplication` row.

  Deduplication is the ingestion engine's own (canonicalId + contentHash), so a
  posting a scheduled worker later fetches upserts onto the contributed row
  rather than duplicating it. Ids are never derived from the contributing user:
  the catalog row carries no userId, so it is not a tracking surface.

  Auth: extension JWT (Bearer) or the website session cookie.
*/
const contributeRateLimit = createRateLimit({ windowMs: 60 * 1000, maxRequests: 30 });

export async function POST(req: NextRequest) {
  try {
    const limit = await contributeRateLimit(req);
    if (!limit.allowed) {
      return NextResponse.json(
        { success: false, error: 'RATE_LIMITED', message: 'Too many contributions — slow down.' },
        { status: 429 }
      );
    }

    const auth = await authenticateRequest(req);
    let userId = auth?.userId;
    if (!userId) {
      const session = await getServerSession(authOptions);
      userId = (session?.user as any)?.id;
    }
    // Signed-in only: it keeps contributions attributable for abuse handling and
    // stops an unauthenticated page from using this as a write proxy.
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Authentication required.' },
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

    // Same bar as the capture path: a title-only stub would pollute Discover and
    // every future catalog search, so a thin capture is a no-op, not an error.
    if (!isCatalogPublishable(capture)) {
      return NextResponse.json({
        success: true,
        catalog: { status: 'skipped', reason: 'description too short to publish' },
      });
    }

    await getConnection();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'DATABASE_CONNECTION_ERROR', message: 'Database connection failed' },
        { status: 503 }
      );
    }

    const rawJob = captureToRawJob(capture, String(userId));
    const normalized = normalizeRawJob(rawJob);
    // batchUpsert returns counters, not the bulkWrite result: a posting already
    // in the catalog (a worker got there first, or another user contributed it)
    // counts as `duplicates` and only has its lastSeenAt refreshed.
    const summary: any = await batchUpsert(db as any, [normalized], 'extension-contribute');
    const inserted = Number(summary?.inserted || 0) > 0;
    const updated = Number(summary?.updated || 0) > 0;

    return NextResponse.json({
      success: true,
      catalog: {
        status: inserted ? 'inserted' : updated ? 'updated' : 'skipped',
        canonicalId: normalized.canonicalId,
        reason: inserted || updated ? undefined : 'already in the shared catalog (refreshed)',
      },
    });
  } catch (err: any) {
    // Contribution is best-effort: it runs in the background while the user is
    // reading a job page, so a failure here is logged, never surfaced.
    console.error('POST /api/jobs/contribute Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to contribute job' },
      { status: 500 }
    );
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
