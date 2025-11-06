import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import type { MyJwtPayload } from '@/types/jwt-payload';
import { getPlanConfig, getCampaignFilterPlans } from '@/lib/config/adminConfig';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication using cookie
    const cookieStore = await cookies();
    const adminToken = cookieStore.get('admin-token');

    if (!adminToken) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    try {
      jwt.verify(adminToken.value, process.env.NEXTAUTH_SECRET || 'fallback-secret') as MyJwtPayload;
    } catch (jwtError) {
      return NextResponse.json(
        { success: false, error: 'Invalid admin token' },
        { status: 401 }
      );
    }

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

