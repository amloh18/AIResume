
import { sendEmail } from '@/lib/email-service';
import EmailCampaign from '@/models/admin/EmailCampaign';
import { getCampaignTemplateById } from '@/lib/campaign-templates';
import { format } from 'date-fns';

class TriggerEmailService {

    /**
     * Trigger an automated email based on a template ID.
     * @param templateId The ID of the template from campaign-templates.ts (e.g., '1-welcome')
     * @param user The user object (must contain email, firstName, etc.)
     * @param metadata Optional metadata for replacing extra variables
     * @param checkDuplicate If true, checks if user already received this template to avoid spam
     */
    async trigger(templateId: string, user: { email: string; firstName?: string; lastName?: string; id?: string;[key: string]: any }, metadata: any = {}, checkDuplicate = false) {
        try {
            // 0. Check Duplicates (if requested)
            if (checkDuplicate && user.email) {
                // We can use the SystemEmailTracker or ActivityLog. 
                // For now, let's use a simple query on EmailCampaign if we tracked it there? No, EmailCampaign is aggregate.
                // We need to query ActivityLog.
                // Dynamic import to avoid circular dep if any
                const { default: ActivityLog } = await import('@/models/ActivityLog');
                const exists = await ActivityLog.findOne({
                    userEmail: user.email,
                    action: 'system_email_sent',
                    resourceId: templateId
                });
                if (exists) {
                    console.log(`Skipping duplicate trigger '${templateId}' for ${user.email}`);
                    return false;
                }
            }

            // 1. Get Template
            const template = getCampaignTemplateById(templateId);
            if (!template) {
                console.error(`Trigger Error: Template '${templateId}' not found.`);
                return false;
            }

            // 2. Resolve Content
            let htmlContent = template.htmlContent;
            let subject = template.subjectTemplate;

            // Basic Personalization
            const firstName = user.firstName || 'there';
            const lastName = user.lastName || '';
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cvcircle.io';

            htmlContent = htmlContent.replace(/{{firstName}}/g, firstName);
            subject = subject.replace(/{{firstName}}/g, firstName);

            htmlContent = htmlContent.replace(/{{lastName}}/g, lastName);
            htmlContent = htmlContent.replace(/{{appUrl}}/g, appUrl);
            htmlContent = htmlContent.replace(/{{email}}/g, user.email);

            // Metadata replacement
            Object.keys(metadata).forEach(key => {
                const regex = new RegExp(`{{${key}}}`, 'g');
                htmlContent = htmlContent.replace(regex, metadata[key]);
                subject = subject.replace(regex, metadata[key]);
            });

            // 3. Find or Create "Monthly Bucket" Campaign Container
            // We group automated sends by Month to keep stats manageable but historical
            const today = new Date();
            const monthStr = format(today, 'MMM yyyy'); // e.g. "Jan 2026"
            const campaignName = `Automated: ${template.name} - ${monthStr}`;

            let campaign = await EmailCampaign.findOne({
                campaignName,
                status: 'sent'  // It's an "active" automated campaign
            });

            if (!campaign) {
                campaign = await EmailCampaign.create({
                    campaignName,
                    subject,
                    status: 'sent', // Mark as sent so it shows up in "Past Campaigns" / Performance
                    htmlContent: template.htmlContent, // Store base template
                    campaignType: template.category === 'transactional' ? 'transactional' : 'trigger', // Use specific type
                    targetFilters: template.suggestedFilters || {},
                    campaignGoal: 'automation',
                    performance: {
                        sent: 0,
                        delivered: 0,
                        opened: 0,
                        clicked: 0
                    },
                    fromName: template.defaultFromName || 'CVCircle Team',
                    fromEmail: template.defaultFromEmail || 'noreply@cvcircle.io',
                    creatorId: 'automation',
                    createdByName: 'Automation Engine',
                    tags: ['automated', template.category, template.id],
                    sentAt: today,
                    isRecurring: false // It's not "Recurring" in the scheduler sense, it's "Triggered"
                });
            }

            // 4. Inject Unsubscribe (Linked to this Container Campaign)
            const unsubscribeUrl = `${appUrl}/unsubscribe?email=${encodeURIComponent(user.email)}&c=${campaign._id}`;
            const unsubscribeFooter = `
                <div style="text-align: center; margin-top: 20px; font-size: 11px; color: #666;">
                    <a href="${unsubscribeUrl}" style="color: #666;">Unsubscribe</a>.
                </div>
            `;

            // Should be handled by base template usually, but ensures it exists
            if (htmlContent.includes('{{unsubscribeUrl}}')) {
                htmlContent = htmlContent.replace(/{{unsubscribeUrl}}/g, unsubscribeUrl);
            } else if (!htmlContent.includes('Unsubscribe')) {
                if (htmlContent.includes('</body>')) {
                    htmlContent = htmlContent.replace('</body>', `${unsubscribeFooter}</body>`);
                } else {
                    htmlContent += unsubscribeFooter;
                }
            }

            // 5. Send Email
            const sent = await sendEmail({
                to: user.email,
                subject,
                html: htmlContent,
                text: template.previewText || subject // Fallback
            });

            // 6. Update Stats
            if (sent.success) {
                await EmailCampaign.updateOne(
                    { _id: campaign._id },
                    {
                        $inc: {
                            'performance.sent': 1,
                            'performance.delivered': 1, // Assumed
                            'sentCount': 1
                        },
                        $set: { updatedAt: new Date() }
                    }
                );

                // Log user action for deduplication
                const { ActivityLogService } = await import('@/lib/services/activityLogService');
                await ActivityLogService.logUserAction({
                    userId: user.id || 'system',
                    userEmail: user.email,
                    action: 'system_email_sent',
                    resourceType: 'other' as any, // Use 'other' as fallback
                    resourceId: templateId,
                    resourceName: template.name,
                    status: 'success',
                    metadata: { campaignId: (campaign as any)._id.toString() }
                });

                console.log(`✅ Triggered '${templateId}' for ${user.email}`);
                return true;
            } else {
                console.error(`❌ Failed to send '${templateId}' to ${user.email}:`, sent.error);
                await EmailCampaign.updateOne(
                    { _id: campaign._id },
                    { $inc: { 'performance.bounced': 1 } }
                );
                return false;
            }

        } catch (error) {
            console.error(`Trigger Service Error (${templateId}):`, error);
            return false;
        }
    }
}

export const triggerService = new TriggerEmailService();
