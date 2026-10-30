import { runCron } from '@/lib/cron/runCron';
import { log } from '@/lib/structured-logger';
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import { DiscountCode, Job } from '@/models';
import {
  getAllAutomationConfigs,
  meetsAudience,
  normalizePlanId,
  planDisplayName,
  sendAutomationEmail,
  type ResolvedAutomation,
} from '@/lib/services/emailAutomationService';

/**
 * Hourly lifecycle sweep.
 *
 * Every `relative` automation in the catalogue (abandoned onboarding, empty
 * account, free→pro nudges, inactivity) is evaluated against users whose anchor
 * timestamp (signup or last login) just crossed the configured delay. Timing,
 * audience and on/off state come from `EmailAutomation` — the admin panel
 * controls them without a deploy.
 *
 * The window is deliberately wider than the cron interval: dedupe (ActivityLog
 * `system_email_sent` + resource id) makes a repeated pass a no-op, so a missed
 * tick or a restart simply catches up instead of skipping users.
 */
const CATCH_UP_MS = 48 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function relativeAutomations(configs: ResolvedAutomation[]) {
  return configs.filter(
    (c) => c.triggerType === 'relative' && typeof c.delayHours === 'number'
  );
}

function dateLabel(value: Date | string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value));
}

/**
 * Values shared by every recipient in a run: how many new jobs landed in the
 * last week (used by the re-engagement emails) and the current live discount
 * (used by the day-30 upgrade email; the block hides itself when none exists).
 */
async function loadRunContext(now: Date) {
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
  let jobCount = 0;
  let coupon: any = null;

  try {
    jobCount = await Job.countDocuments({ createdAt: { $gte: weekAgo } });
  } catch (error: any) {
    log.warn('Trigger sweep: job count lookup failed', { error: error?.message });
  }

  try {
    coupon = await DiscountCode.findOne({
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now },
      $expr: { $lt: ['$usedCount', '$maxUses'] },
    })
      .sort({ discountValue: -1 })
      .select('code validUntil discountType discountValue')
      .lean();
  } catch (error: any) {
    log.warn('Trigger sweep: discount lookup failed', { error: error?.message });
  }

  return {
    jobCount,
    couponCode: coupon?.code || '',
    couponExpiry: coupon?.validUntil ? dateLabel(coupon.validUntil) : '',
  };
}

export async function GET(request: NextRequest) {
  return runCron('process-triggers', request, async () => {
    try {
      await getConnection();

      const now = new Date();
      const configs = await getAllAutomationConfigs();
      const runContext = await loadRunContext(now);
      const results: Record<string, number> = {};

      for (const automation of relativeAutomations(configs)) {
        if (!automation.enabled) continue;

        const anchorField = automation.anchor || 'createdAt';
        const upper = new Date(now.getTime() - (automation.delayHours || 0) * HOUR_MS);
        const lower = new Date(upper.getTime() - CATCH_UP_MS);

        const users = await User.find({
          [anchorField]: { $gte: lower, $lte: upper },
          email: { $exists: true, $ne: '' },
          isAnonymous: { $ne: true },
        }).select(
          'email firstName lastName onboarding usage subscription currentPlanKey lastLogin createdAt'
        );

        let sent = 0;
        for (const user of users) {
          const cvCount = Number((user as any).usage?.cvCreatedCount || 0);
          const onboardingComplete =
            (user as any).onboarding?.activation_status === 'completed';
          const planKey =
            (user as any).subscription?.planKey ||
            (user as any).subscription?.planId ||
            (user as any).currentPlanKey;
          const planId = normalizePlanId(planKey);

          if (
            !meetsAudience(automation, {
              planId,
              cvCount,
              onboardingComplete,
            })
          ) {
            continue;
          }

          const templateData: Record<string, string | number> = {
            planName: planDisplayName(planKey),
            cvCount,
            cvCountPlural: cvCount === 1 ? '' : 's',
            jobCount: runContext.jobCount,
            couponCode: runContext.couponCode,
            couponExpiry: runContext.couponExpiry,
          };

          if ((user as any).lastLogin) {
            const daysInactive = Math.max(
              0,
              Math.floor(
                (now.getTime() - new Date((user as any).lastLogin).getTime()) / DAY_MS
              )
            );
            templateData.daysInactive = daysInactive;
          }

          const delivered = await sendAutomationEmail(
            automation.key,
            {
              id: String(user._id),
              email: user.email!,
              firstName: (user as any).firstName,
              lastName: (user as any).lastName,
            },
            templateData,
            { checkDuplicate: true }
          );
          if (delivered) sent++;
        }

        results[automation.key] = sent;
      }

      return NextResponse.json({
        success: true,
        processed: results,
        message: 'Lifecycle automations processed',
      });
    } catch (error: any) {
      log.error('Trigger processing error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  });
}
