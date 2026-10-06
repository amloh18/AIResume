import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import Notification from '@/models/Notification';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { JobApplication } from '@/models';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getConnection();

    const { id } = await params;
    const notification = await Notification.findOne({
      _id: id,
      userId: authResult.userId,
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    const body = await request.json();
    const { actionType } = body;

    // Handle different action types
    let message = 'Action completed';

    if (actionType === 'move_to_next_stage' && notification.actionData?.jobId) {
      // Move job to next stage
      const job = await JobApplication.findById(notification.actionData.jobId);
      if (job) {
        const statusFlow = ['created', 'applied', 'screening', 'interview', 'offer', 'accepted'];
        const currentIndex = statusFlow.indexOf(job.status);
        if (currentIndex < statusFlow.length - 1) {
          job.status = statusFlow[currentIndex + 1] as any;
          await job.save();
          message = `Job moved to ${job.status} stage`;
        }
      }
    } else if (actionType === 'review_job' && notification.actionData?.jobId) {
      // Just mark as reviewed - redirect will happen on frontend
      message = 'Redirecting to job details';
    }

    // Mark notification as read
    notification.read = true;
    notification.readAt = new Date();
    await notification.save();

    return NextResponse.json({
      success: true,
      message,
      redirectUrl: notification.actionData?.url,
    });
  } catch (error: any) {
    console.error('Error handling notification action:', error);
    return NextResponse.json(
      { error: 'Failed to handle action', message: error.message },
      { status: 500 }
    );
  }
}

