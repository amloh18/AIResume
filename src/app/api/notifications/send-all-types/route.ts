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
      category?: string;
      interactive?: boolean;
      actionType?: string;
      actionUrl?: string;
      persistent?: boolean;
    }> = [
      // --- PROGRESS UPDATES (Non-CTA) ---
      {
        type: 'achievement',
        title: 'Weekly Progress: 5 Applications! 🚀',
        message: 'You\'ve successfully tailored and submitted 5 applications this week. Consistency is key to landing your dream role.',
        priority: 'low',
        category: 'analytics',
        interactive: false,
      },
      {
        type: 'cv_auto_save',
        title: 'Background Auto-Save Successful',
        message: 'Your latest edits to the "Product Manager" CV have been securely saved to the cloud.',
        priority: 'low',
        category: 'system',
        interactive: false,
      },
      // --- PROGRESS UPDATES (CTA-Based) ---
      {
        type: 'cv_ats_score_jump',
        title: 'ATS Score Improved! 📈',
        message: 'Great job! Your recent edits bumped your ATS match score by +15 points for the Senior Developer role.',
        priority: 'medium',
        category: 'ats_score',
        interactive: true,
        actionType: 'view_report',
        actionUrl: '/editor',
      },
      {
        type: 'job_stage_moved',
        title: 'You reached the Interview Stage! 🎉',
        message: 'Tech Corp moved your application to the Interview stage. Time to start prepping!',
        priority: 'high',
        category: 'application_tracker',
        interactive: true,
        actionType: 'prep_interview',
        actionUrl: '/dashboard/tracker',
        persistent: true,
      },
      // --- ALERTS & ACTIONS REQUIRED (CTA-Based) ---
      {
        type: 'deadline_approaching',
        title: 'Action Required: Approaching Deadline ⏰',
        message: 'Your draft application for "Frontend Engineer" at Stripe closes in 48 hours. Finalize your CV now.',
        priority: 'high',
        category: 'application_tracker',
        interactive: true,
        actionType: 'resume_draft',
        actionUrl: '/editor',
        persistent: true,
      },
      {
        type: 'cv_formatting_conflict',
        title: 'Formatting Issue Detected',
        message: 'We noticed a margin overflow in your "Creative Director" template that might cause PDF export issues.',
        priority: 'medium',
        category: 'cv_document',
        interactive: true,
        actionType: 'fix_formatting',
        actionUrl: '/editor',
      },
      // --- INSIGHTS & NUDGES (Non-CTA) ---
      {
        type: 'feature_discovery',
        title: 'Pro Tip: Quantify Your Impact 💡',
        message: 'Did you know? Adding numbers and metrics to your experience section increases interview callback rates by 30%.',
        priority: 'low',
        category: 'system',
        interactive: false,
      },
      {
        type: 'job_stale_alert',
        title: 'Application Stalled?',
        message: 'It has been 14 days since you applied to "Data Analyst" at Acme Corp with no update. Consider sending a polite follow-up.',
        priority: 'medium',
        category: 'application_tracker',
        interactive: true,
        actionType: 'send_follow_up',
        actionUrl: '/dashboard/tracker',
      }
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
          category: template.category as any,
          interactive: template.interactive || false,
          actionType: template.actionType,
          actionUrl: template.actionUrl,
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

