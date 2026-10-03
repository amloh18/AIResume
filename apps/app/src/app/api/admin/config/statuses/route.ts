import { NextRequest, NextResponse } from 'next/server';
import { 
  SUBSCRIPTION_STATUSES, 
  USER_ROLES, 
  TEMPLATE_TIERS, 
  CAMPAIGN_STATUSES,
  PAYMENT_PROVIDERS,
  SUPPORTED_CURRENCIES
} from '@/lib/config/adminConstants';
import { requireAdmin } from '@/lib/middleware/admin-auth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication using NextAuth session
    await requireAdmin(request);

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
        error: error.message || 'Failed to get status configuration'
      },
      { status: 500 }
    );
  }
}

