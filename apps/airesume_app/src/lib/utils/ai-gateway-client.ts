/**
 * VPS OpenAI-compatible bridge gateway client.
 *
 * The VPS runs a dedicated OpenAI-compatible gateway (port 8100) that fronts
 * local CLI tooling — `agy` CLI (Gemini 3.8 Flash) and `opencode` CLI (free
 * OpenRouter models). It speaks the standard OpenAI REST protocol:
 *
 *   GET  /v1/models            — available models
 *   POST /v1/chat/completions  — chat (stream: false | true, SSE)
 *   GET  /health               — { status, busy_slots, max_slots }
 *
 * Why this module exists: `ai-router` used to talk to Ollama and the Gemini REST
 * API directly. Both are still supported as fallbacks, but the gateway is now
 * the preferred connection layer, so the wire format (OpenAI vs. Google vs.
 * Ollama) lives here instead of leaking into the router.
 *
 * Configuration (all read at call time, never at module load, so tests and
 * container restarts pick up changes):
 *
 *   OPENAI_BASE_URL      e.g. http://<gateway-host>:8100/v1   (enables the gateway)
 *   OPENAI_API_KEY       any string; the gateway bypasses auth (default: dummy-token)
 *   DEFAULT_AI_MODEL     default model id (default: gemini-3.8-flash-medium)
 *   AI_GATEWAY_TIMEOUT_MS per-request timeout (default: 120000 — CLI-backed
 *                        models are slower than a hosted API)
 *
 * The gateway is OPT-IN: with no OPENAI_BASE_URL the router keeps its previous
 * behaviour (Ollama → Gemini) and never pays a connection timeout to an
 * address that may not exist in this environment.
 *
 * Security: the API key is never logged. Error bodies are truncated before they
 * are surfaced, and the gateway is only ever called over the private Docker
 * network or the LAN — never through Cloudflare.
 */

/**
 * Default model id. The base URL has no default on purpose: the gateway is
 * opt-in via OPENAI_BASE_URL, and a hardcoded private-network address here
 * would both leak internal topology into a public repository and make an
 * unconfigured deployment pay a connection timeout to an address that may not
 * exist. See getGatewayBaseUrl().
 */
export const DEFAULT_GATEWAY_MODEL = 'gemini-3.8-flash-medium';
/** Fast tier — short edits, real-time completions. */
export const GATEWAY_FAST_MODEL = 'gemini-3.8-flash-low';
/** Deepest reasoning tier. */
export const GATEWAY_HIGH_MODEL = 'gemini-3.8-flash-high';
/** Free fallback tier (OpenCode CLI → OpenRouter free models). */
export const GATEWAY_FREE_MODEL = 'opencode-free';

/** Model ids the gateway is known to accept. */
export const GATEWAY_MODELS = [
  GATEWAY_FAST_MODEL,
  DEFAULT_GATEWAY_MODEL,
  GATEWAY_HIGH_MODEL,
  GATEWAY_FREE_MODEL,
] as const;

export type GatewayModel = (typeof GATEWAY_MODELS)[number];

export interface GatewayMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GatewayChatOptions {
  messages: GatewayMessage[] | { role: string; content: string }[];
  /** Call-site model hint. Normalised through {@link resolveGatewayModel}. */
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface GatewayChatResult {
  content: string;
  model: string;
  provider: 'gateway';
  latencyMs: number;
}

export interface GatewayHealth {
  status: string;
  busySlots: number | null;
  maxSlots: number | null;
}

const DEFAULT_TIMEOUT_MS = 120_000;

/** Base URL without the trailing slash (empty string when unset). */
export function getGatewayBaseUrl(): string {
  const raw = process.env.OPENAI_BASE_URL?.trim();
  if (!raw) return '';
  return raw.replace(/\/+$/, '');
}

/**
 * True when the gateway is configured for this process. Unset OPENAI_BASE_URL
 * means "not part of this deployment" — the router then skips it entirely.
 */
export function isGatewayConfigured(): boolean {
  return getGatewayBaseUrl().length > 0;
}

/** Any non-empty string works; the gateway does not validate it. */
export function getGatewayApiKey(): string {
  return process.env.OPENAI_API_KEY?.trim() || 'dummy-token';
}

export function getGatewayDefaultModel(): string {
  const configured = process.env.DEFAULT_AI_MODEL?.trim();
  if (!configured) return DEFAULT_GATEWAY_MODEL;
  // Canonical casing for known ids; unknown ids are honoured verbatim so a
  // model added to the gateway does not require an app change.
  return normaliseGatewayModelId(configured) ?? configured;
}

function getGatewayTimeoutMs(override?: number): number {
  if (override && Number.isFinite(override) && override > 0) return override;
  const envValue = Number(process.env.AI_GATEWAY_TIMEOUT_MS);
  if (Number.isFinite(envValue) && envValue > 0) return envValue;
  return DEFAULT_TIMEOUT_MS;
}

/** Canonical casing for a gateway model id, or null when it is not one. */
function normaliseGatewayModelId(value: string): string | null {
  const lower = value.trim().toLowerCase();
  if (!lower) return null;
  const match = GATEWAY_MODELS.find(m => m === lower);
  return match ?? null;
}

/**
 * Translate a call-site / admin model hint into a model the gateway accepts.
 *
 * Call sites and `AdminAISettings` still carry Gemini API ids (`gemini-2.5-flash`,
 * `gemini-2.5-flash-lite`, legacy `gemini-1.5-flash`, sometimes `claude-*`).
 * Those are meaningless to the gateway, so:
 *
 *   - a real gateway id passes through unchanged;
 *   - cheap/lite hints map to the fast tier (`gemini-3.8-flash-low`);
 *   - deep-reasoning hints map to the high tier;
 *   - everything else maps to DEFAULT_AI_MODEL.
 *
 * Mapping here keeps admin settings and per-call hints working without a data
 * migration, and keeps the gateway from receiving ids it cannot route.
 */
export function resolveGatewayModel(hint?: string): string {
  if (!hint) return getGatewayDefaultModel();

  const known = normaliseGatewayModelId(hint);
  if (known) return known;

  const tokens = hintTokens(hint);
  if (tokens.some(t => HIGH_TIER_TOKENS.has(t))) return GATEWAY_HIGH_MODEL;
  if (tokens.some(t => FAST_TIER_TOKENS.has(t))) return GATEWAY_FAST_MODEL;
  return getGatewayDefaultModel();
}

/**
 * Split a model id into comparable tokens. Whole-token comparison matters:
 * a naive substring test for "mini" also matches "geMINI", which would send
 * every Gemini hint to the fast tier.
 */
function hintTokens(model: string): string[] {
  return model.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

const FAST_TIER_TOKENS = new Set(['lite', 'mini', 'nano', 'haiku', 'low']);
const HIGH_TIER_TOKENS = new Set(['high', 'pro', 'thinking', 'reasoning', 'opus']);

function buildHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getGatewayApiKey()}`,
  };
}

/** Trim provider error bodies before they reach a log or an HTTP response. */
function truncate(text: string, max = 500): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

/**
 * Extract text from an OpenAI-compatible completion payload. Some gateways
 * return `message.content` as an array of typed parts instead of a string.
 */
function extractContent(payload: any): string {
  const choice = payload?.choices?.[0];
  const content = choice?.message?.content ?? choice?.delta?.content ?? choice?.text;

  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part: any) => (typeof part === 'string' ? part : part?.text ?? ''))
      .join('');
  }
  return '';
}

async function readErrorBody(res: Response): Promise<string> {
  try {
    return truncate(await res.text());
  } catch {
    return 'unreadable error body';
  }
}

/**
 * Non-streaming chat completion against the gateway.
 *
 * Throws on transport errors, non-2xx responses, and empty completions — the
 * router treats every throw as "try the next provider".
 */
export async function gatewayChat(options: GatewayChatOptions): Promise<GatewayChatResult> {
  const baseUrl = getGatewayBaseUrl();
  if (!baseUrl) throw new Error('OPENAI_BASE_URL is not configured');

  const model = resolveGatewayModel(options.model);
  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getGatewayTimeoutMs(options.timeoutMs));

  try {
    const body: Record<string, unknown> = {
      model,
      messages: options.messages,
      stream: false,
    };
    if (typeof options.temperature === 'number') body.temperature = options.temperature;
    if (typeof options.maxTokens === 'number') body.max_tokens = options.maxTokens;

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: buildHeaders(),
      signal: controller.signal,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Gateway ${res.status}: ${await readErrorBody(res)}`);
    }

    const payload = await res.json();
    const content = extractContent(payload);
    if (!content) throw new Error('Gateway returned an empty completion');

    // Some gateways echo the model as a string, some nest it; keep the id we
    // sent when the response is not a plain string.
    const reportedModel = typeof payload?.model === 'string' ? payload.model : model;

    return { content, model: reportedModel, provider: 'gateway', latencyMs: Date.now() - started };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Gateway request timed out after ${getGatewayTimeoutMs(options.timeoutMs)}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Streaming chat completion (SSE). Yields incremental text deltas so a future
 * streaming UI route can reuse the same connection layer. Nothing in the app
 * streams AI output yet; `aiRoute` deliberately stays request/response.
 */
export async function* gatewayChatStream(options: GatewayChatOptions): AsyncGenerator<string, void, unknown> {
  const baseUrl = getGatewayBaseUrl();
  if (!baseUrl) throw new Error('OPENAI_BASE_URL is not configured');

  const model = resolveGatewayModel(options.model);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getGatewayTimeoutMs(options.timeoutMs));

  try {
    const body: Record<string, unknown> = {
      model,
      messages: options.messages,
      stream: true,
    };
    if (typeof options.temperature === 'number') body.temperature = options.temperature;
    if (typeof options.maxTokens === 'number') body.max_tokens = options.maxTokens;

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: buildHeaders(),
      signal: controller.signal,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Gateway ${res.status}: ${await readErrorBody(res)}`);
    }
    if (!res.body) throw new Error('Gateway returned no response body');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE events are newline-delimited; keep the trailing partial line.
      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (!line.startsWith('data:')) continue;

        const data = line.slice(5).trim();
        if (!data || data === '[DONE]') continue;

        try {
          const delta = extractContent(JSON.parse(data));
          if (delta) yield delta;
        } catch {
          // Ignore keep-alives and malformed frames rather than killing the stream.
        }
      }
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Gateway stream timed out after ${getGatewayTimeoutMs(options.timeoutMs)}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Read the gateway's /health endpoint. `/health` sits on the origin, not under
 * /v1, so the version suffix is stripped. Returns null when unreachable.
 */
export async function getGatewayHealth(timeoutMs = 5000): Promise<GatewayHealth | null> {
  const baseUrl = getGatewayBaseUrl();
  if (!baseUrl) return null;

  const origin = baseUrl.replace(/\/v1$/, '');
  try {
    const res = await fetch(`${origin}/health`, {
      headers: { Authorization: `Bearer ${getGatewayApiKey()}` },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const payload: any = await res.json();
    return {
      status: String(payload?.status ?? 'unknown'),
      busySlots: typeof payload?.busy_slots === 'number' ? payload.busy_slots : null,
      maxSlots: typeof payload?.max_slots === 'number' ? payload.max_slots : null,
    };
  } catch {
    return null;
  }
}

/** Boolean probe used by the deep health check. */
export async function gatewayHealthCheck(timeoutMs = 5000): Promise<boolean> {
  const health = await getGatewayHealth(timeoutMs);
  return health !== null && health.status !== 'unhealthy';
}

/** Slot availability, so heavy tasks can wait instead of queueing blind. */
export async function gatewayHasFreeSlot(): Promise<boolean> {
  const health = await getGatewayHealth();
  if (!health) return false;
  if (health.maxSlots === null || health.busySlots === null) return true;
  return health.busySlots < health.maxSlots;
}
