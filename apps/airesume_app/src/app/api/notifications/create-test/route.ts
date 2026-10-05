import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import notificationService from '@/lib/services/notificationService';
import { NotificationType, NotificationPriority } from '@/models/Notification';
import User from '@/models/User';

/**
 * POST /api/notifications/create-test
 * Create a test notification for a specific user (for testing purposes)
 * Requires authentication
 */
export async function POST(request: NextRequest) {
  try {
    await getConnection();

    // Check authentication
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      userId,
      type,
      title,
      message,
      priority = 'medium',
      actionType,
      actionData,
      interactive = false,
      channels = ['in-app'],
      persistent = false,
    } = body;

    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: userId, type, title, message' },
        { status: 400 }
      );
    }

    // Verify user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Create notification
    const notification = await notificationService.createNotification({
      userId,
      type: type as NotificationType,
      title,
      message,
      priority: priority as NotificationPriority,
      actionType,
      actionData,
      interactive,
      channels: channels as any,
      persistent,
    });

    return NextResponse.json({
      success: true,
      notification: {
        id: notification._id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
      },
      message: 'Test notification created successfully',
    });
  } catch (error: any) {
    console.error('Error creating test notification:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create notification' },
      { status: 500 }
    );
  }
}

