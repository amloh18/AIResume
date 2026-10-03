import EmailCampaign from '@/models/admin/EmailCampaign';
import mongoose from 'mongoose';
import { format } from 'date-fns';

/**
 * Sentinel creator for campaigns the system generates on its own behalf.
 * `EmailCampaign.createdBy` is a required ObjectId, and there is no real user to
 * attribute a transactional email container to — so use the all-zero ObjectId,
 * which is greppable and unambiguous, rather than a random one per campaign.
 */
const SYSTEM_CREATOR_ID = new mongoose.Types.ObjectId('000000000000000000000000');
const SYSTEM_CREATOR_EMAIL = 'system@buildairesume.com';
const SYSTEM_CREATOR_NAME = 'System Automation';

export type SystemEmailType =
    | 'daily_summary'
    | 'verification_code'
    | 'password_reset'
    | 'welcome'
    | 'notification';

class SystemEmailTracker {
    /**
     * Logs a system email send by finding or creating a daily campaign container for that type.
     * e.g., "Daily Summaries - Jan 12, 2026"
     */
    async trackEmail(type: SystemEmailType, count: number = 1, metadata: any = {}) {
        try {
            const today = new Date();
            const dateStr = format(today, 'MMM d, yyyy');

            let campaignName = '';
            let subject = '';

            switch (type) {
                case 'daily_summary':
                    campaignName = `System: Daily Summaries - ${dateStr}`;
                    subject = 'Your Daily Job Application Summary';
                    break;
                case 'verification_code':
                    campaignName = `System: Auth Verification Codes - ${dateStr}`;
                    subject = 'Your Verification Code';
                    break;
                case 'password_reset':
                    campaignName = `System: Password Resets - ${dateStr}`;
                    subject = 'Reset Your Password';
                    break;
                default:
                    campaignName = `System: ${type} - ${dateStr}`;
                    subject = 'System Notification';
            }

            // Find existing campaign for today
            let campaign = await EmailCampaign.findOne({
                campaignName,
                'performance.systemType': type
            });

            if (!campaign) {
                // Create new container campaign
                campaign = new EmailCampaign({
                    campaignName,
                    subject,
                    status: 'sent', // Always sent
                    fromDate: today,
                    sentAt: today,
                    htmlContent: '<p>[System Generated Email - Content Varies per User]</p>',
                    targetFilters: {}, // N/A
                    campaignGoal: 'system_notification',
                    performance: {
                        sent: 0,
                        delivered: 0,
                        opened: 0,
                        clicked: 0,
                        systemType: type
                    },
                    fromName: 'System',
                    fromEmail: 'noreply@buildairesume.com',
                    campaignType: 'transactional',
                    // `createdBy` / `createdByEmail` / `createdByName` are all
                    // required by the schema. This previously set `creatorId`,
                    // which is not a schema path at all — Mongoose strict mode
                    // silently stripped it, so validation failed on every call
                    // with "createdByEmail is required, createdBy is required".
                    createdBy: SYSTEM_CREATOR_ID,
                    createdByEmail: SYSTEM_CREATOR_EMAIL,
                    createdByName: SYSTEM_CREATOR_NAME
                });
            }

            // Update counts
            campaign.performance.sent = (campaign.performance.sent || 0) + count;
            campaign.performance.delivered = (campaign.performance.delivered || 0) + count; // Assume delivered
            campaign.sentCount = (campaign.sentCount || 0) + count;
            campaign.updatedAt = new Date();

            await campaign.save();

        } catch (error) {
            console.error('Failed to track system email:', error);
            // Don't throw, we don't want to break the actual email sending
        }
    }
}

export default new SystemEmailTracker();
