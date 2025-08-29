import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
import { User } from '@/models';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    // Find user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Return notification preferences
    const notificationPreferences = {
      email: {
        productUpdates: user.settings?.notifications?.email ?? true,
        billing: true, // Default values for now
        referrals: false,
      },
      inApp: {
        productUpdates: user.settings?.notifications?.push ?? true,
        billing: false,
        referrals: true,
      },
      frequency: 'daily' as const,
    };

    return NextResponse.json({
      success: true,
      preferences: notificationPreferences
    });

  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    const body = await request.json();
    const { email, inApp, frequency } = body;

    // Find user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Update notification settings
    if (!user.settings) user.settings = {};
    if (!user.settings.notifications) user.settings.notifications = {};

    if (email !== undefined) {
      user.settings.notifications.email = email.productUpdates;
    }
    if (inApp !== undefined) {
      user.settings.notifications.push = inApp.productUpdates;
    }

    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Notification preferences updated successfully'
    });

  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
