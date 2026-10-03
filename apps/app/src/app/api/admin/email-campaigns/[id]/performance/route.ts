import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getAdminEmailCampaign } from '@/models/admin-models';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET - Fetch campaign performance
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        // Check if user is admin
        const isAdmin = session?.user && (
            (session.user as any).type === 'admin' ||
            (session.user as any).role === 'admin' ||
            (session.user as any).role === 'superadmin'
        );

        if (!isAdmin) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            );
        }

        const { id } = await params;
        const EmailCampaign = await getAdminEmailCampaign();
        const campaign = await EmailCampaign.findById(id).select('performance targetedUserCount sentCount deliveredCount openedCount clickedCount').lean();

        if (!campaign) {
            return NextResponse.json(
                { error: 'Campaign not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            performance: campaign.performance || {},
            stats: {
                targeted: campaign.targetedUserCount || 0,
                sent: campaign.sentCount || 0,
                delivered: campaign.deliveredCount || 0,
                opened: campaign.openedCount || 0,
                clicked: campaign.clickedCount || 0,
            }
        });

    } catch (error: any) {
        console.error('❌ Get campaign performance error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch performance data' },
            { status: 500 }
        );
    }
}
