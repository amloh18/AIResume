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
  actionData?: any;
  interactive?: boolean;
  priority?: NotificationPriority;
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
      documents_ready: { enabled: true, channels: { 'in-app': true, email: true, push: false } },
      interview_follow_up: { enabled: true, channels: { 'in-app': true, email: true, push: false } },
      job_applied: { enabled: true, channels: { 'in-app': true, email: false, push: false } },
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

    // Get user preferences
    const preferences = await this.getUserPreferences(params.userId, params.type);

    // If notification type is disabled, don't create it
    if (!preferences.enabled) {
      throw new Error(`Notification type ${params.type} is disabled for user`);
    }

    // Determine which channels to use based on preferences
    const channels: NotificationChannel[] = [];
    if (preferences.channels['in-app']) channels.push('in-app');
    if (preferences.channels.email) channels.push('email');
    if (preferences.channels.push) channels.push('push');

    // If no channels are enabled, don't create notification
    if (channels.length === 0) {
      throw new Error(`No delivery channels enabled for notification type ${params.type}`);
    }

    // Create notification
    const notification = new Notification({
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      actionType: params.actionType,
      actionData: params.actionData || {},
      interactive: params.interactive || false,
      priority: params.priority || 'medium',
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
}

export default new NotificationService();

