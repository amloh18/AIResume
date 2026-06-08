/**
 * AI API Helper Utility
 * Provides unified interface for Google Gemini API calls using gemini_api_key
 * Uses @google/genai package with gemini-2.5-flash (model fallback to gemini-2.0-flash)
 */

import { GoogleGenAI } from '@google/genai';
import { ActivityLogService } from '@/lib/services/activityLogService';

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
  provider: 'gemini';
  apiKeyUsed?: string;
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
 * Get available Gemini API key
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
 * Call Gemini API using @google/genai package
 */
async function callGemini(options: AICallOptions, apiKey: string): Promise<string> {
  try {
    const genAI = new GoogleGenAI({ apiKey });

    // Use gemini-2.5-flash as default for speed and cost efficiency
    const primaryModel = options.model || 'gemini-2.5-flash';
    const fallbackModel = 'gemini-2.0-flash';

    // Combine system prompt and user prompt
    let fullPrompt = options.prompt;
    if (options.systemPrompt) {
      fullPrompt = `${options.systemPrompt}\n\n${options.prompt}`;
    }

    let result;
    let usedModel = primaryModel;

    try {
      // Generate content using the new SDK API
      result = await genAI.models.generateContent({
        model: primaryModel,
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        config: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.maxTokens || 2048,
          responseMimeType: options.responseMimeType,
          responseSchema: options.responseSchema,
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
          responseMimeType: options.responseMimeType,
          responseSchema: options.responseSchema,
        }
      });
    }

    const text = result.text;

    if (!text) {
      throw new Error('Gemini API returned empty response');
    }

    // Try to get token usage if available in the SDK response, otherwise estimate
    const usageMetadata = (result as any).usageMetadata;
    const inputTokens = usageMetadata?.promptTokenCount || Math.ceil(fullPrompt.length / 4);
    const outputTokens = usageMetadata?.candidatesTokenCount || Math.ceil(text.length / 4);
    const tokensUsed = inputTokens + outputTokens;
    
    // Cost constants (using gemini flash lite / 1.5 flash pricing)
    const INPUT_COST_PER_1M = 0.075;
    const OUTPUT_COST_PER_1M = 0.30;
    const cost = (inputTokens / 1_000_000) * INPUT_COST_PER_1M + (outputTokens / 1_000_000) * OUTPUT_COST_PER_1M;

    // Log the AI usage to ActivityLogService
    try {
      await ActivityLogService.logAI({
        userId: options.userId,
        model: usedModel,
        tokensUsed,
        cost,
        prompt: fullPrompt.substring(0, 1000), // Log only the first 1000 chars of prompt
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
 * Call Gemini API using the configured key
 */
export async function callAIWithFallback(options: AICallOptions): Promise<AIResponse> {
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



