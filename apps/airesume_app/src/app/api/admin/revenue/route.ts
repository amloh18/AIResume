import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/admin-auth';
import { getRevenueStats, getInvoicesPage } from '@/lib/services/adminStatsService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/revenue
 *
 * Revenue detail for the admin revenue page: totals/MRR/series plus a
 * paginated invoice list.
 *
 * Query params:
 *   ?page=1&limit=20&status=paid&search=INV-123
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search') || '';

    const [revenue, invoices] = await Promise.all([
      getRevenueStats(),
      getInvoicesPage({ page, limit, status, search }),
    ]);

    return NextResponse.json({ success: true, revenue, invoices });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Admin permission required' }, { status: 403 });
    }
    console.error('[Admin Revenue] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
