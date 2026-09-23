// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { cronAuthFailure } from '@/lib/auth/cron-guard';
import mongoose from 'mongoose';
import EmailCampaign, { IEmailCampaign } from '@/models/admin/EmailCampaign';
import campaignEmailService from '@/lib/services/campaignEmailService';
import { addDays, addWeeks, addMonths } from 'date-fns';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    try {
        /*
          1. Verify Cron Secret — fails closed.

          The previous version rejected only in production, and compared against the literal string
          "Bearer undefined" whenever CRON_SECRET was unset. Any non-production deployment therefore
          ran this endpoint for anyone who asked, and no deployment was protected by a missing secret.
        */
        const denied = cronAuthFailure(request.headers);
        if (denied) return denied;

        // Connect to DB if not connected (handled by model import side-effects usually, but good to ensure)
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI!);
        }

        const now = new Date();
        const results = {
            scheduledProcessed: 0,
            recurringProcessed: 0,
            errors: [] as string[]
        };

        // 2. Process Scheduled Campaigns (One-time)
        // Find campaigns that are 'scheduled' and scheduledAt <= now
        const dueScheduledCampaigns = await EmailCampaign.find({
            status: 'scheduled',
            scheduledAt: { $lte: now }
        });

        for (const campaign of dueScheduledCampaigns) {
            console.log(`🚀 Processing scheduled campaign: ${campaign._id} - ${campaign.campaignName}`);
            try {
                await campaignEmailService.sendCampaign(campaign._id as string);
                results.scheduledProcessed++;
            } catch (err: any) {
                console.error(`❌ Error processing scheduled campaign ${campaign._id}:`, err);
                results.errors.push(`Scheduled ${campaign._id}: ${err.message}`);
            }
        }

        // 3. Process Recurring Campaigns
        // Find campaigns that are 'recurring', active (not cancelled), and nextRunAt <= now
        const dueRecurringCampaigns = await EmailCampaign.find({
            status: 'recurring',
            nextRunAt: { $lte: now },
            $or: [
                { endDate: { $exists: false } },
                { endDate: { $eq: null } },
                { endDate: { $gt: now } }
            ]
        });

        for (const parentCampaign of dueRecurringCampaigns) {
            console.log(`🔄 Processing recurring campaign: ${parentCampaign._id} - ${parentCampaign.campaignName}`);

            try {
                // A. Clone the campaign
                const runDate = new Date();
                const dateStr = runDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                const childCampaignData = {
                    campaignName: `${parentCampaign.campaignName} [${dateStr}]`,
                    subject: parentCampaign.subject,
                    htmlContent: parentCampaign.htmlContent,
                    plainTextContent: parentCampaign.plainTextContent,
                    status: 'draft', // Temporarily draft, will be sent immediately
                    targetFilters: parentCampaign.targetFilters,
                    fromName: parentCampaign.fromName,
                    fromEmail: parentCampaign.fromEmail,
                    replyTo: parentCampaign.replyTo,
                    campaignGoal: parentCampaign.campaignGoal,
                    templateId: parentCampaign.templateId,
                    templateName: parentCampaign.templateName,
                    createdBy: parentCampaign.createdBy,
                    createdByName: parentCampaign.createdByName,
                    createdByEmail: parentCampaign.createdByEmail,
                    tags: [...(parentCampaign.tags || []), 'recurring-instance'],
                    parentCampaignId: parentCampaign._id,
                    isRecurring: false, // Child is solitary
                    scheduledAt: runDate
                };

                // Create the child instance
                const childCampaign = await EmailCampaign.create(childCampaignData);

                // B. Send the child campaign
                await campaignEmailService.sendCampaign(childCampaign._id as string);

                // C. Update the Parent
                // Calculate next run
                let nextRun = new Date(parentCampaign.nextRunAt || now);
                switch (parentCampaign.recurringFrequency) {
                    case 'daily':
                        nextRun = addDays(nextRun, 1);
                        break;
                    case 'weekly':
                        nextRun = addWeeks(nextRun, 1);
                        break;
                    case 'monthly':
                        nextRun = addMonths(nextRun, 1);
                        break;
                    default:
                        nextRun = addDays(nextRun, 1); // Default to daily if unknown
                }

                // Ensure next run is in the future (if we missed multiple cycles, catch up? or just schedule for next interval from NOW?)
                // Simple recurring often schedules from "Now" to avoid bursts if system was down.
                // But strictly, it should be from 'last scheduled'. 
                // Let's stick to schedule-based to maintain cadence, but if it's way behind, maybe just set to tomorrow.
                // tailored choice: next interval from PREVIOUS valid nextRunAt.
                if (nextRun <= now) {
                    // fast forward to future
                    nextRun = addDays(now, 1);
                }

                parentCampaign.lastRunAt = now;
                parentCampaign.nextRunAt = nextRun;
                await parentCampaign.save();

                results.recurringProcessed++;

            } catch (err: any) {
                console.error(`❌ Error processing recurring campaign ${parentCampaign._id}:`, err);
                results.errors.push(`Recurring ${parentCampaign._id}: ${err.message}`);
            }
        }

        return NextResponse.json({
            success: true,
            data: results
        });

    } catch (error: any) {
        console.error('❌ Cron job error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: error.message },
            { status: 500 }
        );
    }
}
