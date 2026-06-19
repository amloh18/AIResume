/**
 * Gemini API Helper Utility
 * Provides unified interface for Google Gemini API calls using gemini_api_key
 * Uses @google/genai package with gemini-2.5-flash-lite (with model fallback to gemini-2.5-flash)
 */

import { GoogleGenAI } from '@google/genai';
import { ActivityLogService } from '@/lib/services/activityLogService';

interface GeminiCallOptions {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
  userId?: string;
  action?: string;
  endpoint?: string;
}

interface GeminiResponse {
  content: string;
  provider: 'gemini';
  apiKeyUsed: 'gemini_api_key';
}

function isQuotaError(error: any): boolean {
  if (!error) return false;

  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorString = JSON.stringify(error);

  return (
    errorMessage.includes('429') ||
    errorMessage.includes('quota') ||
    errorMessage.includes('Quota exceeded') ||
    errorMessage.includes('RESOURCE_EXHAUSTED') ||
    errorMessage.includes('rate limit') ||
    errorMessage.includes('rate-limit') ||
    errorString.includes('"code":429') ||
    errorString.includes('"status":"RESOURCE_EXHAUSTED"')
  );
}

function getGeminiApiKey(): string {
  const key =
    process.env.gemini_api_key ||
    process.env.GEMINI_API_KEY ||
    process.env.gemini_api_key1 ||
    process.env.GEMINI_API_KEY1 ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (!key) {
    throw new Error('No Gemini API key configured. Please set gemini_api_key.');
  }

  return key;
}

async function callGemini(options: GeminiCallOptions, apiKey: string): Promise<string> {
  try {
    const genAI = new GoogleGenAI({ apiKey });

    const primaryModel = options.model || 'gemini-2.5-flash-lite';
    const fallbackModel = 'gemini-2.5-flash';

    let fullPrompt = options.prompt;
    if (options.systemPrompt) {
      fullPrompt = `${options.systemPrompt}\n\n${options.prompt}`;
    }

    let result;
    let usedModel = primaryModel;

    try {
      result = await genAI.models.generateContent({
        model: primaryModel,
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        config: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.maxTokens || 2048,
        }
      });
    } catch (primaryError) {
      console.warn(`⚠️ ${primaryModel} failed, trying ${fallbackModel}...`);
      usedModel = fallbackModel;
      result = await genAI.models.generateContent({
        model: fallbackModel,
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        config: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.maxTokens || 2048,
        }
      });
    }

    const text = result.text || '';

    if (!text) {
      throw new Error('Gemini API returned empty response');
    }

    const usageMetadata = (result as any).usageMetadata;
    const inputTokens = usageMetadata?.promptTokenCount || Math.ceil(fullPrompt.length / 4);
    const outputTokens = usageMetadata?.candidatesTokenCount || Math.ceil(text.length / 4);
    const tokensUsed = inputTokens + outputTokens;

    const INPUT_COST_PER_1M = 0.075;
    const OUTPUT_COST_PER_1M = 0.30;
    const cost = (inputTokens / 1_000_000) * INPUT_COST_PER_1M + (outputTokens / 1_000_000) * OUTPUT_COST_PER_1M;

    try {
      await ActivityLogService.logAI({
        userId: options.userId,
        model: usedModel,
        tokensUsed,
        cost,
        prompt: fullPrompt.substring(0, 1000),
        responseLength: text.length,
        action: options.action || 'gemini_generation',
        endpoint: options.endpoint || options.action || 'unknown_endpoint',
        status: 'success'
      });
    } catch (logError) {
      console.error('Failed to log AI usage:', logError);
    }

    return text;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Gemini API error: ${errorMessage}`);
  }
}

/**
 * Call Gemini API with model fallback using the single configured key.
 * Hard-fails immediately if gemini_api_key is not configured.
 * If the primary model fails (non-quota errors) there is no key retry;
 * only the configured model falls back to gemini-2.5-flash.
 */
export async function callGeminiWithFallback(options: GeminiCallOptions): Promise<GeminiResponse> {
  let apiKey: string;
  try {
    apiKey = getGeminiApiKey();
  } catch {
    throw new Error('No Gemini API key configured. Please set gemini_api_key.');
  }

  try {
    console.log(`🔑 Attempting Gemini API call...`);
    const content = await callGemini(options, apiKey);
    console.log(`✅ Gemini API call successful`);
    return {
      content,
      provider: 'gemini',
      apiKeyUsed: 'gemini_api_key'
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Gemini API error: ${errorMessage}`);
  }
}

/**
 * Check if Gemini API key is available
 */
export function hasGeminiApiKeys(): boolean {
  try {
    return Boolean(getGeminiApiKey());
  } catch {
    return false;
  }
}

/**
 * Get the configured API key name for logging
 */
export function getAvailableGeminiKeys(): string[] {
  try {
    return [getGeminiApiKey() ? 'gemini_api_key' : 'none'];
  } catch {
    return [];
  }
}

/**
 * Legacy compatibility: Alias for callGeminiWithFallback
 */
export async function callAIWithFallback(options: GeminiCallOptions): Promise<GeminiResponse> {
  return callGeminiWithFallback(options);
}

/**
 * Legacy compatibility: Alias for hasGeminiApiKeys
 */
export function hasAIApiKeys(): boolean {
  return hasGeminiApiKeys();
}

/**
 * Legacy compatibility: Alias for getAvailableGeminiKeys
 */
export function getAvailableAIKeys(): string[] {
  return getAvailableGeminiKeys();
}
