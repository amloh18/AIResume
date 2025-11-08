import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import Notification from '@/models/Notification';
import { getAuthenticatedUser } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getConnection();

    const userId = authResult.userId;
    const { searchParams } = new URL(request.url);
    const read = searchParams.get('read');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    const query: any = { userId };
    if (read !== null) {
      query.read = read === 'true';
    }
    if (type) {
      query.type = type;
    }

    // Filter expired time-sensitive notifications
    const now = new Date();
    query.$or = [
      { persistent: true }, // Persistent notifications never expire
      { expiresAt: { $gt: now } }, // Time-sensitive that haven't expired
      { expiresAt: { $exists: false } }, // No expiry set
    ];

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .lean();

    const total = await Notification.countDocuments(query);

    return NextResponse.json({
      success: true,
      notifications,
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if user is admin (for creating notifications)
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Add admin check here if needed

    await getConnection();

    const body = await request.json();
    const notificationService = (await import('@/lib/services/notificationService')).default;

    const notification = await notificationService.createNotification(body);

    return NextResponse.json({
      success: true,
      notification,
    });
  } catch (error: any) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification', message: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getConnection();

    const body = await request.json();
    const { action, notificationIds } = body;

    if (action === 'mark-all-read') {
      const userId = authResult.userId;
      await Notification.updateMany(
        { userId, read: false },
        { $set: { read: true, readAt: new Date() } }
      );

      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read',
      });
    }

    if (action === 'mark-read' && notificationIds && Array.isArray(notificationIds)) {
      await Notification.updateMany(
        { _id: { $in: notificationIds }, userId: authResult.userId },
        { $set: { read: true, readAt: new Date() } }
      );

      return NextResponse.json({
        success: true,
        message: 'Notifications marked as read',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error updating notifications:', error);
    return NextResponse.json(
      { error: 'Failed to update notifications', message: error.message },
      { status: 500 }
    );
  }
}

