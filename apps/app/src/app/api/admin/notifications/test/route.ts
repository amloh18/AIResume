import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth';
import { getConnection } from '@/lib/database';
import notificationService from '@/lib/services/notificationService';

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    await getConnection();
    const body = await request.json();
    const userId = body.userId;
    
    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 });
    }

    const type = body.type || 'system_update';
    const title = body.title || 'Test Notification';
    const message = body.message || 'This is a test notification from the admin panel.';
    const channels = body.channels || ['in-app'];

    await notificationService.createNotification({
      userId,
      type,
      title,
      message,
      channels,
      priority: 'medium',
      interactive: true,
      actionType: 'view_test',
    });

    return NextResponse.json({
      success: true,
      message: 'Test notification triggered successfully',
      details: { userId, type, title, message, channels }
    });
  } catch (error: any) {
    console.error('Error triggering test notification:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
});
