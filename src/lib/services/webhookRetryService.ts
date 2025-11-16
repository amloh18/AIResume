import { getConnection } from '@/lib/database';
import WebhookLog from '@/models/WebhookLog';

export interface RetryResult {
  success: boolean;
  webhookLogId: string;
  retryCount: number;
  error?: string;
}

export interface FailedWebhook {
  _id: string;
  provider: 'stripe' | 'razorpay';
  eventType: string;
  payload: any;
  status: string;
  errorMessage?: string;
  retryCount?: number;
  lastRetryAt?: Date;
  createdAt: Date;
}

/**
 * Webhook Retry Service
 * Handles retrying failed webhooks with exponential backoff
 */
class WebhookRetryService {
  private readonly MAX_RETRIES = 5;
  private readonly BASE_DELAY_MS = 60000; // 1 minute
  private readonly MAX_DELAY_MS = 3600000; // 1 hour

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(retryCount: number): number {
    const delay = Math.min(
      this.BASE_DELAY_MS * Math.pow(2, retryCount),
      this.MAX_DELAY_MS
    );
    return delay;
  }

  /**
   * Check if webhook should be retried
   */
  private shouldRetry(webhookLog: any): boolean {
    if (webhookLog.status === 'processed') {
      return false; // Already processed
    }

    if (webhookLog.status === 'failed_permanently') {
      return false; // Permanently failed
    }

    const retryCount = webhookLog.retryCount || 0;
    if (retryCount >= this.MAX_RETRIES) {
      return false; // Max retries reached
    }

    // Check if enough time has passed since last retry
    if (webhookLog.lastRetryAt) {
      const lastRetry = new Date(webhookLog.lastRetryAt);
      const delay = this.calculateBackoffDelay(retryCount);
      const nextRetryTime = new Date(lastRetry.getTime() + delay);
      
      if (new Date() < nextRetryTime) {
        return false; // Not time to retry yet
      }
    }

    return true;
  }

  /**
   * Get failed webhooks that are ready for retry
   */
  async getFailedWebhooks(limit: number = 50): Promise<FailedWebhook[]> {
    await getConnection();

    const failedWebhooks = await WebhookLog.find({
      status: { $in: ['failed', 'error'] },
      retryCount: { $lt: this.MAX_RETRIES }
    })
      .sort({ createdAt: 1 }) // Oldest first
      .limit(limit)
      .lean();

    // Filter webhooks that are ready for retry
    const readyForRetry = failedWebhooks.filter(webhook => {
      if (!webhook.lastRetryAt) {
        return true; // Never retried, ready immediately
      }

      const retryCount = webhook.retryCount || 0;
      const delay = this.calculateBackoffDelay(retryCount);
      const nextRetryTime = new Date(webhook.lastRetryAt.getTime() + delay);
      
      return new Date() >= nextRetryTime;
    });

    return readyForRetry as FailedWebhook[];
  }

  /**
   * Retry a failed webhook
   */
  async retryFailedWebhook(webhookLogId: string): Promise<RetryResult> {
    await getConnection();

    const webhookLog = await WebhookLog.findById(webhookLogId);
    if (!webhookLog) {
      return {
        success: false,
        webhookLogId,
        retryCount: 0,
        error: 'Webhook log not found'
      };
    }

    if (!this.shouldRetry(webhookLog)) {
      return {
        success: false,
        webhookLogId,
        retryCount: webhookLog.retryCount || 0,
        error: 'Webhook should not be retried'
      };
    }

    const retryCount = (webhookLog.retryCount || 0) + 1;

    try {
      // Re-process the webhook based on provider
      if (webhookLog.provider === 'stripe') {
        await this.retryStripeWebhook(webhookLog);
      } else if (webhookLog.provider === 'razorpay') {
        await this.retryRazorpayWebhook(webhookLog);
      } else {
        throw new Error(`Unknown provider: ${webhookLog.provider}`);
      }

      // Mark as processed
      await WebhookLog.findByIdAndUpdate(webhookLogId, {
        status: 'processed',
        retryCount,
        lastRetryAt: new Date(),
        processedAt: new Date(),
        errorMessage: undefined
      });

      return {
        success: true,
        webhookLogId,
        retryCount
      };
    } catch (error: any) {
      // Update retry count and error message
      const updateData: any = {
        retryCount,
        lastRetryAt: new Date(),
        errorMessage: error.message || 'Retry failed'
      };

      // Mark as permanently failed if max retries reached
      if (retryCount >= this.MAX_RETRIES) {
        updateData.status = 'failed_permanently';
      } else {
        updateData.status = 'error'; // Keep as error for next retry
      }

      await WebhookLog.findByIdAndUpdate(webhookLogId, updateData);

      return {
        success: false,
        webhookLogId,
        retryCount,
        error: error.message || 'Retry failed'
      };
    }
  }

  /**
   * Retry Stripe webhook
   * Note: This re-processes the webhook by making an internal API call
   * In production, you might want to extract processing logic into a shared service
   */
  private async retryStripeWebhook(webhookLog: any): Promise<void> {
    // For now, we'll mark it for manual review or implement a simpler retry
    // TODO: Extract webhook processing logic into a shared service
    // For Phase 5, we'll focus on tracking retries and marking for review
    
    // Reconstruct the webhook payload
    const event = {
      type: webhookLog.eventType,
      data: {
        object: webhookLog.payload
      },
      id: webhookLog.payload?.id || `retry_${webhookLog._id}`
    };

    // Process based on event type - simplified version
    // In a full implementation, you'd extract the handler logic here
    console.log(`Retrying Stripe webhook: ${webhookLog.eventType}`, event);
    
    // For now, throw an error to indicate retry is needed
    // This will be enhanced when processing logic is extracted
    throw new Error('Webhook retry processing not yet fully implemented. Manual review required.');
  }

  /**
   * Retry Razorpay webhook
   * Note: This re-processes the webhook by making an internal API call
   */
  private async retryRazorpayWebhook(webhookLog: any): Promise<void> {
    // Reconstruct the webhook payload
    const event = {
      event: webhookLog.eventType,
      payload: webhookLog.payload
    };

    console.log(`Retrying Razorpay webhook: ${webhookLog.eventType}`, event);
    
    // For now, throw an error to indicate retry is needed
    // This will be enhanced when processing logic is extracted
    throw new Error('Webhook retry processing not yet fully implemented. Manual review required.');
  }

  /**
   * Mark webhook as permanently failed
   */
  async markAsPermanentlyFailed(webhookLogId: string, reason?: string): Promise<void> {
    await getConnection();

    await WebhookLog.findByIdAndUpdate(webhookLogId, {
      status: 'failed_permanently',
      errorMessage: reason || 'Max retries exceeded'
    });
  }

  /**
   * Get statistics about failed webhooks
   */
  async getRetryStatistics(): Promise<{
    totalFailed: number;
    readyForRetry: number;
    permanentlyFailed: number;
    byProvider: Record<string, number>;
    byEventType: Record<string, number>;
  }> {
    await getConnection();

    const totalFailed = await WebhookLog.countDocuments({
      status: { $in: ['failed', 'error'] }
    });

    const readyForRetry = (await this.getFailedWebhooks(1000)).length;

    const permanentlyFailed = await WebhookLog.countDocuments({
      status: 'failed_permanently'
    });

    const byProvider = await WebhookLog.aggregate([
      {
        $match: {
          status: { $in: ['failed', 'error', 'failed_permanently'] }
        }
      },
      {
        $group: {
          _id: '$provider',
          count: { $sum: 1 }
        }
      }
    ]);

    const byEventType = await WebhookLog.aggregate([
      {
        $match: {
          status: { $in: ['failed', 'error', 'failed_permanently'] }
        }
      },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 }
        }
      }
    ]);

    return {
      totalFailed,
      readyForRetry,
      permanentlyFailed,
      byProvider: byProvider.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>),
      byEventType: byEventType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>)
    };
  }
}

export default new WebhookRetryService();

