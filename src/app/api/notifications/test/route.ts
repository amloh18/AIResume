import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import notificationService from '@/lib/services/notificationService';
import { NotificationType } from '@/models/Notification';

export async function POST(request: NextRequest) {
  try {
    await getConnection();

    const body = await request.json();
    const { email, type, title, message } = body;

    // Find user by email
    const user = await User.findOne({ email: email || 'amlohsl@icloud.com' });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Create test notification
    const notification = await notificationService.createNotification({
      userId: user._id,
      type: (type as NotificationType) || 'system_update',
      title: title || 'Test Notification',
      message: message || 'This is a test notification to verify the notification system is working correctly.',
      interactive: true,
      actionType: 'review_job',
      actionData: {
        url: '/dashboard',
      },
      priority: 'medium',
      channels: ['in-app', 'email'],
      persistent: false,
      metadata: {
        test: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Test notification created successfully',
      notification: {
        id: notification._id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
      },
    });
  } catch (error: any) {
    console.error('Error creating test notification:', error);
    return NextResponse.json(
      { error: 'Failed to create test notification', message: error.message },
      { status: 500 }
    );
  }
}

