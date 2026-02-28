import { ObjectId } from 'mongodb';
import type { User, AutomationSettings, AdminRules } from '@/types/automation-schema';
import { TIER_LIMITS } from '@/types/automation-schema';

export class AutomationService {
  static async checkDailyLimit(userId: string): Promise<boolean> {
    try {
      const { getDb } = await import('@/lib/db');
      const db = await getDb();

      const [user, settings, adminRules] = await Promise.all([
        db.collection<User>('users').findOne({ _id: new ObjectId(userId) }),
        db
          .collection<AutomationSettings>('automation_settings')
          .findOne({ userId: new ObjectId(userId) }),
        db.collection<AdminRules>('admin_rules').findOne({}),
      ]);

      if (!user || !settings) {
        throw new Error('User or settings not found');
      }

      const tierLimit = TIER_LIMITS[user.tier].dailyApplyCap;
      const userLimit = settings.dailyLimit;
      const adminLimit = adminRules?.maxAppliesPerUserPerDay || 20;

      const effectiveLimit = Math.min(tierLimit, userLimit, adminLimit);

      const applicationService = await import('./applicationService');
      const todayCount =
        await applicationService.ApplicationService.getTodayApplicationsCount(userId);

      return todayCount < effectiveLimit;
    } catch (error) {
      console.error('[AutomationService] checkDailyLimit error:', error);
      throw error;
    }
  }

  static async applyFailureCooldown(userId: string): Promise<void> {
    try {
      const { getDb } = await import('@/lib/db');
      const db = await getDb();

      const [adminRules, applicationService] = await Promise.all([
        db.collection<AdminRules>('admin_rules').findOne({}),
        import('./applicationService'),
      ]);

      const cooldownHours = adminRules?.failureCooldownHours || 24;
      const recentFailures =
        await applicationService.ApplicationService.getRecentFailuresCount(
          userId,
          cooldownHours
        );

      if (recentFailures >= 3) {
        await db.collection<AutomationSettings>('automation_settings').updateOne(
          { userId: new ObjectId(userId) },
          {
            $set: {
              enabled: false,
              updatedAt: new Date(),
            },
          }
        );

        const auditService = await import('./auditService');
        await auditService.AuditService.logAction(
          userId,
          'automation_cooldown_triggered',
          undefined,
          { recentFailures, cooldownHours }
        );

        console.log(
          `[AutomationService] Cooldown triggered for user ${userId} due to ${recentFailures} failures`
        );
      }
    } catch (error) {
      console.error('[AutomationService] applyFailureCooldown error:', error);
      throw error;
    }
  }

  static async getFailureCooldownRemaining(userId: string): Promise<number> {
    try {
      const { getDb } = await import('@/lib/db');
      const db = await getDb();

      const adminRules = await db.collection<AdminRules>('admin_rules').findOne({});
      const cooldownHours = adminRules?.failureCooldownHours || 24;

      const applicationService = await import('./applicationService');
      const applications = await applicationService.ApplicationService.getApplicationHistory(
        userId
      );

      const failures = applications
        .filter((app) => app.status === 'failed')
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 3);

      if (failures.length < 3) {
        return 0;
      }

      const lastFailure = failures[0];
      const cooldownEnd = new Date(
        lastFailure.createdAt.getTime() + cooldownHours * 60 * 60 * 1000
      );

      const now = new Date();
      if (now >= cooldownEnd) {
        return 0;
      }

      return Math.ceil((cooldownEnd.getTime() - now.getTime()) / (1000 * 60 * 60));
    } catch (error) {
      console.error('[AutomationService] getFailureCooldownRemaining error:', error);
      return 0;
    }
  }

  static async getAutomationSettings(
    userId: string
  ): Promise<AutomationSettings | null> {
    try {
      const { getDb } = await import('@/lib/db');
      const db = await getDb();

      const settings = await db
        .collection<AutomationSettings>('automation_settings')
        .findOne({ userId: new ObjectId(userId) });

      return settings;
    } catch (error) {
      console.error('[AutomationService] getAutomationSettings error:', error);
      throw error;
    }
  }

  static async updateAutomationSettings(
    userId: string,
    updates: Partial<Omit<AutomationSettings, '_id' | 'userId' | 'updatedAt'>>
  ): Promise<AutomationSettings> {
    try {
      const { getDb } = await import('@/lib/db');
      const db = await getDb();

      const user = await db.collection<User>('users').findOne({
        _id: new ObjectId(userId),
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (updates.mode === 'auto' && !TIER_LIMITS[user.tier].autoModeAllowed) {
        throw new Error('Auto mode is not available on your plan');
      }

      if (updates.dailyLimit) {
        const tierLimit = TIER_LIMITS[user.tier].dailyApplyCap;
        if (updates.dailyLimit > tierLimit) {
          updates.dailyLimit = tierLimit;
        }
      }

      const settings: AutomationSettings = {
        _id: new ObjectId(),
        userId: new ObjectId(userId),
        enabled: updates.enabled ?? false,
        mode: updates.mode ?? 'assisted',
        dailyLimit:
          updates.dailyLimit ?? TIER_LIMITS[user.tier].dailyApplyCap,
        applyWindow: updates.applyWindow,
        blockedCompanies: updates.blockedCompanies ?? [],
        updatedAt: new Date(),
      };

      await db.collection<AutomationSettings>('automation_settings').updateOne(
        { userId: new ObjectId(userId) },
        { $set: settings },
        { upsert: true }
      );

      const auditService = await import('./auditService');
      await auditService.AuditService.logAction(
        userId,
        'automation_settings_updated',
        undefined,
        { updates }
      );

      return settings;
    } catch (error) {
      console.error('[AutomationService] updateAutomationSettings error:', error);
      throw error;
    }
  }

  static async isAutomationEnabled(userId: string): Promise<boolean> {
    try {
      const settings = await this.getAutomationSettings(userId);
      return settings?.enabled || false;
    } catch (error) {
      console.error('[AutomationService] isAutomationEnabled error:', error);
      return false;
    }
  }
}
