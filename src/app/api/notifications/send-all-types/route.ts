import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import notificationService from '@/lib/services/notificationService';
import { NotificationType, NotificationPriority } from '@/models/Notification';
import User from '@/models/User';

/**
 * POST /api/notifications/send-all-types
 * Send all notification types as toasts and save to notification center for a specific user
 * Requires authentication (admin or the user themselves)
 */
export async function POST(request: NextRequest) {
  try {
    await getConnection();

    // Check authentication (optional for testing - can be called from admin panel)
    const authResult = await getAuthenticatedUser();
    
    const body = await request.json();
    const { userId } = body;
    
    // If authenticated, verify user is admin or the target user
    if (authResult) {
      const isAdmin = authResult.user?.role === 'admin';
      const isTargetUser = authResult.userId === userId;
      
      if (!isAdmin && !isTargetUser) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Only admins or the user themselves can send notifications' },
          { status: 403 }
        );
      }
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: userId' },
        { status: 400 }
      );
    }

    // Verify user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // All notification types with sample content
    const notificationTemplates: Array<{
      type: NotificationType;
      title: string;
      message: string;
      priority: NotificationPriority;
      interactive?: boolean;
      actionType?: string;
      actionData?: any;
      persistent?: boolean;
    }> = [
      {
        type: 'job_status_check',
        title: 'Job Status Update',
        message: 'The status of your application for Software Engineer at Tech Corp has been updated. Check it out!',
        priority: 'medium',
        interactive: true,
        actionType: 'review_job',
        actionData: { url: '/dashboard/tracker' },
      },
      {
        type: 'follow_up',
        title: 'Follow-up Reminder',
        message: 'It\'s been 3 days since you applied. Consider sending a follow-up email to the hiring manager.',
        priority: 'high',
        interactive: true,
        actionType: 'review_job',
        actionData: { url: '/dashboard/tracker' },
      },
      {
        type: 'deadline_approaching',
        title: 'Deadline Approaching',
        message: 'The application deadline for Software Engineer at Tech Corp is in 2 days. Make sure to submit your application!',
        priority: 'high',
        interactive: true,
        actionType: 'review_job',
        actionData: { url: '/dashboard/tracker' },
      },
      {
        type: 'deadline_due_today',
        title: 'Deadline Today!',
        message: 'Today is the deadline for Software Engineer at Tech Corp. Submit your application now!',
        priority: 'urgent',
        interactive: true,
        actionType: 'review_job',
        actionData: { url: '/dashboard/tracker' },
      },
      {
        type: 'deadline_missed',
        title: 'Deadline Missed',
        message: 'The deadline for Software Engineer at Tech Corp has passed. Consider applying to similar positions.',
        priority: 'medium',
        interactive: false,
      },
      {
        type: 'membership_expiring',
        title: 'Membership Expiring Soon',
        message: 'Your Pro membership will expire in 7 days. Renew now to continue enjoying all features.',
        priority: 'high',
        interactive: true,
        actionType: 'view_offer',
        actionData: { url: '/dashboard/settings' },
      },
      {
        type: 'membership_expired',
        title: 'Membership Expired',
        message: 'Your Pro membership has expired. Renew now to restore access to all premium features.',
        priority: 'urgent',
        interactive: true,
        actionType: 'view_offer',
        actionData: { url: '/dashboard/settings' },
      },
      {
        type: 'discount_offer',
        title: 'Special Discount Offer!',
        message: 'Get 20% off on Pro Quarterly plan. Limited time offer - valid for the next 48 hours!',
        priority: 'high',
        interactive: true,
        actionType: 'view_offer',
        actionData: { url: '/dashboard/settings' },
        persistent: true,
      },
      {
        type: 'system_update',
        title: 'System Update',
        message: 'We\'ve made some improvements to the platform. Check out what\'s new in your dashboard!',
        priority: 'low',
        interactive: false,
      },
      {
        type: 'achievement',
        title: 'Achievement Unlocked!',
        message: 'Congratulations! You\'ve applied to 10 jobs. Keep up the great work!',
        priority: 'medium',
        interactive: false,
      },
      {
        type: 'documents_ready',
        title: 'Documents Ready!',
        message: 'Your tailored CV and cover letter for Software Engineer at Tech Corp are ready. Review and apply now!',
        priority: 'high',
        interactive: true,
        actionType: 'review_job',
        actionData: { url: '/studio' },
      },
      {
        type: 'interview_follow_up',
        title: 'Interview Follow-up',
        message: 'You have an interview scheduled for Software Engineer at Tech Corp. Don\'t forget to send a follow-up email after the interview.',
        priority: 'high',
        interactive: true,
        actionType: 'review_job',
        actionData: { url: '/dashboard/tracker' },
      },
      {
        type: 'job_applied',
        title: 'Application Submitted!',
        message: 'Great! You\'ve successfully applied to Software Engineer at Tech Corp. Good luck with your application!',
        priority: 'medium',
        interactive: true,
        actionType: 'review_job',
        actionData: { url: '/dashboard/tracker' },
      },
    ];

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Send each notification type
    for (const template of notificationTemplates) {
      try {
        const notification = await notificationService.createNotification({
          userId,
          type: template.type,
          title: template.title,
          message: template.message,
          priority: template.priority,
          interactive: template.interactive || false,
          actionType: template.actionType,
          actionData: template.actionData,
          persistent: template.persistent || false,
          channels: ['in-app'], // Only in-app to show as toast and save to notification center
        });

        results.push({
          type: template.type,
          success: true,
          notificationId: notification._id.toString(),
        });
        successCount++;
      } catch (error: any) {
        results.push({
          type: template.type,
          success: false,
          error: error.message || 'Unknown error',
        });
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${successCount} notifications successfully, ${errorCount} failed`,
      results,
      summary: {
        total: notificationTemplates.length,
        success: successCount,
        failed: errorCount,
      },
    });
  } catch (error: any) {
    console.error('Error sending all notification types:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

