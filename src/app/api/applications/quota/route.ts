/**
 * API Route: /api/applications/quota
 * 
 * Get user's application quota status
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import QuotaService from '@/lib/services/quota-service';

export async function GET(request: NextRequest) {
  try {
    // Get user ID from headers (fallback for demo)
    const headersList = await headers();
    let userId = headersList.get('x-user-id');
    
    // If no user ID, use a temp one for demo
    if (!userId || userId === 'temp-user-id') {
      userId = 'demo-user-' + Date.now();
    }
    
    // Get user's plan type (would come from user data in production)
    const planType = 'free';

    // Get quota display data
    let quota;
    try {
      quota = await QuotaService.getQuotaDisplay(userId, planType as any);
    } catch (error) {
      // Fallback if quota service fails
      quota = {
        hourly: { used: 0, limit: 50, remaining: 50 },
        daily: { used: 0, limit: 100, remaining: 100 },
        monthly: { used: 0, limit: 500, remaining: 500 },
      };
    }

    // Also check current application quota
    let applicationQuota = { allowed: true };
    try {
      applicationQuota = await QuotaService.checkApplicationQuota(userId, planType as any);
    } catch {
      applicationQuota = { allowed: true };
    }

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
    console.error('Error in applications/quota API:', error);

    // Return default quota on error
    return NextResponse.json({
      success: true,
      hourly: { used: 0, limit: 50, remaining: 50 },
      daily: { used: 0, limit: 100, remaining: 100 },
      monthly: { used: 0, limit: 500, remaining: 500 },
      canApply: true,
    });
  }
}
