import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getTargetedUsers } from '@/lib/services/userSyncService';

// POST - Preview targeted users for campaign
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { targetFilters, limit = 100 } = body;

    if (!targetFilters) {
      return NextResponse.json(
        { error: 'Target filters are required' },
        { status: 400 }
      );
    }

    const targetedUsers = await getTargetedUsers(targetFilters);
    const totalCount = targetedUsers.length;
    const preview = targetedUsers.slice(0, limit);

    return NextResponse.json({
      success: true,
      totalCount,
      previewCount: preview.length,
      users: preview.map(user => ({
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        currentPlanKey: user.currentPlanKey,
        registrationDate: user.registrationDate,
        lastActiveAt: user.lastActiveAt,
      })),
    });

  } catch (error: any) {
    console.error('❌ Preview targets error:', error);
    return NextResponse.json(
      { error: 'Failed to preview targets', details: error.message },
      { status: 500 }
    );
  }
}

