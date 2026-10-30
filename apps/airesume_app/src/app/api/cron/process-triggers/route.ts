import { runCron } from '@/lib/cron/runCron';
import { log } from '@/lib/structured-logger';
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import {
  getAllAutomationConfigs,
  meetsAudience,
  normalizePlanId,
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

function relativeAutomations(configs: ResolvedAutomation[]) {
  return configs.filter(
    (c) => c.triggerType === 'relative' && typeof c.delayHours === 'number'
  );
}

export async function GET(request: NextRequest) {
  return runCron('process-triggers', request, async () => {
    try {
      await getConnection();

      const now = new Date();
      const configs = await getAllAutomationConfigs();
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
        }).select('email firstName lastName onboarding usage subscription lastLogin createdAt');

        let sent = 0;
        for (const user of users) {
          const cvCount = Number((user as any).usage?.cvCreatedCount || 0);
          const onboardingComplete =
            (user as any).onboarding?.activation_status === 'completed';
          const planId = normalizePlanId((user as any).subscription?.planId);

          if (
            !meetsAudience(automation, {
              planId,
              cvCount,
              onboardingComplete,
            })
          ) {
            continue;
          }

          const delivered = await sendAutomationEmail(
            automation.key,
            {
              id: String(user._id),
              email: user.email!,
              firstName: (user as any).firstName,
              lastName: (user as any).lastName,
            },
            {},
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
