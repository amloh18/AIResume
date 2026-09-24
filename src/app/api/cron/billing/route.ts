import { runCron } from '@/lib/cron/runCron';
import { log } from '@/lib/structured-logger';
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
 * Security: `Authorization: Bearer <CRON_SECRET|CRON_API_KEY>` (or the legacy `X-Api-Key` header),
 * checked by the shared fail-closed, constant-time guard. This route previously required *only*
 * `CRON_API_KEY` via `X-Api-Key` with a plain `!==` compare — which disagreed with `src/proxy.ts`,
 * where `/api/cron/*` is admitted by a Bearer token, so a correctly proxied request was rejected here
 * and an `X-Api-Key`-only request was rejected at the proxy. Both header forms now work end to end.
 */
export async function GET(request: NextRequest) {
  // Overlap guard: concurrent renewal/dunning passes could double-charge a card already being retried.
  return runCron('billing', request, async () => {
    try {
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
      log.error('Error in billing scheduler:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  });
}

// Also support POST for cron services that use POST
export async function POST(request: NextRequest) {
  return GET(request);
}

