import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { getAdminEmailCampaign } from '@/models/admin-models';
import { getTargetedUsers } from '@/lib/services/userSyncService';
import { ActivityLogService } from '@/lib/services/activityLogService';
import { getAdminContext } from '@/lib/utils/adminAuth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET - Fetch all campaigns with filters
export async function GET(request: NextRequest) {
    try {
        await getConnection();
        // Skip during build time
        if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
            return NextResponse.json(
                { error: 'Service unavailable during build' },
                { status: 503 }
            );
        }

        const session = await getServerSession(authOptions);

        // Check if user is admin by type or role
        const isAdmin = session?.user && (
            (session.user as any).type === 'admin' ||
            (session.user as any).role === 'admin' ||
            (session.user as any).role === 'superadmin'
        );

        if (!isAdmin) {
            return NextResponse.json(
                { error: 'Unauthorized. Admin access required.' },
                { status: 403 }
            );
        }

        const searchParams = request.nextUrl.searchParams;
        const status = searchParams.get('status') || 'all';
        const limit = parseInt(searchParams.get('limit') || '50');
        const skip = parseInt(searchParams.get('skip') || '0');

        const EmailCampaign = await getAdminEmailCampaign();

        // Build query
        const query: any = {};
        if (status !== 'all') {
            query.status = status;
        }

        // Fetch campaigns with pagination
        const [campaigns, total] = await Promise.all([
            EmailCampaign.find(query)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(skip)
                .lean(),
            EmailCampaign.countDocuments(query),
        ]);

        return NextResponse.json({
            success: true,
            campaigns,
            total,
            limit,
            skip,
        });

    } catch (error: any) {
        console.error('❌ Fetch campaigns error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch campaigns', details: error.message },
            { status: 500 }
        );
    }
}

// POST - Create new campaign
export async function POST(request: NextRequest) {
    try {
        await getConnection();
        const session = await getServerSession(authOptions);

        // Check if user is admin by type or role
        const isAdmin = session?.user && (
            (session.user as any).type === 'admin' ||
            (session.user as any).role === 'admin' ||
            (session.user as any).role === 'superadmin'
        );

        if (!isAdmin) {
            return NextResponse.json(
                { error: 'Unauthorized. Admin access required.' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const EmailCampaign = await getAdminEmailCampaign();

        // Calculate targeted user count
        let targetedUserCount = 0;
        try {
            const targetedUsers = await getTargetedUsers(body.targetFilters || {});
            targetedUserCount = targetedUsers.length;
            
            // Add CSV recipients to count
            if (body.csvRecipients && Array.isArray(body.csvRecipients)) {
                targetedUserCount += body.csvRecipients.length;
            }
        } catch (error) {
            console.warn('⚠️ Failed to get targeted users:', error);
        }

        // Extract admin info from session
        const adminUserId = (session.user as any).id;
        const adminEmail = session.user.email || 'admin@cvcircle.io';
        const adminName = session.user.name || adminEmail.split('@')[0];

        // Handle recurring campaign setup
        if (body.status === 'recurring') {
            body.isRecurring = true;
            // If nextRunAt is not set, default to scheduledAt or now
            if (!body.nextRunAt) {
                body.nextRunAt = body.scheduledAt || new Date();
            }
        }

        // Create campaign
        const campaign = await EmailCampaign.create({
            ...body,
            targetedUserCount,
            status: body.status || 'draft',
            createdBy: adminUserId,
            createdByEmail: adminEmail,
            createdByName: adminName,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        // Log admin action
        const adminContext = await getAdminContext();
        if (adminContext) {
            await ActivityLogService.logAdminAction({
                adminUserId: adminContext.adminUserId!,
                adminEmail: adminContext.adminEmail,
                action: 'created_campaign',
                actionType: 'campaign_management',
                resourceType: 'campaign',
                resourceId: campaign._id.toString(),
                status: 'success',
                metadata: {
                    campaignName: body.name,
                    targetedUserCount,
                }
            });
        }

        return NextResponse.json({
            success: true,
            campaign,
            message: 'Campaign created successfully',
        });

    } catch (error: any) {
        console.error('❌ Create campaign error:', error);
        return NextResponse.json(
            { error: 'Failed to create campaign', details: error.message },
            { status: 500 }
        );
    }
}
