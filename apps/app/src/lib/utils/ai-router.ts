import { ollamaChat, ollamaHealthCheck } from './ollama-client';


const GEMINI_API_KEY =
  process.env.gemini_api_key ||
  process.env.GEMINI_API_KEY ||
  process.env.gemini_api_key1 ||
  process.env.GEMINI_API_KEY1 ||
  process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const OLLAMA_TIMEOUT_MS = 60000;


export interface RouteResult {
  content: string;
  model: string;
  provider: 'ollama' | 'gemini';
  latencyMs: number;
}


export async function aiRoute(messages: { role: string; content: string }[]): Promise<RouteResult> {
  const start = Date.now();


  // Try Ollama first
  if (await ollamaHealthCheck()) {
    try {
      const result = await ollamaChat({ messages: messages as any, timeoutMs: OLLAMA_TIMEOUT_MS });
      return { content: result.content, model: result.model, provider: result.provider as 'ollama', latencyMs: Date.now() - start };
    } catch (err: any) {
      console.warn('[ai-router] Ollama failed, falling back to Gemini:', err.message);
    }
  }


  // Fallback to Gemini
  if (!GEMINI_API_KEY) throw new Error('No AI provider available (Ollama down, no GEMINI_API_KEY)');


  const geminiStart = Date.now();
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
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


  return { content, model: GEMINI_MODEL, provider: 'gemini', latencyMs: Date.now() - start };
}
