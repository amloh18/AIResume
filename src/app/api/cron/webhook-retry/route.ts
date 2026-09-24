import { NextRequest, NextResponse } from 'next/server';
import { cronAuthFailure } from '@/lib/auth/cron-guard';
import { acquireCronLock, cronBusyResponse } from '@/lib/cron/runCron';
import webhookRetryService from '@/lib/services/webhookRetryService';

/**
 * Webhook Retry Cron Endpoint
 * Should be called periodically (e.g., every 15 minutes) by a cron service
 *
 * Security: authenticated by the shared cron guard — `CRON_SECRET`, with `CRON_API_KEY` accepted as an
 * alias. This route's own `verifyCronSecret` helper was already fail-closed and already accepted both
 * names, but it was the last endpoint carrying its own copy of the check; every cron route now goes
 * through `cronAuthFailure` so the fail-closed rule lives in exactly one place.
 */

export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  // Overlap guard: two concurrent passes would retry the same failed webhook twice.
  const lock = acquireCronLock('webhook-retry');
  if (!lock) return cronBusyResponse('webhook-retry');

  try {
    const denied = cronAuthFailure(request.headers);
    if (denied) return denied;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const webhookId = searchParams.get('webhookId'); // Optional: retry specific webhook

    const results: any = {
      timestamp: new Date().toISOString(),
      retried: [],
      failed: [],
      skipped: []
    };

    if (webhookId) {
      // Retry specific webhook
      const result = await webhookRetryService.retryFailedWebhook(webhookId);
      if (result.success) {
        results.retried.push({
          webhookId: result.webhookLogId,
          retryCount: result.retryCount
        });
      } else {
        results.failed.push({
          webhookId: result.webhookLogId,
          retryCount: result.retryCount,
          error: result.error
        });
      }
    } else {
      // Get failed webhooks ready for retry
      const failedWebhooks = await webhookRetryService.getFailedWebhooks(limit);

      console.log(`Found ${failedWebhooks.length} webhooks ready for retry`);

      // Retry each webhook
      for (const webhook of failedWebhooks) {
        try {
          const result = await webhookRetryService.retryFailedWebhook(webhook._id.toString());
          
          if (result.success) {
            results.retried.push({
              webhookId: result.webhookLogId,
              retryCount: result.retryCount,
              provider: webhook.provider,
              eventType: webhook.eventType
            });
          } else {
            results.failed.push({
              webhookId: result.webhookLogId,
              retryCount: result.retryCount,
              error: result.error,
              provider: webhook.provider,
              eventType: webhook.eventType
            });
          }
        } catch (error: any) {
          results.failed.push({
            webhookId: webhook._id.toString(),
            error: error.message,
            provider: webhook.provider,
            eventType: webhook.eventType
          });
        }
      }
    }

    // Get statistics
    const stats = await webhookRetryService.getRetryStatistics();

    return NextResponse.json({
      success: true,
      message: 'Webhook retry completed',
      results,
      statistics: stats
    });
  } catch (error: any) {
    console.error('Error in webhook retry cron:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: error.message 
      },
      { status: 500 }
    );
  } finally {
    lock.release();
  }
}

