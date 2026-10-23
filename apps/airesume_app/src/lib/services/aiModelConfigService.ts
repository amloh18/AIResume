/**
 * aiModelConfigService — the single resolution point for AI model selection.
 *
 * Why this exists: the Gemini model used to be hardcoded per call site (~10
 * files) or read from the GEMINI_MODEL env var at module load. Changing the
 * model required a redeploy, and per-call strings drifted (`gemini-1.5-flash`
 * in mori-chat vs `gemini-2.5-flash` elsewhere).
 *
 * Now the admin panel edits one MongoDB singleton (AdminAISettings) and this
 * service serves it to every AI call through `ai-router`. Resolution order:
 *
 *   1. AdminAISettings document (runtime, admin-controlled)
 *   2. GEMINI_MODEL env var
 *   3. Built-in defaults (gemini-2.5-flash / gemini-2.5-flash-lite)
 *
 * The document is cached in-process (60s TTL) so hot AI paths never wait on a
 * DB round-trip, and every failure falls back rather than throwing — model
 * selection must never take down an AI request.
 */

import AdminAISettings, { IAdminAISettings } from '@/models/admin/AdminAISettings';

export interface AIModelConfig {
  primaryModel: string;
  fastModel: string;
  overridePerCallModels: boolean;
  useOllama: boolean;
  defaultTemperature?: number;
  /** Where the effective config came from, for the admin UI. */
  source: 'admin' | 'env' | 'default';
}

const ENV_MODEL =
  process.env.GEMINI_MODEL ||
  process.env.gemini_model ||
  '';

const DEFAULT_PRIMARY = 'gemini-2.5-flash';
const DEFAULT_FAST = 'gemini-2.5-flash-lite';

const CACHE_TTL_MS = 60_000;

let cache: { config: AIModelConfig; fetchedAt: number } | null = null;
/** In-flight promise so concurrent AI calls share one DB lookup. */
let inFlight: Promise<AIModelConfig> | null = null;

function fallbackConfig(): AIModelConfig {
  return {
    primaryModel: ENV_MODEL || DEFAULT_PRIMARY,
    fastModel: DEFAULT_FAST,
    overridePerCallModels: false,
    useOllama: true,
    source: ENV_MODEL ? 'env' : 'default',
  };
}

/**
 * Fetch the effective AI model config. Never throws; falls back to env/defaults.
 */
export async function getAIModelConfig(): Promise<AIModelConfig> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.config;
  }

  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      // Skip DB access at build time (same guard pattern as userSyncService).
      if (process.env.NEXT_PHASE === 'phase-production-build') {
        return fallbackConfig();
      }

      const { getConnection } = await import('@/lib/database');
      await getConnection();

      const doc = (await AdminAISettings.findOne().lean()) as IAdminAISettings | null;

      if (!doc) {
        const config = fallbackConfig();
        cache = { config, fetchedAt: Date.now() };
        return config;
      }

      const config: AIModelConfig = {
        primaryModel: doc.primaryModel || ENV_MODEL || DEFAULT_PRIMARY,
        fastModel: doc.fastModel || DEFAULT_FAST,
        overridePerCallModels: !!doc.overridePerCallModels,
        useOllama: doc.useOllama !== false,
        defaultTemperature: doc.defaultTemperature,
        source: 'admin',
      };
      cache = { config, fetchedAt: Date.now() };
      return config;
    } catch (error) {
      console.warn('[aiModelConfigService] Falling back to env/default config:', error);
      return fallbackConfig();
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/**
 * Resolve the concrete Gemini model for a request.
 *
 * @param requestedModel Model hint from the call site (may be undefined).
 *                       Lite/flash-lite hints map to the admin `fastModel`.
 * @returns The model string to send to Gemini. Always defined.
 */
export async function resolveGeminiModel(requestedModel?: string): Promise<string> {
  const config = await getAIModelConfig();

  // No hint from the call site → primary model.
  if (!requestedModel) return config.primaryModel;

  // Admin override replaces every per-call hint. Lite hints map to fastModel.
  if (config.overridePerCallModels) {
    return isFastModelHint(requestedModel) ? config.fastModel : config.primaryModel;
  }

  // No override: honor the call site's choice verbatim.
  return requestedModel;
}

/** True when a model hint denotes the lightweight/cheap tier. */
function isFastModelHint(model: string): boolean {
  const m = model.toLowerCase();
  return m.includes('lite') || m.includes('flash-lite') || m.includes('haiku') || m.includes('mini');
}

/** Whether the Ollama-first path should be attempted. */
export async function shouldUseOllama(): Promise<boolean> {
  const config = await getAIModelConfig();
  return config.useOllama;
}

/**
 * Persist admin edits. Upserts the singleton and busts the cache immediately
 * so the next AI call picks up the change without waiting out the TTL.
 */
export async function updateAIModelConfig(
  updates: Partial<Pick<IAdminAISettings, 'primaryModel' | 'fastModel' | 'overridePerCallModels' | 'useOllama' | 'defaultTemperature'>>,
  updatedBy?: string
): Promise<AIModelConfig> {
  const { getConnection } = await import('@/lib/database');
  await getConnection();

  const doc = await AdminAISettings.findOneAndUpdate(
    {},
    { $set: { ...updates, ...(updatedBy ? { updatedBy } : {}) } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  cache = null;

  const config: AIModelConfig = {
    primaryModel: (doc as any)?.primaryModel || ENV_MODEL || DEFAULT_PRIMARY,
    fastModel: (doc as any)?.fastModel || DEFAULT_FAST,
    overridePerCallModels: !!(doc as any)?.overridePerCallModels,
    useOllama: (doc as any)?.useOllama !== false,
    defaultTemperature: (doc as any)?.defaultTemperature,
    source: 'admin',
  };
  cache = { config, fetchedAt: Date.now() };
  return config;
}

/** Bust the in-process cache (used after admin writes from other routes). */
export function invalidateAIModelConfigCache(): void {
  cache = null;
}
