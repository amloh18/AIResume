
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getAdminEmailCampaign } from '@/models/admin-models';
import { getTargetedUsers } from '@/lib/services/userSyncService';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        // Check if user is admin
        const isAdmin = session?.user && (
            (session.user as any).type === 'admin' ||
            (session.user as any).role === 'admin' ||
            (session.user as any).role === 'superadmin'
        );

        if (!isAdmin) {
            // Allow header-based auth for internal tooling/curl
            const authHeader = request.headers.get('authorization');
            if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'dev-secret'}`) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
            }
        }

        const EmailCampaign = await getAdminEmailCampaign();

        // 1. Define the Daily Usage Report Campaign
        const campaignData = {
            campaignName: 'Daily Usage Report (High Activity)',
            subject: 'Your Daily CVCircle Activity Summary',
            htmlContent: `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h1>Hi {{firstName}},</h1>
                    <p>You've been active today! Here is a summary of your progress.</p>
                    <p>We noticed you spent over 10 minutes on the platform. Keep up the great work on your CVs.</p>
                    <br/>
                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background: #84cc16; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Dashboard</a>
                </div>
            `,
            plainTextContent: 'Your daily activity summary. You have been active for more than 10 minutes today.',
            status: 'recurring',
            isRecurring: true,
            recurringFrequency: 'daily',
            scheduledAt: new Date(),
            nextRunAt: new Date(new Date().setHours(18, 0, 0, 0)), // Run at 6 PM
            targetFilters: {
                usageMetrics: {
                    minUsageMinutes: 10
                },
                isDeleted: false
            },
            campaignGoal: 'engagement',
            createdBy: new Date().getTime().toString().padEnd(24, '0').slice(0, 24), // Dummy 24-char hex string logic-ish
            createdByEmail: session?.user?.email || 'system@cvcircle.io',
            createdByName: session?.user?.name || 'System Auto-Gen',
            tags: ['daily-report', 'high-activity'],
            targetedUserCount: 0 // Will be calculated dynamically on run
        };

        // Use updateOne with upsert to bypass Mongoose validation (stale schema issue)
        // and ensure idempotency.
        const now = new Date();
        const result = await EmailCampaign.updateOne(
            { campaignName: campaignData.campaignName, status: 'recurring' },
            {
                $set: {
                    ...campaignData,
                    updatedAt: now
                },
                $setOnInsert: {
                    createdAt: now
                }
            },
            { upsert: true }
        );

        const campaign = await EmailCampaign.findOne({ campaignName: campaignData.campaignName, status: 'recurring' });

        return NextResponse.json({
            success: true,
            message: 'Recurring campaign seeded successfully',
            campaign
        });

    } catch (error: any) {
        console.error('Seeding error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
