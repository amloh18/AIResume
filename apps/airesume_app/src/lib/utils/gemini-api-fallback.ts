/**
 * Shared AI API Utility
 *
 * Provides a single wrapper for API routes to call AI.
 * Uses Ollama (gemma3:4b) as primary, Gemini as fallback.
 *
 * Key resolution (checked in priority order):
 *   1. gemini_api_key
 *   2. GEMINI_API_KEY
 *   3. gemini_api_key1
 *   4. GEMINI_API_KEY1
 *
 * Hard-fails at startup if none of the above is configured.
 *
 * The public function is intentionally named callGeminiWithAllKeysFallback for
 * backwards compatibility with existing importers, but it uses exactly one key.
 */

import { ActivityLogService } from '@/lib/services/activityLogService';
import { randomUUID } from 'crypto';
import { aiRoute } from '@/lib/utils/ai-router';

/**
 * Call AI API — Ollama (gemma3:4b) primary, Gemini fallback.
 * Accepts a string prompt or a messages array.
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
  // Build messages for the router
  const messages: { role: string; content: string }[] = [];
  if (typeof prompt === 'string') {
    messages.push({ role: 'user', content: prompt });
  } else if (Array.isArray(prompt)) {
    // Already a messages array (e.g., from Gemini SDK format)
    for (const msg of prompt) {
      const role = msg.role === 'model' ? 'assistant' : (msg.role || 'user');
      const text = msg.parts?.[0]?.text || msg.content || '';
      if (text) messages.push({ role, content: text });
    }
  } else {
    messages.push({ role: 'user', content: JSON.stringify(prompt) });
  }

  try {
    console.log(`🔑 Attempting AI call (Ollama → Gemini fallback)...`);
    const callStart = Date.now();
    const result = await aiRoute(messages);
    const latencySeconds = (Date.now() - callStart) / 1000;

    if (result.content) {
      console.log(`✅ AI call successful using ${result.provider} (${result.model}). Length: ${result.content.length} chars.`);

      const promptString = typeof prompt === 'string' ? prompt : JSON.stringify(prompt);
      const tokensUsed = Math.ceil((promptString.length + result.content.length) / 4);
      const cost = result.provider === 'ollama' ? 0 : (tokensUsed / 1_000_000) * 0.075;

      try {
        await ActivityLogService.logAI({
          userId: options?.userId,
          model: result.model,
          tokensUsed,
          cost,
          prompt: promptString.substring(0, 1000),
          responseLength: result.content.length,
          action: options?.action || 'ai_generation',
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
            $ai_provider: result.provider === 'ollama' ? 'ollama' : 'google',
            $ai_model: result.model,
            $ai_input_tokens: Math.ceil(promptString.length / 4),
            $ai_output_tokens: Math.ceil(result.content.length / 4),
            $ai_latency: latencySeconds,
            $ai_total_cost_usd: cost,
            $ai_span_name: options?.action || options?.endpoint || 'ai_generation',
          },
        });
      } catch (phError) {
        console.error('PostHog $ai_generation capture error:', phError);
      }

      return result.content;
    } else {
      throw new Error('AI API returned empty response');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`AI API error: ${errorMessage}`);
  }
}
