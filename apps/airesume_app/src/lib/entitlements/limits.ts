/**
 * limits.ts — Usage limit definitions.
 *
 * Limits answer: "How many times can this user do X?"
 * They are separate from features ("can they do it?") and credits.
 *
 * Limits are period-scoped:
 *   daily   → resets at midnight UTC
 *   monthly → resets at billing cycle or 1st of month
 *   total   → lifetime cap (-1 = unlimited)
 *
 * ⚠️ SINGLE SOURCE OF TRUTH — keep in sync with the enforcement configs in
 * `lib/services/autoApplyQuotaService.ts` (PLAN_CONFIGS) and the numbers shown
 * in the paywall/legal copy. Mismatched limits here vs there are exactly how a
 * user ends up at "12 of 10 used" with nothing blocking the next apply.
 */

import { PlanKey } from './plans';

// ─── Limit Key Namespace ─────────────────────────────────────────────────────

export type LimitKey =
  | 'active_jobs'
  | 'journey_cvs'
  | 'auto_apply_daily'
  | 'auto_apply_monthly'
  | 'applications_monthly'
  | 'ai_surgeon_runs_monthly';

export type LimitPeriod = 'daily' | 'monthly' | 'total';

export interface LimitDefinition {
  key: LimitKey;
  period: LimitPeriod;
  /** Default value per plan. -1 = unlimited. */
  defaults: Record<PlanKey, number>;
}

// ─── Limit Registry ──────────────────────────────────────────────────────────

export const LIMITS: LimitDefinition[] = [
  {
    key: 'active_jobs',
    period: 'total',
    defaults: { free: 3, starter: 10, focused: -1 },
  },
  {
    key: 'journey_cvs',
    period: 'total',
    defaults: { free: 3, starter: 10, focused: -1 },
  },
  {
    key: 'auto_apply_daily',
    period: 'daily',
    defaults: { free: 10, starter: 10, focused: 50 },
  },
  {
    key: 'auto_apply_monthly',
    period: 'monthly',
    defaults: { free: 10, starter: 10, focused: -1 },
  },
  {
    key: 'applications_monthly',
    period: 'monthly',
    defaults: { free: 0, starter: 10, focused: -1 },
  },
  {
    key: 'ai_surgeon_runs_monthly',
    period: 'monthly',
    defaults: { free: 10, starter: -1, focused: -1 },
  },
];

// ─── Limit Helpers ───────────────────────────────────────────────────────────

const LIMIT_MAP: Record<LimitKey, LimitDefinition> = Object.fromEntries(
  LIMITS.map((l) => [l.key, l])
) as Record<LimitKey, LimitDefinition>;

/**
 * Get the default limit for a plan and limit key.
 * Returns -1 for unlimited.
 */
export function getDefaultLimit(plan: PlanKey, key: LimitKey): number {
  const def = LIMIT_MAP[key];
  if (!def) return 0;
  return def.defaults[plan] ?? 0;
}

/**
 * Get the period for a limit key.
 */
export function getLimitPeriod(key: LimitKey): LimitPeriod {
  return LIMIT_MAP[key]?.period ?? 'total';
}

/**
 * Check if a limit is unlimited (-1).
 */
export function isUnlimited(limit: number): boolean {
  return limit === -1;
}

/**
 * Calculate remaining quota.
 * Returns null for unlimited.
 */
export function calculateRemaining(limit: number, used: number): number | null {
  if (isUnlimited(limit)) return null;
  return Math.max(0, limit - used);
}

/**
 * Get the limit definition for a key.
 */
export function getLimitDefinition(key: LimitKey): LimitDefinition | undefined {
  return LIMIT_MAP[key];
}
