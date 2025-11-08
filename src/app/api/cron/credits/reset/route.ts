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
  try {
    // Optional: Add authentication/authorization check
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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

