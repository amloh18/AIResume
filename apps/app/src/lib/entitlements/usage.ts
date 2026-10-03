/**
 * usage.ts — Usage tracking and resolution.
 *
 * Usage answers: "How much has this user consumed?"
 *
 * Usage is read from MongoDB usage_counters collection.
 * It is scoped by period (daily, monthly) and metric name.
 */

import { LimitKey, LimitPeriod, getLimitPeriod } from './limits';
import { CreditType } from './credits';

// ─── Usage Record ────────────────────────────────────────────────────────────

export interface UsageRecord {
  userId: string;
  metric: string;
  periodStart: Date;
  periodEnd: Date;
  used: number;
}

export interface UsageBucket {
  limit: number;
  used: number;
  remaining: number | null; // null = unlimited
  period: LimitPeriod;
  resetAt: Date;
}

// ─── Period Calculation ──────────────────────────────────────────────────────

/**
 * Get the period start/end for a given period type and reference date.
 */
export function getPeriodBounds(
  period: LimitPeriod,
  now: Date = new Date()
): { start: Date; end: Date } {
  const start = new Date(now);
  const end = new Date(now);

  switch (period) {
    case 'daily':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case 'monthly':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0); // Last day of current month
      end.setHours(23, 59, 59, 999);
      break;

    case 'total':
      start.setTime(0);
      end.setFullYear(9999);
      break;
  }

  return { start, end };
}

/**
 * Get the period for a usage metric.
 */
export function getUsagePeriod(metric: LimitKey | CreditType): LimitPeriod {
  if (metric in getLimitPeriod) {
    return getLimitPeriod(metric as LimitKey);
  }
  // Credits are monthly
  return 'monthly';
}

/**
 * Build the usage key for MongoDB storage.
 */
export function getUsageKey(userId: string, metric: string, periodStart: Date): string {
  return `${userId}:${metric}:${periodStart.getTime()}`;
}
