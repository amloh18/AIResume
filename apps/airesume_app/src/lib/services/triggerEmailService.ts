import mongoose from 'mongoose';
import { format } from 'date-fns';
import { sendEmail } from '@/lib/email-service';
import EmailCampaign from '@/models/admin/EmailCampaign';
import EmailAutomation from '@/models/EmailAutomation';
import { getCampaignTemplateById } from '@/lib/campaign-templates';
import { renderEmailTemplate } from '@/lib/email-automations';

/**
 * Shared sender for every automated email (trigger templates and lifecycle
 * automations).
 *
 * Two defects in the previous implementation are fixed here:
 *  1. `EmailCampaign.createdBy` is required, but the container was created with
 *     `creatorId` (not a schema path), so `create()` threw a ValidationError and
 *     every automated send silently failed. The container now carries a stable
 *     system ObjectId.
 *  2. Duplicate detection queried `resourceId`, a field ActivityLog does not
 *     have (it stores `resource.id`), so the guard never matched and the same
 *     email could be sent repeatedly. The query now reads `resource.id`.
 */
const SYSTEM_CREATOR_ID = new mongoose.Types.ObjectId('000000000000000000000001');
const SYSTEM_CREATOR_EMAIL = 'automation@buildairesume.com';
const SYSTEM_CREATOR_NAME = 'Automation Engine';

export interface CustomEmailInput {
  key: string;
  name: string;
  category: string;
  subject: string;
  htmlContent: string;
  previewText?: string;
  fromName?: string;
  fromEmail?: string;
  tags?: string[];
}

export interface RecipientLike {
  email: string;
  firstName?: string;
  lastName?: string;
  id?: string;
  [key: string]: any;
}

function escapeHtml(value: any): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Hidden inbox preview line — the first text clients show next to the subject. */
function preheaderBlock(text: string): string {
  return `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;color:#0c1310;">${escapeHtml(
    text
  )}</div>`;
}

class TriggerEmailService {
  /**
   * Trigger an automated email from a campaign template.
   */
  async trigger(
    templateId: string,
    user: RecipientLike,
    metadata: any = {},
    checkDuplicate = false
  ): Promise<boolean> {
    const template = getCampaignTemplateById(templateId);
    if (!template) {
      console.error(`Trigger Error: Template '${templateId}' not found.`);
      return false;
    }

    return this.sendCustom(
      {
        key: templateId,
        name: template.name,
        category: template.category,
        subject: template.subjectTemplate,
        htmlContent: template.htmlContent,
        previewText: template.previewText,
        fromName: template.defaultFromName,
        fromEmail: template.defaultFromEmail,
        tags: ['automated', template.category, template.id],
      },
      user,
      metadata,
      checkDuplicate
    );
  }

  /**
   * Send an arbitrary HTML email through the automation pipeline: monthly
   * campaign container, unsubscribe injection, stats and dedupe log.
   */
  async sendCustom(
    input: CustomEmailInput,
    user: RecipientLike,
    metadata: Record<string, any> = {},
    checkDuplicate = false
  ): Promise<boolean> {
    const dedupeKey = input.key.startsWith('automation:')
      ? input.key
      : `automation:${input.key}`;

    try {
      if (!user?.email) {
        console.error(`Trigger Service Error (${input.key}): recipient has no email.`);
        return false;
      }

      // 0. Duplicate guard
      if (checkDuplicate) {
        const { default: ActivityLog } = await import('@/models/ActivityLog');
        const exists = await ActivityLog.findOne({
          userEmail: user.email,
          action: 'system_email_sent',
          'resource.id': dedupeKey,
        })
          .select('_id')
          .lean();
        if (exists) {
          console.log(`Skipping duplicate trigger '${input.key}' for ${user.email}`);
          return false;
        }
      }

      // 1. Resolve content
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://buildairesume.com';
      const values: Record<string, any> = {
        firstName: user.firstName || 'there',
        lastName: user.lastName || '',
        email: user.email,
        appUrl,
        ...metadata,
      };
      // Metadata is trusted HTML (digest rows); recipient fields are not.
      const htmlValues: Record<string, any> = {
        ...values,
        firstName: escapeHtml(values.firstName),
        lastName: escapeHtml(values.lastName),
        email: escapeHtml(user.email),
      };

      let htmlContent = renderEmailTemplate(input.htmlContent, htmlValues, {
        // Resolved below against the campaign container id — see step 3.
        preserve: ['unsubscribeUrl'],
      });
      const subject = renderEmailTemplate(input.subject, values);
      const previewText = input.previewText
        ? renderEmailTemplate(input.previewText, values)
        : '';

      // 2. Find or create the monthly stats container
      const today = new Date();
      const monthStr = format(today, 'MMM yyyy');
      const campaignName = `Automated: ${input.name} - ${monthStr}`;

      let campaign = await EmailCampaign.findOne({ campaignName, status: 'sent' });

      if (!campaign) {
        campaign = await EmailCampaign.create({
          campaignName,
          subject: input.subject,
          status: 'sent',
          htmlContent: input.htmlContent,
          targetFilters: {},
          campaignGoal: 'automation',
          performance: { sent: 0, delivered: 0, opened: 0, clicked: 0 },
          fromName: input.fromName || 'AIResume Team',
          fromEmail: input.fromEmail || 'noreply@buildairesume.com',
          createdBy: SYSTEM_CREATOR_ID,
          createdByName: SYSTEM_CREATOR_NAME,
          createdByEmail: SYSTEM_CREATOR_EMAIL,
          tags: input.tags || ['automated', input.category, input.key],
          sentAt: today,
          isRecurring: false,
        });
      }

      // 3. Unsubscribe link
      const unsubscribeUrl = `${appUrl}/unsubscribe?email=${encodeURIComponent(
        user.email
      )}&c=${campaign._id}`;

      if (htmlContent.includes('{{unsubscribeUrl}}')) {
        htmlContent = htmlContent.replace(/{{unsubscribeUrl}}/g, unsubscribeUrl);
      } else if (!htmlContent.includes('Unsubscribe')) {
        const footer = `<div style="text-align:center;margin-top:20px;font-size:11px;color:#666;"><a href="${unsubscribeUrl}" style="color:#666;">Unsubscribe</a></div>`;
        htmlContent = htmlContent.includes('</body>')
          ? htmlContent.replace('</body>', `${footer}</body>`)
          : htmlContent + footer;
      }

      // 3b. Hidden preview text (inbox snippet)
      if (previewText) {
        const block = preheaderBlock(previewText);
        htmlContent = /<body[^>]*>/i.test(htmlContent)
          ? htmlContent.replace(/<body([^>]*)>/i, `<body$1>${block}`)
          : block + htmlContent;
      }

      // 4. Send
      const sent = await sendEmail({
        to: user.email,
        subject,
        html: htmlContent,
        text: previewText || subject,
      });

      if (!sent.success) {
        console.error(`❌ Failed to send '${input.key}' to ${user.email}:`, sent.error);
        await Promise.all([
          EmailCampaign.updateOne(
            { _id: campaign._id },
            { $inc: { 'performance.bounced': 1 } }
          ),
          EmailAutomation.updateOne(
            { key: input.key },
            { $set: { 'stats.lastError': sent.error || 'send failed' } }
          ),
        ]);
        return false;
      }

      // 5. Stats + dedupe log
      await EmailCampaign.updateOne(
        { _id: campaign._id },
        {
          $inc: {
            'performance.sent': 1,
            'performance.delivered': 1,
            sentCount: 1,
          },
          $set: { updatedAt: new Date() },
        }
      );

      const { ActivityLogService } = await import('@/lib/services/activityLogService');
      await ActivityLogService.logUserAction({
        userId: user.id || 'system',
        userEmail: user.email,
        action: 'system_email_sent',
        resourceType: 'other' as any,
        resourceId: dedupeKey,
        resourceName: input.name,
        status: 'success',
        metadata: { campaignId: String(campaign._id), automationKey: input.key },
      });

      await EmailAutomation.updateOne(
        { key: input.key },
        {
          $inc: { 'stats.sent': 1 },
          $set: {
            'stats.lastSentAt': new Date(),
            'stats.lastError': null,
          },
        }
      );

      console.log(`✅ Triggered '${input.key}' for ${user.email}`);
      return true;
    } catch (error: any) {
      console.error(`Trigger Service Error (${input.key}):`, error);
      await EmailAutomation.updateOne(
        { key: input.key },
        { $set: { 'stats.lastError': error?.message || 'unknown error' } }
      ).catch(() => undefined);
      return false;
    }
  }
}

export const triggerService = new TriggerEmailService();
