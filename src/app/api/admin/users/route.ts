import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
import { User } from '@/models';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const users = await User.find({})
      .select('firstName lastName email role currentPlanKey subscription createdAt phone location website linkedin github summary settings lastLogin region')
      .lean();

    // Transform the data to match the expected format
    const transformedUsers = users.map(user => ({
      _id: user._id,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email,
      role: user.role || 'user',
      currentPlanKey: user.currentPlanKey || 'free',
      subscription: {
        status: user.subscription?.status || 'inactive',
        provider: user.subscription?.provider || 'stripe',
        currentPeriodEnd: user.subscription?.currentPeriodEnd,
        interval: user.subscription?.interval || 'monthly'
      },
      createdAt: user.createdAt,
      // Profile information
      phone: user.phone || '',
      location: user.location || '',
      website: user.website || '',
      linkedin: user.linkedin || '',
      github: user.github || '',
      summary: user.summary || '',
      // Settings information
      company: user.settings?.company || '',
      timezone: user.settings?.timezone || 'UTC +07:00 - Asia / Jakarta',
      languagePreference: user.settings?.languagePreference || 'English',
      // Admin tracking fields
      lastLogin: user.lastLogin,
      region: user.region || 'Unknown'
    }));

    return NextResponse.json({ users: transformedUsers });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 