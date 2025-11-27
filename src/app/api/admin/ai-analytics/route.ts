import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { ActivityLog, User } from '@/models';

export async function GET(request: NextRequest) {
  try {
    await getConnection();

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
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Fetch real AI usage logs
    const aiUsageLogs = await ActivityLog.find({
      logType: 'ai',
      timestamp: { $gte: startDate }
    }).lean();

    // Calculate metrics
    const totalTokens = aiUsageLogs.reduce((sum, log) => sum + (log.aiMetadata?.tokensUsed || 0), 0);
    const totalCost = aiUsageLogs.reduce((sum, log) => sum + (log.aiMetadata?.cost || 0), 0);
    const totalRequests = aiUsageLogs.length;
    const averageTokensPerRequest = totalRequests > 0 ? totalTokens / totalRequests : 0;
    const costPerToken = totalTokens > 0 ? totalCost / totalTokens : 0;

    // Group by endpoint
    const usageByEndpoint = aiUsageLogs.reduce((acc, log) => {
      const endpoint = log.endpoint || 'unknown';
      if (!acc[endpoint]) {
        acc[endpoint] = { requests: 0, tokens: 0, cost: 0 };
      }
      acc[endpoint].requests += 1;
      acc[endpoint].tokens += log.aiMetadata?.tokensUsed || 0;
      acc[endpoint].cost += log.aiMetadata?.cost || 0;
      return acc;
    }, {} as Record<string, { requests: number; tokens: number; cost: number }>);

    const usageByEndpointArray = Object.entries(usageByEndpoint).map(([endpoint, data]) => ({
      endpoint,
      requests: data.requests,
      tokens: data.tokens,
      cost: data.cost
    }));

    // Group by user
    // We need to fetch user details for the logs
    const userIds = Array.from(new Set(aiUsageLogs.map(log => log.userId?.toString()).filter(Boolean)));
    const users = await User.find({ _id: { $in: userIds } }).select('firstName lastName email').lean();
    const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));

    const usageByUser = aiUsageLogs.reduce((acc, log) => {
      const userId = log.userId?.toString() || 'anonymous';
      if (!acc[userId]) {
        acc[userId] = { requests: 0, tokens: 0, cost: 0 };
      }
      acc[userId].requests += 1;
      acc[userId].tokens += log.aiMetadata?.tokensUsed || 0;
      acc[userId].cost += log.aiMetadata?.cost || 0;
      return acc;
    }, {} as Record<string, { requests: number; tokens: number; cost: number }>);

    const usageByUserArray = Object.entries(usageByUser).map(([userId, data]) => {
      const user = userMap.get(userId);
      const userName = user ? `${user.firstName} ${user.lastName}` : 'Anonymous';
      const userEmail = user ? user.email : 'N/A';

      return {
        userId,
        userName,
        userEmail, // Added email for better identification
        requests: data.requests,
        tokens: data.tokens,
        cost: data.cost
      };
    });

    // Generate daily usage data
    const dailyUsage = [];
    const currentDate = new Date(startDate);
    // Reset time to start of day for comparison
    currentDate.setHours(0, 0, 0, 0);

    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    while (currentDate <= endDate) {
      const nextDate = new Date(currentDate);
      nextDate.setDate(currentDate.getDate() + 1);

      const dayLogs = aiUsageLogs.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= currentDate && logDate < nextDate;
      });

      const dayTokens = dayLogs.reduce((sum, log) => sum + (log.aiMetadata?.tokensUsed || 0), 0);
      const dayCost = dayLogs.reduce((sum, log) => sum + (log.aiMetadata?.cost || 0), 0);

      dailyUsage.push({
        date: currentDate.toISOString().split('T')[0],
        requests: dayLogs.length,
        tokens: dayTokens,
        cost: dayCost
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    const aiData = {
      totalTokens,
      totalCost: Math.round(totalCost * 100) / 100,
      totalRequests,
      averageTokensPerRequest: Math.round(averageTokensPerRequest * 100) / 100,
      costPerToken: Math.round(costPerToken * 1000000) / 1000000,
      usageByEndpoint: usageByEndpointArray,
      usageByUser: usageByUserArray,
      dailyUsage
    };

    return NextResponse.json(aiData);

  } catch (error: any) {
    console.error('Error fetching AI analytics data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI analytics data', details: error.message },
      { status: 500 }
    );
  }
}
