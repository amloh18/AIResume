/**
 * AI API Helper Utility
 * Provides unified interface for Vercel AI Gateway calls
 * Uses @ai-sdk/gateway package with deepseek/deepseek-v4-flash (fallback to google/gemini-2.5-flash-lite)
 */

import { generateText } from 'ai';
import { gateway } from '@ai-sdk/gateway';
import { ActivityLogService } from '@/lib/services/activityLogService';

export interface AICallOptions {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
  responseSchema?: any;
  responseMimeType?: string;
  userId?: string;
  action?: string;
  endpoint?: string;
}

export interface AIResponse {
  content: string;
  provider: 'gemini';
  apiKeyUsed?: string;
}

/**
 * Check if AI Gateway environment variables/tokens are available
 */
export function hasAIApiKeys(): boolean {
  return Boolean(
    process.env.VERCEL_OIDC_TOKEN ||
    process.env.AI_GATEWAY_API_KEY ||
    process.env.gemini_api_key ||
    process.env.GEMINI_API_KEY
  );
}

/**
 * Get available AI Gateway tokens/keys
 */
export function getAvailableAIKeys(): string[] {
  const keys = [];
  if (process.env.VERCEL_OIDC_TOKEN) keys.push('VERCEL_OIDC_TOKEN');
  if (process.env.AI_GATEWAY_API_KEY) keys.push('AI_GATEWAY_API_KEY');
  if (process.env.gemini_api_key || process.env.GEMINI_API_KEY) keys.push('gemini_api_key');
  return keys;
}

/**
 * Call Vercel AI Gateway with DeepSeek primary model and Gemini fallback
 */
export async function callAIWithFallback(options: AICallOptions): Promise<AIResponse> {
  const primaryModel = options.model || 'deepseek/deepseek-v4-flash';
  const fallbackModel = 'google/gemini-2.5-flash-lite';

  try {
    console.log(`🔑 Attempting AI Gateway call using ${primaryModel} with fallback ${fallbackModel}...`);
    const callStart = Date.now();

    // Use Vercel AI SDK generateText with gateway and fallback model
    const response = await generateText({
      model: gateway(primaryModel),
      prompt: options.prompt,
      system: options.systemPrompt,
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 2048,
      providerOptions: {
        gateway: {
          models: [fallbackModel],
        },
      },
      ...(options.responseSchema ? {
        responseFormat: {
          type: 'json',
          schema: options.responseSchema,
        },
      } : options.responseMimeType === 'application/json' ? {
        responseFormat: { type: 'json' },
      } : {}),
    });

    const text = response.text;
    if (!text) {
      throw new Error('AI Gateway returned empty response');
    }

    const latencySeconds = (Date.now() - callStart) / 1000;
    const inputTokens = response.usage?.inputTokens || Math.ceil(options.prompt.length / 4);
    const outputTokens = response.usage?.outputTokens || Math.ceil(text.length / 4);
    const tokensUsed = inputTokens + outputTokens;

    // Cost estimation
    const INPUT_COST_PER_1M = 0.075;
    const OUTPUT_COST_PER_1M = 0.30;
    const cost = (inputTokens / 1_000_000) * INPUT_COST_PER_1M + (outputTokens / 1_000_000) * OUTPUT_COST_PER_1M;

    // Log the AI usage to ActivityLogService
    try {
      await ActivityLogService.logAI({
        userId: options.userId,
        model: response.response?.modelId || primaryModel,
        tokensUsed,
        cost,
        prompt: options.prompt.substring(0, 1000),
        responseLength: text.length,
        action: options.action || 'gateway_generation',
        endpoint: options.endpoint || options.action || 'unknown_endpoint',
        status: 'success'
      });
    } catch (logError) {
      console.error('Failed to log AI usage:', logError);
    }

    try {
      const { getPostHogClient } = await import('@/lib/posthog-server');
      const posthog = getPostHogClient();
      const distinctId = options.userId || 'anonymous';
      posthog.capture({
        distinctId,
        event: '$ai_generation',
        properties: {
          $ai_provider: 'vercel-gateway',
          $ai_model: response.response?.modelId || primaryModel,
          $ai_input_tokens: inputTokens,
          $ai_output_tokens: outputTokens,
          $ai_latency: latencySeconds,
          $ai_total_cost_usd: cost,
          $ai_span_name: options.action || options.endpoint || 'gateway_generation',
        },
      });
    } catch (phError) {
      console.error('PostHog $ai_generation capture error:', phError);
    }

    return {
      content: text,
      provider: 'gemini', // Keep 'gemini' for backward compatibility in service parsers
      apiKeyUsed: process.env.VERCEL_OIDC_TOKEN ? 'VERCEL_OIDC_TOKEN' : 'AI_GATEWAY_API_KEY'
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`AI Gateway error: ${errorMessage}`);
    throw new Error(`AI Gateway error: ${errorMessage}`);
  }
}




