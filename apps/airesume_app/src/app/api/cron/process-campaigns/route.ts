import { runCron } from '@/lib/cron/runCron';
import { log } from '@/lib/structured-logger';
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import EmailCampaign, { IEmailCampaign } from '@/models/admin/EmailCampaign';
import campaignEmailService from '@/lib/services/campaignEmailService';
import { addDays, addWeeks, addMonths } from 'date-fns';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    // Overlap guard: a concurrent run would clone the same recurring child campaign twice.
    return runCron('process-campaigns', request, async () => {
      try {
          /*
            Connect through the unified connection manager — a raw
            mongoose.connect() here can bind the shared default connection
            without the MONGODB_DB override and poison every later query in
            this process (see the split-database guard in connection-manager).
          */
          await getConnection();

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
              log.info(`🚀 Processing scheduled campaign: ${campaign._id} - ${campaign.campaignName}`);
              try {
                  await campaignEmailService.sendCampaign(String(campaign._id));
                  results.scheduledProcessed++;
              } catch (err: any) {
                  log.error(`❌ Error processing scheduled campaign ${campaign._id}:`, err);
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
              log.info(`🔄 Processing recurring campaign: ${parentCampaign._id} - ${parentCampaign.campaignName}`);

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
                  await campaignEmailService.sendCampaign(String(childCampaign._id));

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
                  log.error(`❌ Error processing recurring campaign ${parentCampaign._id}:`, err);
                  results.errors.push(`Recurring ${parentCampaign._id}: ${err.message}`);
              }
          }

          return NextResponse.json({
              success: true,
              data: results
          });

      } catch (error: any) {
          log.error('❌ Cron job error:', error);
          return NextResponse.json(
              { error: 'Internal Server Error', details: error.message },
              { status: 500 }
          );
      }
    });
}
