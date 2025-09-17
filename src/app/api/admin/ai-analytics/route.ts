import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
// Removed - using Clerk now
import connectDB from '@/lib/database';
import AIUsageLog from '@/models/AIUsageLog';

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

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