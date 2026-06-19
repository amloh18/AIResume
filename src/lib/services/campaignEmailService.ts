import { sendEmail, createTransporter } from '@/lib/email-service';
import EmailCampaign from '@/models/admin/EmailCampaign';
import { getTargetedUsers, resolveCampaignRecipients } from '@/lib/services/userSyncService';
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
                campaign.performance.sent = 0;
                campaign.performance.delivered = 0;
                campaign.performance.bounced = 0;
                campaign.performance.softBounces = 0;
                campaign.performance.hardBounces = 0;
                campaign.sentCount = 0;
                campaign.deliveredCount = 0;
                campaign.bouncedCount = 0;
                await campaign.save();
            }

            // Pre-create shared transporter to avoid exhausting connection pool
            let transporter: ReturnType<typeof createTransporter> | null = null;
            if (!isDryRun) {
                transporter = createTransporter();
                if (!transporter) {
                    await EmailCampaign.findByIdAndUpdate(campaignId, {
                        status: 'cancelled',
                        notes: 'Email service not configured'
                    });
                    throw new Error('Email service not configured');
                }
            }

            // 3. Get recipients from the saved recipients list
            let recipients = campaign.recipients || [];
            
            // Fallback for legacy campaigns if list is empty
            if (recipients.length === 0) {
                recipients = await resolveCampaignRecipients(
                    campaign.targetFilters || {},
                    campaign.csvRecipients || []
                );
                campaign.recipients = recipients;
                await campaign.save();
            }

            // Filter out removed or already sent ones
            const targetRecipients = recipients.filter(r => !r.removed && r.status !== 'sent');

            console.log(`📧 Campaign ${campaignId}: Found ${targetRecipients.length} eligible recipients (Total: ${recipients.length})`);

            if (targetRecipients.length === 0) {
                if (!isDryRun) {
                    campaign.status = 'sent'; // Completed with 0 sends
                    await campaign.save();
                }
                result.success = true;
                return result;
            }

            // 4. Send emails (Mock or Real)
            if (isDryRun) {
                result.totalSent = targetRecipients.length;
                result.success = true;
                return result;
            }

            let hasTimedOut = false;

            // Send to each recipient using shared transporter
            // Limit concurrency to avoid overwhelming the email provider
            const BATCH_SIZE = 10;
            const BATCH_DELAY_MS = 300;

            for (let i = 0; i < targetRecipients.length; i += BATCH_SIZE) {
                const batch = targetRecipients.slice(i, i + BATCH_SIZE);

                if (isDryRun) {
                    result.totalSent += batch.length;
                    continue;
                }

                await Promise.all(batch.map(async (user) => {
                    try {
                        if (!user.email) return;

                        // Personalize content
                        let htmlContent = campaign.htmlContent;
                        let subject = campaign.subject;

                        if (user.firstName) {
                            htmlContent = htmlContent.replace(/{{firstName}}/g, user.firstName);
                            subject = subject.replace(/{{firstName}}/g, user.firstName);
                        } else {
                            htmlContent = htmlContent.replace(/{{firstName}}/g, 'there');
                            subject = subject.replace(/{{firstName}}/g, 'there');
                        }

                        if (user.lastName) {
                            htmlContent = htmlContent.replace(/{{lastName}}/g, user.lastName);
                        }

                        htmlContent = htmlContent.replace(/{{email}}/g, user.email);

                        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cvcircle.io';
                        htmlContent = htmlContent.replace(/{{appUrl}}/g, appUrl);

                        const unsubscribeUrl = `${appUrl}/unsubscribe?email=${encodeURIComponent(user.email)}&c=${campaign._id}`;

                        if (htmlContent.includes('{{unsubscribeUrl}}')) {
                            htmlContent = htmlContent.replace(/{{unsubscribeUrl}}/g, unsubscribeUrl);
                        } else {
                            const unsubscribeFooter = `
                              <div style="text-align: center; margin-top: 20px; font-size: 11px; color: #666;">
                                <a href="${unsubscribeUrl}" style="color: #666;">Unsubscribe</a> from these emails.
                              </div>
                            `;
                            if (htmlContent.includes('</body>')) {
                                htmlContent = htmlContent.replace('</body>', `${unsubscribeFooter}</body>`);
                            } else {
                                htmlContent += unsubscribeFooter;
                            }
                        }

                        let sendResponse: { success: boolean; messageId?: string; error?: string };
                        try {
                            const mailResult = await transporter!.sendMail({
                                from: (campaign.fromEmail ? `"${campaign.fromName || 'CVCircle'}" <${campaign.fromEmail}>` : undefined),
                                to: user.email,
                                subject,
                                text: campaign.plainTextContent || htmlContent,
                                html: htmlContent,
                            });
                            sendResponse = { success: true, messageId: mailResult.messageId };
                        } catch (sendError: any) {
                            sendResponse = { success: false, error: sendError.message };
                        }

                        if (sendResponse.success) {
                            result.totalSent++;
                            await EmailCampaign.updateOne(
                                { _id: campaignId, 'recipients.email': user.email },
                                {
                                    $set: {
                                        'recipients.$.status': 'sent',
                                        'recipients.$.sentAt': new Date(),
                                        'recipients.$.error': undefined,
                                    },
                                    $inc: {
                                        'performance.sent': 1,
                                        'performance.delivered': 1,
                                        sentCount: 1,
                                        deliveredCount: 1
                                    }
                                }
                            );
                        } else {
                            result.totalFailed++;
                            result.errors = result.errors || [];
                            result.errors.push(`Failed for ${user.email}: ${sendResponse.error}`);
                            await EmailCampaign.updateOne(
                                { _id: campaignId, 'recipients.email': user.email },
                                {
                                    $set: {
                                        'recipients.$.status': 'failed',
                                        'recipients.$.error': sendResponse.error,
                                    },
                                    $inc: {
                                        'performance.sent': 1,
                                        'performance.bounced': 1,
                                        bouncedCount: 1
                                    }
                                }
                            );
                        }

                    } catch (err: any) {
                        console.error(`Error sending to ${user.email}:`, err);
                        result.totalFailed++;
                        result.errors = result.errors || [];
                        result.errors.push(`Error for ${user.email}: ${err.message}`);
                        if (!isDryRun) {
                            await EmailCampaign.updateOne(
                                { _id: campaignId, 'recipients.email': user.email },
                                {
                                    $set: {
                                        'recipients.$.status': 'failed',
                                        'recipients.$.error': err.message,
                                    },
                                    $inc: {
                                        'performance.bounced': 1,
                                        bouncedCount: 1
                                    }
                                }
                            ).catch(() => {});
                        }
                    }
                }));

                // Small delay between batches
                if (i + BATCH_SIZE < targetRecipients.length) {
                    await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
                }
            }

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
