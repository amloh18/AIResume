/**
 * autoApplyQuotaService.ts — Unified Auto-Apply quota management.
 *
 * This is the SINGLE source of truth for Auto-Apply quota consumption.
 * It handles:
 *   - Atomic reservation (concurrency-safe)
 *   - Idempotent operations (operationId dedup)
 *   - Reservation lifecycle (reserved → consumed/released)
 *   - Plan-aware limits, aligned with `lib/entitlements/limits.ts`:
 *       Free:    10 lifetime (10/day rate cap)
 *       Starter: 10 / billing month
 *       Focused: 50 / day (monthly uncapped — daily is the operative limit)
 *   - Billing period alignment
 *   - Recovery for abandoned reservations
 */

import mongoose from 'mongoose';
import { getConnection } from '@/lib/database';
import AutoApplyReservation, {
  type IAutoApplyReservation,
  type ReservationStatus,
} from '@/models/AutoApplyReservation';
import User from '@/models/User';
import { formatResetCountdown } from '@/lib/utils/reset-countdown';

// ─── Plan Definitions ─────────────────────────────────────────────────────────

export interface AutoApplyPlanConfig {
  /** Monthly limit (-1 = unlimited) */
  monthlyLimit: number;
  /** Lifetime limit for free plan (-1 = no lifetime cap) */
  lifetimeLimit: number;
  /** Daily rate limit */
  dailyLimit: number;
  /** Whether this plan has auto-apply enabled */
  enabled: boolean;
}

const PLAN_CONFIGS: Record<string, AutoApplyPlanConfig> = {
  free: {
    monthlyLimit: -1,       // No monthly limit (uses lifetime)
    lifetimeLimit: 10,      // 10 lifetime uses
    dailyLimit: 10,         // Rate limit
    enabled: true,          // Free plan does have auto-apply (with lifetime cap)
  },
  starter: {
    monthlyLimit: 10,       // 10 per billing period — canonical Starter cap
                            // (matches limits.ts, the paywall, and legal copy)
    lifetimeLimit: -1,      // No lifetime cap
    dailyLimit: 10,         // Rate limit (never the binding constraint; monthly is)
    enabled: true,
  },
  focused: {
    monthlyLimit: -1,       // Monthly uncapped — the DAILY limit is the operative cap,
                            // matching the marketed "50 automated applications / day"
                            // and entitlement-service's Focused behaviour.
    lifetimeLimit: -1,      // No lifetime cap
    dailyLimit: 50,         // Rate limit — this is what binds on Focused
    enabled: true,
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QuotaCheckResult {
  allowed: boolean;
  remaining: number | null;   // null = unlimited
  used: number;
  limit: number;              // -1 = unlimited
  reserved: number;
  plan: string;
  billingPeriodStart?: Date;
  billingPeriodEnd?: Date;
  lifetimeUsed?: number;      // For free plan
  lifetimeLimit?: number;     // For free plan
  reason?: string;
  resetAt?: Date;
}

export interface ReservationResult {
  success: boolean;
  reservationId?: string;
  operationId?: string;
  usage?: {
    used: number;
    reserved: number;
    limit: number;
    remaining: number | null;
  };
  error?: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class AutoApplyQuotaService {
  /**
   * Resolve the canonical plan key from a user document.
   */
  static resolvePlan(user: any): string {
    const planKey = user?.subscription?.planKey || 'free';
    // Normalize: starter_monthly -> starter, focused_yearly -> focused, etc.
    if (planKey.startsWith('focused')) return 'focused';
    if (planKey.startsWith('starter')) return 'starter';
    return 'free';
  }

  /**
   * Get the plan configuration.
   */
  static getPlanConfig(plan: string): AutoApplyPlanConfig {
    return PLAN_CONFIGS[plan] || PLAN_CONFIGS.free;
  }

  /**
   * Get the current billing period bounds.
   * For free plan: lifetime (epoch to infinity)
   * For paid plans: current calendar month or Stripe billing period
   */
  static getBillingPeriod(user: any, plan: string): { start: Date; end: Date } {
    if (plan === 'free') {
      // Lifetime: from epoch to far future
      return {
        start: new Date(0),
        end: new Date('2099-12-31T23:59:59.999Z'),
      };
    }

    // Use Stripe billing period if available
    const sub = user?.subscription;
    if (sub?.currentPeriodStart && sub?.currentPeriodEnd) {
      return {
        start: new Date(sub.currentPeriodStart),
        end: new Date(sub.currentPeriodEnd),
      };
    }

    // Fallback: current calendar month
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }

  /**
   * Get today's bounds for daily rate limiting.
   */
  static getTodayBounds(): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { start, end };
  }

  /**
   * The cap that actually binds for a plan right now, and its reset time.
   *
   * Mirrors the precedence in checkQuota:
   *   free    → lifetime cap (resets never)
   *   starter → monthly cap (resets at billing period end)
   *   focused → daily cap (resets at midnight; monthly is uncapped)
   *
   * Returns null for unlimited plans (nothing binds).
   */
  private static resolveBindingCap(
    plan: string,
    config: AutoApplyPlanConfig,
    usage: {
      total: number;
      dailyUsed: number;
      lifetimeUsed?: number;
      billingPeriodEnd: Date;
    }
  ): { cap: number; used: number; resetAt?: Date; reason: string } | null {
    if (plan === 'free') {
      const used = usage.lifetimeUsed ?? 0;
      return {
        cap: config.lifetimeLimit,
        used,
        reason: `Lifetime limit reached (${used}/${config.lifetimeLimit}). Upgrade for more.`,
      };
    }

    if (plan === 'focused') {
      return {
        cap: config.dailyLimit,
        used: usage.dailyUsed,
        resetAt: this.getTomorrowStart(),
        reason: `Daily limit reached (${usage.dailyUsed}/${config.dailyLimit}). Resets at midnight.`,
      };
    }

    if (config.monthlyLimit === -1) return null;
    const monthlyCountdown = formatResetCountdown(usage.billingPeriodEnd);
    return {
      cap: config.monthlyLimit,
      used: usage.total,
      resetAt: usage.billingPeriodEnd,
      reason: `Monthly limit reached (${usage.total}/${config.monthlyLimit}). ${monthlyCountdown ? `Resets in ${monthlyCountdown}.` : `Resets ${usage.billingPeriodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.`}`,
    };
  }

  private static getTomorrowStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  }

  /**
   * Get current usage counts for a user.
   * Returns consumed, reserved, and total for the current billing period.
   */
  static async getUsage(userId: string): Promise<{
    consumed: number;
    reserved: number;
    total: number;
    dailyUsed: number;
    lifetimeUsed?: number;
    billingPeriodStart: Date;
    billingPeriodEnd: Date;
  }> {
    await getConnection();

    const user = await User.findById(userId).lean();
    if (!user) throw new Error('User not found');

    const plan = this.resolvePlan(user);
    const { start: periodStart, end: periodEnd } = this.getBillingPeriod(user, plan);
    const { start: todayStart, end: todayEnd } = this.getTodayBounds();

    // Count reservations in current billing period
    const periodQuery = {
      userId: new mongoose.Types.ObjectId(userId),
      createdAt: { $gte: periodStart, $lte: periodEnd },
    };

    const [consumedResult, reservedResult, dailyResult] = await Promise.all([
      // Consumed = completed operations
      AutoApplyReservation.countDocuments({
        ...periodQuery,
        status: 'consumed',
      }),
      // Reserved = in-progress operations
      AutoApplyReservation.countDocuments({
        ...periodQuery,
        status: 'reserved',
      }),
      // Daily count for rate limiting
      AutoApplyReservation.countDocuments({
        userId: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: todayStart, $lte: todayEnd },
        status: { $in: ['consumed', 'reserved'] },
      }),
    ]);

    // For free plan, also track lifetime usage
    let lifetimeUsed: number | undefined;
    if (plan === 'free') {
      lifetimeUsed = await AutoApplyReservation.countDocuments({
        userId: new mongoose.Types.ObjectId(userId),
        status: 'consumed',
      });
    }

    return {
      consumed: consumedResult,
      reserved: reservedResult,
      total: consumedResult + reservedResult,
      dailyUsed: dailyResult,
      lifetimeUsed,
      billingPeriodStart: periodStart,
      billingPeriodEnd: periodEnd,
    };
  }

  /**
   * Check if quota is available without consuming.
   * Used for read-only checks.
   */
  static async checkQuota(userId: string): Promise<QuotaCheckResult> {
    await getConnection();

    const user = await User.findById(userId).lean();
    if (!user) {
      return {
        allowed: false,
        remaining: 0,
        used: 0,
        limit: 0,
        reserved: 0,
        plan: 'free',
        reason: 'User not found',
      };
    }

    const plan = this.resolvePlan(user);
    const config = this.getPlanConfig(plan);

    if (!config.enabled) {
      return {
        allowed: false,
        remaining: 0,
        used: 0,
        limit: 0,
        reserved: 0,
        plan,
        reason: 'Auto-Apply not available on this plan',
      };
    }

    const usage = await this.getUsage(userId);
    const { start: todayStart, end: todayEnd } = this.getTodayBounds();

    // Check daily rate limit
    if (usage.dailyUsed >= config.dailyLimit) {
      const tomorrow = new Date(todayStart);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return {
        allowed: false,
        remaining: 0,
        // In-progress reservations count against usage — report the total the
        // user actually sees in the UI, not just completed operations.
        used: usage.total,
        limit: config.dailyLimit,
        reserved: usage.reserved,
        plan,
        billingPeriodStart: usage.billingPeriodStart,
        billingPeriodEnd: usage.billingPeriodEnd,
        lifetimeUsed: usage.lifetimeUsed,
        lifetimeLimit: config.lifetimeLimit,
        reason: `Daily limit reached (${usage.dailyUsed}/${config.dailyLimit}). Resets at midnight.`,
        resetAt: tomorrow,
      };
    }

    // Check plan-specific limit
    if (plan === 'free') {
      // Free plan: lifetime limit
      const lifetimeUsed = usage.lifetimeUsed ?? 0;
      if (lifetimeUsed >= config.lifetimeLimit) {
        return {
          allowed: false,
          remaining: 0,
          used: lifetimeUsed,
          limit: config.lifetimeLimit,
          reserved: usage.reserved,
          plan,
          lifetimeUsed,
          lifetimeLimit: config.lifetimeLimit,
          billingPeriodStart: usage.billingPeriodStart,
          billingPeriodEnd: usage.billingPeriodEnd,
          reason: `Lifetime limit reached (${config.lifetimeLimit}/${config.lifetimeLimit}). Upgrade for more.`,
        };
      }
      return {
        allowed: true,
        remaining: config.lifetimeLimit - lifetimeUsed,
        used: lifetimeUsed,
        limit: config.lifetimeLimit,
        reserved: usage.reserved,
        plan,
        lifetimeUsed,
        lifetimeLimit: config.lifetimeLimit,
        billingPeriodStart: usage.billingPeriodStart,
        billingPeriodEnd: usage.billingPeriodEnd,
      };
    }

    // Paid plans: monthly limit
    if (config.monthlyLimit !== -1 && usage.total >= config.monthlyLimit) {
      const monthlyCountdown = formatResetCountdown(usage.billingPeriodEnd);
      return {
        allowed: false,
        remaining: 0,
        used: usage.total,
        limit: config.monthlyLimit,
        reserved: usage.reserved,
        plan,
        billingPeriodStart: usage.billingPeriodStart,
        billingPeriodEnd: usage.billingPeriodEnd,
        reason: `Monthly limit reached (${usage.total}/${config.monthlyLimit}). ${monthlyCountdown ? `Resets in ${monthlyCountdown}.` : `Resets ${usage.billingPeriodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.`}`,
        resetAt: usage.billingPeriodEnd,
      };
    }

    const remaining = config.monthlyLimit === -1
      ? null
      : config.monthlyLimit - usage.total;

    return {
      allowed: true,
      remaining,
      used: usage.consumed,
      limit: config.monthlyLimit,
      reserved: usage.reserved,
      plan,
      billingPeriodStart: usage.billingPeriodStart,
      billingPeriodEnd: usage.billingPeriodEnd,
    };
  }

  /**
   * Atomically reserve one Auto-Apply slot.
   *
   * This is the critical path. It uses MongoDB atomic operations to ensure
   * that two concurrent requests cannot both observe available quota and
   * both consume the same slot.
   *
   * The reservation is created with status='reserved'. It must be either:
   *   - consumed (via completeReservation) when the operation succeeds
   *   - released (via releaseReservation) if the operation fails early
   */
  static async reserve(
    userId: string,
    operationId: string,
    options?: { jobId?: string; applicationId?: string }
  ): Promise<ReservationResult> {
    await getConnection();

    const user = await User.findById(userId).lean();
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const plan = this.resolvePlan(user);
    const config = this.getPlanConfig(plan);

    if (!config.enabled) {
      return { success: false, error: 'Auto-Apply not available on this plan' };
    }

    // Check quota first (fast path — before attempting insert)
    const quota = await this.checkQuota(userId);
    if (!quota.allowed) {
      return { success: false, error: quota.reason || 'Quota exhausted' };
    }

    const { start: periodStart, end: periodEnd } = this.getBillingPeriod(user, plan);

    // Attempt atomic insert with unique operationId
    try {
      const reservation = await AutoApplyReservation.create({
        userId: new mongoose.Types.ObjectId(userId),
        operationId,
        status: 'reserved',
        plan,
        billingPeriodStart: periodStart,
        billingPeriodEnd: periodEnd,
        applicationId: options?.applicationId,
      });

      // Recalculate usage after reservation.
      const updatedUsage = await this.getUsage(userId);
      const configAfter = this.getPlanConfig(plan);
      const remainingAfter = plan === 'free'
        ? (configAfter.lifetimeLimit - (updatedUsage.lifetimeUsed ?? 0))
        : (configAfter.monthlyLimit === -1 ? null : configAfter.monthlyLimit - updatedUsage.total);

      /*
        Post-reserve recheck — closes the check-then-insert race.

        `checkQuota` above runs before the insert; two concurrent requests can
        both observe "1 slot left", both pass, and both insert. The unique
        index only dedupes identical operationIds, which these are not.
        Without this recheck the plan ends up one reservation over its cap —
        the "12 of 10 used" class of bug.

        The binding cap mirrors checkQuota: free → lifetime, focused → daily,
        starter → monthly. If we are over, THIS reservation is the one that
        loses the race: release it immediately and fail the request. Callers
        treat it like any other quota denial.
      */
      const binding = this.resolveBindingCap(plan, configAfter, updatedUsage);
      if (binding !== null && binding.used > binding.cap) {
        await this.releaseReservation(reservation._id.toString(), 'over_limit_concurrent_reserve');

        const resetAt = plan === 'free' ? undefined : binding.resetAt;
        return {
          success: false,
          error: binding.reason,
          usage: {
            used: binding.cap,
            reserved: updatedUsage.reserved,
            limit: binding.cap,
            remaining: 0,
          },
        };
      }

      return {
        success: true,
        reservationId: reservation._id.toString(),
        operationId,
        usage: {
          used: updatedUsage.consumed,
          reserved: updatedUsage.reserved,
          limit: plan === 'free' ? configAfter.lifetimeLimit : configAfter.monthlyLimit,
          remaining: remainingAfter,
        },
      };
    } catch (err: any) {
      // Duplicate key error = same operationId already exists (idempotent)
      if (err?.code === 11000) {
        const existing = await AutoApplyReservation.findOne({
          userId: new mongoose.Types.ObjectId(userId),
          operationId,
        });

        if (existing) {
          // Already reserved/consumed — return existing state (idempotent)
          const updatedUsage = await this.getUsage(userId);
          return {
            success: true,
            reservationId: String(existing._id),
            operationId,
            usage: {
              used: updatedUsage.consumed,
              reserved: updatedUsage.reserved,
              limit: plan === 'free' ? config.lifetimeLimit : config.monthlyLimit,
              remaining: plan === 'free'
                ? (config.lifetimeLimit - (updatedUsage.lifetimeUsed ?? 0))
                : (config.monthlyLimit === -1 ? null : config.monthlyLimit - updatedUsage.total),
            },
          };
        }
      }
      throw err;
    }
  }

  /**
   * Mark a reservation as consumed (operation completed successfully).
   */
  static async consumeReservation(
    reservationId: string,
    links?: { applicationId?: string; journeyId?: string; queueItemId?: string }
  ): Promise<void> {
    await getConnection();

    const update: any = {
      status: 'consumed',
      consumedAt: new Date(),
    };
    if (links?.applicationId) update.applicationId = links.applicationId;
    if (links?.journeyId) update.journeyId = links.journeyId;
    if (links?.queueItemId) update.queueItemId = links.queueItemId;

    await AutoApplyReservation.findByIdAndUpdate(reservationId, { $set: update });
  }

  /**
   * Release a reservation (operation failed before meaningful processing).
   *
   * IMPORTANT: Only release if processing did NOT materially begin.
   * If the operation was already processing documents or submitting,
   * the quota should remain consumed.
   */
  static async releaseReservation(
    reservationId: string,
    reason: string
  ): Promise<void> {
    await getConnection();

    await AutoApplyReservation.findByIdAndUpdate(reservationId, {
      $set: {
        status: 'released',
        releasedAt: new Date(),
        releasedReason: reason,
      },
    });
  }

  /**
   * Find a reservation by operationId (for idempotency checks).
   */
  static async findByOperationId(
    userId: string,
    operationId: string
  ): Promise<IAutoApplyReservation | null> {
    await getConnection();

    return AutoApplyReservation.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      operationId,
    }) as Promise<IAutoApplyReservation | null>;
  }

  /**
   * Find a reservation by ID.
   */
  static async findById(reservationId: string): Promise<IAutoApplyReservation | null> {
    await getConnection();
    return AutoApplyReservation.findById(reservationId) as Promise<IAutoApplyReservation | null>;
  }

  /**
   * Recover abandoned reservations.
   *
   * Reservations stuck in 'reserved' status for more than `maxAgeMinutes`
   * are released. This prevents permanent quota leakage from crashed workers,
   * server restarts, etc.
   *
   * IMPORTANT: We only release if the reservation is old enough that it's
   * definitely abandoned. Active operations should have been consumed or
   * released by the worker.
   */
  static async recoverAbandoned(maxAgeMinutes: number = 30): Promise<number> {
    await getConnection();

    const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000);

    const result = await AutoApplyReservation.updateMany(
      {
        status: 'reserved',
        createdAt: { $lt: cutoff },
      },
      {
        $set: {
          status: 'released',
          releasedAt: new Date(),
          releasedReason: 'auto_released_abandoned',
        },
      }
    );

    return result.modifiedCount;
  }

  /**
   * Get usage summary for display (used by API responses and frontend).
   *
   * The numbers here must match what checkQuota/reserve enforce: the binding
   * cap per plan (free → lifetime, starter → monthly, focused → daily) and the
   * matching reset time, so the UI never shows "X of Y used" for a limit that
   * is not the one actually blocking the next apply.
   */
  static async getUsageSummary(userId: string): Promise<{
    plan: string;
    used: number;
    reserved: number;
    limit: number;
    remaining: number | null;
    resetAt: Date;
    isUnlimited: boolean;
    lifetimeUsed?: number;
    lifetimeLimit?: number;
  }> {
    const user = await User.findById(userId).lean();
    if (!user) throw new Error('User not found');

    const plan = this.resolvePlan(user);
    const config = this.getPlanConfig(plan);
    const usage = await this.getUsage(userId);

    const binding = this.resolveBindingCap(plan, config, usage);
    if (!binding) {
      // Unlimited plan — nothing binds; report totals against -1.
      return {
        plan,
        used: usage.total,
        reserved: usage.reserved,
        limit: -1,
        remaining: null,
        resetAt: usage.billingPeriodEnd,
        isUnlimited: true,
      };
    }

    const remaining = Math.max(0, binding.cap - binding.used);

    return {
      plan,
      used: binding.used,
      reserved: usage.reserved,
      limit: binding.cap,
      remaining,
      resetAt: binding.resetAt ?? usage.billingPeriodEnd,
      isUnlimited: false,
      lifetimeUsed: plan === 'free' ? usage.lifetimeUsed : undefined,
      lifetimeLimit: plan === 'free' ? config.lifetimeLimit : undefined,
    };
  }
}
