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
 * Get available Gemini API keys in priority order
 * Checks both naming conventions: GEMINI_API_KEY/gemini_api_key and GEMINI_API_KEY2/gemini_api_key2
 */
function getGeminiApiKeys(): Array<{ name: string; key: string }> {
  const keys: Array<{ name: string; key: string }> = [];
  
  // Primary: Check multiple naming conventions
  const primaryKey = 
    process.env.gemini_api_key || 
    process.env.GEMINI_API_KEY ||
    process.env.gemini_api_key1 ||
    process.env.GEMINI_API_KEY1;
  
  if (primaryKey) {
    keys.push({
      name: 'gemini_api_key',
      key: primaryKey
    });
  }
  
  // Fallback: Check multiple naming conventions for second key
  const fallbackKey = 
    process.env.gemini_api_key2 || 
    process.env.GEMINI_API_KEY2 ||
    process.env['GEMINI_API-KEY2'] ||
    process.env['gemini_api-key2'];
  
  if (fallbackKey) {
    keys.push({
      name: 'gemini_api_key2',
      key: fallbackKey
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
 * Tries gemini_api_key first, then gemini_api_key2
 */
export async function callGeminiWithFallback(options: GeminiCallOptions): Promise<GeminiResponse> {
  const apiKeys = getGeminiApiKeys();
  
  if (apiKeys.length === 0) {
    throw new Error('No Gemini API keys configured. Please set gemini_api_key or gemini_api_key2');
  }
  
  let lastError: Error | null = null;
  
  for (const { name, key } of apiKeys) {
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
      console.error(`❌ ${name} failed:`, errorMessage);
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // If this is the last key, throw the error
      if (apiKeys.indexOf(apiKeys.find(k => k.name === name)!) === apiKeys.length - 1) {
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

