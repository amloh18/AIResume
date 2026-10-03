import { NextRequest, NextResponse } from 'next/server';
import { resolveCampaignRecipients } from '@/lib/services/userSyncService';
import { requireAdmin } from '@/lib/middleware/admin-auth';
import EmailCampaign from '@/models/admin/EmailCampaign';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requireAdmin(request);

        const { id } = await params;
        const campaign = await EmailCampaign.findById(id);

        if (!campaign) {
            return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
        }

        const { searchParams } = new URL(request.url);
        const page = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 1), 500);
        const emailSearch = (searchParams.get('email') || '').trim().toLowerCase();
        const nameSearch = (searchParams.get('name') || '').trim().toLowerCase();
        const sourceFilter = searchParams.get('source') || 'all';

        let recipients = campaign.recipients || [];
        
        // If recipients array is empty (legacy campaign), dynamically resolve it and cache/save it to DB
        if (recipients.length === 0) {
            recipients = await resolveCampaignRecipients(
                campaign.targetFilters || {},
                campaign.csvRecipients || []
            );
            campaign.recipients = recipients;
            await campaign.save();
        }

        // Active recipients are those not marked as removed
        const activeRecipients = recipients.filter(r => !r.removed);

        // Map to format returned to client
        const mapped = activeRecipients.map((user: any) => ({
            id: user.userId?.toString() || user._id?.toString() || user.email,
            email: user.email || '',
            firstName: user.firstName || 'Unknown',
            lastName: user.lastName || 'User',
            currentPlanKey: user.currentPlanKey || null,
            registrationDate: user.registrationDate || null,
            lastActiveAt: user.lastActiveAt || null,
            isCsv: !!user.isCsv,
            status: user.status || 'pending',
            error: user.error,
        }));

        let filtered = mapped;
        if (sourceFilter === 'db') {
            filtered = mapped.filter(u => !u.isCsv);
        } else if (sourceFilter === 'csv') {
            filtered = mapped.filter(u => u.isCsv);
        }

        if (emailSearch) {
            filtered = filtered.filter(u => u.email.toLowerCase().includes(emailSearch));
        }
        if (nameSearch) {
            filtered = filtered.filter(u =>
                `${u.firstName} ${u.lastName}`.toLowerCase().includes(nameSearch)
            );
        }

        const totalCount = filtered.length;
        const totalPages = Math.max(Math.ceil(totalCount / limit), 1);
        const safePage = Math.min(page, totalPages);
        const start = (safePage - 1) * limit;
        const paginated = filtered.slice(start, start + limit);

        return NextResponse.json({
            success: true,
            campaignId: id,
            totalCount,
            page: safePage,
            totalPages,
            limit,
            users: paginated,
        });
    } catch (error: any) {
        console.error('❌ Recipients list API error:', error);
        if (error.message === 'UNAUTHORIZED') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        if (error.message === 'FORBIDDEN') {
            return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
        }
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to fetch recipients',
            totalCount: 0,
            totalPages: 0,
            users: [],
        }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requireAdmin(request);

        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');

        if (!email) {
            return NextResponse.json({ success: false, error: 'Email parameter is required' }, { status: 400 });
        }

        const campaign = await EmailCampaign.findById(id);

        if (!campaign) {
            return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
        }

        if (campaign.status === 'sent' || campaign.status === 'sending') {
            return NextResponse.json({ success: false, error: 'Cannot remove recipients from a campaign that has already been sent or is sending' }, { status: 400 });
        }

        let recipients = campaign.recipients || [];
        
        // If recipients array is empty, resolve it first
        if (recipients.length === 0) {
            recipients = await resolveCampaignRecipients(
                campaign.targetFilters || {},
                campaign.csvRecipients || []
            );
        }

        // Find recipient and mark removed
        const targetEmail = email.toLowerCase().trim();
        let found = false;
        
        recipients = recipients.map(r => {
            if (r.email.toLowerCase().trim() === targetEmail) {
                found = true;
                return { ...r, removed: true };
            }
            return r;
        });

        if (!found) {
            return NextResponse.json({ success: false, error: 'Recipient not found in campaign list' }, { status: 404 });
        }

        campaign.recipients = recipients;
        campaign.markModified('recipients');
        campaign.targetedUserCount = recipients.filter(r => !r.removed).length;
        
        await campaign.save();

        return NextResponse.json({
            success: true,
            message: 'Recipient removed successfully'
        });
    } catch (error: any) {
        console.error('❌ Remove recipient API error:', error);
        if (error.message === 'UNAUTHORIZED') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        if (error.message === 'FORBIDDEN') {
            return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
        }
        return NextResponse.json({ success: false, error: error.message || 'Failed to remove recipient' }, { status: 500 });
    }
}
