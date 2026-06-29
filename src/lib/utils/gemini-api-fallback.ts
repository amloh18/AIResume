/**
 * Shared Gemini API Utility
 *
 * Provides a single-key wrapper for API routes to call Gemini.
 *
 * Key resolution (checked in priority order):
 *   1. gemini_api_key
 *   2. GEMINI_API_KEY
 *   3. gemini_api_key1
 *   4. GEMINI_API_KEY1
 *   5. NEXT_PUBLIC_GEMINI_API_KEY
 *
 * Hard-fails at startup if none of the above is configured.
 *
 * The public function is intentionally named callGeminiWithAllKeysFallback for
 * backwards compatibility with existing importers, but it uses exactly one key.
 */

import { GoogleGenAI } from '@google/genai';
import { ActivityLogService } from '@/lib/services/activityLogService';
import { randomUUID } from 'crypto';

/**
 * Get the Gemini API key
 * Falls back to GEMINI_API_KEY, gemini_api_key1, GEMINI_API_KEY1, then NEXT_PUBLIC_GEMINI_API_KEY
 * Hard-fails if none is configured.
 */
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

/**
 * Call Gemini API
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
    responseMimeType?: string;
  }
): Promise<string> {
  const apiKey = getGeminiApiKey();

  try {
    console.log(`🔑 Attempting Gemini API call...`);
    const genAI = new GoogleGenAI({ apiKey });

    const primaryModel = options?.model || 'gemini-2.5-flash-lite';
    const fallbackModel = 'gemini-2.5-flash';

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
          responseMimeType: options?.responseMimeType,
        }
      });
    } catch (primaryError) {
      console.warn(`⚠️ ${primaryModel} failed, trying ${fallbackModel}...`);
      usedModel = fallbackModel;
      result = await genAI.models.generateContent({
        model: fallbackModel,
        contents,
        config: {
          temperature: options?.temperature || 0.7,
          maxOutputTokens: options?.maxTokens || 2048,
          responseMimeType: options?.responseMimeType,
        }
      });
    }

    const latencySeconds = (Date.now() - callStart) / 1000;
    const text = result.text || '';

    if (text) {
      console.log(`✅ Gemini API call successful using ${usedModel}. Length: ${text.length} chars.`);
      if ((result as any).candidates?.[0]) {
        const candidate = (result as any).candidates[0];
        console.log(`Debug Gemini candidate: finishReason=${candidate.finishReason}, safetyRatings=${JSON.stringify(candidate.safetyRatings)}`);
      }

      const usageMetadata = (result as any).usageMetadata;
      const promptString = typeof prompt === 'string' ? prompt : JSON.stringify(prompt);
      const inputTokens = usageMetadata?.promptTokenCount || Math.ceil(promptString.length / 4);
      const outputTokens = usageMetadata?.candidatesTokenCount || Math.ceil(text.length / 4);
      const tokensUsed = inputTokens + outputTokens;

      const INPUT_COST_PER_1M = 0.075;
      const OUTPUT_COST_PER_1M = 0.30;
      const cost = (inputTokens / 1_000_000) * INPUT_COST_PER_1M + (outputTokens / 1_000_000) * OUTPUT_COST_PER_1M;

      try {
        await ActivityLogService.logAI({
          userId: options?.userId,
          model: usedModel,
          tokensUsed,
          cost,
          prompt: promptString.substring(0, 1000),
          responseLength: text.length,
          action: options?.action || 'gemini_generation',
          endpoint: options?.endpoint || options?.action || 'unknown_endpoint',
          status: 'success'
        });
      } catch (logError) {
        console.error('Failed to log AI usage:', logError);
      }

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
    throw new Error(`Gemini API error: ${errorMessage}`);
  }
}
