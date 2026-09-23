import { NextRequest, NextResponse } from 'next/server';
import { cronAuthFailure } from '@/lib/auth/cron-guard';
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
  try {
    // Fail closed — a missing CRON_SECRET must never make this endpoint public.
    const denied = cronAuthFailure(request.headers);
    if (denied) return denied;

    const result = await creditResetService.resetCreditsForEligibleUsers();

    return NextResponse.json({
      success: true,
      message: 'Credit reset completed',
      reset: result.reset,
      skipped: result.skipped,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error in credit reset cron job:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to reset credits',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

