// @ts-nocheck
import { NextRequest } from 'next/server';
import { getConnection } from '@/lib/database';
import Notification from '@/models/Notification';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { withAdminAuth } from '@/lib/middleware/admin-auth';
import { withErrorHandling, successResponse, errorResponse } from '@/lib/validation/api-validator';
import { withValidation } from '@/lib/validation/api-validator';
import { createNotificationSchema } from '@/lib/validation/schemas';
import { z } from 'zod';

const updateNotificationSchema = z.object({
  action: z.enum(['mark-all-read', 'mark-read']),
  notificationIds: z.array(z.string()).optional(),
});

export const GET = withErrorHandling(async (request: NextRequest) => {
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
    return errorResponse('UNAUTHORIZED', 'Authentication required', undefined, 401);
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

  return successResponse({
      notifications,
      total,
      limit,
      offset,
    });
});

/**
 * POST /api/notifications
 * Create a notification (admin only)
 */
export const POST = withAdminAuth(
  withValidation(createNotificationSchema, async (request, validatedData) => {
    await getConnection();

    const notificationService = (await import('@/lib/services/notificationService')).default;
    const notification = await notificationService.createNotification(validatedData);

    return successResponse({ notification });
  }) as (request: NextRequest) => Promise<NextResponse>
);

/**
 * PUT /api/notifications
 * Update notifications (mark as read)
 */
export const PUT = withErrorHandling(
  withValidation(updateNotificationSchema, async (request, validatedData) => {
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', undefined, 401);
    }

    await getConnection();

    const { action, notificationIds } = validatedData;

    if (action === 'mark-all-read') {
      const userId = authResult.userId;
      await Notification.updateMany(
        { userId, read: false },
        { $set: { read: true, readAt: new Date() } }
      );

      return successResponse({ message: 'All notifications marked as read' });
    }

    if (action === 'mark-read' && notificationIds && Array.isArray(notificationIds)) {
      await Notification.updateMany(
        { _id: { $in: notificationIds }, userId: authResult.userId },
        { $set: { read: true, readAt: new Date() } }
      );

      return successResponse({ message: 'Notifications marked as read' });
    }

    return errorResponse('VALIDATION_ERROR', 'Invalid action', undefined, 400);
  })
);

