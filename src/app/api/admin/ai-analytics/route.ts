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
    // Cost Constants for Gemini Flash (per 1M tokens)
    const INPUT_COST_PER_1M = 0.075;
    const OUTPUT_COST_PER_1M = 0.30;

    // Helper to estimate cost
    const calculateLogCost = (log: any) => {
      // Use stored cost if available
      if (typeof log.aiMetadata?.cost === 'number') {
        return log.aiMetadata.cost;
      }

      let inputTokens = 0;
      let outputTokens = 0;

      // Try to get from metadata if available
      if (log.aiMetadata?.inputTokens) inputTokens = log.aiMetadata.inputTokens;
      else if (log.aiMetadata?.prompt) inputTokens = Math.ceil(log.aiMetadata.prompt.length / 4);

      if (log.aiMetadata?.outputTokens) outputTokens = log.aiMetadata.outputTokens;
      else if (log.aiMetadata?.responseLength) outputTokens = Math.ceil(log.aiMetadata.responseLength / 4);
      // Fallback if only total is known
      else if (log.aiMetadata?.tokensUsed) {
        inputTokens = Math.ceil(log.aiMetadata.tokensUsed * 0.8);
        outputTokens = log.aiMetadata.tokensUsed - inputTokens;
      }

      const inputCost = (inputTokens / 1_000_000) * INPUT_COST_PER_1M;
      const outputCost = (outputTokens / 1_000_000) * OUTPUT_COST_PER_1M;

      return inputCost + outputCost;
    };

    // Calculate metrics
    let totalTokens = 0;
    let totalCost = 0;
    let inputCostTotal = 0;
    let outputCostTotal = 0;
    const totalRequests = aiUsageLogs.length;

    aiUsageLogs.forEach(log => {
      totalTokens += log.aiMetadata?.tokensUsed || 0;
      
      let inputTokens = log.aiMetadata?.inputTokens || Math.ceil((log.aiMetadata?.tokensUsed || 0) * 0.8);
      let outputTokens = log.aiMetadata?.outputTokens || ((log.aiMetadata?.tokensUsed || 0) - inputTokens);
      
      const inputCost = (inputTokens / 1_000_000) * INPUT_COST_PER_1M;
      const outputCost = (outputTokens / 1_000_000) * OUTPUT_COST_PER_1M;
      
      inputCostTotal += inputCost;
      outputCostTotal += outputCost;
      totalCost += (inputCost + outputCost);
    });

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
      acc[endpoint].cost += calculateLogCost(log);
      return acc;
    }, {} as Record<string, { requests: number; tokens: number; cost: number }>);

    const usageByEndpointArray = Object.entries(usageByEndpoint).map(([endpoint, data]) => ({
      endpoint,
      requests: data.requests,
      tokens: data.tokens,
      cost: data.cost
    }));

    // Group by user
    const userIds = Array.from(new Set(aiUsageLogs.map(log => log.userId?.toString()).filter(Boolean)));
    const users = await User.find({ _id: { $in: userIds } }).select('firstName lastName email').lean();
    const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));

    const usageByUser = aiUsageLogs.reduce((acc, log) => {
      // Use userId if available, otherwise 'anonymous'
      // But we key by userId to aggregate. 
      const userId = log.userId?.toString() || 'anonymous';

      // If we don't have a userId but have an email in the log, track by email?
      // The current UI expects a list of objects.
      // Let's stick to userId grouping, but we'll fallback to Email for display name.
      const key = userId === 'anonymous' && log.userEmail ? log.userEmail : userId;

      if (!acc[key]) {
        acc[key] = {
          requests: 0,
          tokens: 0,
          cost: 0,
          userId: userId,
          emailFallback: log.userEmail
        };
      }
      acc[key].requests += 1;
      acc[key].tokens += log.aiMetadata?.tokensUsed || 0;
      acc[key].cost += calculateLogCost(log);
      return acc;
    }, {} as Record<string, { requests: number; tokens: number; cost: number; userId: string; emailFallback?: string }>);

    const usageByUserArray = Object.entries(usageByUser).map(([key, data]) => {
      const user = userMap.get(data.userId);
      // Fallback logic: User DB > Log Email > "Anonymous"
      const userName = user ? `${user.firstName} ${user.lastName}` : (data.emailFallback || 'Anonymous');
      const userEmail = user ? user.email : (data.emailFallback || 'N/A');

      return {
        userId: data.userId,
        userName,
        userEmail,
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
      inputCost: inputCostTotal,
      outputCost: outputCostTotal,
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
