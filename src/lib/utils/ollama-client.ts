const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://192.168.1.8:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma3:4b';


interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}


interface ChatOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}


export async function ollamaChat({ messages, temperature = 0.7, maxTokens = 2048, timeoutMs = 60000 }: ChatOptions) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);


  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false,
        options: { temperature, num_predict: maxTokens },
      }),
    });


    if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return { content: data.message?.content || '', model: OLLAMA_MODEL, provider: 'ollama' };
  } finally {
    clearTimeout(timeout);
  }
}


export async function ollamaHealthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch { return false; }
}
