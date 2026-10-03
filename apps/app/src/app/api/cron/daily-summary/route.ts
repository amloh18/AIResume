import { runCron } from '@/lib/cron/runCron';
import { log } from '@/lib/structured-logger';
import { NextRequest, NextResponse } from 'next/server';
import dailySummaryEmailService from '@/lib/services/dailySummaryEmailService';

/**
 * Daily Summary Email Cron Endpoint
 * Should be called daily (e.g., via Vercel Cron or external cron service)
 *
 * Usage:
 * - Vercel Cron: Add to vercel.json
 * - External: Set up daily cron job to call this endpoint
 *
 * Security: `Authorization: Bearer <CRON_SECRET>` (or `CRON_API_KEY`), checked by the shared
 * fail-closed, constant-time guard rather than a hand-rolled `!==` compare.
 */
export async function GET(request: NextRequest) {
  // Overlap guard: a slow summary run overlapping its next tick would enqueue the same emails twice.
  return runCron('daily-summary', request, async () => {
    try {
      log.info('📧 Starting daily summary email job...');

      const result = await dailySummaryEmailService.sendDailySummariesToAllUsers();

      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        result: {
          sent: result.sent,
          skipped: result.skipped,
          failed: result.failed,
          errors: result.errors.slice(0, 10), // Limit errors in response
        },
      });
    } catch (error: any) {
      log.error('❌ Error in daily summary cron job:', error);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to send daily summaries',
          message: error.message 
        },
        { status: 500 }
      );
    }
  });
}

// Also support POST for cron services that use POST
export async function POST(request: NextRequest) {
  return GET(request);
}

