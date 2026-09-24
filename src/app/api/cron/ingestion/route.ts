// /api/cron/ingestion — Vercel cron endpoint for job ingestion
//
// Runs every 5 minutes to:
// 1. Process demand-driven segments (highest priority first)
// 2. Run baseline schedule (non-demand-driven refresh)
// 3. Recover stale runs
// 4. Cleanup expired locks
//
// Security: Protected by CRON_SECRET environment variable
// Time limit: Bounded execution to stay within Vercel serverless limits
//
// Usage in vercel.json:
// {
//   "crons": [{
//     "path": "/api/cron/ingestion",
//     "schedule": "*/5 * * * *"
//   }]
// }

import { NextRequest, NextResponse } from 'next/server';
import { cronAuthFailure } from '@/lib/auth/cron-guard';
import { acquireCronLock, cronBusyResponse } from '@/lib/cron/runCron';
import { BackgroundScheduler } from '@/lib/ingestion/backgroundScheduler';
import { BaselineScheduler } from '@/lib/ingestion/baselineSchedule';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Fail closed — a missing CRON_SECRET must never make this endpoint public.
  const denied = cronAuthFailure(request.headers);
  if (denied) return denied;

  // Overlap guard: a 5-minute tick must not start a second scheduler cycle while the previous one
  // still holds segment locks — the stale-recovery step would otherwise free them mid-flight.
  const lock = acquireCronLock('ingestion:get');
  if (!lock) return cronBusyResponse('ingestion:get');

  try {
    // Run the complete scheduler cycle
    const result = await BackgroundScheduler.run();

    // Log summary for monitoring
    console.log('[Cron Ingestion]', JSON.stringify({
      timestamp: result.timestamp,
      durationMs: result.duration,
      demandProcessed: result.steps.demandProcessing.processed,
      demandSucceeded: result.steps.demandProcessing.succeeded,
      baselineRan: result.steps.baselineSchedule.ran.length,
      baselineSkipped: result.steps.baselineSchedule.skipped.length,
      baselineFailed: result.steps.baselineSchedule.failed.length,
      errors: result.errors.length,
    }));

    // Return response
    return NextResponse.json({
      success: result.errors.length === 0,
      timestamp: result.timestamp,
      duration: result.duration,
      steps: {
        lockCleanup: result.steps.lockCleanup.cleaned,
        staleRecovery: result.steps.staleRecovery.recovered,
        demandProcessing: {
          processed: result.steps.demandProcessing.processed,
          succeeded: result.steps.demandProcessing.succeeded,
          failed: result.steps.demandProcessing.failed,
          skipped: result.steps.demandProcessing.skipped,
        },
        baselineSchedule: {
          ran: result.steps.baselineSchedule.ran,
          skipped: result.steps.baselineSchedule.skipped.length,
          failed: result.steps.baselineSchedule.failed,
        },
      },
      errors: result.errors,
    });
  } catch (err: any) {
    console.error('[Cron Ingestion] Fatal error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  } finally {
    lock.release();
  }
}

/**
 * POST endpoint for manual triggers (admin only).
 * Accepts optional body with { action: 'baseline' | 'demand' | 'health' }.
 */
export async function POST(request: NextRequest) {
  // Fail closed — a missing CRON_SECRET must never make this endpoint public.
  const denied = cronAuthFailure(request.headers);
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const action = body.action || 'full';

  // Overlap guard — same reason as GET: an overlapping manual trigger would fight the scheduled cycle.
  const lock = acquireCronLock('ingestion:post');
  if (!lock) return cronBusyResponse('ingestion:post');

  try {
    switch (action) {
      case 'baseline': {
        const result = await BaselineScheduler.runBaselineCycle();
        return NextResponse.json({ success: true, action, result });
      }

      case 'demand': {
        const { IngestionScheduler } = await import('@/lib/ingestion/scheduler');
        const maxSegments = body.maxSegments || 3;
        const result = await IngestionScheduler.processDemandQueue(maxSegments);
        return NextResponse.json({ success: true, action, result });
      }

      case 'health': {
        const result = await BackgroundScheduler.healthCheck();
        return NextResponse.json({ success: true, action, result });
      }

      case 'full':
      default: {
        const result = await BackgroundScheduler.run();
        return NextResponse.json({ success: true, action, result });
      }
    }
  } catch (err: any) {
    console.error(`[Cron Ingestion] ${action} error:`, err);
    return NextResponse.json(
      { success: false, action, error: err.message },
      { status: 500 }
    );
  } finally {
    lock.release();
  }
}
