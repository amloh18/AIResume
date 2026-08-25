import { ObjectId } from 'mongodb';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import type { GlobalAutoApplyPreferences } from '@/app/api/jobs/preferences/route';

const DEFAULT_PREFERENCES: GlobalAutoApplyPreferences = {
  enabled: false,
  targetRoles: [],
  locations: [],
  remoteOnly: false,
  workplaceTypes: ['remote'],
  minSalary: 0,
  salaryCurrency: 'INR_LPA',
  experienceYears: 2,
  maxNoticePeriodDays: 30,
  maxPerDay: 25,
  useTailoredCV: true,
  useCoverLetter: true,
  autoAnswerQuestions: true,
  enabledPortals: ['naukri', 'indeed', 'greenhouse', 'adzuna'],
  searchIntensity: 'exploring',
  expectedApplicationsPerMonth: 50,
  applicationMode: 'manual_review',
};

type PreferenceUpdate = Partial<Omit<GlobalAutoApplyPreferences, 'enabled'>> & { enabled?: boolean };

export class UserJobPreferencesService {
  /**
   * Get canonical job preferences for a user.
   * Falls back to defaults if nothing saved yet.
   */
  static async getPreferences(userId: string): Promise<GlobalAutoApplyPreferences> {
    try {
      await getConnection();
      const user: any = await User.findById(userId).lean();
      if (!user) return { ...DEFAULT_PREFERENCES };

      const saved = user.autoApplyPreferences || {};

      return {
        enabled: saved.enabled ?? user.naukriIntegration?.preferences?.autoApplyEnabled ?? DEFAULT_PREFERENCES.enabled,
        targetRoles: saved.targetRoles?.length > 0
          ? saved.targetRoles
          : user.naukriIntegration?.preferences?.targetTitles?.length > 0
          ? user.naukriIntegration?.preferences?.targetTitles
          : DEFAULT_PREFERENCES.targetRoles,
        locations: saved.locations?.length > 0
          ? saved.locations
          : user.naukriIntegration?.preferences?.targetLocations?.length > 0
          ? user.naukriIntegration?.preferences?.targetLocations
          : DEFAULT_PREFERENCES.locations,
        remoteOnly: saved.remoteOnly ?? DEFAULT_PREFERENCES.remoteOnly,
        workplaceTypes: saved.workplaceTypes ?? (saved.remoteOnly ? ['remote'] : DEFAULT_PREFERENCES.workplaceTypes),
        minSalary: saved.minSalary ?? user.naukriIntegration?.preferences?.minCtcLakhs ?? DEFAULT_PREFERENCES.minSalary,
        salaryCurrency: saved.salaryCurrency ?? DEFAULT_PREFERENCES.salaryCurrency,
        experienceYears: saved.experienceYears ?? user.naukriIntegration?.preferences?.experienceYears ?? DEFAULT_PREFERENCES.experienceYears,
        maxNoticePeriodDays: saved.maxNoticePeriodDays ?? user.naukriIntegration?.preferences?.maxNoticePeriodDays ?? DEFAULT_PREFERENCES.maxNoticePeriodDays,
        maxPerDay: saved.maxPerDay ?? user.naukriIntegration?.preferences?.dailyLimit ?? DEFAULT_PREFERENCES.maxPerDay,
        useTailoredCV: saved.useTailoredCV ?? DEFAULT_PREFERENCES.useTailoredCV,
        useCoverLetter: saved.useCoverLetter ?? DEFAULT_PREFERENCES.useCoverLetter,
        autoAnswerQuestions: saved.autoAnswerQuestions ?? DEFAULT_PREFERENCES.autoAnswerQuestions,
        enabledPortals: saved.enabledPortals ?? DEFAULT_PREFERENCES.enabledPortals,
        searchIntensity: saved.searchIntensity ?? DEFAULT_PREFERENCES.searchIntensity,
        expectedApplicationsPerMonth: saved.expectedApplicationsPerMonth ?? DEFAULT_PREFERENCES.expectedApplicationsPerMonth,
        applicationMode: saved.applicationMode ?? DEFAULT_PREFERENCES.applicationMode,
      };
    } catch (error) {
      console.error('[UserJobPreferencesService] getPreferences error:', error);
      return { ...DEFAULT_PREFERENCES };
    }
  }

  /**
   * Merge partial updates into existing preferences and persist.
   * Returns the updated full preferences.
   */
  static async updatePreferences(userId: string, updates: PreferenceUpdate): Promise<GlobalAutoApplyPreferences> {
    try {
      await getConnection();
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      const existing = (user as any).autoApplyPreferences || {};
      const merged: GlobalAutoApplyPreferences = {
        enabled: updates.enabled ?? existing.enabled ?? DEFAULT_PREFERENCES.enabled,
        targetRoles: updates.targetRoles ?? existing.targetRoles ?? DEFAULT_PREFERENCES.targetRoles,
        locations: updates.locations ?? existing.locations ?? DEFAULT_PREFERENCES.locations,
        remoteOnly: updates.remoteOnly ?? existing.remoteOnly ?? DEFAULT_PREFERENCES.remoteOnly,
        workplaceTypes: updates.workplaceTypes ?? existing.workplaceTypes ?? (updates.remoteOnly ? ['remote'] : DEFAULT_PREFERENCES.workplaceTypes),
        minSalary: updates.minSalary ?? existing.minSalary ?? DEFAULT_PREFERENCES.minSalary,
        salaryCurrency: updates.salaryCurrency ?? existing.salaryCurrency ?? DEFAULT_PREFERENCES.salaryCurrency,
        experienceYears: updates.experienceYears ?? existing.experienceYears ?? DEFAULT_PREFERENCES.experienceYears,
        maxNoticePeriodDays: updates.maxNoticePeriodDays ?? existing.maxNoticePeriodDays ?? DEFAULT_PREFERENCES.maxNoticePeriodDays,
        maxPerDay: updates.maxPerDay ?? existing.maxPerDay ?? DEFAULT_PREFERENCES.maxPerDay,
        useTailoredCV: updates.useTailoredCV ?? existing.useTailoredCV ?? DEFAULT_PREFERENCES.useTailoredCV,
        useCoverLetter: updates.useCoverLetter ?? existing.useCoverLetter ?? DEFAULT_PREFERENCES.useCoverLetter,
        autoAnswerQuestions: updates.autoAnswerQuestions ?? existing.autoAnswerQuestions ?? DEFAULT_PREFERENCES.autoAnswerQuestions,
        enabledPortals: updates.enabledPortals ?? existing.enabledPortals ?? DEFAULT_PREFERENCES.enabledPortals,
        searchIntensity: updates.searchIntensity ?? existing.searchIntensity ?? DEFAULT_PREFERENCES.searchIntensity,
        expectedApplicationsPerMonth: updates.expectedApplicationsPerMonth ?? existing.expectedApplicationsPerMonth ?? DEFAULT_PREFERENCES.expectedApplicationsPerMonth,
        applicationMode: updates.applicationMode ?? existing.applicationMode ?? DEFAULT_PREFERENCES.applicationMode,
      };

      (user as any).autoApplyPreferences = merged;

      // Sync to portal integrations
      if (user.naukriIntegration) {
        user.naukriIntegration.preferences = {
          targetTitles: merged.targetRoles,
          targetLocations: merged.locations,
          minCtcLakhs: merged.minSalary,
          experienceYears: merged.experienceYears,
          maxNoticePeriodDays: merged.maxNoticePeriodDays,
          dailyLimit: merged.maxPerDay,
          autoApplyEnabled: merged.enabled,
        };
      }

      if (user.indeedIntegration) {
        user.indeedIntegration.preferences = {
          targetTitles: merged.targetRoles,
          targetLocations: merged.locations,
          minSalary: merged.minSalary * 10000,
          salaryCurrency: merged.salaryCurrency.startsWith('INR') ? 'INR' : 'USD',
          remoteOnly: merged.remoteOnly,
          dailyLimit: merged.maxPerDay,
          autoApplyEnabled: merged.enabled,
        };
      }

      await user.save();

      // Sync to legacy job_preferences collection (used by matching engine)
      await UserJobPreferencesService.syncToLegacyJobPreferences(userId, merged).catch(() => {});

      // Sync to UserQuota.autoApplySettings (used by auto-apply processor)
      await UserJobPreferencesService.syncToUserQuotaSettings(userId, merged).catch(() => {});

      // Invalidate recommendation cache (non-blocking)
      UserJobPreferencesService.invalidateCache(userId).catch(() => {});

      return merged;
    } catch (error) {
      console.error('[UserJobPreferencesService] updatePreferences error:', error);
      throw error;
    }
  }

  /**
   * Save onboarding step data into autoApplyPreferences.
   * Maps step-specific fields to the canonical schema.
   */
  static async saveOnboardingStep(userId: string, step: string, data: Record<string, any>): Promise<void> {
    const updates: PreferenceUpdate = {};

    switch (step) {
      case 'target_roles':
        if (data.targetRoles) updates.targetRoles = data.targetRoles;
        break;
      case 'workplace':
        if (data.workplaceTypes) updates.workplaceTypes = data.workplaceTypes;
        if (data.locations) updates.locations = data.locations;
        updates.remoteOnly = data.workplaceTypes?.includes('remote') && !data.workplaceTypes?.includes('hybrid') && !data.workplaceTypes?.includes('onsite');
        break;
      case 'salary':
        if (data.salaryMin !== undefined) updates.minSalary = data.salaryMin;
        if (data.salaryCurrency) updates.salaryCurrency = data.salaryCurrency;
        break;
      case 'experience':
        if (data.experienceYears !== undefined) updates.experienceYears = data.experienceYears;
        if (data.maxNoticePeriodDays !== undefined) updates.maxNoticePeriodDays = data.maxNoticePeriodDays;
        break;
      case 'search_intensity':
        if (data.searchIntensity) updates.searchIntensity = data.searchIntensity;
        break;
      case 'application_volume':
        if (data.expectedApplicationsPerMonth !== undefined) updates.expectedApplicationsPerMonth = data.expectedApplicationsPerMonth;
        break;
      case 'application_mode':
        if (data.applicationMode) updates.applicationMode = data.applicationMode;
        break;
    }

    if (Object.keys(updates).length > 0) {
      await this.updatePreferences(userId, updates);
    }
  }

  private static async invalidateCache(userId: string): Promise<void> {
    try {
      const { cacheManager } = await import('@/lib/cache/cache-manager');
      if (cacheManager && typeof cacheManager.delete === 'function') {
        await cacheManager.delete(`recommendations:${userId}`);
      }
    } catch {
      // Cache module may not be available; non-critical
    }
  }

  /**
   * Sync canonical preferences to legacy job_preferences collection
   * used by JobMatchingService and JobDiscoveryService.
   */
  private static async syncToLegacyJobPreferences(userId: string, prefs: GlobalAutoApplyPreferences): Promise<void> {
    try {
      const { ObjectId } = await import('mongodb');
      const { getDb } = await import('@/lib/db');
      const db = await getDb();

      const legacyPrefs = {
        titles: prefs.targetRoles,
        locations: prefs.locations,
        country: 'UK',
        remoteOnly: prefs.remoteOnly,
        salaryMin: prefs.minSalary,
        salaryCurrency: prefs.salaryCurrency,
        updatedAt: new Date(),
      };

      await db.collection('job_preferences').updateOne(
        { userId: new ObjectId(userId) },
        { $set: legacyPrefs },
        { upsert: true }
      );
    } catch (error) {
      console.error('[UserJobPreferencesService] syncToLegacyJobPreferences error:', error);
    }
  }

  /**
   * Sync canonical preferences to UserQuota.autoApplySettings
   * used by the auto-apply processor.
   */
  private static async syncToUserQuotaSettings(userId: string, prefs: GlobalAutoApplyPreferences): Promise<void> {
    try {
      const { ObjectId } = await import('mongodb');
      const { getDb } = await import('@/lib/db');
      const db = await getDb();

      const autoApplySettings = {
        enabled: prefs.enabled,
        targetRoles: prefs.targetRoles,
        locations: prefs.locations,
        remoteOnly: prefs.remoteOnly,
        minSalary: prefs.minSalary,
        maxPerDay: prefs.maxPerDay,
        useTailoredCV: prefs.useTailoredCV,
        useCoverLetter: prefs.useCoverLetter,
        autoAnswerQuestions: prefs.autoAnswerQuestions,
        enabledPortals: prefs.enabledPortals,
      };

      await db.collection('user_quotas').updateOne(
        { userId: new ObjectId(userId) },
        { $set: { autoApplySettings } },
        { upsert: true }
      );
    } catch (error) {
      console.error('[UserJobPreferencesService] syncToUserQuotaSettings error:', error);
    }
  }
}
