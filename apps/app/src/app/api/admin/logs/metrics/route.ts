import { NextRequest, NextResponse } from 'next/server';
import { ActivityLogService } from '@/lib/services/activityLogService';
import { requireAdmin } from '@/lib/middleware/admin-auth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication using NextAuth session
    await requireAdmin(request);

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
        error: error.message || 'Failed to get log metrics',
        metrics: null
      },
      { status: 500 }
    );
  }
}

