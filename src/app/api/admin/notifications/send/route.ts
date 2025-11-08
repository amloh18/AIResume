import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import notificationService from '@/lib/services/notificationService';
import { NotificationType, NotificationChannel } from '@/models/Notification';

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Add admin role check here

    await getConnection();

    const body = await request.json();
    const {
      type,
      title,
      message,
      targetAudience,
      planFilter,
      channels,
      persistent,
      expiresAt,
    } = body;

    // Determine target users
    let userQuery: any = {};
    if (targetAudience === 'free') {
      userQuery.currentPlanKey = 'free';
    } else if (targetAudience === 'paid') {
      userQuery.currentPlanKey = { $ne: 'free' };
    } else if (targetAudience === 'new') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      userQuery.createdAt = { $gte: thirtyDaysAgo };
    }

    if (planFilter) {
      userQuery.currentPlanKey = planFilter;
    }

    const users = await User.find(userQuery).select('_id firebaseUid');

    // Enqueue notification for each user
    let enqueued = 0;
    for (const user of users) {
      await notificationService.enqueueNotificationTask({
        taskType: type as NotificationType,
        payload: {
          userId: user._id.toString(),
          firebaseUid: user.firebaseUid,
          notificationType: type,
          title,
          message,
          channels: channels || ['in-app'],
          persistent: persistent || false,
          expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        },
        priority: 'medium',
      });
      enqueued++;
    }

    return NextResponse.json({
      success: true,
      message: `Notification enqueued for ${enqueued} users`,
      enqueued,
    });
  } catch (error: any) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification', message: error.message },
      { status: 500 }
    );
  }
}

