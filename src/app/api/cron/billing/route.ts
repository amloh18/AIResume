import { NextRequest, NextResponse } from 'next/server';
import {
  processRenewals,
  processDunning,
  retryFailedPayments,
  sendDunningEmails
} from '@/lib/services/billingSchedulerService';

/**
 * Billing Scheduler Cron Endpoint
 * Should be called by a cron job service (e.g., Vercel Cron, GitHub Actions, etc.)
 * 
 * Security: Add authentication/authorization (API key, IP whitelist, etc.)
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Add authentication/authorization
    // Example: Check for API key in headers
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== process.env.CRON_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'all';

    const results: any = {};

    // Process renewals
    if (action === 'all' || action === 'renewals') {
      results.renewals = await processRenewals();
    }

    // Process dunning
    if (action === 'all' || action === 'dunning') {
      results.dunning = await processDunning();
    }

    // Retry failed payments
    if (action === 'all' || action === 'retry') {
      results.retry = await retryFailedPayments();
    }

    // Send dunning emails
    if (action === 'all' || action === 'emails') {
      results.emails = await sendDunningEmails();
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results
    });
  } catch (error: any) {
    console.error('Error in billing scheduler:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Also support POST for cron services that use POST
export async function POST(request: NextRequest) {
  return GET(request);
}

