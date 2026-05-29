// @ts-nocheck
import { getConnection } from '@/lib/database';
import Notification, {
  INotification,
  NotificationType,
  NotificationChannel,
  NotificationPriority,
} from '@/models/Notification';
import NotificationQueue, {
  INotificationQueue,
  QueueTaskType,
} from '@/models/NotificationQueue';
import User from '@/models/User';
import emailNotificationService from './emailNotificationService';

export interface CreateNotificationParams {
  userId: string | any;
  type: NotificationType;
  title: string;
  message: string;
  actionType?: string;
  actionUrl?: string;
  actionData?: any;
  interactive?: boolean;
  priority?: NotificationPriority;
  category?: string;
  expiresAt?: Date;
  persistent?: boolean;
  channels?: NotificationChannel[];
  metadata?: any;
}

export interface EnqueueNotificationParams {
  taskType: QueueTaskType;
  payload: any;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  scheduledFor?: Date;
}

class NotificationService {
  /**
   * Get default notification preferences for a notification type
   */
  private getDefaultPreferences(type: NotificationType): {
    enabled: boolean;
    channels: { 'in-app': boolean; email: boolean; push: boolean };
  } {
    const defaults: Record<NotificationType, { enabled: boolean; channels: { 'in-app': boolean; email: boolean; push: boolean } }> = {
      job_status_check: { enabled: true, channels: { 'in-app': true, email: false, push: false } },
      follow_up: { enabled: true, channels: { 'in-app': true, email: true, push: false } },
      deadline_approaching: { enabled: true, channels: { 'in-app': true, email: true, push: true } },
      deadline_due_today: { enabled: true, channels: { 'in-app': true, email: true, push: true } },
      deadline_missed: { enabled: true, channels: { 'in-app': true, email: true, push: false } },
      membership_expiring: { enabled: true, channels: { 'in-app': true, email: true, push: true } },
      membership_expired: { enabled: true, channels: { 'in-app': true, email: true, push: false } },
      discount_offer: { enabled: true, channels: { 'in-app': true, email: false, push: false } },
      system_update: { enabled: true, channels: { 'in-app': true, email: false, push: false } },
      achievement: { enabled: true, channels: { 'in-app': true, email: false, push: false } },
      documents_ready: { enabled: true, channels: { 'in-app': true, email: false, push: false } },
      interview_follow_up: { enabled: true, channels: { 'in-app': true, email: false, push: false } },
      job_applied: { enabled: true, channels: { 'in-app': true, email: false, push: false } },

      // New Types Defaults
      job_draft_created: { enabled: true, channels: { 'in-app': true, email: false, push: false } },
      job_stage_moved: { enabled: true, channels: { 'in-app': true, email: false, push: false } },
      job_stale_alert: { enabled: true, channels: { 'in-app': true, email: true, push: false } },
      interview_prep_ready: { enabled: true, channels: { 'in-app': true, email: false, push: false } },
      document_saved: { enabled: true, channels: { 'in-app': true, email: false, push: false } },
      feature_discovery: { enabled: true, channels: { 'in-app': true, email: false, push: false } },
      extension_download: { enabled: true, channels: { 'in-app': true, email: false, push: false } },
    };

    return defaults[type] || { enabled: true, channels: { 'in-app': true, email: false, push: false } };
  }

  /**
   * Get user notification preferences for a specific type
   */
  private async getUserPreferences(
    userId: string,
    type: NotificationType
  ): Promise<{ enabled: boolean; channels: { 'in-app': boolean; email: boolean; push: boolean } }> {
    await getConnection();
    const user = await User.findById(userId).select('notificationPreferences');

    if (!user) {
      return this.getDefaultPreferences(type);
    }

    const preferences = user.notificationPreferences || {};
    const typePreferences = preferences[type];

    if (!typePreferences) {
      return this.getDefaultPreferences(type);
    }

    return {
      enabled: typePreferences.enabled !== false,
      channels: {
        'in-app': typePreferences.channels?.['in-app'] !== false,
        email: typePreferences.channels?.email === true,
        push: typePreferences.channels?.push === true,
      },
    };
  }

  /**
   * Create a notification and deliver it based on user preferences
   */
  async createNotification(params: CreateNotificationParams): Promise<INotification> {
    await getConnection();

    // Use provided channels if available, otherwise use user preferences
    let channels: NotificationChannel[] = [];

    if (params.channels && params.channels.length > 0) {
      // Use explicitly provided channels
      channels = params.channels;
    } else {
      // Get user preferences
      const preferences = await this.getUserPreferences(params.userId, params.type);

      // If notification type is disabled, don't create it
      if (!preferences.enabled) {
        throw new Error(`Notification type ${params.type} is disabled for user`);
      }

      // Determine which channels to use based on preferences
      if (preferences.channels['in-app']) channels.push('in-app');
      if (preferences.channels.email) channels.push('email');
      if (preferences.channels.push) channels.push('push');

      // If no channels are enabled, don't create notification
      if (channels.length === 0) {
        throw new Error(`No delivery channels enabled for notification type ${params.type}`);
      }
    }

    // Create notification
    const notification = new Notification({
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      actionType: params.actionType,
      actionUrl: params.actionUrl,
      actionData: params.actionData || {},
      interactive: params.interactive || false,
      priority: params.priority || 'medium',
      category: params.category,
      expiresAt: params.expiresAt,
      persistent: params.persistent || false,
      channels,
      deliveryStatus: {},
      metadata: params.metadata || {},
    });

    await notification.save();

    // Deliver to enabled channels
    await this.deliverNotification(notification);

    return notification;
  }

  /**
   * Enqueue a notification task (decoupled - doesn't process immediately)
   */
  async enqueueNotificationTask(params: EnqueueNotificationParams): Promise<INotificationQueue> {
    await getConnection();

    const queueTask = new NotificationQueue({
      taskType: params.taskType,
      payload: params.payload,
      priority: params.priority || 'medium',
      scheduledFor: params.scheduledFor || new Date(),
      status: 'pending',
      retries: 0,
      maxRetries: 3,
    });

    await queueTask.save();
    return queueTask;
  }

  /**
   * Deliver notification to all enabled channels
   */
  async deliverNotification(notification: INotification): Promise<void> {
    const user = await User.findById(notification.userId).select('email firstName');
    if (!user) {
      console.error(`User not found for notification ${notification._id}`);
      return;
    }

    // Deliver to each enabled channel
    for (const channel of notification.channels) {
      try {
        if (channel === 'in-app') {
          await this.sendInApp(notification);
        } else if (channel === 'email') {
          await this.sendEmail(notification, user.email, user.firstName);
        } else if (channel === 'push') {
          await this.sendPush(notification);
        }
      } catch (error: any) {
        console.error(`Failed to deliver notification ${notification._id} via ${channel}:`, error);
        // Update delivery status with error
        if (notification.deliveryStatus[channel]) {
          notification.deliveryStatus[channel].error = error.message;
        }
        await notification.save();
      }
    }
  }

  /**
   * Send in-app notification (already created in DB, just mark as delivered)
   */
  private async sendInApp(notification: INotification): Promise<void> {
    notification.deliveryStatus['in-app'] = {
      delivered: true,
      deliveredAt: new Date(),
    };
    await notification.save();

    // Send notification via SSE immediately if connection exists
    try {
      // Dynamic import sseService to avoid circular dependencies
      const { sseService } = await import('@/lib/services/sseService');
      const userId = notification.userId.toString();
      
      // Convert Mongoose document to plain object for SSE transmission
      let notificationData: any;
      if (notification.toObject) {
        notificationData = notification.toObject();
      } else if (notification.toJSON) {
        notificationData = notification.toJSON();
      } else {
        // Fallback: manually extract all fields
        notificationData = {
          _id: notification._id,
          userId: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          actionType: notification.actionType,
          actionData: notification.actionData || {},
          read: notification.read || false,
          readAt: notification.readAt,
          interactive: notification.interactive || false,
          priority: notification.priority || 'medium',
          expiresAt: notification.expiresAt,
          persistent: notification.persistent || false,
          channels: notification.channels || ['in-app'],
          deliveryStatus: notification.deliveryStatus || {},
          metadata: notification.metadata || {},
          createdAt: notification.createdAt || new Date(),
          updatedAt: notification.updatedAt || new Date(),
        };
      }
      
      // Ensure channels array exists and includes 'in-app'
      if (!notificationData.channels || !Array.isArray(notificationData.channels)) {
        notificationData.channels = ['in-app'];
      }
      
      await sseService.sendNotificationToUser(userId, notificationData);
      if (process.env.NODE_ENV === 'development') {
        console.log(`📤 Notification sent via SSE to user ${userId}:`, notificationData.title);
      }
    } catch (error) {
      // SSE might not be available or user might not be connected - that's okay
      // The polling mechanism will pick it up
      if (process.env.NODE_ENV === 'development') {
        console.debug('Could not send notification via SSE (user may not be connected):', error);
      }
    }
  }

  /**
   * Send email notification
   */
  private async sendEmail(
    notification: INotification,
    userEmail: string,
    firstName: string
  ): Promise<void> {
    const result = await emailNotificationService.sendEmailNotification(
      notification,
      userEmail,
      firstName
    );

    if (result.success) {
      notification.deliveryStatus.email = {
        delivered: true,
        deliveredAt: new Date(),
      };
    } else {
      notification.deliveryStatus.email = {
        delivered: false,
        error: result.error || 'Unknown error',
      };
    }
    await notification.save();
  }

  /**
   * Send push notification (placeholder - will be implemented with push service)
   */
  private async sendPush(notification: INotification): Promise<void> {
    // TODO: Implement push notification service
    // For now, just mark as delivered
    notification.deliveryStatus.push = {
      delivered: true,
      deliveredAt: new Date(),
    };
    await notification.save();
  }


  /**
   * Process notification queue (called by worker)
   */
  async processNotificationQueue(limit: number = 50): Promise<{
    processed: number;
    failed: number;
  }> {
    await getConnection();

    const tasks = await NotificationQueue.find({
      status: 'pending',
      scheduledFor: { $lte: new Date() },
    })
      .sort({ priority: -1, createdAt: 1 })
      .limit(limit);

    let processed = 0;
    let failed = 0;

    for (const task of tasks) {
      try {
        // Mark as processing
        task.status = 'processing';
        task.processedAt = new Date();
        await task.save();

        // Process based on task type
        if (task.taskType === 'broadcast' || task.taskType === 'targeted') {
          // Handle bulk notifications
          const userIds = task.payload.userIds || [task.payload.userId];
          for (const userId of userIds) {
            await this.createNotification({
              userId,
              type: task.payload.notificationType as NotificationType,
              title: task.payload.title,
              message: task.payload.message,
              actionType: task.payload.actionType,
              actionData: task.payload.actionData,
              interactive: task.payload.interactive,
              priority: task.payload.priority as NotificationPriority,
              expiresAt: task.payload.expiresAt,
              persistent: task.payload.persistent,
              channels: task.payload.channels,
              metadata: task.payload.metadata,
            });
          }
        } else {
          // Handle single user notification
          await this.createNotification({
            userId: task.payload.userId,
            type: task.taskType as NotificationType,
            title: task.payload.title,
            message: task.payload.message,
            actionType: task.payload.actionType,
            actionData: task.payload.actionData,
            interactive: task.payload.interactive,
            priority: task.payload.priority as NotificationPriority,
            expiresAt: task.payload.expiresAt,
            persistent: task.payload.persistent,
            channels: task.payload.channels,
            metadata: task.payload.metadata,
          });
        }

        // Mark as completed
        task.status = 'completed';
        task.completedAt = new Date();
        await task.save();
        processed++;
      } catch (error: any) {
        console.error(`Failed to process queue task ${task._id}:`, error);
        task.retries++;
        task.error = error.message;

        if (task.retries >= task.maxRetries) {
          task.status = 'failed';
        } else {
          task.status = 'pending';
          // Exponential backoff: retry after 2^retries minutes
          task.scheduledFor = new Date(Date.now() + Math.pow(2, task.retries) * 60 * 1000);
        }
        await task.save();
        failed++;
      }
    }

    return { processed, failed };
  }
  /**
   * Notify when a job draft is created
   */
  async notifyJobDraftCreated(userId: string, jobTitle: string, jobId: string): Promise<void> {
    await this.createNotification({
      userId,
      type: 'job_draft_created',
      title: 'Job Draft Created',
      message: `Draft for "${jobTitle}" has been saved. Complete your application when ready.`,
      actionType: 'edit_job',
      actionData: { jobId },
      interactive: true,
      priority: 'low',
    });
  }

  /**
   * Notify when a job stage is moved
   */
  async notifyJobStageMoved(
    userId: string,
    jobTitle: string,
    jobId: string,
    newStage: string,
    oldStage: string
  ): Promise<void> {
    // Determine message based on stage
    let message = `"${jobTitle}" moved to ${newStage}.`;
    let priority: NotificationPriority = 'medium';

    if (newStage === 'Offer') {
      message = `Congratulations! "${jobTitle}" moved to Offer stage! 🎉`;
      priority = 'high';
    } else if (newStage === 'Rejected') {
      message = `"${jobTitle}" moved to Rejected. Keep going, the right role is out there!`;
      priority = 'low';
    } else if (newStage === 'Interview') {
      message = `Exciting! "${jobTitle}" moved to Interview stage. Check out prep materials.`;
      priority = 'high';
    }

    await this.createNotification({
      userId,
      type: 'job_stage_moved',
      title: 'Job Status Updated',
      message,
      actionType: 'view_job',
      actionData: { jobId },
      interactive: true,
      priority,
    });

    // Valid "Interview Prep Ready" notification if moving to Interview
    if (newStage === 'Interview') {
      await this.notifyInterviewPrepReady(userId, jobTitle, jobId);
    }
  }

  /**
   * Notify when interview prep is ready
   */
  async notifyInterviewPrepReady(userId: string, jobTitle: string, jobId: string): Promise<void> {
    await this.createNotification({
      userId,
      type: 'interview_prep_ready',
      title: 'Interview Prep Ready',
      message: `AI Interview Coach is ready for "${jobTitle}". Practice now!`,
      actionType: 'interview_prep',
      actionData: { jobId },
      interactive: true,
      priority: 'high',
    });
  }

  /**
   * Notify about stale jobs (Action Required)
   */
  async notifyStaleJob(userId: string, jobTitle: string, jobId: string, daysSinceUpdate: number): Promise<void> {
    await this.createNotification({
      userId,
      type: 'job_stale_alert',
      title: 'Action Required',
      message: `"${jobTitle}" hasn't been updated in ${daysSinceUpdate} days. Any updates?`,
      actionType: 'view_job',
      actionData: { jobId },
      interactive: true,
      priority: 'medium',
    });
  }

  /**
   * Notify when documents are saved
   */
  async notifyDocumentSaved(userId: string, docName: string, docType: string): Promise<void> {
    await this.createNotification({
      userId,
      type: 'document_saved',
      title: 'Document Saved',
      message: `${docType} "${docName}" has been saved successfully.`,
      priority: 'low',
    });
  }

  /**
   * Trigger feature discovery notification (idempotent check should be done by caller or here if needed)
   */
  async notifyFeatureDiscovery(userId: string, featureName: string, description: string): Promise<void> {
    await this.createNotification({
      userId,
      type: 'feature_discovery',
      title: `Try New Feature: ${featureName}`,
      message: description,
      interactive: true,
      actionType: 'feature_discovery', // generic action handler
      actionData: { feature: featureName },
      priority: 'low',
    });
  }

  /**
   * Trigger Chrome Extension download nudge
   */
  async notifyExtensionDownload(userId: string): Promise<void> {
    await this.createNotification({
      userId,
      type: 'extension_download',
      title: 'Boost Your Productivity',
      message: 'Download our Chrome Extension to save jobs directly from LinkedIn and other sites.',
      interactive: true,
      actionType: 'download_extension',
      actionData: { url: 'https://chrome.google.com/webstore/...' }, // Placeholder URL
      priority: 'medium',
      channels: ['in-app'], // Usually just in-app is enough
    });
  }
}

export default new NotificationService();

