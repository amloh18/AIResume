import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
// Removed - using Clerk now
import usageLimitsService from '@/lib/services/usageLimitsService';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user ID from session
    const userId = session.user.id;
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    // Get user usage information
    const usage = await usageLimitsService.getUserUsage(userId);
    if (!usage) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      usage
    });

  } catch (error) {
    console.error('Error fetching user usage limits:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    const body = await request.json();
    const { action, deviceFingerprint } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    // Check usage limit
    const usageCheck = await usageLimitsService.checkUsageLimit({
      userId,
      action,
      deviceFingerprint
    });

    return NextResponse.json({
      success: true,
      allowed: usageCheck.allowed,
      reason: usageCheck.reason,
      currentUsage: usageCheck.currentUsage,
      limit: usageCheck.limit,
      resetTime: usageCheck.resetTime
    });

  } catch (error) {
    console.error('Error checking usage limit:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}