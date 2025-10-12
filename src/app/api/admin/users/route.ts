import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
import { User } from '@/models';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Admin users API called');
    
    const session = await getServerSession(authOptions);
    console.log('👤 Session:', session ? 'Found' : 'Not found');
    console.log('👤 User role:', session?.user?.role);
    
    if (!session || session.user?.role !== 'admin') {
      console.log('❌ Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔗 Connecting to database...');
    await connectDB();
    console.log('✅ Database connected');

    console.log('👥 Fetching users...');
    const users = await User.find({})
      .select('firstName lastName email role currentPlanKey subscription createdAt phone location website linkedin github summary settings lastLogin region')
      .lean();
    
    console.log('👥 Users found:', users.length);

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

    console.log('✅ Returning users:', transformedUsers.length);
    return NextResponse.json({ users: transformedUsers });
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 