import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { User } from '@/models';

/**
 * POST /api/users/resolve
 * 
 * Resolves an authProviderId to a MongoDB ObjectId
 * Used by onboarding and other flows that need user resolution
 */
export async function POST(request: NextRequest) {
  try {
    await getConnection();
    
    const body = await request.json();
    const { authProviderId, authProvider = 'firebase' } = body;

    if (!authProviderId) {
      return NextResponse.json(
        { success: false, error: 'authProviderId is required' },
        { status: 400 }
      );
    }

    // Find user by authProviderId
    const user = await User.findOne({ 
      authProviderId,
      authProvider 
    }).lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found in database' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      mongoUserId: (user as any)._id,
      authProviderId: (user as any).authProviderId,
      authProvider: (user as any).authProvider
    });

  } catch (error: any) {
    console.error('User resolution API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
