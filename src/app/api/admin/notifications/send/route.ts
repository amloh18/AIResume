// @ts-nocheck
import { NextRequest } from 'next/server';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import notificationService from '@/lib/services/notificationService';
import { NotificationType } from '@/models/Notification';
import { withAdminAuth } from '@/lib/middleware/admin-auth';
import { withValidation, successResponse } from '@/lib/validation/api-validator';
import { z } from 'zod';

const sendNotificationSchema = z.object({
  type: z.string().min(1, 'Notification type is required'),
  title: z.string().min(1, 'Title is required').max(200),
  message: z.string().min(1, 'Message is required').max(1000),
  targetAudience: z.enum(['all', 'free', 'paid', 'new']).optional(),
  planFilter: z.string().optional(),
  channels: z.array(z.string()).optional().default(['in-app']),
  persistent: z.boolean().optional().default(false),
  expiresAt: z.string().datetime().optional(),
});

/**
 * POST /api/admin/notifications/send
 * Send notifications to users (admin only)
 */
export const POST = withAdminAuth(
  withValidation(sendNotificationSchema, async (request, validatedData) => {
    await getConnection();

    const {
      type,
      title,
      message,
      targetAudience,
      planFilter,
      channels,
      persistent,
      expiresAt,
    } = validatedData;

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

    // Enqueue notification for each user
    let enqueued = 0;
    for (const user of users) {
      await notificationService.enqueueNotificationTask({
        taskType: type as NotificationType,
        payload: {
          userId: user._id.toString(),
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

    return successResponse({
      message: `Notification enqueued for ${enqueued} users`,
      enqueued,
    });
  }) as (request: NextRequest) => Promise<NextResponse>
);
