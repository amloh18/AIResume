import { getConnection } from '@/lib/database';
import { JobApplication } from '@/models';
import notificationService from './notificationService';

class DeadlineNotificationService {
  /**
   * Check for approaching, due, and missed deadlines and enqueue notification tasks
   */
  async checkAndEnqueue(): Promise<{ enqueued: number }> {
    await getConnection();

    const now = new Date();
    let enqueued = 0;

    // Find jobs with deadlines
    const jobs = await JobApplication.find({
      deadline: { $exists: true, $ne: null },
      status: { $ne: 'rejected' }, // Don't notify for rejected jobs
    }).select('_id userId jobTitle company deadline status');

    for (const job of jobs) {
      if (!job.deadline) continue;

      const deadline = new Date(job.deadline);
      const daysUntilDeadline = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const hoursUntilDeadline = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60));

      // Deadline approaching (3 days before)
      if (daysUntilDeadline === 3) {
        await notificationService.enqueueNotificationTask({
          taskType: 'deadline_approaching',
          payload: {
            userId: job.userId,
            notificationType: 'deadline_approaching',
            title: 'Deadline Approaching',
            message: `Application deadline for ${job.jobTitle} at ${job.company} is in 3 days.`,
            actionType: 'review_job',
            actionData: {
              jobId: job._id.toString(),
              url: `/dashboard/tracker/${job._id}`,
            },
            interactive: true,
            priority: 'high',
            channels: ['in-app', 'email'],
            persistent: false,
            expiresAt: deadline, // Expires when deadline passes
            metadata: {
              jobId: job._id.toString(),
              deadline: deadline.toISOString(),
              daysUntil: daysUntilDeadline,
            },
          },
          priority: 'high',
          scheduledFor: now,
        });
        enqueued++;
      }

      // Deadline due today (within 24 hours)
      if (hoursUntilDeadline >= 0 && hoursUntilDeadline <= 24 && daysUntilDeadline === 0) {
        await notificationService.enqueueNotificationTask({
          taskType: 'deadline_due_today',
          payload: {
            userId: job.userId,
            notificationType: 'deadline_due_today',
            title: 'Deadline Today!',
            message: `Application deadline for ${job.jobTitle} at ${job.company} is today!`,
            actionType: 'review_job',
            actionData: {
              jobId: job._id.toString(),
              url: `/dashboard/tracker/${job._id}`,
            },
            interactive: true,
            priority: 'urgent',
            channels: ['in-app', 'email', 'push'],
            persistent: false,
            expiresAt: new Date(deadline.getTime() + 24 * 60 * 60 * 1000), // Expires 24h after deadline
            metadata: {
              jobId: job._id.toString(),
              deadline: deadline.toISOString(),
              hoursUntil: hoursUntilDeadline,
            },
          },
          priority: 'urgent',
          scheduledFor: now,
        });
        enqueued++;
      }

      // Deadline missed (past deadline, but not too old - within 7 days)
      if (daysUntilDeadline < 0 && daysUntilDeadline >= -7) {
        await notificationService.enqueueNotificationTask({
          taskType: 'deadline_missed',
          payload: {
            userId: job.userId,
            notificationType: 'deadline_missed',
            title: 'Deadline Missed',
            message: `The application deadline for ${job.jobTitle} at ${job.company} has passed.`,
            actionType: 'review_job',
            actionData: {
              jobId: job._id.toString(),
              url: `/dashboard/tracker/${job._id}`,
            },
            interactive: true,
            priority: 'high',
            channels: ['in-app', 'email'],
            persistent: true, // Persistent - user should acknowledge this
            metadata: {
              jobId: job._id.toString(),
              deadline: deadline.toISOString(),
              daysPast: Math.abs(daysUntilDeadline),
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

export default new DeadlineNotificationService();

