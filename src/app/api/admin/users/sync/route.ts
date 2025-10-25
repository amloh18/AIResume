import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { syncUsersToAdmin } from '@/lib/services/userSyncService';

// POST - Trigger user sync from main DB to admin DB
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    console.log('🔄 Manual user sync triggered by admin:', session.user.email);

    const result = await syncUsersToAdmin();

    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'User sync failed', 
          details: result.errors.join(', ') 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User sync completed successfully',
      stats: {
        syncedCount: result.syncedCount,
        newUsers: result.newUsers,
        updatedUsers: result.updatedUsers,
        errors: result.errors.length,
      },
      errors: result.errors,
    });

  } catch (error: any) {
    console.error('❌ Sync users error:', error);
    return NextResponse.json(
      { error: 'Failed to sync users', details: error.message },
      { status: 500 }
    );
  }
}

// GET - Check sync status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const { getAdminUser } = await import('@/models/admin-models');
    const AdminUser = await getAdminUser();

    const stats = await AdminUser.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          byPlan: [
            {
              $group: {
                _id: '$currentPlanKey',
                count: { $sum: 1 }
              }
            }
          ],
          recentSync: [
            {
              $sort: { lastSyncedAt: -1 }
            },
            {
              $limit: 1
            },
            {
              $project: {
                lastSyncedAt: 1
              }
            }
          ]
        }
      }
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers: stats[0]?.total[0]?.count || 0,
        byPlan: stats[0]?.byPlan || [],
        lastSyncedAt: stats[0]?.recentSync[0]?.lastSyncedAt || null,
      },
    });

  } catch (error: any) {
    console.error('❌ Get sync status error:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status', details: error.message },
      { status: 500 }
    );
  }
}

