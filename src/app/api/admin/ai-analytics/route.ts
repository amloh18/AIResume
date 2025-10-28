import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
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
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Generate mock AI usage data for now
    const aiUsageLogs = generateMockAIUsageData(startDate, now);

    // Calculate metrics
    const totalTokens = aiUsageLogs.reduce((sum, log) => sum + (log.tokensUsed?.total || 0), 0);
    const totalCost = aiUsageLogs.reduce((sum, log) => sum + (log.cost || 0), 0);
    const totalRequests = aiUsageLogs.length;
    const averageTokensPerRequest = totalRequests > 0 ? totalTokens / totalRequests : 0;
    const costPerToken = totalTokens > 0 ? totalCost / totalTokens : 0;

    // Group by endpoint
    const usageByEndpoint = aiUsageLogs.reduce((acc, log) => {
      const endpoint = log.apiEndpoint || 'unknown';
      if (!acc[endpoint]) {
        acc[endpoint] = { requests: 0, tokens: 0, cost: 0 };
      }
      acc[endpoint].requests += 1;
      acc[endpoint].tokens += log.tokensUsed?.total || 0;
      acc[endpoint].cost += log.cost || 0;
      return acc;
    }, {} as Record<string, { requests: number; tokens: number; cost: number }>);

    const usageByEndpointArray = Object.entries(usageByEndpoint).map(([endpoint, data]) => ({
      endpoint,
      requests: data.requests,
      tokens: data.tokens,
      cost: data.cost
    }));

    // Group by user
    const usageByUser = aiUsageLogs.reduce((acc, log) => {
      const userId = log.userId?.toString() || 'anonymous';
      if (!acc[userId]) {
        acc[userId] = { requests: 0, tokens: 0, cost: 0 };
      }
      acc[userId].requests += 1;
      acc[userId].tokens += log.tokensUsed?.total || 0;
      acc[userId].cost += log.cost || 0;
      return acc;
    }, {} as Record<string, { requests: number; tokens: number; cost: number }>);

    const usageByUserArray = Object.entries(usageByUser).map(([userId, data]) => ({
      userId,
      userName: `User ${userId.slice(-4)}`, // Mock user name
      requests: data.requests,
      tokens: data.tokens,
      cost: data.cost
    }));

    // Generate daily usage data
    const dailyUsage = [];
    const currentDate = new Date(startDate);
    while (currentDate <= now) {
      const nextDate = new Date(currentDate);
      nextDate.setDate(currentDate.getDate() + 1);
      
      const dayLogs = aiUsageLogs.filter(log => {
        const logDate = new Date(log.createdAt);
        return logDate >= currentDate && logDate < nextDate;
      });
      
      const dayTokens = dayLogs.reduce((sum, log) => sum + (log.tokensUsed?.total || 0), 0);
      const dayCost = dayLogs.reduce((sum, log) => sum + (log.cost || 0), 0);
      
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
      costPerToken: Math.round(costPerToken * 1000000) / 1000000, // Cost per token in micro-dollars
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

function generateMockAIUsageData(startDate: Date, endDate: Date) {
  const logs = [];
  const endpoints = ['/api/ai/generate-cv', '/api/ai/analyze-job', '/api/ai/optimize-content', '/api/ai/generate-cover-letter'];
  const providers = ['openai', 'google', 'anthropic'];
  const models = ['gpt-4', 'gpt-3.5-turbo', 'gemini-pro', 'claude-3'];
  
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const totalLogs = Math.floor(Math.random() * 200) + 50; // 50-250 logs
  
  for (let i = 0; i < totalLogs; i++) {
    const randomDate = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const provider = providers[Math.floor(Math.random() * providers.length)];
    const model = models[Math.floor(Math.random() * models.length)];
    const promptTokens = Math.floor(Math.random() * 500) + 100;
    const completionTokens = Math.floor(Math.random() * 200) + 50;
    const totalTokens = promptTokens + completionTokens;
    const cost = totalTokens * 0.0001; // Mock cost calculation
    
    logs.push({
      userId: `user-${Math.floor(Math.random() * 10) + 1}`,
      apiEndpoint: endpoint,
      tokensUsed: {
        prompt: promptTokens,
        completion: completionTokens,
        total: totalTokens
      },
      cost: cost,
      provider: provider,
      model: model,
      status: Math.random() > 0.1 ? 'success' : 'error',
      createdAt: randomDate
    });
  }
  
  return logs;
}
