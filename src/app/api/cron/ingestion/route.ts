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
import { BackgroundScheduler } from '@/lib/ingestion/backgroundScheduler';
import { BaselineScheduler } from '@/lib/ingestion/baselineSchedule';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

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
  }
}

/**
 * POST endpoint for manual triggers (admin only).
 * Accepts optional body with { action: 'baseline' | 'demand' | 'health' }.
 */
export async function POST(request: NextRequest) {
  // Verify cron secret or admin auth
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const action = body.action || 'full';

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
  }
}
