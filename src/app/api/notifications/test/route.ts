import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import notificationService from '@/lib/services/notificationService';
import { NotificationType } from '@/models/Notification';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await getConnection();

    const body = await request.json();
    const { email, userId, type, title, message } = body;

    // Try to get user by userId first, then email, then authenticated session
    let user;
    
    if (userId) {
      // Use provided userId
      user = await User.findById(userId);
      console.log('🆔 Using provided userId:', userId);
    } else {
      const session = await getServerSession(authOptions);
      
      if (session?.user?.email) {
        // Use authenticated user
        user = await User.findOne({ email: session.user.email });
        console.log('📧 Using authenticated user:', session.user.email);
      } else if (email) {
        // Fallback to provided email
        user = await User.findOne({ email });
        console.log('📧 Using provided email:', email);
      } else {
        // Default fallback
        user = await User.findOne({ email: 'amlohsl@icloud.com' });
        console.log('📧 Using default email: amlohsl@icloud.com');
      }
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    console.log('👤 Sending notification to user:', user._id.toString(), user.email);

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
      channels: ['in-app'], // Only in-app for toast notifications
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

