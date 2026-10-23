import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/admin-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/campaigns/send
 *
 * Body: { campaignId: string, dryRun?: boolean }
 *
 * Delegates to the existing CampaignEmailService — the same code path the
 * /api/cron/process-campaigns job uses — so there is exactly one sender.
 * That service enforces the Hostinger daily send limit and content-size guard;
 * this route does not re-implement them.
 *
 * dryRun=true projects the recipient count without sending (safe preview).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin(request);

    const body = await request.json();
    const campaignId = body?.campaignId;
    const dryRun = !!body?.dryRun;

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId is required' }, { status: 400 });
    }

    const { getConnection } = await import('@/lib/database');
    await getConnection();

    const { default: campaignEmailService } = await import('@/lib/services/campaignEmailService');

    const adminUser = {
      id: (session.user as any)?.id,
      email: (session.user as any)?.email,
      name: (session.user as any)?.name,
    };

    const result = await campaignEmailService.sendCampaign(campaignId, dryRun, adminUser);

    console.log(
      `[Admin Campaigns] ${(session.user as any)?.email} ${dryRun ? 'dry-ran' : 'sent'} campaign ${campaignId}: ` +
        `${result.totalSent} sent, ${result.totalFailed} failed`
    );

    return NextResponse.json({ ...result, dryRun });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Admin permission required' }, { status: 403 });
    }
    console.error('[Admin Campaigns Send] Error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
