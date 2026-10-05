import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import CV from '@/models/CV';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await getConnection();

    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = authResult.userId;

    // Count user's CVs
    const cvCount = await CV.countDocuments({
      userId: new mongoose.Types.ObjectId(userId)
    });

    const isFirstCV = cvCount === 0;

    return NextResponse.json({
      success: true,
      isFirstCV,
      cvCount
    });

  } catch (error: any) {
    console.error('❌ Check first CV error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check CV count' },
      { status: 500 }
    );
  }
}

