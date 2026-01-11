import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import campaignEmailService from '@/lib/services/campaignEmailService';
import { getAdminEmailCampaign } from '@/models/admin-models';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST - Trigger campaign send
export async function POST(
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
                { error: 'Unauthorized. Admin access required.' },
                { status: 403 }
            );
        }

        const { id } = await params;

        // Check if campaign exists
        const EmailCampaign = await getAdminEmailCampaign();
        const campaign = await EmailCampaign.findById(id);

        if (!campaign) {
            return NextResponse.json(
                { error: 'Campaign not found' },
                { status: 404 }
            );
        }

        if (campaign.status === 'sent' || campaign.status === 'sending') {
            return NextResponse.json(
                { error: 'Campaign has already been sent' },
                { status: 400 }
            );
        }

        // Start sending process (async / fire-and-forget or await depending on needs)
        // For large campaigns, we should probably use a background job defined in a queue.
        // However, for this implementation, we will await it but use small batch sizes in the service.
        // If it times out on Vercel (10s limit on free/hobby), we might need to move to proper background jobs.
        // For now, let's execute it directly.

        console.log(`🚀 Starting send for campaign ${id}...`);

        const result = await campaignEmailService.sendCampaign(id, false, session.user);

        return NextResponse.json({
            success: result.success,
            sentValues: {
                sent: result.totalSent,
                failed: result.totalFailed
            },
            message: result.success ? 'Campaign sent successfully' : 'Campaign completed with errors',
            errors: result.errors
        });

    } catch (error: any) {
        console.error('❌ Send campaign endpoint error:', error);
        return NextResponse.json(
            { error: 'Failed to initiate campaign send', details: error.message },
            { status: 500 }
        );
    }
}
