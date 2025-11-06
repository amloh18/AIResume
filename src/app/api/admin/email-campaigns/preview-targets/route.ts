import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import type { MyJwtPayload } from '@/types/jwt-payload';
import { getTargetedUsers } from '@/lib/services/userSyncService';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Skip during build time
    if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
      return NextResponse.json(
        { success: false, error: 'Service unavailable during build' },
        { status: 503 }
      );
    }

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

    const body = await request.json();
    const { targetFilters, limit = 100 } = body;

    if (!targetFilters || typeof targetFilters !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid target filters provided' },
        { status: 400 }
      );
    }

    // Get all targeted users
    const allUsers = await getTargetedUsers(targetFilters);
    const totalCount = allUsers.length;

    // Get preview users (limited)
    const previewUsers = allUsers.slice(0, limit).map((user: any) => ({
      id: user._id?.toString() || user.mainUserId?.toString(),
      email: user.email,
      firstName: user.firstName || 'Unknown',
      lastName: user.lastName || 'User',
      currentPlanKey: user.currentPlanKey || 'free',
      registrationDate: user.registrationDate,
      lastActiveAt: user.lastActiveAt,
    }));

    return NextResponse.json({
      success: true,
      totalCount,
      previewCount: previewUsers.length,
      users: previewUsers,
    });

  } catch (error: any) {
    console.error('❌ Preview targets API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to preview targeted users',
        totalCount: 0,
        previewCount: 0,
        users: []
      },
      { status: 500 }
    );
  }
}

