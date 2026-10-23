import { ollamaChat, ollamaHealthCheck } from './ollama-client';
import {
  resolveGeminiModel,
  shouldUseOllama,
} from '@/lib/services/aiModelConfigService';


const GEMINI_API_KEY =
  process.env.gemini_api_key ||
  process.env.GEMINI_API_KEY ||
  process.env.gemini_api_key1 ||
  process.env.GEMINI_API_KEY1;
const OLLAMA_TIMEOUT_MS = 60000;


export interface RouteResult {
  content: string;
  model: string;
  provider: 'ollama' | 'gemini';
  latencyMs: number;
}

export interface AIRouteOptions {
  /**
   * Model hint from the call site. Resolved through aiModelConfigService,
   * which may replace it with the admin-configured primary/fast model.
   */
  model?: string;
}

export async function aiRoute(
  messages: { role: string; content: string }[],
  options?: AIRouteOptions
): Promise<RouteResult> {
  const start = Date.now();

  // Try Ollama first (admin can disable this path in AI settings)
  if (await shouldUseOllama()) {
    if (await ollamaHealthCheck()) {
      try {
        const result = await ollamaChat({ messages: messages as any, timeoutMs: OLLAMA_TIMEOUT_MS });
        return { content: result.content, model: result.model, provider: result.provider as 'ollama', latencyMs: Date.now() - start };
      } catch (err: any) {
        console.warn('[ai-router] Ollama failed, falling back to Gemini:', err.message);
      }
    }
  }


  // Fallback to Gemini
  if (!GEMINI_API_KEY) throw new Error('No AI provider available (Ollama down, no GEMINI_API_KEY)');

  // Single resolution point: admin settings → env → default (see aiModelConfigService)
  const model = await resolveGeminiModel(options?.model);

  const geminiStart = Date.now();
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      }),
    }
  );


  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';


  return { content, model, provider: 'gemini', latencyMs: Date.now() - start };
}
