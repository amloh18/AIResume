import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/admin-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/campaigns/preview
 *
 * Body: { targetFilters: {...} } — the same filter shape EmailCampaign stores.
 *
 * Projects how many users a campaign would reach, using the existing
 * userSyncService.getTargetedUsers (the same resolver the sender uses), so
 * the preview count matches what a real send would deliver to.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const targetFilters = body?.targetFilters || {};

    const { getTargetedUsers } = await import('@/lib/services/userSyncService');
    const users = await getTargetedUsers(targetFilters);

    // Do not echo full user records — just the count and a small sample.
    const sample = users.slice(0, 5).map((u: any) => ({
      email: u.email,
      plan: u.currentPlanKey || u.subscription?.planKey || 'free',
    }));

    return NextResponse.json({ success: true, count: users.length, sample });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Admin permission required' }, { status: 403 });
    }
    console.error('[Admin Campaigns Preview] Error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
