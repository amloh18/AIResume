import AIUsageLog from '@/models/AIUsageLog';

export interface AIUsageData {
  userId: string;
  apiEndpoint: string;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost: number;
  provider: string;
  model: string;
  requestData?: any;
  responseData?: any;
  status: 'success' | 'error';
  errorMessage?: string;
}

export class AIUsageLogger {
  /**
   * Log AI usage to the database
   */
  static async logUsage(usageData: AIUsageData): Promise<void> {
    try {
      await AIUsageLog.create({
        userId: usageData.userId,
        apiEndpoint: usageData.apiEndpoint,
        tokensUsed: usageData.tokensUsed,
        cost: usageData.cost,
        provider: usageData.provider,
        model: usageData.model,
        requestData: usageData.requestData,
        responseData: usageData.responseData,
        status: usageData.status,
        errorMessage: usageData.errorMessage
      });
    } catch (error) {
      console.error('Error logging AI usage:', error);
      // Don't throw error to avoid breaking the main functionality
    }
  }

  /**
   * Calculate cost based on token usage and provider rates
   */
  static calculateCost(
    tokensUsed: { prompt: number; completion: number; total: number },
    provider: string = 'openai',
    model: string = 'gpt-3.5-turbo'
  ): number {
    // Default rates (can be moved to environment variables)
    const rates: { [key: string]: { [key: string]: { input: number; output: number } } } = {
      openai: {
        'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
        'gpt-4': { input: 0.03, output: 0.06 },
        'gpt-4-turbo': { input: 0.01, output: 0.03 }
      },
      google: {
        'gemini-pro': { input: 0.0005, output: 0.0015 },
        'gemini-pro-vision': { input: 0.0005, output: 0.0015 }
      },
      anthropic: {
        'claude-3-sonnet': { input: 0.003, output: 0.015 },
        'claude-3-haiku': { input: 0.00025, output: 0.00125 }
      }
    };

    const providerRates = rates[provider] || rates.openai;
    const modelRates = providerRates[model] || providerRates['gpt-3.5-turbo'];

    const inputCost = (tokensUsed.prompt / 1000) * modelRates.input;
    const outputCost = (tokensUsed.completion / 1000) * modelRates.output;

    return inputCost + outputCost;
  }

  /**
   * Extract token usage from OpenAI response
   */
  static extractOpenAIUsage(response: any): { prompt: number; completion: number; total: number } {
    if (response?.usage) {
      return {
        prompt: response.usage.prompt_tokens || 0,
        completion: response.usage.completion_tokens || 0,
        total: response.usage.total_tokens || 0
      };
    }
    return { prompt: 0, completion: 0, total: 0 };
  }

  /**
   * Extract token usage from Google Gemini response
   */
  static extractGeminiUsage(response: any): { prompt: number; completion: number; total: number } {
    if (response?.usageMetadata) {
      return {
        prompt: response.usageMetadata.promptTokenCount || 0,
        completion: response.usageMetadata.candidatesTokenCount || 0,
        total: response.usageMetadata.totalTokenCount || 0
      };
    }
    return { prompt: 0, completion: 0, total: 0 };
  }

  /**
   * Extract token usage from Anthropic Claude response
   */
  static extractClaudeUsage(response: any): { prompt: number; completion: number; total: number } {
    if (response?.usage) {
      return {
        prompt: response.usage.input_tokens || 0,
        completion: response.usage.output_tokens || 0,
        total: response.usage.input_tokens + response.usage.output_tokens || 0
      };
    }
    return { prompt: 0, completion: 0, total: 0 };
  }

  /**
   * Get usage statistics for a user
   */
  static async getUserStats(userId: string, options?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<any> {
    return AIUsageLog.getUsageStats({
      userId: userId as any,
      startDate: options?.startDate,
      endDate: options?.endDate
    });
  }

  /**
   * Get total cost for a user
   */
  static async getUserTotalCost(userId: string, options?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<number> {
    const stats = await this.getUserStats(userId, options);
    return stats.totalCost || 0;
  }

  /**
   * Check if user has exceeded usage limits
   */
  static async checkUsageLimits(userId: string, limits: {
    dailyCost?: number;
    monthlyCost?: number;
    dailyRequests?: number;
    monthlyRequests?: number;
  }): Promise<{ exceeded: boolean; reason?: string }> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [dailyStats, monthlyStats] = await Promise.all([
      AIUsageLog.getUsageStats({
        userId: userId as any,
        startDate: startOfDay,
        endDate: now
      }),
      AIUsageLog.getUsageStats({
        userId: userId as any,
        startDate: startOfMonth,
        endDate: now
      })
    ]);

    // Check daily limits
    if (limits.dailyCost && dailyStats.totalCost > limits.dailyCost) {
      return { exceeded: true, reason: 'Daily cost limit exceeded' };
    }

    if (limits.dailyRequests && dailyStats.totalRequests > limits.dailyRequests) {
      return { exceeded: true, reason: 'Daily request limit exceeded' };
    }

    // Check monthly limits
    if (limits.monthlyCost && monthlyStats.totalCost > limits.monthlyCost) {
      return { exceeded: true, reason: 'Monthly cost limit exceeded' };
    }

    if (limits.monthlyRequests && monthlyStats.totalRequests > limits.monthlyRequests) {
      return { exceeded: true, reason: 'Monthly request limit exceeded' };
    }

    return { exceeded: false };
  }
} 