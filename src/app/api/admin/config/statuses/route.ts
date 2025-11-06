import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import type { MyJwtPayload } from '@/types/jwt-payload';
import { 
  SUBSCRIPTION_STATUSES, 
  USER_ROLES, 
  TEMPLATE_TIERS, 
  CAMPAIGN_STATUSES,
  PAYMENT_PROVIDERS,
  SUPPORTED_CURRENCIES
} from '@/lib/config/adminConfig';

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

    return NextResponse.json({
      success: true,
      subscriptionStatuses: SUBSCRIPTION_STATUSES,
      userRoles: USER_ROLES,
      templateTiers: TEMPLATE_TIERS,
      campaignStatuses: CAMPAIGN_STATUSES,
      paymentProviders: PAYMENT_PROVIDERS,
      currencies: SUPPORTED_CURRENCIES,
    });

  } catch (error: any) {
    console.error('❌ Get status config error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to get status configuration'
      },
      { status: 500 }
    );
  }
}

