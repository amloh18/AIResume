import { NextRequest, NextResponse } from 'next/server';
import { JobPreferencesService } from '@/lib/services/jobPreferencesService';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } },
        { status: 401 }
      );
    }

    const preferences = await JobPreferencesService.getPreferences(userId);

    if (!preferences) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Preferences not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ preferences });
  } catch (error: any) {
    console.error('[API] GET /api/jobs/preferences error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to fetch preferences',
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
    const { titles, locations, country, remoteOnly, salaryMin } = body;

    const validation = JobPreferencesService.validatePreferences({
      titles,
      locations,
      country,
      remoteOnly,
      salaryMin,
    });

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid preferences',
            details: { errors: validation.errors },
          },
        },
        { status: 400 }
      );
    }

    const preferences = await JobPreferencesService.updatePreferences(userId, {
      titles,
      locations,
      country: 'UK',
      remoteOnly: remoteOnly ?? false,
      salaryMin,
    });

    return NextResponse.json({ preferences }, { status: 200 });
  } catch (error: any) {
    console.error('[API] POST /api/jobs/preferences error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to update preferences',
        },
      },
      { status: 500 }
    );
  }
}
