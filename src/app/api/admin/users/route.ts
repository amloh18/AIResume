import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/database';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const users = await User.find({})
      .select('firstName lastName email role currentPlanKey subscription createdAt lastLogin region')
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
        provider: user.subscription?.provider || 'none',
        currentPeriodEnd: user.subscription?.currentPeriodEnd,
        interval: user.subscription?.interval || 'monthly'
      },
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      region: user.region || 'Unknown'
    }));

    return NextResponse.json({ users: transformedUsers });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 