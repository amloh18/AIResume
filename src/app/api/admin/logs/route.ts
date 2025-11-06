import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import type { MyJwtPayload } from '@/types/jwt-payload';
import { ActivityLogService } from '@/lib/services/activityLogService';
import { LogType, LogStatus } from '@/models/ActivityLog';

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
    
    const logType = searchParams.get('logType') as LogType | null;
    const userId = searchParams.get('userId') || undefined;
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
    const status = searchParams.get('status') as LogStatus | null;
    const action = searchParams.get('action') || undefined;
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = parseInt(searchParams.get('skip') || '0');

    const result = await ActivityLogService.getLogs({
      logType: logType || undefined,
      userId,
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

