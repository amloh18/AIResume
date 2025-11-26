/**
 * Script to send all notification types as toasts and save to notification center
 * Usage: npx tsx scripts/send-all-notification-types.ts
 */

import { getConnection } from '../src/lib/database';
import notificationService from '../src/lib/services/notificationService';
import { NotificationType, NotificationPriority } from '../src/models/Notification';
import User from '../src/models/User';
import mongoose from 'mongoose';

const TARGET_USER_ID = '69209667c579142da2445851';

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

async function sendAllNotifications() {
  try {
    console.log('🔌 Connecting to database...');
    await getConnection();
    console.log('✅ Connected to database');

    // Verify user exists
    console.log(`\n🔍 Verifying user ${TARGET_USER_ID}...`);
    const user = await User.findById(TARGET_USER_ID);
    if (!user) {
      console.error(`❌ User ${TARGET_USER_ID} not found`);
      process.exit(1);
    }
    console.log(`✅ User found: ${user.email}`);

    console.log(`\n📨 Sending ${notificationTemplates.length} notifications...\n`);

    let successCount = 0;
    let errorCount = 0;

    // Send each notification type with a small delay to avoid overwhelming
    for (let i = 0; i < notificationTemplates.length; i++) {
      const template = notificationTemplates[i];
      
      try {
        console.log(`[${i + 1}/${notificationTemplates.length}] Creating ${template.type} notification...`);
        
        const notification = await notificationService.createNotification({
          userId: TARGET_USER_ID,
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

        console.log(`  ✅ Created notification: ${notification._id}`);
        successCount++;

        // Small delay between notifications (500ms)
        if (i < notificationTemplates.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error: any) {
        console.error(`  ❌ Failed to create ${template.type} notification:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`  ✅ Successfully created: ${successCount} notifications`);
    console.log(`  ❌ Failed: ${errorCount} notifications`);
    console.log(`\n✨ All notifications have been sent!`);
    console.log(`   They will appear as toasts and be saved to the notification center.`);
    console.log(`   User ID: ${TARGET_USER_ID}`);
    console.log(`   User Email: ${user.email}\n`);

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
sendAllNotifications();






