import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/admin-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Admin campaign detail: GET (full doc incl. content), PUT (update), DELETE.
 *
 * Guardrail: a campaign that has started sending cannot be edited or deleted
 * — mutating a live send would corrupt its stats and could double-send.
 */

async function loadModels() {
  const { getConnection } = await import('@/lib/database');
  await getConnection();
  const { EmailCampaign } = await import('@/models');
  return EmailCampaign;
}

const EDITABLE_FIELDS = [
  'campaignName',
  'subject',
  'htmlContent',
  'plainTextContent',
  'targetFilters',
  'scheduledAt',
  'fromName',
  'fromEmail',
  'replyTo',
  'campaignGoal',
  'tags',
  'notes',
  'recurringFrequency',
  'endDate',
] as const;

const MUTABLE_STATUSES = ['draft', 'scheduled', 'cancelled'];

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(request);
    const EmailCampaign = await loadModels();
    const { id } = await params;

    const campaign = await EmailCampaign.findById(id).lean();
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, campaign });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Admin permission required' }, { status: 403 });
    }
    console.error('[Admin Campaign GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAdmin(request);
    const EmailCampaign = await loadModels();
    const { id } = await params;

    const campaign = await EmailCampaign.findById(id);
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    if (!MUTABLE_STATUSES.includes(campaign.status)) {
      return NextResponse.json(
        { error: `Campaign is "${campaign.status}" and can no longer be edited. Duplicate it to make changes.` },
        { status: 409 }
      );
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    for (const field of EDITABLE_FIELDS) {
      if (body[field] !== undefined) updates[field] = body[field];
    }
    // Status transitions: allow draft ↔ scheduled and cancel; never un-send.
    if (body.status && ['draft', 'scheduled', 'cancelled'].includes(body.status)) {
      if (body.status === 'scheduled' && !body.scheduledAt && !campaign.scheduledAt) {
        return NextResponse.json({ error: 'scheduledAt is required to schedule a campaign' }, { status: 400 });
      }
      updates.status = body.status;
      if (body.status === 'scheduled' && body.scheduledAt) {
        updates.scheduledAt = new Date(body.scheduledAt);
      }
    }

    Object.assign(campaign, updates);
    await campaign.save();

    console.log(`[Admin Campaigns] ${(session.user as any)?.email} updated campaign ${id}`);
    return NextResponse.json({ success: true, campaign });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Admin permission required' }, { status: 403 });
    }
    console.error('[Admin Campaign PUT] Error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAdmin(request);
    const EmailCampaign = await loadModels();
    const { id } = await params;

    const campaign = await EmailCampaign.findById(id);
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    if (campaign.status === 'sending' || campaign.status === 'sent') {
      return NextResponse.json(
        { error: `Cannot delete a campaign that is ${campaign.status}. Its delivery stats are kept for reporting.` },
        { status: 409 }
      );
    }

    await campaign.deleteOne();
    console.log(`[Admin Campaigns] ${(session.user as any)?.email} deleted campaign ${id}`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Admin permission required' }, { status: 403 });
    }
    console.error('[Admin Campaign DELETE] Error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
