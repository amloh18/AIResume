import { callAIWithFallback } from './ai-api-helper';

/**
 * Shared Gemini API Utility
 * Delegated to Vercel AI Gateway via callAIWithFallback for consistency
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
  const promptText = typeof prompt === 'string'
    ? prompt
    : Array.isArray(prompt)
      ? prompt.map((p: any) => p.parts?.map((part: any) => part.text).join('\n') || '').join('\n')
      : JSON.stringify(prompt);

  const res = await callAIWithFallback({
    prompt: promptText,
    model: options?.model,
    temperature: options?.temperature,
    maxTokens: options?.maxTokens,
    userId: options?.userId,
    action: options?.action || 'gemini_all_keys_fallback',
    endpoint: options?.endpoint,
    responseMimeType: options?.responseMimeType,
  });

  return res.content;
}
