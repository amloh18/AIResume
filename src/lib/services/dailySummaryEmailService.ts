import { getConnection } from '@/lib/database';
import { JobApplication, ApplicationJourney, User } from '@/models';
import { sendEmail } from '@/lib/email-service';
import mongoose from 'mongoose';

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
    const { summary, firstName } = userSummary;
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
  <title>Your Daily Job Search Summary - CVCircle</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">📊 Your Daily Summary</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">${date}</p>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin: 0 0 20px 0;">Hi ${firstName || 'there'},</p>
    
    <p style="font-size: 16px; margin: 0 0 30px 0;">Here's what happened with your job search today:</p>
    
    <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #1f2937;">📈 Today's Activity</h2>
      ${summary.jobsAdded > 0 ? `<div style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
        <strong style="color: #667eea;">${summary.jobsAdded}</strong> ${summary.jobsAdded === 1 ? 'job' : 'jobs'} added
      </div>` : ''}
      ${summary.jobsApplied > 0 ? `<div style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
        <strong style="color: #10b981;">${summary.jobsApplied}</strong> ${summary.jobsApplied === 1 ? 'application' : 'applications'} submitted
      </div>` : ''}
      ${summary.interviewsScheduled > 0 ? `<div style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
        <strong style="color: #f59e0b;">${summary.interviewsScheduled}</strong> ${summary.interviewsScheduled === 1 ? 'interview' : 'interviews'} scheduled
      </div>` : ''}
      ${summary.documentsReady > 0 ? `<div style="padding: 10px 0;">
        <strong style="color: #8b5cf6;">${summary.documentsReady}</strong> ${summary.documentsReady === 1 ? 'document set' : 'document sets'} ready
      </div>` : ''}
    </div>
    
    <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #1f2937;">📋 Current Status</h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div style="padding: 10px; background: #f3f4f6; border-radius: 6px;">
          <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">Draft</div>
          <div style="font-size: 20px; font-weight: bold; color: #374151;">${summary.jobsByStatus.draft}</div>
        </div>
        <div style="padding: 10px; background: #f3f4f6; border-radius: 6px;">
          <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">Created</div>
          <div style="font-size: 20px; font-weight: bold; color: #374151;">${summary.jobsByStatus.created}</div>
        </div>
        <div style="padding: 10px; background: #f3f4f6; border-radius: 6px;">
          <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">Applied</div>
          <div style="font-size: 20px; font-weight: bold; color: #374151;">${summary.jobsByStatus.applied}</div>
        </div>
        <div style="padding: 10px; background: #f3f4f6; border-radius: 6px;">
          <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">Interview</div>
          <div style="font-size: 20px; font-weight: bold; color: #374151;">${summary.jobsByStatus.interview}</div>
        </div>
        <div style="padding: 10px; background: #f3f4f6; border-radius: 6px;">
          <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">Offer</div>
          <div style="font-size: 20px; font-weight: bold; color: #374151;">${summary.jobsByStatus.offer}</div>
        </div>
        <div style="padding: 10px; background: #f3f4f6; border-radius: 6px;">
          <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">Rejected</div>
          <div style="font-size: 20px; font-weight: bold; color: #374151;">${summary.jobsByStatus.rejected}</div>
        </div>
      </div>
    </div>
    
    <div style="text-align: center; margin-top: 30px;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://cvcircle.io'}/dashboard" 
         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
        View Dashboard
      </a>
    </div>
    
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px; text-align: center;">
      Keep up the great work! 🚀
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
      This is your daily summary email from CVCircle.<br>
      You're receiving this because you have active job applications.
    </p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate text email template for daily summary
   */
  private getTextTemplate(userSummary: UserSummary): string {
    const { summary, firstName } = userSummary;
    const date = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    return `
Your Daily Job Search Summary - ${date}

Hi ${firstName || 'there'},

Here's what happened with your job search today:

Today's Activity:
${summary.jobsAdded > 0 ? `- ${summary.jobsAdded} ${summary.jobsAdded === 1 ? 'job' : 'jobs'} added` : ''}
${summary.jobsApplied > 0 ? `- ${summary.jobsApplied} ${summary.jobsApplied === 1 ? 'application' : 'applications'} submitted` : ''}
${summary.interviewsScheduled > 0 ? `- ${summary.interviewsScheduled} ${summary.interviewsScheduled === 1 ? 'interview' : 'interviews'} scheduled` : ''}
${summary.documentsReady > 0 ? `- ${summary.documentsReady} ${summary.documentsReady === 1 ? 'document set' : 'document sets'} ready` : ''}

Current Status:
- Draft: ${summary.jobsByStatus.draft}
- Created: ${summary.jobsByStatus.created}
- Applied: ${summary.jobsByStatus.applied}
- Interview: ${summary.jobsByStatus.interview}
- Offer: ${summary.jobsByStatus.offer}
- Rejected: ${summary.jobsByStatus.rejected}

View your dashboard: ${process.env.NEXT_PUBLIC_APP_URL || 'https://cvcircle.io'}/dashboard

Keep up the great work! 🚀

---
This is your daily summary email from CVCircle.
You're receiving this because you have active job applications.
    `.trim();
  }

  /**
   * Send daily summary email to a user
   */
  async sendDailySummary(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await getConnection();

      const user = await User.findById(userId).select('email firstName settings');
      if (!user || !user.email) {
        return { success: false, error: 'User not found or no email address' };
      }

      // Check if daily summary email is enabled in user settings
      const dailySummaryEnabled = user.settings?.notifications?.email?.dailySummary ?? true;
      if (!dailySummaryEnabled) {
        return { success: true, error: 'Daily summary email is disabled by user' };
      }

      // Get summary for last 24 hours
      const endDate = new Date();
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 1);

      const summary = await this.getUserDailySummary(userId, startDate, endDate);
      
      // Only send if there's activity
      if (!summary) {
        return { success: true, error: 'No activity to summarize' };
      }

      const userSummary: UserSummary = {
        userId,
        email: user.email,
        firstName: user.firstName || 'there',
        summary,
      };

      const html = this.getEmailTemplate(userSummary);
      const text = this.getTextTemplate(userSummary);

      const result = await sendEmail({
        to: user.email,
        subject: `📊 Your Daily Job Search Summary - ${new Date().toLocaleDateString()}`,
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

      return results;
    } catch (error: any) {
      console.error('❌ Error sending daily summaries:', error);
      throw error;
    }
  }
}

export default new DailySummaryEmailService();

