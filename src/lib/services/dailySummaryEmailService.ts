// @ts-nocheck pre-existing type escape — removal tracked as R14 in docs/application-automation/fix-tasks.md
import { getConnection } from '@/lib/database';
import { JobApplication, ApplicationJourney, User } from '@/models';
import { sendEmail } from '@/lib/email-service';
import SystemEmailTracker from './SystemEmailTracker';
import { mixedIdFilter } from '@/lib/utils/mixed-id';

interface DailySummary {
  jobsAdded: number;
  jobsApplied: number;
  interviewsScheduled: number;
  documentsReady: number;
}

interface UserSummary {
  userId: string;
  email: string;
  firstName: string;
  summary: DailySummary;
  isFreePlan: boolean;
}

class DailySummaryEmailService {
  /**
   * Get daily summary for a user
   */
  async getUserDailySummary(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<DailySummary | null> {
    await getConnection();

    // `JobApplication.userId` is a `Schema.Types.Mixed` path, so Mongoose does not cast the query
    // value: a bare ObjectId misses the string-stored rows and vice versa (SB-06). Measured
    // 2026-09-27 — objectId 84 / string 15.
    const userFilter = mixedIdFilter(userId);

    // Get jobs added in the last 24 hours
    const jobsAdded = await JobApplication.countDocuments({
      userId: userFilter,
      createdAt: { $gte: startDate, $lte: endDate },
    });

    /*
      Jobs submitted in the last 24 hours.

      `appliedAt` is the authoritative submission timestamp — the same field `/api/dashboard/streak`
      and `entitlement-service` already count on — and it is set by both writers that reach
      `applied` (`processApplication.ts:208`, `unifiedApplyService.ts:471`).

      This used to query `'statusHistory.status'` / `'statusHistory.changedAt'` with a
      `statusHistory: { $exists: false }` fallback. `JobApplication` has **no** `statusHistory`
      path — the same defect class as SB-17 — so the first branch matched nothing (measured: 0 of 99
      documents carry the field) and the fallback's guard was a tautology that excluded nothing.
      The count therefore silently degraded to "status is `applied` AND `updatedAt` is in the
      window", which any unrelated write (a note, a stage change) drags into today and re-counts.
    */
    const jobsApplied = await JobApplication.countDocuments({
      userId: userFilter,
      $or: [
        { appliedAt: { $gte: startDate, $lte: endDate } },
        {
          // The state machine's own trail, for a transition recorded without a timestamp write.
          stageHistory: {
            $elemMatch: {
              internalStatus: 'applied',
              changedAt: { $gte: startDate, $lte: endDate },
            },
          },
        },
        {
          // Legacy rows that reached `applied` with no timestamp at all (measured: 2 of 11).
          status: 'applied',
          appliedAt: { $exists: false },
          updatedAt: { $gte: startDate, $lte: endDate },
        },
      ],
    });

    /*
      Interviews in the last 24 hours.

      There is no `interviewAt` field, and the state machine has never recorded an `interview`
      entry (measured: `stageHistory.internalStatus` only ever holds processing / review_required /
      saved / form_detected / automation_failed / queued), so this is necessarily derived from the
      current status. The history branch is kept so it starts counting the moment the state machine
      does record one.
    */
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

    // Get documents ready in the last 24 hours (journeys with documents created).
    // `ApplicationJourney.userId` is a plain `String` path, so Mongoose casts the value for us and
    // the raw string is the correct query — deliberately no `mixedIdFilter` here (SB-06).
    const documentsReady = await ApplicationJourney.countDocuments({
      userId,
      'metadata.updatedAt': { $gte: startDate, $lte: endDate },
      $or: [
        { cvId: { $exists: true, $ne: null } },
        { coverLetterId: { $exists: true, $ne: null } },
      ],
    });

    // NOTE: a `jobsByStatus` block used to run six more `countDocuments` here and return the result.
    // Nothing ever read it — neither template touches it and `getUserDailySummary` has exactly one
    // caller, `sendDailySummary` — so it was six wasted round-trips **per user** on a cron that
    // walks the whole user table. Removed rather than left as decoration.

    // Only return summary if there's activity
    if (jobsAdded === 0 && jobsApplied === 0 && interviewsScheduled === 0 && documentsReady === 0) {
      return null;
    }

    return {
      jobsAdded,
      jobsApplied,
      interviewsScheduled,
      documentsReady,
    };
  }

  /**
   * Generate HTML email template for daily summary
   */
  private getEmailTemplate(userSummary: UserSummary): string {
    const { summary, firstName, isFreePlan } = userSummary;
    const date = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Job Application Report</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #ffffff; background-color: #1a230f; margin: 0; padding: 0;">
  
  <!-- Main Container -->
  <div style="max-width: 600px; margin: 0 auto; background-color: #141810; border-radius: 16px; overflow: hidden; margin-top: 20px; margin-bottom: 20px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);">
    
    <!-- Header -->
    <div style="background-color: #141810; padding: 30px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
      <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 20px;">
        <img src="${process.env.NEXT_PUBLIC_APP_URL || 'https://buildairesume.com'}/images/logo.png" alt="AIResume" style="height: 40px; display: block;">
      </div>
      <p style="color: #757575; margin: 0; font-size: 14px;">${date}</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 30px;">
      <p style="font-size: 16px; margin: 0 0 25px 0; color: #ffffff;">Hi ${firstName || 'there'},</p>
      
      <p style="font-size: 16px; margin: 0 0 30px 0; color: #e5e5e5;">Here is your daily snapshot of your job search progress.</p>
      
      <!-- Daily Activity Cards -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px;">
        <div style="background-color: #313a28; padding: 15px; border-radius: 12px; text-align: center; border: 1px solid rgba(255, 255, 255, 0.08);">
          <div style="font-size: 24px; font-weight: 800; color: #013f2e; margin-bottom: 5px;">${summary.jobsAdded}</div>
          <div style="font-size: 12px; color: #757575; text-transform: uppercase; letter-spacing: 0.5px;">Jobs Added</div>
        </div>
        <div style="background-color: #313a28; padding: 15px; border-radius: 12px; text-align: center; border: 1px solid rgba(255, 255, 255, 0.08);">
          <div style="font-size: 24px; font-weight: 800; color: #013f2e; margin-bottom: 5px;">${summary.jobsApplied}</div>
          <div style="font-size: 12px; color: #757575; text-transform: uppercase; letter-spacing: 0.5px;">Applied</div>
        </div>
        <div style="background-color: #313a28; padding: 15px; border-radius: 12px; text-align: center; border: 1px solid rgba(255, 255, 255, 0.08);">
          <div style="font-size: 24px; font-weight: 800; color: #013f2e; margin-bottom: 5px;">${summary.interviewsScheduled}</div>
          <div style="font-size: 12px; color: #757575; text-transform: uppercase; letter-spacing: 0.5px;">Interviews</div>
        </div>
        <div style="background-color: #313a28; padding: 15px; border-radius: 12px; text-align: center; border: 1px solid rgba(255, 255, 255, 0.08);">
          <div style="font-size: 24px; font-weight: 800; color: #013f2e; margin-bottom: 5px;">${summary.documentsReady}</div>
          <div style="font-size: 12px; color: #757575; text-transform: uppercase; letter-spacing: 0.5px;">Docs Ready</div>
        </div>
      </div>
      
      <!-- Upgrade Section (Only for Free Plan) -->
      ${isFreePlan ? `
      <div style="background: linear-gradient(135deg, rgba(1, 63, 46, 0.1) 0%, rgba(1, 63, 46, 0.05) 100%); border: 1px solid rgba(1, 63, 46, 0.3); border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 30px;">
        <h3 style="color: #ffffff; margin: 0 0 10px 0; font-size: 18px;">Unlock Your Full Potential 🚀</h3>
        <p style="color: #e5e5e5; font-size: 14px; margin: 0 0 20px 0;">Get unlimited AI tailoring, advanced analytics, and priority support with AIResume Pro.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://buildairesume.com'}/dashboard/settings?tab=billing" 
           style="display: inline-block; background: linear-gradient(to right, #013f2e, #02523c); color: #000000; padding: 10px 24px; text-decoration: none; border-radius: 9999px; font-weight: 700; font-size: 14px;">
          Upgrade to Pro
        </a>
      </div>
      ` : ''}

      <!-- Dashboard Button -->
      <div style="text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://buildairesume.com'}/dashboard" 
           style="display: inline-block; background-color: #313a28; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; border: 1px solid rgba(255, 255, 255, 0.08);">
          Go to Dashboard
        </a>
      </div>
      
    </div>
    
    <div style="background-color: #141810; padding: 20px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.08);">
      <p style="font-size: 12px; color: #757575; margin: 0;">
        &copy; 2026 AIResume by Morigrid Labs. All rights reserved.<br>
        You received this email because you have active job applications.
      </p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate text email template for daily summary
   */
  private getTextTemplate(userSummary: UserSummary): string {
    const { summary, firstName, isFreePlan } = userSummary;
    const date = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
Job Application Report
${date}

Hi ${firstName || 'there'},

Here is your daily snapshot of your job search progress.

TODAY'S ACTIVITY
----------------
Jobs Added: ${summary.jobsAdded}
Applied: ${summary.jobsApplied}
Interviews: ${summary.interviewsScheduled}
Docs Ready: ${summary.documentsReady}

${isFreePlan ? `
UNLOCK YOUR FULL POTENTIAL
--------------------------
Get unlimited AI tailoring, advanced analytics, and priority support with AIResume Pro.
Upgrade here: ${process.env.NEXT_PUBLIC_APP_URL || 'https://buildairesume.com'}/dashboard/settings?tab=billing
` : ''}

View your dashboard: ${process.env.NEXT_PUBLIC_APP_URL || 'https://buildairesume.com'}/dashboard

---
© 2026 AIResume by Morigrid Labs. All rights reserved.
    `.trim();
  }

  /**
   * Send daily summary email to a user
   * 
   * IMPORTANT: This method ONLY uses real database data. It NEVER uses hardcoded or mock data.
   * - All job counts are queried from the database
   * - If there's no activity, the email is NOT sent (returns early)
   * - All summary data comes from actual user job applications
   */
  async sendDailySummary(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await getConnection();

      const user = await User.findById(userId).select('email firstName settings subscription');
      if (!user || !user.email) {
        return { success: false, error: 'User not found or no email address' };
      }

      // Check if daily summary email is enabled in user settings
      const dailySummaryEnabled = user.settings?.notifications?.email?.dailySummary ?? true;
      if (!dailySummaryEnabled) {
        return { success: true, error: 'Daily summary email is disabled by user' };
      }

      // Get summary for last 24 hours - ALL DATA COMES FROM DATABASE, NO HARDCODED VALUES
      const endDate = new Date();
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 1);

      const summary = await this.getUserDailySummary(userId, startDate, endDate);

      // Only send if there's activity - NO MOCK DATA IS EVER USED
      if (!summary) {
        return { success: true, error: 'No activity to summarize' };
      }

      // Check if user is on free plan (starter_monthly is the renamed free plan)
      const isFreePlan = !user.subscription?.planId ||
        user.subscription.planId === 'free' ||
        user.subscription.planId === 'starter_monthly';

      const userSummary: UserSummary = {
        userId,
        email: user.email,
        firstName: user.firstName || 'there',
        summary,
        isFreePlan,
      };

      const html = this.getEmailTemplate(userSummary);
      const text = this.getTextTemplate(userSummary);

      const result = await sendEmail({
        to: user.email,
        subject: `Job Application Report`,
        text,
        html,
      });

      if (result.success) {
        console.log(`✅ Daily summary email sent to user ${userId}`);
      }

      return result;
    } catch (error: any) {
      console.error(`❌ Failed to send daily summary to user ${userId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send daily summary emails to all active users
   */
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
      // Get all users with email addresses
      const users = await User.find({ email: { $exists: true, $ne: '' } })
        .select('_id email firstName')
        .lean();

      console.log(`📧 Processing daily summaries for ${users.length} users`);

      for (const user of users) {
        try {
          const result = await this.sendDailySummary(user._id.toString());

          if (result.success) {
            if (result.error === 'No activity to summarize') {
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

      console.log(`✅ Daily summary emails completed: ${results.sent} sent, ${results.skipped} skipped, ${results.failed} failed`);

      // Track this batch in the system campaign log
      if (results.sent > 0) {
        await SystemEmailTracker.trackEmail('daily_summary', results.sent);
      }

      return results;
    } catch (error: any) {
      console.error('❌ Error sending daily summaries:', error);
      throw error;
    }
  }
}

export default new DailySummaryEmailService();
