/**
 * Gemini API Helper Utility
 * Provides unified interface for Google Gemini API calls with gemini_api_key and gemini_api_key2 fallback
 * Uses @google/genai package with gemini-2.5-flash-lite model
 */

import { GoogleGenAI } from '@google/genai';

interface GeminiCallOptions {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

interface GeminiResponse {
  content: string;
  provider: 'gemini';
  apiKeyUsed: string;
}

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
 * Get available Gemini API keys in priority order
 * Checks all three keys: gemini_api_key, gemini_api_key2, gemini_api_key3
 * Priority: gemini_api_key2 first (primary), then gemini_api_key, then gemini_api_key3
 */
function getGeminiApiKeys(): Array<{ name: string; key: string }> {
  const keys: Array<{ name: string; key: string }> = [];

  // PRIMARY: Try gemini_api_key2 first (check multiple naming conventions)
  const primaryKey =
    process.env.gemini_api_key2 ||
    process.env.GEMINI_API_KEY2 ||
    process.env['GEMINI_API-KEY2'] ||
    process.env['gemini_api-key2'];

  if (primaryKey) {
    keys.push({
      name: 'gemini_api_key2',
      key: primaryKey
    });
  }

  // SECONDARY: Use gemini_api_key
  const secondaryKey =
    process.env.gemini_api_key ||
    process.env.GEMINI_API_KEY ||
    process.env.gemini_api_key1 ||
    process.env.GEMINI_API_KEY1;

  if (secondaryKey) {
    keys.push({
      name: 'gemini_api_key',
      key: secondaryKey
    });
  }

  // TERTIARY: Use gemini_api_key3 as final fallback
  const tertiaryKey =
    process.env.gemini_api_key3 ||
    process.env.GEMINI_API_KEY3 ||
    process.env['GEMINI_API-KEY3'] ||
    process.env['gemini_api-key3'];

  if (tertiaryKey) {
    keys.push({
      name: 'gemini_api_key3',
      key: tertiaryKey
    });
  }

  return keys;
}

/**
 * Call Gemini API using @google/genai package
 */
async function callGemini(options: GeminiCallOptions, apiKey: string): Promise<string> {
  try {
    const genAI = new GoogleGenAI({ apiKey });

    // Use gemini-2.5-flash-lite as default for speed and cost efficiency
    const modelName = options.model || 'gemini-2.5-flash-lite';

    // Combine system prompt and user prompt
    let fullPrompt = options.prompt;
    if (options.systemPrompt) {
      fullPrompt = `${options.systemPrompt}\n\n${options.prompt}`;
    }

    // Generate content using the new SDK API
    const result = await genAI.models.generateContent({
      model: modelName,
      contents: fullPrompt,
      config: {
        temperature: options.temperature || 0.7,
        maxOutputTokens: options.maxTokens || 2048,
      }
    });

    const text = result.text || '';

    if (!text) {
      throw new Error('Gemini API returned empty response');
    }

    return text;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Gemini API error: ${errorMessage}`);
  }
}

/**
 * Call Gemini API with automatic fallback
 * Tries all available keys: gemini_api_key2 (primary), gemini_api_key, gemini_api_key3
 * Automatically falls back to next key on quota/rate limit errors
 */
export async function callGeminiWithFallback(options: GeminiCallOptions): Promise<GeminiResponse> {
  const apiKeys = getGeminiApiKeys();

  if (apiKeys.length === 0) {
    throw new Error('No Gemini API keys configured. Please set gemini_api_key, gemini_api_key2, or gemini_api_key3');
  }

  let lastError: Error | null = null;

  for (let i = 0; i < apiKeys.length; i++) {
    const { name, key } = apiKeys[i];
    const isLastKey = i === apiKeys.length - 1;
    
    try {
      console.log(`🔑 Attempting Gemini API call with ${name}...`);

      const content = await callGemini(options, key);

      console.log(`✅ Gemini API call successful with ${name}`);
      return {
        content,
        provider: 'gemini',
        apiKeyUsed: name
      };
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

/**
 * Check if Gemini API keys are available
 */
export function hasGeminiApiKeys(): boolean {
  return getGeminiApiKeys().length > 0;
}

/**
 * Get the name of the available API keys (for logging)
 */
export function getAvailableGeminiKeys(): string[] {
  return getGeminiApiKeys().map(k => k.name);
}

/**
 * Legacy compatibility: Alias for callGeminiWithFallback
 * This maintains backward compatibility with existing code
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

