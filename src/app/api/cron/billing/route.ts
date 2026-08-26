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
    // Security: Verify CRON_API_KEY is configured
    const cronApiKey = process.env.CRON_API_KEY;
    if (!cronApiKey) {
      console.error('CRON_API_KEY is not configured - blocking request');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== cronApiKey) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'all';

    const results: any = {};

    // Run all billing operations in parallel (they are independent)
    if (action === 'all') {
      const [renewals, dunning, retry, emails] = await Promise.allSettled([
        processRenewals(),
        processDunning(),
        retryFailedPayments(),
        sendDunningEmails(),
      ]);
      results.renewals = renewals.status === 'fulfilled' ? renewals.value : { error: renewals.reason?.message };
      results.dunning = dunning.status === 'fulfilled' ? dunning.value : { error: dunning.reason?.message };
      results.retry = retry.status === 'fulfilled' ? retry.value : { error: retry.reason?.message };
      results.emails = emails.status === 'fulfilled' ? emails.value : { error: emails.reason?.message };
    } else {
      // Individual actions
      if (action === 'renewals') results.renewals = await processRenewals();
      if (action === 'dunning') results.dunning = await processDunning();
      if (action === 'retry') results.retry = await retryFailedPayments();
      if (action === 'emails') results.emails = await sendDunningEmails();
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

