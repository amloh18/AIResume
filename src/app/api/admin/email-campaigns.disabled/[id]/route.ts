import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getAdminEmailCampaign } from '@/models/admin-models';
import { getTargetedUsers } from '@/lib/services/userSyncService';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET - Fetch single campaign
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Skip during build time
    if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
      return NextResponse.json(
        { error: 'Service unavailable during build' },
        { status: 503 }
      );
    }

    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const EmailCampaign = await getAdminEmailCampaign();
    const campaign = await EmailCampaign.findById(id).lean();

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      campaign,
    });

  } catch (error: any) {
    console.error('❌ Get campaign error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update campaign
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const EmailCampaign = await getAdminEmailCampaign();

    const campaign = await EmailCampaign.findById(id);
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Prevent updating sent campaigns
    if (campaign.status === 'sent') {
      return NextResponse.json(
        { error: 'Cannot update a campaign that has already been sent' },
        { status: 400 }
      );
    }

    // Update targeted user count if filters changed
    if (body.targetFilters) {
      try {
        const targetedUsers = await getTargetedUsers(body.targetFilters);
        body.targetedUserCount = targetedUsers.length;
      } catch (error) {
        console.warn('⚠️ Failed to get targeted users during build:', error);
        body.targetedUserCount = 0;
      }
    }

    const updatedCampaign = await EmailCampaign.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true }
    ).lean();

    return NextResponse.json({
      success: true,
      campaign: updatedCampaign,
      message: 'Campaign updated successfully',
    });

  } catch (error: any) {
    console.error('❌ Update campaign error:', error);
    return NextResponse.json(
      { error: 'Failed to update campaign', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete campaign
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const EmailCampaign = await getAdminEmailCampaign();

    const campaign = await EmailCampaign.findById(id);
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Prevent deleting sent campaigns
    if (campaign.status === 'sent') {
      return NextResponse.json(
        { error: 'Cannot delete a campaign that has already been sent. Archive it instead.' },
        { status: 400 }
      );
    }

    await EmailCampaign.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Campaign deleted successfully',
    });

  } catch (error: any) {
    console.error('❌ Delete campaign error:', error);
    return NextResponse.json(
      { error: 'Failed to delete campaign', details: error.message },
      { status: 500 }
    );
  }
}

