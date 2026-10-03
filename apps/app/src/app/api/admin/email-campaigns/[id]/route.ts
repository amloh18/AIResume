import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { getAdminEmailCampaign } from '@/models/admin-models';
import { resolveCampaignRecipients } from '@/lib/services/userSyncService';
import { ActivityLogService } from '@/lib/services/activityLogService';
import { getAdminContext } from '@/lib/utils/adminAuth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET - Fetch single campaign
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Prevent updating sent campaigns, UNLESS archiving
    if (campaign.status === 'sent' && body.status !== 'archived') {
      return NextResponse.json(
        { error: 'Cannot update a campaign that has already been sent' },
        { status: 400 }
      );
    }

    // Update targeted user count if filters or CSV recipients changed
    if (body.targetFilters !== undefined || body.csvRecipients !== undefined) {
      try {
        const filters = body.targetFilters !== undefined ? body.targetFilters : campaign.targetFilters;
        const csv = body.csvRecipients !== undefined ? body.csvRecipients : campaign.csvRecipients;
        const existingRecipients = campaign.recipients || [];
        
        const recipients = await resolveCampaignRecipients(filters, csv, existingRecipients);
        body.recipients = recipients;
        body.targetedUserCount = recipients.filter(r => !r.removed).length;
      } catch (error) {
        console.error('❌ Failed to resolve recipients during update:', error);
        body.targetedUserCount = campaign.targetedUserCount;
      }
    }

    // Handle recurring campaign setup
    if (body.status === 'recurring') {
      body.isRecurring = true;
      // If nextRunAt is not set, default to scheduledAt or now
      if (!body.nextRunAt) {
        body.nextRunAt = body.scheduledAt || new Date();
      }
    }

    const updatedCampaign = await EmailCampaign.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true }
    ).lean();

    // Log admin action
    const adminContext = await getAdminContext();
    if (adminContext) {
      await ActivityLogService.logAdminAction({
        adminUserId: adminContext.adminUserId!,
        adminEmail: adminContext.adminEmail,
        action: 'updated_campaign',
        actionType: 'campaign_management',
        resourceType: 'campaign',
        resourceId: id,
        status: 'success',
        metadata: {
          campaignName: body.name || campaign.name,
          status: body.status || campaign.status
        }
      });
    }

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

    // Log admin action
    const adminContext = await getAdminContext();
    if (adminContext) {
      await ActivityLogService.logAdminAction({
        adminUserId: adminContext.adminUserId!,
        adminEmail: adminContext.adminEmail,
        action: 'deleted_campaign',
        actionType: 'campaign_management',
        resourceType: 'campaign',
        resourceId: id,
        status: 'success',
        metadata: {
          campaignName: campaign.name
        }
      });
    }

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

