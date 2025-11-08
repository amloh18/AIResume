import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/database';
import User from '@/models/User';
import creditService from '@/lib/services/creditService';

/**
 * Initialize credits for current user (for testing)
 * GET /api/test/credits/init
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = user._id.toString();
    const planKey = user.currentPlanKey || 'free';

    // Get current status
    const beforeStatus = await creditService.getCreditStatus(userId);

    // Initialize credits
    const initResult = await creditService.initializeCredits(userId, planKey);

    // Get status after initialization
    const afterStatus = await creditService.getCreditStatus(userId);

    return NextResponse.json({
      success: initResult,
      message: 'Credits initialized',
      plan: planKey,
      before: beforeStatus,
      after: afterStatus
    });

  } catch (error: any) {
    console.error('Credit initialization error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Initialization failed',
        message: error.message
      },
      { status: 500 }
    );
  }
}

