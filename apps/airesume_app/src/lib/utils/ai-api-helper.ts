/**
 * AI API Helper Utility
 * Provides unified interface for AI API calls with Ollama primary + Gemini fallback
 * Uses Ollama (gemma3:4b) as primary, Gemini as fallback
 */

import { ActivityLogService } from '@/lib/services/activityLogService';
import { aiRoute } from '@/lib/utils/ai-router';

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
  provider: 'ollama' | 'gemini';
  apiKeyUsed?: string;
}

/**
 * Get available Gemini API key
 */
function getGeminiApiKey(): string {
  const key =
    process.env.gemini_api_key ||
    process.env.GEMINI_API_KEY ||
    process.env.gemini_api_key1 ||
    process.env.GEMINI_API_KEY1;

  if (!key) {
    throw new Error('No Gemini API key configured. Please set GEMINI_API_KEY in .env.local.');
  }

  return key;
}

/**
 * Call AI API — Ollama (gemma3:4b) primary, Gemini fallback
 */
export async function callAIWithFallback(options: AICallOptions): Promise<AIResponse> {
  // Build messages for the router
  const messages: { role: string; content: string }[] = [];
  if (options.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }
  messages.push({ role: 'user', content: options.prompt });

  // Try Ollama first via router
  try {
    console.log(`🔑 Attempting AI call (Ollama → Gemini fallback)...`);
    const result = await aiRoute(messages);
    console.log(`✅ AI call successful via ${result.provider} (${result.model}, ${result.latencyMs}ms)`);

    // Log usage
    const tokensUsed = Math.ceil((options.prompt.length + result.content.length) / 4);
    const cost = result.provider === 'ollama' ? 0 : (tokensUsed / 1_000_000) * 0.075;

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
      apiKeyUsed: result.provider === 'ollama' ? 'ollama' : 'gemini_api_key'
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`AI API error: ${errorMessage}`);
  }
}

/**
 * Check if Gemini API keys are available
 */
export function hasAIApiKeys(): boolean {
  try {
    return Boolean(getGeminiApiKey());
  } catch {
    return false;
  }
}

/**
 * Get the name of the available API keys (for logging)
 */
export function getAvailableAIKeys(): string[] {
  try {
    return [getGeminiApiKey() ? 'gemini_api_key' : 'none'];
  } catch {
    return [];
  }
}



