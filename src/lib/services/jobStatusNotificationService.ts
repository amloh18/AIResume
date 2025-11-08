import { getConnection } from '@/lib/database';
import { JobApplication } from '@/models';
import notificationService from './notificationService';
import { NotificationType } from '@/models/Notification';

class JobStatusNotificationService {
  /**
   * Check jobs that need status updates and enqueue notification tasks
   */
  async checkAndEnqueue(): Promise<{ enqueued: number }> {
    await getConnection();

    const now = new Date();
    let enqueued = 0;

    // Jobs in 'applied' status older than 7 days → ask if interviewed
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const appliedJobs = await JobApplication.find({
      status: 'applied',
      updatedAt: { $lte: sevenDaysAgo },
      applicationDate: { $exists: true, $lte: sevenDaysAgo },
    }).select('_id userId jobTitle company status updatedAt applicationDate');

    for (const job of appliedJobs) {
      await notificationService.enqueueNotificationTask({
        taskType: 'job_status_check',
        payload: {
          userId: job.userId,
          notificationType: 'job_status_check',
          title: 'Update Job Status',
          message: `It's been 7 days since you applied for ${job.jobTitle} at ${job.company}. Have you heard back?`,
          actionType: 'review_job',
          actionData: {
            jobId: job._id.toString(),
            url: `/dashboard/jobs/${job._id}`,
          },
          interactive: true,
          priority: 'medium',
          channels: ['in-app'],
          persistent: false,
          metadata: {
            jobId: job._id.toString(),
            currentStatus: job.status,
            suggestedNextStatus: 'screening',
          },
        },
        priority: 'medium',
      });
      enqueued++;
    }

    // Jobs in 'screening' status older than 3 days → ask if moved to interview
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const screeningJobs = await JobApplication.find({
      status: 'screening',
      updatedAt: { $lte: threeDaysAgo },
    }).select('_id userId jobTitle company status updatedAt');

    for (const job of screeningJobs) {
      await notificationService.enqueueNotificationTask({
        taskType: 'job_status_check',
        payload: {
          userId: job.userId,
          notificationType: 'job_status_check',
          title: 'Job Status Update',
          message: `${job.jobTitle} at ${job.company} has been in screening for 3 days. Any updates?`,
          actionType: 'move_to_next_stage',
          actionData: {
            jobId: job._id.toString(),
            url: `/dashboard/jobs/${job._id}`,
          },
          interactive: true,
          priority: 'medium',
          channels: ['in-app'],
          persistent: false,
          metadata: {
            jobId: job._id.toString(),
            currentStatus: job.status,
            suggestedNextStatus: 'interview',
          },
        },
        priority: 'medium',
      });
      enqueued++;
    }

    // Jobs in 'interview' status older than 5 days → ask if offer/rejected
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    const interviewJobs = await JobApplication.find({
      status: 'interview',
      updatedAt: { $lte: fiveDaysAgo },
    }).select('_id userId jobTitle company status updatedAt');

    for (const job of interviewJobs) {
      await notificationService.enqueueNotificationTask({
        taskType: 'job_status_check',
        payload: {
          userId: job.userId,
          notificationType: 'job_status_check',
          title: 'Interview Follow-up',
          message: `It's been 5 days since your interview for ${job.jobTitle} at ${job.company}. Any news?`,
          actionType: 'move_to_next_stage',
          actionData: {
            jobId: job._id.toString(),
            url: `/dashboard/jobs/${job._id}`,
          },
          interactive: true,
          priority: 'high',
          channels: ['in-app', 'email'],
          persistent: false,
          metadata: {
            jobId: job._id.toString(),
            currentStatus: job.status,
            suggestedNextStatus: 'offer',
          },
        },
        priority: 'high',
      });
      enqueued++;
    }

    return { enqueued };
  }
}

export default new JobStatusNotificationService();

