import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
// Removed - using Clerk now
import connectDB from '@/lib/database';
import User from '@/models/User';

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const { monthlyGoal } = await request.json();

    if (typeof monthlyGoal !== 'number' || monthlyGoal < 1 || monthlyGoal > 100) {
      return NextResponse.json(
        { success: false, error: 'Monthly goal must be a number between 1 and 100' },
        { status: 400 }
      );
    }

    const user = await User.findOneAndUpdate(
      { email: session.user.email },
      { monthlyGoal },
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        monthlyGoal: user.monthlyGoal
      }
    });

  } catch (error: any) {
    console.error('Error updating monthly goal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update monthly goal' },
      { status: 500 }
    );
  }
}
