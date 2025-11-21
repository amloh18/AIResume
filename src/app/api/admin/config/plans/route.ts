import { NextRequest, NextResponse } from 'next/server';
import { getPlanConfig, getCampaignFilterPlans } from '@/lib/config/adminConfig';
import { requireAdmin } from '@/lib/middleware/admin-auth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication using NextAuth session
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const forCampaigns = searchParams.get('forCampaigns') === 'true';

    if (forCampaigns) {
      const plans = await getCampaignFilterPlans();
      return NextResponse.json({
        success: true,
        plans,
      });
    }

    const { plans, planDisplayNames } = await getPlanConfig();

    return NextResponse.json({
      success: true,
      plans,
      planDisplayNames,
    });

  } catch (error: any) {
    console.error('❌ Get plan config error:', error);
    
    // Handle authentication errors
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to get plan configuration',
        plans: [],
        planDisplayNames: {}
      },
      { status: 500 }
    );
  }
}

