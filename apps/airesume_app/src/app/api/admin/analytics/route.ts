import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/admin-auth';
import { getAdminOverview, getAdminRecentActivity } from '@/lib/services/adminStatsService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/analytics
 *
 * One combined dashboard payload (revenue, users, product usage, AI usage,
 * email) plus recent signups/payments. Served from adminStatsService so every
 * admin surface reads the same aggregates.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const [overview, recent] = await Promise.all([
      getAdminOverview(),
      getAdminRecentActivity(),
    ]);

    return NextResponse.json({ success: true, ...overview, ...recent });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Admin permission required' }, { status: 403 });
    }
    console.error('[Admin Analytics] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
