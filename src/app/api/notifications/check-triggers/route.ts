import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { JobApplication, Notification } from '@/models';
import notificationService from '@/lib/services/notificationService';

export async function POST(request: NextRequest) {
    try {
        const auth = await authenticateRequest(request);
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { userId } = auth;
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // 1. Check for Stale Jobs
        // Find active jobs not updated in 30 days
        const staleJobs = await JobApplication.find({
            userId,
            updatedAt: { $lt: thirtyDaysAgo },
            status: { $nin: ['rejected', 'withdrawn', 'offer', 'accepted', 'saved'] }, // Only active jobs
            isArchived: false,
        }).limit(3); // Limit to 3 to avoid spam

        for (const job of staleJobs) {
            // Check if we already notified recently (e.g., in last 30 days)
            const existingNotif = await Notification.findOne({
                userId,
                type: 'job_stale_alert',
                'metadata.jobId': job._id.toString(),
                createdAt: { $gt: thirtyDaysAgo },
            });

            if (!existingNotif) {
                const daysSinceUpdate = Math.floor((now.getTime() - new Date(job.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
                await notificationService.notifyStaleJob(
                    userId,
                    job.jobTitle,
                    job._id.toString(),
                    daysSinceUpdate
                );
            }
        }

        // 2. Check for Extension Engagement
        // Check if user has ever used the extension (look for 'extension-saved' tag)
        const hasUsedExtension = await JobApplication.findOne({
            userId,
            tags: 'extension-saved',
        });

        if (!hasUsedExtension) {
            // Check if we already sent the prompt
            const extensionNotif = await Notification.findOne({
                userId,
                type: 'extension_download',
            });

            if (!extensionNotif) {
                await notificationService.notifyExtensionDownload(userId);
            }
        }

        // 3. Feature Discovery (Mock implementation - pick one random feature)
        // could iterate through features list
        const feature = { name: "ATS Resume Scan", desc: "Optimize your resume for specific job descriptions." };
        const featureNotif = await Notification.findOne({
            userId,
            type: 'feature_discovery',
            'actionData.feature': feature.name
        });

        // Simple logic: Send one if no other feature discovery sent in last 7 days
        const recentDiscovery = await Notification.findOne({
            userId,
            type: 'feature_discovery',
            createdAt: { $gt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
        });

        if (!featureNotif && !recentDiscovery) {
            await notificationService.notifyFeatureDiscovery(userId, feature.name, feature.desc);
        }

        return NextResponse.json({ success: true, message: 'Checks completed' });
    } catch (error) {
        console.error('Error in notification checks:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
