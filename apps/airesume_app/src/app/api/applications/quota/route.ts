/**
 * API Route: /api/applications/quota
 *
 * Get the signed-in user's application quota status.
 *
 * ## What changed and why
 *
 * This route used to read `x-user-id` from a request header and, failing that, invent an identity:
 *
 *     let userId = headersList.get('x-user-id');
 *     if (!userId || userId === 'temp-user-id') {
 *       userId = 'demo-user-' + Date.now();
 *     }
 *
 * Two problems. A request header is not authentication — any signed-in caller could name any user and
 * read that user's quota. And the `demo-user-<timestamp>` fallback meant the endpoint silently reported
 * a *brand-new* identity's quota on every single call, so the numbers it returned were fiction rather
 * than anyone's real usage.
 *
 * It also answered `success: true` with hard-coded "50 / 100 / 500 remaining" whenever the quota service
 * threw, so a broken quota backend looked like a user with a full allowance.
 *
 * Identity now comes from the session, and a failure is reported as a failure.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import QuotaService from '@/lib/services/quota-service';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth?.userId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'User authentication required' } },
        { status: 401 }
      );
    }

    const userId = auth.userId;
    const planType = (auth.user as any)?.currentPlanKey || 'free';

    const quota = await QuotaService.getQuotaDisplay(userId, planType as any);
    const applicationQuota = await QuotaService.checkApplicationQuota(userId, planType as any);

    return NextResponse.json({
      success: true,
      hourly: {
        used: quota.hourly.used,
        limit: quota.hourly.limit,
        remaining: quota.hourly.remaining,
      },
      daily: {
        used: quota.daily.used,
        limit: quota.daily.limit,
        remaining: quota.daily.remaining,
      },
      monthly: {
        used: quota.monthly.used,
        limit: quota.monthly.limit,
        remaining: quota.monthly.remaining,
      },
      canApply: applicationQuota.allowed,
    });
  } catch (error: any) {
    /*
      Do NOT fall back to a hard-coded "full allowance". A quota read that failed is not evidence that
      the user has room to apply, and reporting it as such is how a limit gets silently bypassed.
    */
    console.error('[API] GET /api/applications/quota error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'QUOTA_UNAVAILABLE',
          message: 'Could not read your application quota. Please try again.',
        },
      },
      { status: 503 }
    );
  }
}
