/**
 * AI API Helper Utility
 * Provides unified interface for AI API calls.
 *
 * Provider chain (see ai-router): VPS OpenAI-compatible gateway → Ollama → Gemini.
 * The exported names are kept for backwards compatibility with existing importers.
 */

import { ActivityLogService } from '@/lib/services/activityLogService';
import { aiRoute } from '@/lib/utils/ai-router';
import { isGatewayConfigured } from '@/lib/utils/ai-gateway-client';

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
  provider: 'gateway' | 'ollama' | 'gemini';
  apiKeyUsed?: string;
}

/** Non-throwing variant used by the availability helpers. */
function hasGeminiApiKey(): boolean {
  return Boolean(
    process.env.gemini_api_key ||
      process.env.GEMINI_API_KEY ||
      process.env.gemini_api_key1 ||
      process.env.GEMINI_API_KEY1
  );
}

/**
 * Cost accounting: the gateway and Ollama run on our own VPS (CLI-backed /
 * local weights), so only the direct Gemini API bills per token.
 */
function estimateCost(provider: AIResponse['provider'], tokensUsed: number): number {
  return provider === 'gemini' ? (tokensUsed / 1_000_000) * 0.075 : 0;
}

/**
 * Call AI API — gateway → Ollama → Gemini (see ai-router)
 */
export async function callAIWithFallback(options: AICallOptions): Promise<AIResponse> {
  // Build messages for the router
  const messages: { role: string; content: string }[] = [];
  if (options.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }
  messages.push({ role: 'user', content: options.prompt });

  try {
    console.log(`🔑 Attempting AI call (gateway → Ollama → Gemini fallback)...`);
    const result = await aiRoute(messages, { model: options.model });
    console.log(`✅ AI call successful via ${result.provider} (${result.model}, ${result.latencyMs}ms)`);

    // Log usage
    const tokensUsed = Math.ceil((options.prompt.length + result.content.length) / 4);
    const cost = estimateCost(result.provider, tokensUsed);

    try {
      await ActivityLogService.logAI({
        userId: options.userId,
        model: result.model,
        tokensUsed,
        cost,
        prompt: options.prompt.substring(0, 1000),
        responseLength: result.content.length,
        action: options.action || 'ai_generation',
        endpoint: options.endpoint || options.action || 'unknown_endpoint',
        status: 'success'
      });
    } catch (logError) {
      console.error('Failed to log AI usage:', logError);
    }

    return {
      content: result.content,
      provider: result.provider,
      apiKeyUsed: result.provider === 'gemini' ? 'gemini_api_key' : result.provider
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`AI API error: ${errorMessage}`);
  }
}

/**
 * Whether any AI provider is usable in this process.
 *
 * The VPS gateway needs no Gemini key, so a gateway-only deployment must not
 * report "AI unavailable" — every route that gates on this helper would
 * otherwise refuse to call the gateway at all.
 */
export function hasAIApiKeys(): boolean {
  return isGatewayConfigured() || hasGeminiApiKey();
}

/**
 * Get the name of the available API keys (for logging)
 */
export function getAvailableAIKeys(): string[] {
  const keys: string[] = [];
  if (isGatewayConfigured()) keys.push('ai_gateway');
  if (hasGeminiApiKey()) keys.push('gemini_api_key');
  return keys.length ? keys : ['none'];
}
