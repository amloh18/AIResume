import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { cronAuthFailure } from '@/lib/auth/cron-guard';
import { log } from '@/lib/structured-logger';
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
 *     const lock = await acquireCronLock('daily-summary');
 *     if (!lock) return cronBusyResponse('daily-summary');
 *     try {
 *       …existing work, unchanged…
 *     } catch (e) { … } finally {
 *       await lock.release();
 *     }
 *
 * Wrapped (for new routes):
 *
 *     return runCron('daily-summary', request, async () => NextResponse.json({ … }));
 *
 * ## Scope of the guarantee
 *
 * Two guards, checked in order:
 *
 *   1. an **in-process `Map`** — synchronous, so a same-process overlap is refused without a round
 *      trip, and the 409 can still report how long the run has been going;
 *   2. a **Mongo lease** (`cronlocks`, one document per job name) — the cross-process guard.
 *
 * The `Map` alone was the original implementation, and it is only correct while exactly one app
 * container exists. The docblock used to say so ("If the app is ever scaled to multiple replicas,
 * this must become a Mongo `findOneAndUpdate` lease before these routes rely on it") — this is that
 * lease (SB-07). Two replicas ticking `daily-summary` at the same second would otherwise both run.
 *
 * The lease is acquired with a conditional `findOneAndUpdate` on `expiresAt`, so exactly one caller
 * can win a given lease even when several race for an expired one: Mongo evaluates the filter
 * against the document state at update time, so the loser's filter no longer matches and its upsert
 * trips the unique index instead. That collision is the "someone else holds it" signal.
 *
 * **Degradation is deliberate.** If there is no database connection, or the lease store errors, the
 * run proceeds on the in-process guard alone and logs a warning. A guard that cannot reach its store
 * must not silently stop every scheduled job — that would trade a rare double-send for a total
 * outage, which is the worse failure. The practical consequence is that the first tick after a cold
 * boot may be single-process-only; every later tick is covered.
 *
 * **Known limitation.** The lease is not renewed, so a run that outlives `CRON_LEASE_TTL_MS` (or a
 * container killed without releasing) can be joined by the next tick once the lease lapses. The TTL
 * is therefore a ceiling on a stuck job's outage window, and is set well above the slowest job.
 *
 * A skipped run returns **409** with `code: 'CRON_ALREADY_RUNNING'` so the scheduler log shows the
 * tick was refused rather than silently dropped.
 */

interface CronLock {
  release(): Promise<void>;
}

/** How long a lease is valid before another tick may take it over. */
const CRON_LEASE_TTL_MS = 15 * 60 * 1000;

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

type LeaseOutcome =
  | { kind: 'acquired'; owner: string }
  | { kind: 'held' }
  | { kind: 'unavailable' };

/**
 * Try to take the cross-process lease.
 *
 * Distinguishing `held` from `unavailable` is the whole point: `held` means another run owns the job
 * and this tick must be refused, whereas `unavailable` means we could not ask and must fall back.
 */
async function tryAcquireLease(name: string): Promise<LeaseOutcome> {
  let CronLockModel: typeof import('@/models/CronLock').default;
  try {
    const mongoose = (await import('mongoose')).default;
    if (mongoose.connection.readyState !== 1) return { kind: 'unavailable' };
    CronLockModel = (await import('@/models/CronLock')).default;
  } catch (err: any) {
    log.warn('[runCron] Lease unavailable, falling back to the in-process guard', {
      job: name,
      error: err?.message,
    });
    return { kind: 'unavailable' };
  }

  const now = new Date();
  const owner = randomUUID();

  try {
    const doc = await CronLockModel.findOneAndUpdate(
      { name, expiresAt: { $lte: now } },
      {
        $set: {
          name,
          owner,
          startedAt: now,
          expiresAt: new Date(now.getTime() + CRON_LEASE_TTL_MS),
        },
      },
      { upsert: true, new: true }
    ).lean();

    // Defensive: with `upsert: true` a loser can, in principle, still observe the winner's document.
    if (!doc || doc.owner !== owner) return { kind: 'held' };
    return { kind: 'acquired', owner };
  } catch (err: any) {
    // A live lease already occupies the unique `name` — that is a genuine overlap.
    if (err?.code === 11000) return { kind: 'held' };

    log.warn('[runCron] Lease acquire failed, falling back to the in-process guard', {
      job: name,
      error: err?.message,
    });
    return { kind: 'unavailable' };
  }
}

async function releaseLease(name: string, owner: string): Promise<void> {
  const CronLockModel = (await import('@/models/CronLock')).default;
  // Scoped to `owner` so a run whose lease already lapsed cannot delete the lease of the run that
  // took over from it.
  await CronLockModel.deleteOne({ name, owner });
}

/**
 * Take the lock for `name`, or return `null` when a run is already in flight.
 * Always pair with `await release()` in a `finally`.
 */
export async function acquireCronLock(name: string): Promise<CronLock | null> {
  /*
    In-process slot first, and synchronously — before the first `await`. That keeps the guard cheap
    for the common case and preserves the property that a caller can observe the run as in-flight
    immediately after invoking it.
  */
  if (running.has(name)) return null;
  running.set(name, { startedAt: Date.now() });

  const outcome = await tryAcquireLease(name);

  if (outcome.kind === 'held') {
    // Another process is running this job. Give the local slot back — we are not running it.
    running.delete(name);
    return null;
  }

  const owner = outcome.kind === 'acquired' ? outcome.owner : null;

  return {
    release: async () => {
      running.delete(name);
      if (!owner) return;
      try {
        await releaseLease(name, owner);
      } catch (err: any) {
        // The lease expires on its own; failing to delete it must not fail the run.
        log.warn('[runCron] Lease release failed', { job: name, error: err?.message });
      }
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

  const lock = await acquireCronLock(name);
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
    await lock.release();
  }
}
