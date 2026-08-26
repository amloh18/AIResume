import { sendEmail } from '@/lib/email-service';
import { INotification } from '@/models/Notification';

class EmailNotificationService {
  /**
   * Send email notification
   */
  async sendEmailNotification(
    notification: INotification,
    userEmail: string,
    firstName: string
  ): Promise<{ success: boolean; error?: string }> {
    const html = this.getEmailTemplate(notification, firstName);
    const text = this.getTextTemplate(notification, firstName);

    const result = await sendEmail({
      to: userEmail,
      subject: notification.title,
      text,
      html,
    });

    return result;
  }

  /**
   * Get HTML email template
   */
  private getEmailTemplate(notification: INotification, firstName: string): string {
    const actionButton = notification.interactive && notification.actionType
      ? `
        <div style="margin-top: 24px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.buildairesume.com'}${notification.actionData?.url || '/dashboard'}" 
             style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
            ${this.getActionButtonText(notification.actionType)}
          </a>
        </div>
      `
      : '';

    const priorityBadge = notification.priority === 'urgent'
      ? '<span style="display: inline-block; padding: 4px 8px; background-color: #EF4444; color: white; border-radius: 4px; font-size: 12px; font-weight: 600; margin-left: 8px;">URGENT</span>'
      : '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h1 style="color: #111827; margin-top: 0; font-size: 24px;">
              ${notification.title}
              ${priorityBadge}
            </h1>
            <p style="color: #6b7280; font-size: 16px; margin-bottom: 20px;">
              Hello ${firstName},
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              ${notification.message}
            </p>
            ${actionButton}
            <p style="color: #9ca3af; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              © ${new Date().getFullYear()} AIResume. All rights reserved.<br>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.buildairesume.com'}/dashboard/settings?tab=notifications" style="color: #4F46E5; text-decoration: none;">Manage notification preferences</a>
            </p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Get plain text email template
   */
  private getTextTemplate(notification: INotification, firstName: string): string {
    const actionText = notification.interactive && notification.actionType
      ? `\n\n${this.getActionButtonText(notification.actionType)}: ${process.env.NEXT_PUBLIC_APP_URL || 'https://app.buildairesume.com'}${notification.actionData?.url || '/dashboard'}`
      : '';

    return `
${notification.title}

Hello ${firstName},

${notification.message}
${actionText}

© ${new Date().getFullYear()} AIResume. All rights reserved.
Manage notification preferences: ${process.env.NEXT_PUBLIC_APP_URL || 'https://app.buildairesume.com'}/dashboard/settings?tab=notifications
    `.trim();
  }

  /**
   * Get action button text
   */
  private getActionButtonText(actionType: string): string {
    switch (actionType) {
      case 'move_to_next_stage':
        return 'Move to Next Stage';
      case 'review_job':
        return 'Review Job';
      case 'view_offer':
        return 'View Offer';
      default:
        return 'View Details';
    }
  }
}

export default new EmailNotificationService();

