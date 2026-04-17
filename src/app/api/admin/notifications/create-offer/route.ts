import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import notificationService from '@/lib/services/notificationService';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getConnection();

    const body = await request.json();
    const {
      code,
      discountType,
      value,
      expiryDate,
      targetAudience,
      planFilter,
      title,
      message,
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

    const users = await User.find(userQuery).select('_id').lean();

    // Create discount offer notification for each user
    let enqueued = 0;
    for (const user of users) {
      await notificationService.enqueueNotificationTask({
        taskType: 'discount_offer',
        payload: {
          userId: user._id.toString(),
          notificationType: 'discount_offer',
          title: title || `Special Offer: ${discountType === 'percentage' ? `${value}%` : `$${value}`} Off!`,
          message: message || `Use code ${code} to get ${discountType === 'percentage' ? `${value}%` : `$${value}`} off!`,
          actionType: 'view_offer',
          actionData: {
            url: `/dashboard/settings?tab=subscription&code=${code}`,
          },
          interactive: true,
          priority: 'high',
          channels: ['in-app', 'email'],
          persistent: false,
          expiresAt: expiryDate ? new Date(expiryDate) : undefined,
          metadata: {
            discountCode: code,
            discountType,
            discountValue: value,
            expiryDate,
          },
        },
        priority: 'high',
      });
      enqueued++;
    }

    return NextResponse.json({
      success: true,
      message: `Discount offer created and sent to ${enqueued} users`,
      enqueued,
    });
  } catch (error: any) {
    console.error('Error creating discount offer:', error);
    return NextResponse.json(
      { error: 'Failed to create offer', message: error.message },
      { status: 500 }
    );
  }
}

