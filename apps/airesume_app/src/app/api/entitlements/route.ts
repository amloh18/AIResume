import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { EntitlementService } from '@/lib/services/entitlement-service';

/**
 * GET /api/entitlements
 * Returns canonical user entitlements, live usage, period limits, and reset dates
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const entitlements = await EntitlementService.getUserEntitlements(auth.userId);

    return NextResponse.json({
      success: true,
      entitlements,
    });
  } catch (error: any) {
    console.error('[API] GET /api/entitlements error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to resolve entitlements' },
      { status: 500 }
    );
  }
}
