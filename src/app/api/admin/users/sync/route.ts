import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import type { MyJwtPayload } from '@/types/jwt-payload';
import { syncUsersToAdmin } from '@/lib/services/userSyncService';
import AdminUser from '@/models/admin/AdminUser';
import { getConnection } from '@/lib/database';

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

    // Check database connection
    try {
      await getConnection();
    } catch (dbError: any) {
      console.error('❌ Database connection error:', dbError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database connection failed',
          details: dbError.message 
        },
        { status: 500 }
      );
    }

    // Get sync status
    const totalUsers = await AdminUser.countDocuments();
    const lastSyncDate = await AdminUser.findOne()
      .sort({ lastSyncedAt: -1 })
      .select('lastSyncedAt')
      .lean();

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        lastSyncedAt: lastSyncDate?.lastSyncedAt || null,
      },
    });

  } catch (error: any) {
    console.error('❌ Get sync status error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to get sync status',
        totalUsers: 0,
        lastSyncedAt: null
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    // Check database connection before syncing
    try {
      await getConnection();
      console.log('✅ Database connection verified');
    } catch (dbError: any) {
      console.error('❌ Database connection error:', dbError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database connection failed. Please check your MongoDB connection.',
          details: dbError.message 
        },
        { status: 500 }
      );
    }

    // Perform user sync
    console.log('🔄 Starting user sync...');
    const syncResult = await syncUsersToAdmin();

    if (syncResult.success) {
      return NextResponse.json({
        success: true,
        stats: {
          syncedCount: syncResult.syncedCount,
          newUsers: syncResult.newUsers,
          updatedUsers: syncResult.updatedUsers,
          errors: syncResult.errors,
        },
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User sync failed',
          details: syncResult.errors.join(', ') || 'Unknown error',
          stats: {
            syncedCount: syncResult.syncedCount,
            newUsers: syncResult.newUsers,
            updatedUsers: syncResult.updatedUsers,
            errors: syncResult.errors,
          }
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('❌ User sync API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to sync users',
        details: error.stack || 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

