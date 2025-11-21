import { getConnection } from '@/lib/database';
import { JobApplication } from '@/models';
import notificationService from './notificationService';

class FollowUpNotificationService {
  /**
   * Check for overdue follow-ups and enqueue notification tasks
   */
  async checkAndEnqueue(): Promise<{ enqueued: number }> {
    await getConnection();

    const now = new Date();
    let enqueued = 0;

    // Find jobs with follow-ups that are overdue
    const jobs = await JobApplication.find({
      followUps: { $exists: true, $ne: [] },
      status: { $in: ['applied', 'screening', 'interview'] },
    }).select('_id userId jobTitle company followUps status updatedAt');

    for (const job of jobs) {
      if (!job.followUps || job.followUps.length === 0) continue;

      // Check each follow-up
      for (const followUp of job.followUps) {
        const followUpDate = new Date(followUp.date);
        const daysOverdue = Math.floor((now.getTime() - followUpDate.getTime()) / (1000 * 60 * 60 * 24));

        // If follow-up is overdue (past the scheduled date)
        if (daysOverdue > 0 && !followUp.outcome) {
          await notificationService.enqueueNotificationTask({
            taskType: 'follow_up',
            payload: {
              userId: job.userId,
              notificationType: 'follow_up',
              title: 'Follow-up Reminder',
              message: `You have an overdue follow-up for ${job.jobTitle} at ${job.company}. It was scheduled ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} ago.`,
              actionType: 'review_job',
              actionData: {
                jobId: job._id.toString(),
                url: `/dashboard/tracker/${job._id}`,
              },
              interactive: true,
              priority: daysOverdue > 7 ? 'high' : 'medium',
              channels: ['in-app', 'email'],
              persistent: false,
              metadata: {
                jobId: job._id.toString(),
                followUpDate: followUp.date,
                daysOverdue,
                followUpType: followUp.type,
              },
            },
            priority: daysOverdue > 7 ? 'high' : 'medium',
          });
          enqueued++;
          break; // Only one notification per job
        }
      }

      // Also check for stale applications (no activity for 14 days)
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      if (job.updatedAt && new Date(job.updatedAt) < fourteenDaysAgo) {
        // Check if we already sent a follow-up notification recently (within last 7 days)
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        // We'll check this in the notification service to avoid duplicates
        // For now, just enqueue it

        await notificationService.enqueueNotificationTask({
          taskType: 'follow_up',
          payload: {
            userId: job.userId,
            notificationType: 'follow_up',
            title: 'Stale Application',
            message: `Your application for ${job.jobTitle} at ${job.company} hasn't been updated in 14 days. Consider following up.`,
            actionType: 'review_job',
            actionData: {
              jobId: job._id.toString(),
              url: `/dashboard/tracker/${job._id}`,
            },
            interactive: true,
            priority: 'low',
            channels: ['in-app'],
            persistent: false,
            metadata: {
              jobId: job._id.toString(),
              daysSinceUpdate: Math.floor((now.getTime() - new Date(job.updatedAt).getTime()) / (1000 * 60 * 60 * 24)),
            },
          },
          priority: 'low',
        });
        enqueued++;
      }
    }

    return { enqueued };
  }
}

export default new FollowUpNotificationService();

