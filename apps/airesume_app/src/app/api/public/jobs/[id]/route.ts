/**
 * GET /api/public/jobs/:id — anonymous, read-only job detail.
 *
 * `:id` accepts any of the three shapes that appear in `/explore/jobs/:id`:
 *
 *   1. the readable slug      `senior-product-designer-linear-4f2a1b3c`
 *   2. the sha256 canonicalId  (what every pre-slug link used)
 *   3. the raw Mongo `_id`     (the oldest deep links)
 *
 * The lookup is the same shared resolver the page uses, so a segment can never
 * resolve here but 404 there. Unlike the page, this endpoint does **not** redirect
 * a legacy id to the slug — an API caller asked for a resource, not a URL — it
 * simply echoes the canonical `slug` field back in the payload.
 *
 * Same security posture as the list endpoint: no session, explicit projection,
 * rate limited, and a closed/expired listing is still returned (for historical
 * context) but flagged `openForApplication: false` so the UI never invites an
 * application to a role that is no longer accepting one.
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimiter } from '@/lib/rate-limiter';
import { getDb } from '@/lib/db';
import {
  toPublicJobDetail,
  type PublicJobDetailResponse,
} from '@/lib/jobs/publicJobView';
import { findPublicJobByIdentifier, MAX_JOB_IDENTIFIER_LENGTH } from '@/lib/jobs/jobIdentifier';

export const dynamic = 'force-dynamic';

/** 120 detail reads / minute / IP. */
const PUBLIC_JOB_DETAIL_RATE_LIMIT = { windowMs: 60 * 1000, maxRequests: 120 };

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const limitResult = await rateLimiter.checkLimit(request, PUBLIC_JOB_DETAIL_RATE_LIMIT);
    if (!limitResult.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please slow down.' },
        { status: 429 }
      );
    }

    const { id } = await params;
    const identifier = (id || '').trim();

    if (!identifier || identifier.length > MAX_JOB_IDENTIFIER_LENGTH) {
      return NextResponse.json({ success: false, error: 'Job not found.' }, { status: 404 });
    }

    const db = await getDb();
    const found = await findPublicJobByIdentifier(db, identifier);

    if (!found) {
      return NextResponse.json(
        { success: false, error: 'This job listing is no longer available.' },
        { status: 404 }
      );
    }

    const payload: PublicJobDetailResponse = { success: true, job: toPublicJobDetail(found.raw) };

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
      },
    });
  } catch (error: any) {
    console.error('[API] GET /api/public/jobs/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to load this job right now. Please try again.' },
      { status: 500 }
    );
  }
}
