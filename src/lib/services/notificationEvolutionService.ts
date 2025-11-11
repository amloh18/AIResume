import { getConnection } from '@/lib/database';
import Notification from '@/models/Notification';
import notificationService from './notificationService';
import { NotificationType } from '@/models/Notification';

class NotificationEvolutionService {
  /**
   * Handle time-sensitive to persistent transitions
   * Example: "Deadline approaching" (expiresAt = deadline) → "Deadline missed" (persistent)
   */
  async evolveNotifications(): Promise<{ evolved: number }> {
    await getConnection();

    const now = new Date();
    let evolved = 0;

    // Find expired time-sensitive notifications that should evolve
    const expiredNotifications = await Notification.find({
      persistent: false,
      expiresAt: { $exists: true, $lte: now },
      read: false,
    });

    for (const notification of expiredNotifications) {
      // Check if this notification should evolve into a new one
      if (notification.type === 'deadline_approaching' || notification.type === 'deadline_due_today') {
        // Check if deadline was actually missed
        const deadline = notification.metadata?.deadline
          ? new Date(notification.metadata.deadline)
          : notification.expiresAt;

        if (deadline && deadline < now) {
          // Create new persistent "deadline missed" notification
          await notificationService.createNotification({
            userId: notification.userId.toString(),
            type: 'deadline_missed',
            title: 'Deadline Missed',
            message: `The application deadline for ${notification.metadata?.jobTitle || 'a job'} has passed.`,
            actionType: 'review_job',
            actionData: notification.actionData,
            interactive: true,
            priority: 'high',
            persistent: true, // This one is persistent
            channels: ['in-app', 'email'],
            metadata: {
              ...notification.metadata,
              originalNotificationId: notification._id.toString(),
            },
          });

          // Mark old notification as read (it's expired)
          notification.read = true;
          notification.readAt = new Date();
          await notification.save();
          evolved++;
        }
      } else if (notification.type === 'membership_expiring') {
        // Check if membership actually expired
        const expiryDate = notification.metadata?.expiryDate
          ? new Date(notification.metadata.expiryDate)
          : notification.expiresAt;

        if (expiryDate && expiryDate < now) {
          // Create new persistent "membership expired" notification
          await notificationService.createNotification({
            userId: notification.userId.toString(),
            type: 'membership_expired',
            title: 'Membership Expired',
            message: `Your ${notification.metadata?.planKey || 'membership'} has expired. Renew now to restore access.`,
            actionType: 'view_offer',
            actionData: {
              url: '/dashboard/settings?tab=subscription',
            },
            interactive: true,
            priority: 'high',
            persistent: true,
            channels: ['in-app', 'email'],
            metadata: {
              ...notification.metadata,
              originalNotificationId: notification._id.toString(),
            },
          });

          // Mark old notification as read
          notification.read = true;
          notification.readAt = new Date();
          await notification.save();
          evolved++;
        }
      }
    }

    return { evolved };
  }

  /**
   * Clean up old expired notifications (older than 30 days)
   */
  async cleanupOldExpiredNotifications(): Promise<number> {
    await getConnection();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await Notification.deleteMany({
      persistent: false,
      expiresAt: { $exists: true, $lt: thirtyDaysAgo },
      read: true,
    });

    return result.deletedCount || 0;
  }
}

export default new NotificationEvolutionService();

