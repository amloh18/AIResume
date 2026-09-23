// /api/cron/auto-apply — drains the application queue.
//
// WHY THIS EXISTS
// ---------------
// `ApplicationQueue` is fed by `/api/jobs/auto-apply` but was only ever drained by the in-process polling
// loop in `src/workers/applicationWorker.ts`. That loop lives inside the web container, so queue progress
// depended on a web request lifecycle — and there was no way for an external scheduler to nudge the queue
// or to run it while the web tier was being redeployed.
//
// This endpoint runs the same worker primitives (`claimNextApplication` → `processApplication` →
// `completeQueueItem`/`failQueueItem`) against the same collection, so there is exactly one queue and one
// set of state transitions. It is safe to run alongside the in-process loop: claiming is an atomic
// `findOneAndUpdate`, so two workers can never process the same application.
//
// NOT `AutoApplyQueue`. That legacy collection had exactly one writer — the demo route
// `/api/applications/process`, which fabricated a `demo-user-<timestamp>` id and had no
// submission-evidence gate. The route had no callers and was removed; draining that collection
// would have been a no-op in production. The live queue is `ApplicationQueue`, and this
// endpoint drains that one.
//
// Security: `Authorization: Bearer <CRON_SECRET>`. The proxy also authenticates this route (see
// `src/proxy.ts`), so this check is defence in depth rather than the only gate.
//
// Schedule suggestion (on the VPS, or Vercel Cron):
//   */5 * * * *   curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
//                   https://buildairesume.com/api/cron/auto-apply

import { NextRequest, NextResponse } from 'next/server';
import {
  claimNextApplication,
  completeQueueItem,
  failQueueItem,
  releaseStuckItems,
} from '@/lib/worker/claimNext';
import { processApplication } from '@/lib/worker/processApplication';
import { ensureConnection } from '@/lib/database';
import { cronAuthFailure } from '@/lib/auth/cron-guard';

export const dynamic = 'force-dynamic';

// Browser automation dominates the runtime. This is advisory for serverless hosts; on the VPS the
// in-handler deadline below is what actually bounds the run.
export const maxDuration = 300;

/** Browser automation is heavy: keep the per-run batch small (AGENTS.md §28, §46). */
const DEFAULT_BATCH = 5;
const MAX_BATCH = 20;

/** A queue item locked for longer than this is assumed abandoned by a crashed worker. */
const STUCK_LOCK_MINUTES = 30;

function resolveBatchSize(request: NextRequest): number {
  const raw = request.nextUrl.searchParams.get('limit') || process.env.AUTO_APPLY_CRON_BATCH;
  const parsed = Number.parseInt(raw || '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_BATCH;
  return Math.min(parsed, MAX_BATCH);
}

async function runQueue(batchSize: number) {
  const startedAt = Date.now();
  // Leave headroom under maxDuration so the handler can return a summary instead of being killed.
  const deadline = startedAt + (maxDuration - 20) * 1000;

  await ensureConnection();

  const releasedStuck = await releaseStuckItems(STUCK_LOCK_MINUTES);

  const errors: string[] = [];
  let processed = 0;
  let submitted = 0;
  let needsReview = 0;
  let failed = 0;

  for (let i = 0; i < batchSize; i++) {
    if (Date.now() > deadline) {
      errors.push('Time budget reached; remaining items left queued for the next run.');
      break;
    }

    const claimed = await claimNextApplication();
    if (!claimed) break; // Queue drained.

    const { queueItem, jobApplication } = claimed;
    const applicationId = String(jobApplication._id);
    processed++;

    try {
      const result = await processApplication({ queueItem, jobApplication });

      if (result.success) {
        await completeQueueItem(queueItem._id);
      } else {
        await failQueueItem(queueItem._id, result.message, true);
      }

      // `processApplication` reports the canonical stage rather than a queue status, so count by stage.
      if (result.stage === 'applied') submitted++;
      else if (result.stage === 'staging') needsReview++;
      else failed++;

      console.log(
        `[Cron AutoApply] ${applicationId}: ${result.status} — ${result.message}`
      );
    } catch (err: any) {
      failed++;
      errors.push(`${applicationId}: ${err?.message || 'unknown error'}`);
      await failQueueItem(queueItem._id, err?.message || 'unknown error', true).catch(() => {});
      console.error(`[Cron AutoApply] ${applicationId} threw:`, err?.message);
    }
  }

  return {
    success: errors.length === 0,
    processedCount: processed,
    submitted,
    needsReview,
    failed,
    releasedStuck,
    skipped: 'items remaining are handled by the next run',
    durationMs: Date.now() - startedAt,
    timestamp: new Date().toISOString(),
    errors,
  };
}

export async function GET(request: NextRequest) {
  // Fail closed. This used to let the request through when no secret was configured, on the theory that
  // the proxy would reject it — which made the proxy a single point of failure and contradicted the
  // defence-in-depth intent of having a check here at all.
  const denied = cronAuthFailure(request.headers);
  if (denied) return denied;

  try {
    return NextResponse.json(await runQueue(resolveBatchSize(request)));
  } catch (err: any) {
    console.error('[Cron AutoApply] Fatal error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to process the application queue', timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}

// Many cron services (and `curl -X POST`) use POST; behave identically.
export async function POST(request: NextRequest) {
  return GET(request);
}
