import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import Notification from '@/models/Notification';
import { getAuthenticatedUser } from '@/lib/auth-helpers';

export async function PUT(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getConnection();

    const userId = authResult.userId;
    await Notification.updateMany(
      { userId, read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    return NextResponse.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark all as read', message: error.message },
      { status: 500 }
    );
  }
}

