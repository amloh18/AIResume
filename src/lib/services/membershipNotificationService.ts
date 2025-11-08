import { getConnection } from '@/lib/database';
import User from '@/models/User';
import notificationService from './notificationService';

class MembershipNotificationService {
  /**
   * Check for expiring memberships and enqueue notification tasks
   */
  async checkAndEnqueue(): Promise<{ enqueued: number }> {
    await getConnection();

    const now = new Date();
    let enqueued = 0;

    // Find users with active subscriptions
    const users = await User.find({
      'subscription.status': 'active',
      $or: [
        { 'subscription.currentPeriodEnd': { $exists: true } },
        { 'subscription.accessExpiresAt': { $exists: true } },
      ],
    }).select('_id email firstName subscription');

    for (const user of users) {
      const expiryDate = user.subscription.accessExpiresAt || user.subscription.currentPeriodEnd;
      if (!expiryDate) continue;

      const expiry = new Date(expiryDate);
      const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // 7 days before expiry
      if (daysUntilExpiry === 7) {
        await notificationService.enqueueNotificationTask({
          taskType: 'membership_expiring',
          payload: {
            userId: user._id.toString(),
            notificationType: 'membership_expiring',
            title: 'Membership Expiring Soon',
            message: `Your ${user.subscription.planKey} membership expires in 7 days. Renew now to continue enjoying all features.`,
            actionType: 'view_offer',
            actionData: {
              url: '/dashboard/settings?tab=subscription',
            },
            interactive: true,
            priority: 'high',
            channels: ['in-app', 'email'],
            persistent: false,
            expiresAt: expiry,
            metadata: {
              planKey: user.subscription.planKey,
              expiryDate: expiry.toISOString(),
              daysUntil: daysUntilExpiry,
            },
          },
          priority: 'high',
          scheduledFor: now,
        });
        enqueued++;
      }

      // 3 days before expiry
      if (daysUntilExpiry === 3) {
        await notificationService.enqueueNotificationTask({
          taskType: 'membership_expiring',
          payload: {
            userId: user._id.toString(),
            notificationType: 'membership_expiring',
            title: 'Membership Expiring Soon',
            message: `Your ${user.subscription.planKey} membership expires in 3 days. Don't lose access to your features!`,
            actionType: 'view_offer',
            actionData: {
              url: '/dashboard/settings?tab=subscription',
            },
            interactive: true,
            priority: 'urgent',
            channels: ['in-app', 'email', 'push'],
            persistent: false,
            expiresAt: expiry,
            metadata: {
              planKey: user.subscription.planKey,
              expiryDate: expiry.toISOString(),
              daysUntil: daysUntilExpiry,
            },
          },
          priority: 'urgent',
          scheduledFor: now,
        });
        enqueued++;
      }

      // On expiry day
      if (daysUntilExpiry === 0) {
        await notificationService.enqueueNotificationTask({
          taskType: 'membership_expiring',
          payload: {
            userId: user._id.toString(),
            notificationType: 'membership_expiring',
            title: 'Membership Expires Today',
            message: `Your ${user.subscription.planKey} membership expires today. Renew now to maintain access.`,
            actionType: 'view_offer',
            actionData: {
              url: '/dashboard/settings?tab=subscription',
            },
            interactive: true,
            priority: 'urgent',
            channels: ['in-app', 'email', 'push'],
            persistent: false,
            expiresAt: new Date(expiry.getTime() + 24 * 60 * 60 * 1000),
            metadata: {
              planKey: user.subscription.planKey,
              expiryDate: expiry.toISOString(),
            },
          },
          priority: 'urgent',
          scheduledFor: now,
        });
        enqueued++;
      }

      // After expiry (within grace period - 3 days)
      if (daysUntilExpiry < 0 && daysUntilExpiry >= -3) {
        await notificationService.enqueueNotificationTask({
          taskType: 'membership_expired',
          payload: {
            userId: user._id.toString(),
            notificationType: 'membership_expired',
            title: 'Membership Expired',
            message: `Your ${user.subscription.planKey} membership has expired. Renew now to restore access.`,
            actionType: 'view_offer',
            actionData: {
              url: '/dashboard/settings?tab=subscription',
            },
            interactive: true,
            priority: 'high',
            channels: ['in-app', 'email'],
            persistent: true, // Persistent - user should acknowledge
            metadata: {
              planKey: user.subscription.planKey,
              expiryDate: expiry.toISOString(),
              daysPast: Math.abs(daysUntilExpiry),
            },
          },
          priority: 'high',
          scheduledFor: now,
        });
        enqueued++;
      }
    }

    return { enqueued };
  }
}

export default new MembershipNotificationService();

