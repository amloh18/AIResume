/**
 * GET /api/public/jobs — anonymous, read-only job search.
 *
 * ## Security posture
 *
 * This route is intentionally **public**: `/api/public` is on the middleware
 * allowlist in `src/proxy.ts`, and it is the *only* reason this path is reachable
 * without a session. It must therefore be self-defending:
 *
 *   - No session is read and no `userId` is ever consulted, so there is no
 *     "caller-supplied identity" surface to spoof.
 *   - The response is built from an explicit field projection
 *     (`PUBLIC_JOB_PROJECTION`), so a newly added private field on the `jobs`
 *     document cannot leak by default.
 *   - The query is parsed and bounded (`parsePublicJobQuery`) and regex input is
 *     escaped, so an anonymous caller cannot drive an unbounded scan or ReDoS.
 *   - Requests are rate limited per IP.
 *
 * Nothing here mutates state. Saving, applying, tailoring and quota consumption
 * all live on authenticated routes that re-check the session independently.
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimiter } from '@/lib/rate-limiter';
import { getDb } from '@/lib/db';
import {
  PUBLIC_JOB_PROJECTION,
  parsePublicJobQuery,
  toPublicJobSummary,
  type PublicJobsListResponse,
} from '@/lib/jobs/publicJobView';

export const dynamic = 'force-dynamic';

/** 60 searches / minute / IP — generous for a human, hostile to a scraper. */
const PUBLIC_JOBS_RATE_LIMIT = { windowMs: 60 * 1000, maxRequests: 60 };

export async function GET(request: NextRequest) {
  try {
    const limitResult = await rateLimiter.checkLimit(request, PUBLIC_JOBS_RATE_LIMIT);
    if (!limitResult.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please slow down.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.max(1, Math.ceil((limitResult.resetTime - Date.now()) / 1000))),
          },
        }
      );
    }

    const db = await getDb();
    const jobsColl = db.collection('jobs');

    const { filter, sort, page, pageSize, skip } = parsePublicJobQuery(request.nextUrl.searchParams);

    const [rawJobs, total] = await Promise.all([
      jobsColl
        .find(filter)
        .project(PUBLIC_JOB_PROJECTION)
        .sort(sort)
        .skip(skip)
        .limit(pageSize)
        .toArray(),
      jobsColl.countDocuments(filter),
    ]);

    const payload: PublicJobsListResponse = {
      success: true,
      jobs: rawJobs.map(toPublicJobSummary),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: pageSize > 0 ? Math.ceil(total / pageSize) : 0,
        hasMore: skip + rawJobs.length < total,
      },
    };

    return NextResponse.json(payload, {
      headers: {
        // Public, shareable, and short-lived. `stale-while-revalidate` keeps a
        // busy listing page fast without ever serving a closed role as open for
        // long — the status is re-checked on every revalidation.
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error: any) {
    console.error('[API] GET /api/public/jobs error:', error);
    // Never surface a stack trace or driver error to an anonymous caller.
    return NextResponse.json(
      { success: false, error: 'Unable to load jobs right now. Please try again.' },
      { status: 500 }
    );
  }
}
