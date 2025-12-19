/**
 * Shared Gemini API Fallback Utility
 * Provides a simple function for API routes to call Gemini with automatic fallback
 * Supports all 3 API keys: gemini_api_key, gemini_api_key2, gemini_api_key3
 */

import { GoogleGenAI } from '@google/genai';

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
    process.env.GEMINI_API_KEY1;
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
      
      const modelName = options?.model || 'gemini-2.5-flash-lite';
      const contents = typeof prompt === 'string' 
        ? [{ role: 'user', parts: [{ text: prompt }] }]
        : prompt;

      const result = await genAI.models.generateContent({
        model: modelName,
        contents,
        config: {
          temperature: options?.temperature || 0.7,
          maxOutputTokens: options?.maxTokens || 2048,
        }
      });

      const text = result.text || '';

      if (text) {
        console.log(`✅ Gemini API call successful with ${name}`);
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

