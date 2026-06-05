import { sendEmail } from '@/lib/email-service';
import EmailCampaign from '@/models/admin/EmailCampaign';
import { getTargetedUsers } from '@/lib/services/userSyncService';
import { ActivityLogService } from '@/lib/services/activityLogService';

interface SendResult {
    success: boolean;
    totalSent: number;
    totalFailed: number;
    errors?: string[];
    campaignId: string;
}

export class CampaignEmailService {
    /**
     * Send a specific campaign to its targeted users
     * @param campaignId The ID of the campaign to send
     * @param isDryRun If true, doesn't actually send emails but returns projected count
     */
    async sendCampaign(campaignId: string, isDryRun = false, adminUser?: any): Promise<SendResult> {
        const result: SendResult = {
            success: false,
            totalSent: 0,
            totalFailed: 0,
            errors: [],
            campaignId
        };

        try {
            // Check Daily Send Limit (Hostinger: 1000 per 24h)
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const recentCampaigns = await EmailCampaign.find({
                sentAt: { $gte: twentyFourHoursAgo },
                status: 'sent'
            });
            const totalSentRecently = recentCampaigns.reduce((sum, c) => sum + (c.sentCount || 0), 0);
            
            const HOSTINGER_DAILY_LIMIT = 1000;
            if (totalSentRecently >= HOSTINGER_DAILY_LIMIT) {
                throw new Error(`Daily send limit reached (${totalSentRecently}/${HOSTINGER_DAILY_LIMIT}). Hostinger allows 1000 emails per 24 hours.`);
            }

            // 1. Fetch the campaign
            const campaign = await EmailCampaign.findById(campaignId);
            if (!campaign) {
                throw new Error(`Campaign not found: ${campaignId}`);
            }

            // Check Size Limit (Hostinger: 35MB)
            const contentSize = Buffer.byteLength(campaign.htmlContent, 'utf8');
            const sizeInMB = contentSize / (1024 * 1024);
            if (sizeInMB > 30) { // Safety margin
                throw new Error(`Email size exceeds Hostinger limit (Current: ${sizeInMB.toFixed(2)}MB, Limit: 35MB).`);
            }

            // Check status (unless dry run)
            if (!isDryRun && (campaign.status === 'sent' || campaign.status === 'sending')) {
                throw new Error(`Campaign already sent or sending: ${campaign.status}`);
            }

            // 2. Update status to 'sending'
            if (!isDryRun) {
                campaign.status = 'sending';
                campaign.sentAt = new Date();
                campaign.performance = campaign.performance || {};
                await campaign.save();
            }

            // 3. Get recipients based on filters
            let recipients = await getTargetedUsers(campaign.targetFilters);
            
            // 3b. Add CSV recipients if present
            if (campaign.csvRecipients && campaign.csvRecipients.length > 0) {
                const csvRecipients = campaign.csvRecipients.map(r => ({
                    email: r.email,
                    firstName: r.name.split(' ')[0],
                    lastName: r.name.split(' ').slice(1).join(' ')
                }));
                recipients = [...recipients, ...csvRecipients];
            }

            console.log(`📧 Campaign ${campaignId}: Found ${recipients.length} recipients`);

            if (recipients.length === 0) {
                if (!isDryRun) {
                    campaign.status = 'sent'; // Completed with 0 sends
                    campaign.targetedUserCount = 0;
                    await campaign.save();
                }
                result.success = true;
                return result;
            }

            // 4. Send emails (Mock or Real)
            if (isDryRun) {
                result.totalSent = recipients.length;
                result.success = true;
                return result;
            }

            // Send to each recipient
            // Limit concurrency to avoid overwhelming the email provider
            const BATCH_SIZE = 10;

            for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
                const batch = recipients.slice(i, i + BATCH_SIZE);

                await Promise.all(batch.map(async (user) => {
                    try {
                        if (!user.email) return;

                        // Personalize content
                        let htmlContent = campaign.htmlContent;
                        let subject = campaign.subject;

                        // Basic personalization
                        if (user.firstName) {
                            htmlContent = htmlContent.replace(/{{firstName}}/g, user.firstName);
                            subject = subject.replace(/{{firstName}}/g, user.firstName);
                        } else {
                            // Fallback
                            htmlContent = htmlContent.replace(/{{firstName}}/g, 'there');
                            subject = subject.replace(/{{firstName}}/g, 'there');
                        }

                        if (user.lastName) {
                            htmlContent = htmlContent.replace(/{{lastName}}/g, user.lastName);
                        }

                        htmlContent = htmlContent.replace(/{{email}}/g, user.email);

                        // Replace {{appUrl}}
                        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cvcircle.io';
                        htmlContent = htmlContent.replace(/{{appUrl}}/g, appUrl);

                        // Generate Unsubscribe Link
                        const unsubscribeUrl = `${appUrl}/unsubscribe?email=${encodeURIComponent(user.email)}&c=${campaign._id}`;

                        // Replace {{unsubscribeUrl}}
                        if (htmlContent.includes('{{unsubscribeUrl}}')) {
                            htmlContent = htmlContent.replace(/{{unsubscribeUrl}}/g, unsubscribeUrl);
                        } else {
                            // Only inject footer if {{unsubscribeUrl}} was NOT present in template
                            const unsubscribeFooter = `
                              <div style="text-align: center; margin-top: 20px; font-size: 11px; color: #666;">
                                <a href="${unsubscribeUrl}" style="color: #666;">Unsubscribe</a> from these emails.
                              </div>
                            `;
                            // Inject footer before closing body/html
                            if (htmlContent.includes('</body>')) {
                                htmlContent = htmlContent.replace('</body>', `${unsubscribeFooter}</body>`);
                            } else {
                                htmlContent += unsubscribeFooter;
                            }
                        }

                        // Send via main email service
                        const sendResponse = await sendEmail({
                            to: user.email,
                            subject: subject,
                            html: htmlContent,
                            text: campaign.plainTextContent || htmlContent, // Fallback to HTML if no text
                            // Pass campaign ID for tracking (if supported by provider)
                        });

                        if (sendResponse.success) {
                            result.totalSent++;

                            // Update campaign metrics incrementally (every 10 or so) to show progress
                            if (result.totalSent % 10 === 0) {
                                await EmailCampaign.findByIdAndUpdate(campaignId, {
                                    $inc: { 'performance.sent': 10, 'sentCount': 10 }
                                });
                            }
                        } else {
                            result.totalFailed++;
                            result.errors?.push(`Failed for ${user.email}: ${sendResponse.error}`);
                        }

                    } catch (err: any) {
                        console.error(`Error sending to ${user.email}:`, err);
                        result.totalFailed++;
                        result.errors?.push(`Error for ${user.email}: ${err.message}`);
                    }
                }));

                // Small delay between batches to be nice to SMTP
                if (i + BATCH_SIZE < recipients.length) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            // 5. Finalize Campaign Stats
            campaign.status = 'sent';
            campaign.sentCount = result.totalSent;
            campaign.performance.sent = result.totalSent;

            // Calculate delivery rate (simple approximation until webhooks are added)
            campaign.deliveredCount = result.totalSent; // Assume delivered if sent successfully without immediate bounce
            campaign.performance.delivered = result.totalSent;
            campaign.performance.bounced = result.totalFailed; // Implied immediate failures

            await campaign.save();

            // Log activity
            if (adminUser) {
                await ActivityLogService.logAdminAction({
                    adminUserId: adminUser.id,
                    adminEmail: adminUser.email,
                    action: 'sent_campaign',
                    actionType: 'campaign_management',
                    resourceType: 'campaign',
                    resourceId: campaignId,
                    status: 'success',
                    metadata: {
                        sent: result.totalSent,
                        failed: result.totalFailed
                    }
                });
            }

            result.success = true;

        } catch (error: any) {
            console.error(`Campaign Send Error [${campaignId}]:`, error);
            result.errors?.push(error.message);

            // Update status to draft or something indicating failure so it can be retried?
            // Or keep as sending/error?
            await EmailCampaign.findByIdAndUpdate(campaignId, {
                status: 'cancelled', // Temporarily mark cancelled on critical error
                notes: `Failed to complete sending: ${error.message}`
            });
        }

        return result;
    }
}

export default new CampaignEmailService();
