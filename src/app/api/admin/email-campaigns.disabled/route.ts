import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getAdminEmailCampaign } from '@/models/admin-models';
import { getTargetedUsers } from '@/lib/services/userSyncService';

// GET - Fetch all email campaigns
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');

    const EmailCampaign = await getAdminEmailCampaign();

    const query: any = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [campaigns, total] = await Promise.all([
      EmailCampaign.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EmailCampaign.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      campaigns,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error: any) {
    console.error('❌ Get campaigns error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new email campaign
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      campaignName,
      subject,
      htmlContent,
      plainTextContent,
      status = 'draft',
      targetFilters,
      scheduledAt,
      templateId,
      templateName,
      tags,
      notes,
    } = body;

    // Validate required fields
    if (!campaignName || !subject || !htmlContent) {
      return NextResponse.json(
        { error: 'Campaign name, subject, and HTML content are required' },
        { status: 400 }
      );
    }

    // Get targeted user count
    let targetedUserCount = 0;
    if (targetFilters) {
      const targetedUsers = await getTargetedUsers(targetFilters);
      targetedUserCount = targetedUsers.length;
    }

    const EmailCampaign = await getAdminEmailCampaign();

    const campaign = await EmailCampaign.create({
      campaignName,
      subject,
      htmlContent,
      plainTextContent,
      status,
      targetFilters: targetFilters || {},
      targetedUserCount,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      templateId,
      templateName,
      tags: tags || [],
      notes,
      createdBy: (session.user as any).id || session.user.email,
      createdByName: session.user.name || 'Admin',
      createdByEmail: session.user.email || '',
      sentCount: 0,
      deliveredCount: 0,
      openedCount: 0,
      clickedCount: 0,
      bouncedCount: 0,
      unsubscribedCount: 0,
    });

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
