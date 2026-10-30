import EmailAutomation from '@/models/EmailAutomation';
import {
  AUTOMATION_CATALOG,
  getDefaultAutomation,
  renderAutomationTemplate,
  type AutomationDefinition,
} from '@/lib/email-automations';
import { triggerService, type RecipientLike } from './triggerEmailService';

/**
 * Resolves automation configuration (`DB override ?? code default`) and sends
 * lifecycle emails. Used by event handlers and by the scheduled trigger cron.
 */
export interface ResolvedAutomation extends AutomationDefinition {
  stats?: { sent: number; lastSentAt?: Date; lastError?: string };
  updatedAt?: Date;
}

const CACHE_TTL_MS = 60 * 1000;

let cache: { at: number; configs: Map<string, ResolvedAutomation> } | null = null;

function mergeConfig(
  def: AutomationDefinition,
  doc: any | null
): ResolvedAutomation {
  if (!doc) return { ...def };

  return {
    ...def,
    enabled: doc.enabled ?? def.enabled,
    triggerType: doc.triggerType ?? def.triggerType,
    event: doc.event ?? def.event,
    delayHours: doc.delayHours ?? def.delayHours,
    anchor: doc.anchor ?? def.anchor,
    schedule: doc.schedule ?? def.schedule,
    subject: doc.subject || def.subject,
    previewText: doc.previewText ?? def.previewText,
    htmlContent: doc.htmlContent || def.htmlContent,
    fromName: doc.fromName ?? def.fromName,
    fromEmail: doc.fromEmail ?? def.fromEmail,
    audience: { ...def.audience, ...(doc.audience || {}) },
    digest: def.digest ? { ...def.digest, ...(doc.digest || {}) } : doc.digest,
    stats: doc.stats,
    updatedAt: doc.updatedAt,
  };
}

export async function getAllAutomationConfigs(forceRefresh = false): Promise<ResolvedAutomation[]> {
  if (!forceRefresh && cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return AUTOMATION_CATALOG.map(
      (def) => cache!.configs.get(def.key) || { ...def }
    );
  }

  let docs: any[] = [];
  try {
    docs = await EmailAutomation.find({}).lean();
  } catch (error) {
    console.error('[EmailAutomation] Failed to load overrides, using defaults:', error);
  }

  const byKey = new Map(docs.map((doc) => [doc.key, doc]));
  const configs = new Map<string, ResolvedAutomation>();
  for (const def of AUTOMATION_CATALOG) {
    configs.set(def.key, mergeConfig(def, byKey.get(def.key) || null));
  }

  cache = { at: Date.now(), configs };
  return AUTOMATION_CATALOG.map((def) => configs.get(def.key)!);
}

export async function getAutomationConfig(
  key: string,
  forceRefresh = false
): Promise<ResolvedAutomation | null> {
  const def = getDefaultAutomation(key);
  if (!def) return null;

  if (!forceRefresh && cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.configs.get(key) || { ...def };
  }

  let doc: any = null;
  try {
    doc = await EmailAutomation.findOne({ key }).lean();
  } catch (error) {
    console.error(`[EmailAutomation] Failed to load '${key}', using default:`, error);
  }
  return mergeConfig(def, doc);
}

export function invalidateAutomationCache(): void {
  cache = null;
}

export interface AutomationAudienceState {
  planId?: string | null;
  cvCount?: number;
  onboardingComplete?: boolean;
}

/** Normalises plan ids so `starter_monthly` and `free` are both treated as free. */
export function normalizePlanId(planId?: string | null): string {
  if (!planId) return 'free';
  return planId === 'starter_monthly' ? 'free' : planId;
}

export function meetsAudience(
  config: ResolvedAutomation,
  state: AutomationAudienceState
): boolean {
  const audience = config.audience || {};
  const plan = normalizePlanId(state.planId);

  if (audience.plans?.length) {
    const allowed = audience.plans.map(normalizePlanId);
    if (!allowed.includes(plan)) return false;
  }
  if (audience.requireCv && !(state.cvCount && state.cvCount > 0)) return false;
  if (audience.excludeWithCv && state.cvCount && state.cvCount > 0) return false;
  if (audience.onboardingIncomplete && state.onboardingComplete) return false;

  return true;
}

/**
 * Sends a lifecycle automation if it is enabled. Duplicate sends per user and
 * automation key are suppressed — event handlers can call this safely on retry.
 */
export async function sendAutomationEmail(
  key: string,
  user: RecipientLike,
  data: Record<string, any> = {},
  options: { checkDuplicate?: boolean } = {}
): Promise<boolean> {
  const config = await getAutomationConfig(key);
  if (!config) {
    console.error(`[EmailAutomation] Unknown automation '${key}'.`);
    return false;
  }
  if (!config.enabled) {
    return false;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://buildairesume.com';
  const renderedSubject = renderAutomationTemplate(config.subject, {
    ...data,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    appUrl,
  });

  return triggerService.sendCustom(
    {
      key,
      name: config.name,
      category: config.category,
      subject: renderedSubject,
      htmlContent: config.htmlContent,
      previewText: config.previewText,
      fromName: config.fromName,
      fromEmail: config.fromEmail,
      tags: ['automated', config.category, key],
    },
    user,
    {
      ...data,
      appUrl,
    },
    options.checkDuplicate ?? true
  );
}
