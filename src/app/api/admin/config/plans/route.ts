import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/admin-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    return NextResponse.json({
      success: true,
      plans: ['free', 'starter_monthly', 'starter_yearly', 'pro_monthly', 'pro_yearly'],
      planDisplayNames: {
        free: 'Free Tier',
        starter_monthly: 'Starter Monthly',
        starter_yearly: 'Starter Yearly',
        pro_monthly: 'Professional Monthly',
        pro_yearly: 'Professional Yearly'
      }
    });

  } catch (error: any) {
    console.error('❌ Get plans config error:', error);
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: error.message || 'Failed to get plans configuration' }, { status: 500 });
  }
}
