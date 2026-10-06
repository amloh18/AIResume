import { runCron } from '@/lib/cron/runCron';
import { log } from '@/lib/structured-logger';
import { NextRequest, NextResponse } from 'next/server';
import webhookRetryService from '@/lib/services/webhookRetryService';

/**
 * Webhook Retry Cron Endpoint
 * Should be called periodically (e.g., every 15 minutes) by a cron service
 *
 * Security: authenticated by the shared cron guard — `CRON_SECRET`, with `CRON_API_KEY` accepted as an
 * alias. This route used to carry its own `verifyCronSecret` copy; it now goes through `runCron`, so
 * fail-closed auth, the overlap lock and correlation id live in exactly one place for every cron route.
 */

export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  // Overlap guard: two concurrent passes would retry the same failed webhook twice.
  return runCron('webhook-retry', request, async () => {
    try {
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

        log.info(`Found ${failedWebhooks.length} webhooks ready for retry`);

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
      log.error('Error in webhook retry cron:', error);
      return NextResponse.json(
        { 
          success: false,
          error: 'Internal server error',
          message: error.message 
        },
        { status: 500 }
      );
    }
  });
}

