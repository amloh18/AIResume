/**
 * credits.ts — Credit definitions.
 *
 * Credits are consumable tokens that grant access to specific operations.
 * They are separate from features (permissions) and limits (quotas).
 *
 * Credits are period-scoped and consumed transactionally:
 *   check → reserve → execute → commit (or rollback)
 */

import { PlanKey } from './plans';

// ─── Credit Type Namespace ───────────────────────────────────────────────────

export type CreditType =
  | 'job_credits'
  | 'ai_credits';

export type CreditPeriod = 'monthly' | 'never';

export interface CreditDefinition {
  type: CreditType;
  period: CreditPeriod;
  /** Default allocation per plan. -1 = unlimited. */
  defaults: Record<PlanKey, number>;
}

// ─── Credit Registry ─────────────────────────────────────────────────────────

export const CREDITS: CreditDefinition[] = [
  {
    type: 'job_credits',
    period: 'monthly',
    defaults: { free: 10, starter: -1, focused: -1 },
  },
  {
    type: 'ai_credits',
    period: 'monthly',
    defaults: { free: 10, starter: -1, focused: -1 },
  },
];

const CREDIT_MAP: Record<CreditType, CreditDefinition> = Object.fromEntries(
  CREDITS.map((c) => [c.type, c])
) as Record<CreditType, CreditDefinition>;

/**
 * Get the default credit allocation for a plan.
 * Returns -1 for unlimited.
 */
export function getDefaultCredits(plan: PlanKey, type: CreditType): number {
  const def = CREDIT_MAP[type];
  if (!def) return 0;
  return def.defaults[plan] ?? 0;
}

/**
 * Check if credits are unlimited.
 */
export function isUnlimitedCredits(credits: number): boolean {
  return credits === -1;
}

/**
 * Get the credit definition.
 */
export function getCreditDefinition(type: CreditType): CreditDefinition | undefined {
  return CREDIT_MAP[type];
}
