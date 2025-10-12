import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
import { User } from '@/models';
import AIUsageLog from '@/models/AIUsageLog';

// Add error handling for Firebase imports
let admin;
try {
  const firebaseAdmin = require('@/lib/firebase-admin');
  admin = firebaseAdmin.default;
} catch (error) {
  console.warn('⚠️ Firebase Admin not available:', error);
  admin = null;
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Check admin role from database
    const user = await User.findOne({ email: session.user.email }).select('role');
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (range) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get overall usage statistics
    const usageStats = await AIUsageLog.getUsageStats({
      startDate,
      endDate: now
    });

    // Get usage by endpoint
    const usageByEndpoint = await AIUsageLog.getUsageByEndpoint({
      startDate,
      endDate: now,
      limit: 10
    });

    // Get usage by user
    const usageByUser = await AIUsageLog.getUsageByUser({
      startDate,
      endDate: now,
      limit: 10
    });

    // Get daily usage
    const dailyUsage = await AIUsageLog.getDailyUsage({
      startDate,
      endDate: now
    });

    // Calculate cost per token
    const costPerToken = usageStats.totalTokens > 0 ? usageStats.totalCost / usageStats.totalTokens : 0;

    const aiAnalyticsData = {
      totalTokens: usageStats.totalTokens,
      totalCost: usageStats.totalCost,
      totalRequests: usageStats.totalRequests,
      averageTokensPerRequest: Math.round(usageStats.avgTokensPerRequest || 0),
      costPerToken: costPerToken,
      usageByEndpoint: usageByEndpoint.map(item => ({
        endpoint: item._id,
        requests: item.requests,
        tokens: item.tokens,
        cost: item.cost
      })),
      usageByUser: usageByUser.map(item => ({
        userId: item._id.toString(),
        userName: item.userName || 'Unknown User',
        requests: item.requests,
        tokens: item.tokens,
        cost: item.cost
      })),
      dailyUsage: dailyUsage.map(item => ({
        date: item._id,
        requests: item.requests,
        tokens: item.tokens,
        cost: item.cost
      }))
    };

    return NextResponse.json(aiAnalyticsData);
  } catch (error) {
    console.error('Error fetching AI analytics data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI analytics data' },
      { status: 500 }
    );
  }
} 