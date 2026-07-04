import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { User } from '@/models';
import subscriptionService from '@/lib/services/subscriptionService';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await getConnection();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const plan = searchParams.get('plan') || '';
    const userType = searchParams.get('userType') || '';

    // Build query
    const query: any = {};
    
    if (search) {
      const isObjectId = mongoose.isValidObjectId(search);
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
      if (isObjectId) {
        query.$or.push({ _id: new mongoose.Types.ObjectId(search) });
      }
    }
    
    if (role && role !== 'all') {
      query.role = role;
    }
    
    if (plan && plan !== 'all') {
      query.currentPlanKey = plan;
    }

    if (userType === 'registered') {
      query.isAnonymous = false;
    } else if (userType === 'guest') {
      query.isAnonymous = true;
    }

    // Get users with pagination
    const skip = (page - 1) * limit;
    
    const [users, totalCount] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query)
    ]);

    // Transform users to match expected format
    const transformedUsers = users.map(user => {
      const { currentPlanKey, subscription } = subscriptionService.getEffectivePlan(user);
      return {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role || 'user',
        currentPlanKey: currentPlanKey,
        subscription: {
          status: subscription?.status || 'inactive',
          provider: subscription?.provider || 'none',
          currentPeriodEnd: subscription?.currentPeriodEnd,
          interval: subscription?.interval || 'monthly'
        },
        createdAt: user.createdAt,
        phone: user.phone,
        location: user.location,
        website: user.website,
        linkedin: user.linkedin,
        github: user.github,
        summary: user.summary,
        company: user.company,
        timezone: user.timezone,
        languagePreference: user.languagePreference,
        region: user.region
      };
    });

    return NextResponse.json({
      success: true,
      users: transformedUsers,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    }, { headers: { 'Cache-Control': 'no-store' } });

  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users', details: error.message },
      { status: 500 }
    );
  }
}
