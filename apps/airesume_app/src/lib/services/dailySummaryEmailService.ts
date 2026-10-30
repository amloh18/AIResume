// @ts-nocheck pre-existing type escape — removal tracked as R14 in docs/application-automation/fix-tasks.md
import { getConnection } from '@/lib/database';
import { JobApplication, ApplicationJourney, User } from '@/models';
import ActivityLog from '@/models/ActivityLog';
import SystemEmailTracker from './SystemEmailTracker';
import { mixedIdFilter } from '@/lib/utils/mixed-id';
import { triggerService } from './triggerEmailService';
import { getAutomationConfig } from './emailAutomationService';
import { renderDigestItems, type DigestItem } from '@/lib/email-automations';

interface DailySummary {
  jobsAdded: number;
  jobsApplied: number;
  interviewsScheduled: number;
  documentsReady: number;
}

interface DigestResult {
  summary: DailySummary;
  actionItems: DigestItem[];
}

interface UserSummary {
  userId: string;
  email: string;
  firstName: string;
  summary: DailySummary;
  actionItems: DigestItem[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function daysUntil(date: Date): string {
  const diffHours = Math.round((date.getTime() - Date.now()) / (60 * 60 * 1000));
  if (diffHours < 0) {
    const days = Math.abs(Math.ceil(diffHours / 24));
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }
  if (diffHours <= 24) return 'today';
  const days = Math.ceil(diffHours / 24);
  return `in ${days} day${days === 1 ? '' : 's'}`;
}

/**
 * Daily digest service.
 *
 * This is now the single daily email: the old "Job Application Report" and the
 * per-job deadline / follow-up / action-required emails are merged into one
 * message. The per-job notification services keep their in-app notifications
 * but no longer request an email channel, so the email quota is spent once per
 * user per day instead of once per job event.
 */
class DailySummaryEmailService {
  async getUserDailySummary(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<DigestResult | null> {
    await getConnection();

    const userFilter = mixedIdFilter(userId);

    const jobsAdded = await JobApplication.countDocuments({
      userId: userFilter,
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const jobsApplied = await JobApplication.countDocuments({
      userId: userFilter,
      $or: [
        { appliedAt: { $gte: startDate, $lte: endDate } },
        {
          stageHistory: {
            $elemMatch: {
              internalStatus: 'applied',
              changedAt: { $gte: startDate, $lte: endDate },
            },
          },
        },
        {
          status: 'applied',
          appliedAt: { $exists: false },
          updatedAt: { $gte: startDate, $lte: endDate },
        },
      ],
    });

    const interviewsScheduled = await JobApplication.countDocuments({
      userId: userFilter,
      $or: [
        {
          stageHistory: {
            $elemMatch: {
              internalStatus: 'interview',
              changedAt: { $gte: startDate, $lte: endDate },
            },
          },
        },
        { status: 'interview', updatedAt: { $gte: startDate, $lte: endDate } },
      ],
    });

    const documentsReady = await ApplicationJourney.countDocuments({
      userId,
      'metadata.updatedAt': { $gte: startDate, $lte: endDate },
      $or: [
        { cvId: { $exists: true, $ne: null } },
        { coverLetterId: { $exists: true, $ne: null } },
      ],
    });

    const actionItems = await this.getActionItems(userId);

    if (
      jobsAdded === 0 &&
      jobsApplied === 0 &&
      interviewsScheduled === 0 &&
      documentsReady === 0 &&
      actionItems.length === 0
    ) {
      return null;
    }

    return {
      summary: { jobsAdded, jobsApplied, interviewsScheduled, documentsReady },
      actionItems,
    };
  }

  /**
   * Everything that needs the user's attention today: deadlines in the next
   * three days, overdue follow-ups, and applications parked for approval or
   * retry. Capped so the email stays readable.
   */
  private async getActionItems(userId: string): Promise<DigestItem[]> {
    const userFilter = mixedIdFilter(userId);
    const now = new Date();
    const inThreeDays = new Date(now.getTime() + 3 * DAY_MS);
    const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);
    const items: DigestItem[] = [];

    const [deadlines, followUps, blocked] = await Promise.all([
      JobApplication.find({
        userId: userFilter,
        deadline: { $gte: sevenDaysAgo, $lte: inThreeDays },
        status: { $nin: ['rejected', 'withdrawn', 'hired'] },
      })
        .select('_id jobTitle company deadline status')
        .limit(10)
        .lean(),
      JobApplication.find({
        userId: userFilter,
        followUps: { $exists: true, $ne: [] },
        status: { $in: ['applied', 'screening', 'interview'] },
      })
        .select('_id jobTitle company followUps')
        .limit(10)
        .lean(),
      JobApplication.find({
        userId: userFilter,
        status: { $in: ['review_required', 'automation_failed'] },
      })
        .select('_id jobTitle company status automationReason')
        .limit(10)
        .lean(),
    ]);

    for (const job of deadlines as any[]) {
      const deadline = new Date(job.deadline);
      const when = daysUntil(deadline);
      const missed = deadline.getTime() < now.getTime();
      items.push({
        kind: 'deadline',
        title: missed
          ? `Deadline missed — ${job.jobTitle} at ${job.company}`
          : `Deadline ${when} — ${job.jobTitle} at ${job.company}`,
        message: missed
          ? 'This deadline has passed. Update the status so your tracker stays accurate.'
          : 'Finish and submit this application before the deadline.',
        url: `/dashboard/jobs?tab=applications&jobId=${job._id}`,
        priority: missed ? 'high' : when === 'today' ? 'urgent' : 'high',
      });
    }

    for (const job of followUps as any[]) {
      const overdue = (job.followUps || []).find(
        (f: any) => f?.date && new Date(f.date) < now && !f.outcome
      );
      if (!overdue) continue;
      const days = Math.max(
        1,
        Math.floor((now.getTime() - new Date(overdue.date).getTime()) / DAY_MS)
      );
      items.push({
        kind: 'follow_up',
        title: `Follow up — ${job.jobTitle} at ${job.company}`,
        message: `Your follow-up was scheduled ${days} day${days === 1 ? '' : 's'} ago and is still open.`,
        url: `/dashboard/jobs?tab=applications&jobId=${job._id}`,
        priority: days > 7 ? 'high' : 'medium',
      });
    }

    for (const job of blocked as any[]) {
      items.push({
        kind: 'action_required',
        title:
          job.status === 'automation_failed'
            ? `Submission failed — ${job.jobTitle} at ${job.company}`
            : `Approval needed — ${job.jobTitle} at ${job.company}`,
        message:
          job.automationReason ||
          (job.status === 'automation_failed'
            ? 'Open the application to retry, or take over and apply manually.'
            : 'We paused this application until you confirm the details.'),
        url: `/dashboard/jobs?tab=applications&jobId=${job._id}`,
        priority: 'urgent',
      });
    }

    const rank: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    return items.sort((a, b) => (rank[a.priority || 'medium'] ?? 2) - (rank[b.priority || 'medium'] ?? 2)).slice(0, 8);
  }

  private digestSummaryHtml(summary: DailySummary): string {
    return (
      `Since yesterday you added <strong>${summary.jobsAdded}</strong> job${summary.jobsAdded === 1 ? '' : 's'}, ` +
      `submitted <strong>${summary.jobsApplied}</strong> application${summary.jobsApplied === 1 ? '' : 's'}, ` +
      `have <strong>${summary.interviewsScheduled}</strong> interview${summary.interviewsScheduled === 1 ? '' : 's'} scheduled ` +
      `and <strong>${summary.documentsReady}</strong> document${summary.documentsReady === 1 ? '' : 's'} ready.`
    );
  }

  private async alreadySentToday(userEmail: string): Promise<boolean> {
    const existing = await ActivityLog.findOne({
      userEmail,
      action: 'system_email_sent',
      'resource.id': 'automation:daily_digest',
      timestamp: { $gte: startOfToday() },
    })
      .select('_id')
      .lean();
    return !!existing;
  }

  /**
   * Send the digest to one user. Returns early (no email) when the automation is
   * disabled, the user opted out, or there is nothing to report.
   */
  async sendDailySummary(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await getConnection();

      const user = await User.findById(userId).select('email firstName settings subscription');
      if (!user || !user.email) {
        return { success: false, error: 'User not found or no email address' };
      }

      const config = await getAutomationConfig('daily_digest');
      if (!config || !config.enabled) {
        return { success: true, error: 'Daily digest automation is disabled' };
      }

      const dailySummaryEnabled = user.settings?.notifications?.email?.dailySummary ?? true;
      if (!dailySummaryEnabled) {
        return { success: true, error: 'Daily digest email is disabled by user' };
      }

      if (await this.alreadySentToday(user.email)) {
        return { success: true, error: 'Daily digest already sent today' };
      }

      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - DAY_MS);

      const result = await this.getUserDailySummary(userId, startDate, endDate);
      if (!result) {
        return { success: true, error: 'No activity to summarize' };
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://buildairesume.com';
      const userSummary: UserSummary = {
        userId,
        email: user.email,
        firstName: user.firstName || 'there',
        summary: result.summary,
        actionItems: result.actionItems,
      };

      const sent = await triggerService.sendCustom(
        {
          key: 'daily_digest',
          name: config.name,
          category: config.category,
          subject: config.subject,
          htmlContent: config.htmlContent,
          previewText: config.previewText,
          fromName: config.fromName,
          fromEmail: config.fromEmail,
          tags: ['automated', 'reports', 'daily_digest'],
        },
        {
          id: String(user._id),
          email: user.email,
          firstName: userSummary.firstName,
        },
        {
          appUrl,
          digestSummary: this.digestSummaryHtml(userSummary.summary),
          digestItems: renderDigestItems(userSummary.actionItems, appUrl),
        },
        false
      );

      if (sent) {
        console.log(`✅ Daily digest sent to user ${userId}`);
      }

      return sent
        ? { success: true }
        : { success: false, error: 'Email delivery failed' };
    } catch (error: any) {
      console.error(`❌ Failed to send daily digest to user ${userId}:`, error);
      return { success: false, error: error.message };
    }
  }

  async sendDailySummariesToAllUsers(): Promise<{
    sent: number;
    skipped: number;
    failed: number;
    errors: string[];
  }> {
    await getConnection();

    const results = {
      sent: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[],
    };

    try {
      const config = await getAutomationConfig('daily_digest');
      if (!config || !config.enabled) {
        console.log('📧 Daily digest automation is disabled — nothing to send.');
        return results;
      }

      const users = await User.find({
        email: { $exists: true, $ne: '' },
        isAnonymous: { $ne: true },
      })
        .select('_id')
        .lean();

      console.log(`📧 Processing daily digests for ${users.length} users`);

      for (const user of users) {
        try {
          const result = await this.sendDailySummary(user._id.toString());
          if (result.success) {
            if (result.error) {
              results.skipped++;
            } else {
              results.sent++;
            }
          } else {
            results.failed++;
            results.errors.push(`User ${user._id}: ${result.error}`);
          }
        } catch (error: any) {
          results.failed++;
          results.errors.push(`User ${user._id}: ${error.message}`);
        }
      }

      console.log(
        `✅ Daily digests completed: ${results.sent} sent, ${results.skipped} skipped, ${results.failed} failed`
      );

      if (results.sent > 0) {
        await SystemEmailTracker.trackEmail('daily_summary', results.sent);
      }

      return results;
    } catch (error: any) {
      console.error('❌ Error sending daily digests:', error);
      throw error;
    }
  }
}

export default new DailySummaryEmailService();
