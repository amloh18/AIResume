import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/admin-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Admin email campaign management.
 *
 * GET  /api/admin/campaigns            → paginated campaign list
 * POST /api/admin/campaigns            → create a draft/scheduled campaign
 *
 * Sending reuses the existing CampaignEmailService (same code path the cron
 * uses) — see /api/admin/campaigns/send. Targeting reuses
 * userSyncService.getTargetedUsers — see /api/admin/campaigns/preview.
 */

async function loadModels() {
  const { getConnection } = await import('@/lib/database');
  await getConnection();
  const { EmailCampaign } = await import('@/models');
  return EmailCampaign;
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const EmailCampaign = await loadModels();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const limit = Math.min(100, Number(searchParams.get('limit')) || 20);
    const status = searchParams.get('status');

    const filter: Record<string, unknown> = {};
    if (status && status !== 'all') filter.status = status;

    const [items, total] = await Promise.all([
      EmailCampaign.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select(
          'campaignName subject status targetFilters targetedUserCount sentCount deliveredCount openedCount clickedCount bouncedCount unsubscribedCount scheduledAt sentAt isRecurring recurringFrequency fromName fromEmail replyTo createdByEmail createdAt updatedAt'
        )
        .lean(),
      EmailCampaign.countDocuments(filter),
    ]);

    return NextResponse.json({ success: true, items, total, page, limit, pages: Math.ceil(total / limit) || 1 });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Admin permission required' }, { status: 403 });
    }
    console.error('[Admin Campaigns GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin(request);
    const EmailCampaign = await loadModels();

    const body = await request.json();
    const { campaignName, subject, htmlContent, plainTextContent, targetFilters, scheduledAt, fromName, fromEmail, replyTo, status, isRecurring, recurringFrequency, endDate, campaignGoal, tags, notes } = body || {};

    if (!campaignName || !subject || !htmlContent) {
      return NextResponse.json({ error: 'campaignName, subject and htmlContent are required' }, { status: 400 });
    }
    if (isRecurring && !recurringFrequency) {
      return NextResponse.json({ error: 'recurringFrequency is required for recurring campaigns' }, { status: 400 });
    }

    const user = session.user as any;
    const campaign = await EmailCampaign.create({
      campaignName,
      subject,
      htmlContent,
      plainTextContent,
      targetFilters: targetFilters || {},
      status: status === 'scheduled' && !scheduledAt ? 'draft' : status || 'draft',
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      fromName,
      fromEmail,
      replyTo,
      isRecurring: !!isRecurring,
      recurringFrequency: isRecurring ? recurringFrequency : undefined,
      nextRunAt: isRecurring ? new Date() : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      campaignGoal,
      tags,
      notes,
      createdBy: user?.id,
      createdByName: user?.name || user?.email || 'Admin',
      createdByEmail: user?.email || 'admin',
    });

    console.log(`[Admin Campaigns] ${user?.email} created campaign ${campaign._id} (${campaignName})`);
    return NextResponse.json({ success: true, campaign }, { status: 201 });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Admin permission required' }, { status: 403 });
    }
    console.error('[Admin Campaigns POST] Error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
