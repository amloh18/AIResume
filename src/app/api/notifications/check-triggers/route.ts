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

        // Batch-fetch all existing notifications for stale jobs (avoid N+1)
        if (staleJobs.length > 0) {
            const staleJobIds = staleJobs.map(j => j._id.toString());
            const existingStaleNotifs = await Notification.find({
                userId,
                type: 'job_stale_alert',
                'metadata.jobId': { $in: staleJobIds },
                createdAt: { $gt: thirtyDaysAgo },
            }).lean();
            const notifiedJobIds = new Set(existingStaleNotifs.map(n => n.metadata?.jobId));

            for (const job of staleJobs) {
                if (!notifiedJobIds.has(job._id.toString())) {
                    const daysSinceUpdate = Math.floor((now.getTime() - new Date(job.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
                    await notificationService.notifyStaleJob(
                        userId,
                        job.jobTitle,
                        job._id.toString(),
                        daysSinceUpdate
                    );
                }
            }
        }

        // 2. Check for Extension Engagement + Feature Discovery (parallel)
        const [hasUsedExtension, extensionNotif, featureNotif, recentDiscovery] = await Promise.all([
            JobApplication.findOne({ userId, tags: 'extension-saved' }),
            Notification.findOne({ userId, type: 'extension_download' }),
            Notification.findOne({ userId, type: 'feature_discovery', 'actionData.feature': 'ATS Resume Scan' }),
            Notification.findOne({ userId, type: 'feature_discovery', createdAt: { $gt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } }),
        ]);

        if (!hasUsedExtension && !extensionNotif) {
            await notificationService.notifyExtensionDownload(userId);
        }

        const feature = { name: "ATS Resume Scan", desc: "Optimize your resume for specific job descriptions." };
        if (!featureNotif && !recentDiscovery) {
            await notificationService.notifyFeatureDiscovery(userId, feature.name, feature.desc);
        }

        return NextResponse.json({ success: true, message: 'Checks completed' });
    } catch (error) {
        console.error('Error in notification checks:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
