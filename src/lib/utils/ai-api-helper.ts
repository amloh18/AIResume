/**
 * AI API Helper Utility
 * Provides unified interface for AI API calls with ChatGPT_API_KEY and PERPLEXITY_API_KEY fallback
 */

interface AICallOptions {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

interface AIResponse {
  content: string;
  provider: 'openai' | 'perplexity';
}

/**
 * Get available AI API keys in priority order
 */
function getAIApiKeys(): Array<{ name: string; key: string; provider: 'openai' | 'perplexity' }> {
  const keys: Array<{ name: string; key: string; provider: 'openai' | 'perplexity' }> = [];
  
  // Primary: ChatGPT_API_KEY (OpenAI)
  if (process.env.ChatGPT_API_KEY) {
    keys.push({
      name: 'ChatGPT_API_KEY',
      key: process.env.ChatGPT_API_KEY,
      provider: 'openai'
    });
  }
  
  // Fallback: PERPLEXITY_API_KEY
  if (process.env.PERPLEXITY_API_KEY) {
    keys.push({
      name: 'PERPLEXITY_API_KEY',
      key: process.env.PERPLEXITY_API_KEY,
      provider: 'perplexity'
    });
  }
  
  return keys;
}

/**
 * Call OpenAI API
 */
async function callOpenAI(options: AICallOptions, apiKey: string): Promise<string> {
  const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
  
  const messages = [];
  if (options.systemPrompt) {
    messages.push({
      role: 'system',
      content: options.systemPrompt
    });
  }
  messages.push({
    role: 'user',
    content: options.prompt
  });
  
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model || 'gpt-4o-mini',
      messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2048,
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
  }
  
  const data = await response.json();
  
  if (!data.choices || data.choices.length === 0 || !data.choices[0].message?.content) {
    throw new Error('OpenAI API returned empty response');
  }
  
  return data.choices[0].message.content;
}

/**
 * Call Perplexity API
 */
async function callPerplexity(options: AICallOptions, apiKey: string): Promise<string> {
  const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
  
  const messages = [];
  if (options.systemPrompt) {
    messages.push({
      role: 'system',
      content: options.systemPrompt
    });
  }
  messages.push({
    role: 'user',
    content: options.prompt
  });
  
  const response = await fetch(PERPLEXITY_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model || 'sonar-pro-chat',
      messages,
      max_tokens: options.maxTokens || 2048,
      temperature: options.temperature || 0.7,
      top_p: 0.95,
      stream: false
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Perplexity API error: ${response.status} - ${errorData}`);
  }
  
  const data = await response.json();
  
  if (!data.choices || data.choices.length === 0 || !data.choices[0].message?.content) {
    throw new Error('Perplexity API returned empty response');
  }
  
  return data.choices[0].message.content;
}

/**
 * Call AI API with automatic fallback
 * Tries ChatGPT_API_KEY first, then PERPLEXITY_API_KEY
 */
export async function callAIWithFallback(options: AICallOptions): Promise<AIResponse> {
  const apiKeys = getAIApiKeys();
  
  if (apiKeys.length === 0) {
    throw new Error('No AI API keys configured. Please set ChatGPT_API_KEY or PERPLEXITY_API_KEY');
  }
  
  let lastError: Error | null = null;
  
  for (const { name, key, provider } of apiKeys) {
    try {
      console.log(`🔑 Attempting AI API call with ${name} (${provider})...`);
      
      let content: string;
      if (provider === 'openai') {
        content = await callOpenAI(options, key);
      } else {
        content = await callPerplexity(options, key);
      }
      
      console.log(`✅ AI API call successful with ${name} (${provider})`);
      return {
        content,
        provider
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ ${name} (${provider}) failed:`, errorMessage);
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // If this is the last key, throw the error
      if (apiKeys.indexOf(apiKeys.find(k => k.name === name)!) === apiKeys.length - 1) {
        throw new Error(`All AI API keys failed. Last error (${name}): ${errorMessage}`);
      }
      
      // Otherwise, continue to next key
      console.log(`⏭️  Continuing to next API key...`);
    }
  }
  
  throw lastError || new Error('Failed to call AI API');
}

/**
 * Check if AI API keys are available
 */
export function hasAIApiKeys(): boolean {
  return getAIApiKeys().length > 0;
}

/**
 * Get the name of the available API keys (for logging)
 */
export function getAvailableAIKeys(): string[] {
  return getAIApiKeys().map(k => k.name);
}

