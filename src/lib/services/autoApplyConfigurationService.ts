/**
 * AutoApplyConfiguration Service
 * 
 * Service for auto-apply execution configuration.
 * This consumes JobSearchProfile for matching criteria but does NOT own
 * general job-search preferences.
 * 
 * The domain answers: "How should BuildAIResume execute applications?"
 */

import { ObjectId } from 'mongodb';
import { getConnection } from '@/lib/database';
import AutoApplyConfiguration from '@/models/AutoApplyConfiguration';
import JobSearchProfile from '@/models/JobSearchProfile';
import type { IAutoApplyConfigurationDocument } from '@/models/AutoApplyConfiguration';

// Default configuration values
const DEFAULT_CONFIG = {
  enabled: false,
  maxPerDay: 25,
  useTailoredCV: true,
  useCoverLetter: true,
  autoAnswerQuestions: true,
  enabledPortals: ['naukri', 'indeed', 'greenhouse', 'adzuna'],
  portalOverrides: {
    naukri: { enabled: false, dailyLimit: 25 },
    indeed: { enabled: false, dailyLimit: 25 },
  },
};

export class AutoApplyConfigurationService {
  /**
   * Get auto-apply configuration for a user.
   * Returns null if no configuration exists.
   */
  static async getConfig(userId: string): Promise<IAutoApplyConfigurationDocument | null> {
    try {
      await getConnection();
      const config = await AutoApplyConfiguration.findOne({ userId: new ObjectId(userId) }).lean();
      return config as IAutoApplyConfigurationDocument | null;
    } catch (error) {
      console.error('[AutoApplyConfigurationService] getConfig error:', error);
      throw new Error('Failed to fetch auto-apply configuration');
    }
  }

  /**
   * Get or create auto-apply configuration for a user.
   * Always returns a configuration (creates if needed).
   */
  static async getOrCreateConfig(userId: string): Promise<IAutoApplyConfigurationDocument> {
    try {
      await getConnection();
      
      let config = await AutoApplyConfiguration.findOne({ userId: new ObjectId(userId) });
      
      if (!config) {
        // Get or create JobSearchProfile first
        const { JobSearchProfileService } = await import('./jobSearchProfileService');
        const profile = await JobSearchProfileService.getOrCreateProfile(userId);
        
        config = await AutoApplyConfiguration.create({
          userId: new ObjectId(userId),
          jobSearchProfileId: profile._id,
          ...DEFAULT_CONFIG,
          profileVersion: profile.profileVersion,
          lastSyncedAt: new Date(),
        });
        console.log(`[AutoApplyConfigurationService] Created new config for user ${userId}`);
      }
      
      return config;
    } catch (error) {
      console.error('[AutoApplyConfigurationService] getOrCreateConfig error:', error);
      throw new Error('Failed to get or create auto-apply configuration');
    }
  }

  /**
   * Update auto-apply configuration.
   */
  static async updateConfig(
    userId: string,
    updates: Partial<Omit<IAutoApplyConfigurationDocument, '_id' | 'userId' | 'jobSearchProfileId' | 'profileVersion' | 'createdAt' | 'updatedAt'>>
  ): Promise<IAutoApplyConfigurationDocument> {
    try {
      await getConnection();
      
      const config = await AutoApplyConfiguration.findOneAndUpdate(
        { userId: new ObjectId(userId) },
        { $set: updates },
        { new: true, upsert: true }
      );
      
      if (!config) {
        throw new Error('Failed to update configuration');
      }
      
      return config;
    } catch (error) {
      console.error('[AutoApplyConfigurationService] updateConfig error:', error);
      throw new Error('Failed to update auto-apply configuration');
    }
  }

  /**
   * Sync configuration with JobSearchProfile.
   * Ensures profileVersion matches and re-reads profile data if needed.
   */
  static async syncWithProfile(userId: string): Promise<IAutoApplyConfigurationDocument> {
    try {
      await getConnection();
      
      const { JobSearchProfileService } = await import('./jobSearchProfileService');
      const profile = await JobSearchProfileService.getProfile(userId);
      
      if (!profile) {
        throw new Error('JobSearchProfile not found');
      }
      
      const config = await AutoApplyConfiguration.findOneAndUpdate(
        { userId: new ObjectId(userId) },
        { 
          $set: { 
            profileVersion: profile.profileVersion,
            lastSyncedAt: new Date(),
          } 
        },
        { new: true, upsert: true }
      );
      
      if (!config) {
        throw new Error('Failed to sync configuration');
      }
      
      return config;
    } catch (error) {
      console.error('[AutoApplyConfigurationService] syncWithProfile error:', error);
      throw new Error('Failed to sync configuration with profile');
    }
  }

  /**
   * Check if auto-apply is enabled for a user.
   */
  static async isEnabled(userId: string): Promise<boolean> {
    const config = await this.getConfig(userId);
    return config?.enabled ?? false;
  }

  /**
   * Get effective daily limit for a specific portal.
   */
  static async getDailyLimit(userId: string, portal: string): Promise<number> {
    const config = await this.getConfig(userId);
    if (!config) {
      return DEFAULT_CONFIG.maxPerDay;
    }
    
    // Check portal-specific override
    const override = config.portalOverrides?.[portal as keyof typeof config.portalOverrides];
    if (override?.dailyLimit) {
      return override.dailyLimit;
    }
    
    // Fall back to global limit
    return config.maxPerDay;
  }

  /**
   * Delete auto-apply configuration.
   */
  static async deleteConfig(userId: string): Promise<void> {
    try {
      await getConnection();
      await AutoApplyConfiguration.deleteOne({ userId: new ObjectId(userId) });
    } catch (error) {
      console.error('[AutoApplyConfigurationService] deleteConfig error:', error);
      throw new Error('Failed to delete auto-apply configuration');
    }
  }
}
