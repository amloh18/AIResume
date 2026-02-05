import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { NotificationTriggers } from '@/lib/notifications/triggers';

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, variables = {} } = body;

    if (!type) {
      return NextResponse.json({ error: 'Notification type is required' }, { status: 400 });
    }

    const userId = authResult.userId;

    switch (type) {
      case 'application_stage':
        await NotificationTriggers.applicationStage(
          userId,
          variables.fromStage || 'draft',
          variables.toStage || 'applied',
          {
            role: variables.role || 'Software Engineer',
            company: variables.company || 'Example Corp',
          }
        );
        break;

      case 'ats_score_generated':
        await NotificationTriggers.atsScore(
          userId,
          'SCORE_GENERATED',
          {
            role: variables.role || 'Software Engineer',
            company: variables.company || 'Example Corp',
            score: variables.score || 75,
          }
        );
        break;

      default:
        return NextResponse.json({ error: 'Unknown notification type' }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Notification created successfully'
    });

  } catch (error) {
    console.error('Error creating test notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}
