import { NextRequest, NextResponse } from 'next/server';
import { ActivityLogService } from '@/lib/services/activityLogService';
import { LogType, LogStatus } from '@/models/ActivityLog';
import { requireAdmin } from '@/lib/middleware/admin-auth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication using NextAuth session
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    
    const logType = searchParams.get('logType') as LogType | null;
    const userId = searchParams.get('userId') || undefined;
    const userEmail = searchParams.get('userEmail') || undefined;
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
    const status = searchParams.get('status') as LogStatus | null;
    const action = searchParams.get('action') || undefined;
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = parseInt(searchParams.get('skip') || '0');

    const result = await ActivityLogService.getLogs({
      logType: logType || undefined,
      userId,
      userEmail,
      startDate,
      endDate,
      status: status || undefined,
      action,
      limit,
      skip
    });

    return NextResponse.json({
      success: true,
      logs: result.logs,
      total: result.total,
      limit,
      skip
    });

  } catch (error: any) {
    console.error('❌ Get logs error:', error);
    
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
        error: error.message || 'Failed to get logs',
        logs: [],
        total: 0
      },
      { status: 500 }
    );
  }
}

