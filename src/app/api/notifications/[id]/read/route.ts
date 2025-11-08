import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import Notification from '@/models/Notification';
import { getAuthenticatedUser } from '@/lib/auth-helpers';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getConnection();

    const notification = await Notification.findOne({
      _id: params.id,
      userId: authResult.userId,
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    notification.read = true;
    notification.readAt = new Date();
    await notification.save();

    return NextResponse.json({
      success: true,
      notification,
    });
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark notification as read', message: error.message },
      { status: 500 }
    );
  }
}

