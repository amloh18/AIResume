import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import type { MyJwtPayload } from '@/types/jwt-payload';
import { ActivityLogService } from '@/lib/services/activityLogService';

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
    const timeRange = (searchParams.get('range') || '7d') as 'today' | '7d' | '30d' | '90d';

    const metrics = await ActivityLogService.getMetrics(timeRange);

    return NextResponse.json({
      success: true,
      metrics,
      timeRange
    });

  } catch (error: any) {
    console.error('❌ Get log metrics error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to get log metrics',
        metrics: null
      },
      { status: 500 }
    );
  }
}

