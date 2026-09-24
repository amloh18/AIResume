import { runCron } from '@/lib/cron/runCron';
import { log } from '@/lib/structured-logger';
import { NextRequest, NextResponse } from 'next/server';
import creditResetService from '@/lib/services/creditResetService';

/**
 * Cron job endpoint to reset credits for eligible users
 * Should be called daily (e.g., via Vercel Cron or external cron service)
 * 
 * Usage:
 * - Vercel Cron: Add to vercel.json
 * - External: Set up daily cron job to call this endpoint
 */
export async function GET(request: NextRequest) {
  // Overlap guard: a reset running twice concurrently could double-award credits.
  return runCron('credits:reset', request, async () => {
    try {
      const result = await creditResetService.resetCreditsForEligibleUsers();

      return NextResponse.json({
        success: true,
        message: 'Credit reset completed',
        reset: result.reset,
        skipped: result.skipped,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      log.error('Error in credit reset cron job:', error);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to reset credits',
          message: error.message 
        },
        { status: 500 }
      );
    }
  });
}

