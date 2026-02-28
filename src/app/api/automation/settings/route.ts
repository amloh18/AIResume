import { NextRequest, NextResponse } from 'next/server';
import { AutomationService } from '@/lib/services/automationService';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } },
        { status: 401 }
      );
    }

    const settings = await AutomationService.getAutomationSettings(userId);

    if (!settings) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Settings not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error('[API] GET /api/automation/settings error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to fetch settings',
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { enabled, mode, dailyLimit, applyWindow, blockedCompanies } = body;

    const settings = await AutomationService.updateAutomationSettings(userId, {
      enabled,
      mode,
      dailyLimit,
      applyWindow,
      blockedCompanies,
    });

    return NextResponse.json({ settings }, { status: 200 });
  } catch (error: any) {
    console.error('[API] POST /api/automation/settings error:', error);
    
    if (error.message.includes('not available on your plan')) {
      return NextResponse.json(
        {
          error: {
            code: 'TIER_INSUFFICIENT',
            message: error.message,
          },
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to update settings',
        },
      },
      { status: 500 }
    );
  }
}
