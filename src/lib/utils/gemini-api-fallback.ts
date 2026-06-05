/**
 * Shared Gemini API Fallback Utility
 * Provides a simple function for API routes to call Gemini with automatic fallback
 * Supports all 3 API keys: gemini_api_key, gemini_api_key2, gemini_api_key3
 */

import { GoogleGenAI } from '@google/genai';
import { ActivityLogService } from '@/lib/services/activityLogService';
import { randomUUID } from 'crypto';

/**
 * Check if error is a quota/rate limit error (429)
 */
function isQuotaError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorString = JSON.stringify(error);
  
  // Check for 429 status code or quota-related error messages
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

/**
 * Get all available Gemini API keys in priority order
 */
function getAllGeminiApiKeys(): Array<{ name: string; key: string }> {
  const keys: Array<{ name: string; key: string }> = [];

  // PRIMARY: gemini_api_key2
  const key2 =
    process.env.gemini_api_key2 ||
    process.env.GEMINI_API_KEY2 ||
    process.env['GEMINI_API-KEY2'] ||
    process.env['gemini_api-key2'];
  if (key2) {
    keys.push({ name: 'gemini_api_key2', key: key2 });
  }

  // SECONDARY: gemini_api_key
  const key1 =
    process.env.gemini_api_key ||
    process.env.GEMINI_API_KEY ||
    process.env.gemini_api_key1 ||
    process.env.GEMINI_API_KEY1 ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (key1) {
    keys.push({ name: 'gemini_api_key', key: key1 });
  }

  // TERTIARY: gemini_api_key3
  const key3 =
    process.env.gemini_api_key3 ||
    process.env.GEMINI_API_KEY3 ||
    process.env['GEMINI_API-KEY3'] ||
    process.env['gemini_api-key3'];
  if (key3) {
    keys.push({ name: 'gemini_api_key3', key: key3 });
  }

  return keys;
}

/**
 * Call Gemini API with automatic fallback across all available keys
 * @param prompt - The prompt to send to Gemini
 * @param options - Optional configuration
 */
export async function callGeminiWithAllKeysFallback(
  prompt: string | any,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    userId?: string;
    action?: string;
    endpoint?: string;
  }
): Promise<string> {
  const apiKeys = getAllGeminiApiKeys();

  if (apiKeys.length === 0) {
    throw new Error('No Gemini API keys configured. Please set gemini_api_key, gemini_api_key2, or gemini_api_key3');
  }

  let lastError: Error | null = null;

  for (let i = 0; i < apiKeys.length; i++) {
    const { name, key } = apiKeys[i];
    const isLastKey = i === apiKeys.length - 1;

    try {
      console.log(`🔑 Attempting Gemini API call with ${name}...`);
      const genAI = new GoogleGenAI({ apiKey: key });
      
      const primaryModel = options?.model || 'gemini-2.5-flash';
      const fallbackModel = 'gemini-2.0-flash';
      
      const contents = typeof prompt === 'string' 
        ? [{ role: 'user', parts: [{ text: prompt }] }]
        : prompt;

      const callStart = Date.now();
      let result;
      let usedModel = primaryModel;

      try {
        result = await genAI.models.generateContent({
          model: primaryModel,
          contents,
          config: {
            temperature: options?.temperature || 0.7,
            maxOutputTokens: options?.maxTokens || 2048,
          }
        });
      } catch (primaryError) {
        console.warn(`⚠️ ${primaryModel} failed with ${name}, trying ${fallbackModel}...`);
        usedModel = fallbackModel;
        result = await genAI.models.generateContent({
          model: fallbackModel,
          contents,
          config: {
            temperature: options?.temperature || 0.7,
            maxOutputTokens: options?.maxTokens || 2048,
          }
        });
      }

      const latencySeconds = (Date.now() - callStart) / 1000;

      const text = result.text || '';

      if (text) {
        console.log(`✅ Gemini API call successful with ${name} using ${usedModel}`);

        // Try to get token usage if available in the SDK response, otherwise estimate
        const usageMetadata = (result as any).usageMetadata;
        const promptString = typeof prompt === 'string' ? prompt : JSON.stringify(prompt);
        const inputTokens = usageMetadata?.promptTokenCount || Math.ceil(promptString.length / 4);
        const outputTokens = usageMetadata?.candidatesTokenCount || Math.ceil(text.length / 4);
        const tokensUsed = inputTokens + outputTokens;

        // Cost constants
        const INPUT_COST_PER_1M = 0.075;
        const OUTPUT_COST_PER_1M = 0.30;
        const cost = (inputTokens / 1_000_000) * INPUT_COST_PER_1M + (outputTokens / 1_000_000) * OUTPUT_COST_PER_1M;

        // Log the AI usage to ActivityLogService
        try {
          await ActivityLogService.logAI({
            userId: options?.userId,
            model: usedModel,
            tokensUsed,
            cost,
            prompt: promptString.substring(0, 1000), // Log only the first 1000 chars
            responseLength: text.length,
            action: options?.action || 'gemini_fallback_generation',
            endpoint: options?.endpoint || options?.action || 'unknown_endpoint',
            status: 'success'
          });
        } catch (logError) {
          console.error('Failed to log AI usage:', logError);
        }

        // Capture $ai_generation event for PostHog LLM analytics
        try {
          const { getPostHogClient } = await import('@/lib/posthog-server');
          const posthog = getPostHogClient();
          const distinctId = options?.userId || 'anonymous';
          posthog.capture({
            distinctId,
            event: '$ai_generation',
            properties: {
              $ai_trace_id: randomUUID(),
              $ai_provider: 'google',
              $ai_model: usedModel,
              $ai_input_tokens: inputTokens,
              $ai_output_tokens: outputTokens,
              $ai_latency: latencySeconds,
              $ai_total_cost_usd: cost,
              $ai_span_name: options?.action || options?.endpoint || 'gemini_generation',
            },
          });
        } catch (phError) {
          console.error('PostHog $ai_generation capture error (gemini):', phError);
        }

        return text;
      } else {
        throw new Error('Gemini API returned empty response');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isQuota = isQuotaError(error);

      if (isQuota) {
        console.warn(`⚠️ ${name} quota exceeded (429), falling back to next key...`);
      } else {
        console.error(`❌ ${name} failed:`, errorMessage);
      }

      lastError = error instanceof Error ? error : new Error(String(error));

      // If this is the last key, throw the error
      if (isLastKey) {
        throw new Error(`All Gemini API keys failed. Last error (${name}): ${errorMessage}`);
      }

      // Otherwise, continue to next key
      console.log(`⏭️  Continuing to next API key...`);
    }
  }

  throw lastError || new Error('Failed to call Gemini API');
}

