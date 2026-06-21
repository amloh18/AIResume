// @ts-nocheck
import { getConnection } from '@/lib/database';
import { JobApplication, ApplicationJourney, User } from '@/models';
import { sendEmail } from '@/lib/email-service';
import mongoose from 'mongoose';
import SystemEmailTracker from './SystemEmailTracker';

interface DailySummary {
  jobsAdded: number;
  jobsApplied: number;
  interviewsScheduled: number;
  documentsReady: number;
  jobsByStatus: {
    draft: number;
    created: number;
    applied: number;
    interview: number;
    offer: number;
    rejected: number;
  };
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

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Get jobs added in the last 24 hours
    const jobsAdded = await JobApplication.countDocuments({
      userId: userObjectId,
      createdAt: { $gte: startDate, $lte: endDate },
    });

    // Get jobs moved to applied status in the last 24 hours
    // Check statusHistory for when status changed to 'applied'
    const appliedJobs = await JobApplication.find({
      userId: userObjectId,
      'statusHistory.status': 'applied',
      'statusHistory.changedAt': { $gte: startDate, $lte: endDate },
    }).lean();

    // Also check jobs without statusHistory that were updated to applied
    const appliedJobsNoHistory = await JobApplication.find({
      userId: userObjectId,
      status: 'applied',
      statusHistory: { $exists: false },
      updatedAt: { $gte: startDate, $lte: endDate },
    }).lean();

    const jobsApplied = new Set([
      ...appliedJobs.map(j => j._id.toString()),
      ...appliedJobsNoHistory.map(j => j._id.toString()),
    ]).size;

    // Get interviews scheduled in the last 24 hours
    // Check statusHistory for when status changed to 'interview'
    const interviewJobs = await JobApplication.find({
      userId: userObjectId,
      'statusHistory.status': 'interview',
      'statusHistory.changedAt': { $gte: startDate, $lte: endDate },
    }).lean();

    // Also check jobs without statusHistory that were updated to interview
    const interviewJobsNoHistory = await JobApplication.find({
      userId: userObjectId,
      status: 'interview',
      statusHistory: { $exists: false },
      updatedAt: { $gte: startDate, $lte: endDate },
    }).lean();

    const interviewsScheduled = new Set([
      ...interviewJobs.map(j => j._id.toString()),
      ...interviewJobsNoHistory.map(j => j._id.toString()),
    ]).size;

    // Get documents ready in the last 24 hours (journeys with documents created)
    const documentsReady = await ApplicationJourney.countDocuments({
      userId: userObjectId,
      'metadata.updatedAt': { $gte: startDate, $lte: endDate },
      $or: [
        { cvId: { $exists: true, $ne: null } },
        { coverLetterId: { $exists: true, $ne: null } },
      ],
    });

    // Get current job counts by status
    const jobsByStatus = {
      draft: await JobApplication.countDocuments({ userId: userObjectId, status: 'draft' }),
      created: await JobApplication.countDocuments({ userId: userObjectId, status: 'created' }),
      applied: await JobApplication.countDocuments({ userId: userObjectId, status: 'applied' }),
      interview: await JobApplication.countDocuments({ userId: userObjectId, status: 'interview' }),
      offer: await JobApplication.countDocuments({ userId: userObjectId, status: 'offer' }),
      rejected: await JobApplication.countDocuments({ userId: userObjectId, status: 'rejected' }),
    };

    // Only return summary if there's activity
    if (jobsAdded === 0 && jobsApplied === 0 && interviewsScheduled === 0 && documentsReady === 0) {
      return null;
    }

    return {
      jobsAdded,
      jobsApplied,
      interviewsScheduled,
      documentsReady,
      jobsByStatus,
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
        <img src="${process.env.NEXT_PUBLIC_APP_URL || 'https://cvcircle.io'}/images/logo.png" alt="CVCircle" style="height: 40px; display: block;">
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
          <div style="font-size: 24px; font-weight: 800; color: #99FF00; margin-bottom: 5px;">${summary.jobsAdded}</div>
          <div style="font-size: 12px; color: #757575; text-transform: uppercase; letter-spacing: 0.5px;">Jobs Added</div>
        </div>
        <div style="background-color: #313a28; padding: 15px; border-radius: 12px; text-align: center; border: 1px solid rgba(255, 255, 255, 0.08);">
          <div style="font-size: 24px; font-weight: 800; color: #99FF00; margin-bottom: 5px;">${summary.jobsApplied}</div>
          <div style="font-size: 12px; color: #757575; text-transform: uppercase; letter-spacing: 0.5px;">Applied</div>
        </div>
        <div style="background-color: #313a28; padding: 15px; border-radius: 12px; text-align: center; border: 1px solid rgba(255, 255, 255, 0.08);">
          <div style="font-size: 24px; font-weight: 800; color: #99FF00; margin-bottom: 5px;">${summary.interviewsScheduled}</div>
          <div style="font-size: 12px; color: #757575; text-transform: uppercase; letter-spacing: 0.5px;">Interviews</div>
        </div>
        <div style="background-color: #313a28; padding: 15px; border-radius: 12px; text-align: center; border: 1px solid rgba(255, 255, 255, 0.08);">
          <div style="font-size: 24px; font-weight: 800; color: #99FF00; margin-bottom: 5px;">${summary.documentsReady}</div>
          <div style="font-size: 12px; color: #757575; text-transform: uppercase; letter-spacing: 0.5px;">Docs Ready</div>
        </div>
      </div>
      
      <!-- Upgrade Section (Only for Free Plan) -->
      ${isFreePlan ? `
      <div style="background: linear-gradient(135deg, rgba(153, 255, 0, 0.1) 0%, rgba(153, 255, 0, 0.05) 100%); border: 1px solid rgba(153, 255, 0, 0.3); border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 30px;">
        <h3 style="color: #ffffff; margin: 0 0 10px 0; font-size: 18px;">Unlock Your Full Potential 🚀</h3>
        <p style="color: #e5e5e5; font-size: 14px; margin: 0 0 20px 0;">Get unlimited AI tailoring, advanced analytics, and priority support with CVCircle Pro.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://cvcircle.io'}/dashboard/settings?tab=billing" 
           style="display: inline-block; background: linear-gradient(to right, #99FF00, #88e600); color: #000000; padding: 10px 24px; text-decoration: none; border-radius: 9999px; font-weight: 700; font-size: 14px;">
          Upgrade to Pro
        </a>
      </div>
      ` : ''}

      <!-- Dashboard Button -->
      <div style="text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://cvcircle.io'}/dashboard" 
           style="display: inline-block; background-color: #313a28; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; border: 1px solid rgba(255, 255, 255, 0.08);">
          Go to Dashboard
        </a>
      </div>
      
    </div>
    
    <div style="background-color: #141810; padding: 20px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.08);">
      <p style="font-size: 12px; color: #757575; margin: 0;">
        &copy; 2026 CVCircle by Morigrid Labs. All rights reserved.<br>
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
Get unlimited AI tailoring, advanced analytics, and priority support with CVCircle Pro.
Upgrade here: ${process.env.NEXT_PUBLIC_APP_URL || 'https://cvcircle.io'}/dashboard/settings?tab=billing
` : ''}

View your dashboard: ${process.env.NEXT_PUBLIC_APP_URL || 'https://cvcircle.io'}/dashboard

---
© 2026 CVCircle by Morigrid Labs. All rights reserved.
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
