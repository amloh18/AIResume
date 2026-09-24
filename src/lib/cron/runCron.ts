import { NextRequest, NextResponse } from 'next/server';
import { cronAuthFailure } from '@/lib/auth/cron-guard';
import {
  CORRELATION_HEADER,
  resolveCorrelationId,
  runWithCorrelation,
} from '@/lib/observability/correlation';

/**
 * Overlap protection for `/api/cron/*` handlers.
 *
 * ## Why
 *
 * The host cron file fires several of these on fixed schedules (some every few minutes). Nothing
 * stopped a second run from starting while the first was still working: each request is an
 * independent invocation, and the work is not safe to run twice concurrently — `daily-summary` would
 * enqueue the same emails twice, `state-recovery` could race its own repairs, `process-campaigns`
 * could clone the same recurring child twice, and a long `auto-apply` run could overlap its next tick.
 *
 * ## Two ways to use it
 *
 * Inline (used by the existing routes — the smallest possible diff around their existing try/catch):
 *
 *     const denied = cronAuthFailure(request.headers);
 *     if (denied) return denied;
 *     const lock = acquireCronLock('daily-summary');
 *     if (!lock) return cronBusyResponse('daily-summary');
 *     try {
 *       …existing work, unchanged…
 *     } catch (e) { … } finally {
 *       lock.release();
 *     }
 *
 * Wrapped (for new routes):
 *
 *     return runCron('daily-summary', request, async () => NextResponse.json({ … }));
 *
 * ## Scope of the guarantee
 *
 * The lock is an **in-process** `Map`: it protects against overlap *within one Node process*, which
 * is what this deployment has (a single app container). It deliberately does not use the database — a
 * Mongo-based lock would be cross-process but adds a write per cron tick and a new failure mode to
 * every route for a scheduler that is already single-host. If the app is ever scaled to multiple
 * replicas, this must become a Mongo `findOneAndUpdate` lease before these routes rely on it.
 *
 * A skipped run returns **409** with `code: 'CRON_ALREADY_RUNNING'` so the scheduler log shows the
 * tick was refused rather than silently dropped.
 */

interface CronLock {
  release(): void;
}

const running = new Map<string, { startedAt: number }>();

/** Test seam — lets tests reset state between cases. */
export function __resetCronLocks(): void {
  running.clear();
}

export function isCronRunning(name: string): boolean {
  return running.has(name);
}

/** Milliseconds a named cron job has been running, or null when it is idle. */
export function cronRunElapsedMs(name: string): number | null {
  const entry = running.get(name);
  return entry ? Date.now() - entry.startedAt : null;
}

/**
 * Take the lock for `name`, or return `null` when a run is already in flight.
 * Always pair with `release()` in a `finally`.
 */
export function acquireCronLock(name: string): CronLock | null {
  if (running.has(name)) return null;
  running.set(name, { startedAt: Date.now() });
  return {
    release: () => {
      running.delete(name);
    },
  };
}

/** The 409 a route returns when it refuses to overlap an in-flight run. */
export function cronBusyResponse(name: string): NextResponse {
  return NextResponse.json(
    {
      success: false,
      code: 'CRON_ALREADY_RUNNING',
      job: name,
      runningForMs: cronRunElapsedMs(name),
      message: `A previous run of "${name}" is still in progress; this tick was skipped.`,
    },
    { status: 409 }
  );
}

/**
 * Authenticate, guard against overlap, and run `work` — auth + lock + run in one call.
 * `work` returns the route's own response so each route keeps its exact payload shape.
 */
export async function runCron(
  name: string,
  request: NextRequest,
  work: () => Promise<NextResponse>
): Promise<NextResponse> {
  const denied = cronAuthFailure(request.headers);
  if (denied) return denied;

  const lock = acquireCronLock(name);
  if (!lock) return cronBusyResponse(name);

  /*
    Correlation for wrapped-style routes: one id per tick, echoed on the response, so every log line
    this run emits can be joined. (Inline-style routes mint their own id when they *enqueue* work, so
    queue documents produced by a cron run are still traceable end to end.)
  */
  const correlationId = resolveCorrelationId(request.headers.get(CORRELATION_HEADER));

  try {
    const response = await runWithCorrelation({ correlationId }, work);
    response.headers.set(CORRELATION_HEADER, correlationId);
    return response;
  } finally {
    lock.release();
  }
}
