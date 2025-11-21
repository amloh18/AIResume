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
 * Security: Requires CRON_SECRET in Authorization header
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const authHeader = request.headers.get('authorization');
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret) {
      console.error('CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    if (token !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('📧 Starting daily summary email job...');

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
    console.error('❌ Error in daily summary cron job:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to send daily summaries',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

// Also support POST for cron services that use POST
export async function POST(request: NextRequest) {
  return GET(request);
}

