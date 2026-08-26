/**
 * JobSearchProfile Service
 * 
 * Canonical service for job-search preferences.
 * This is the single source of truth for all job-search related data.
 * 
 * The domain answers: "What kind of job is this user looking for?"
 * 
 * IMPORTANT: Versioning is atomic and guaranteed by this service.
 * Do NOT rely on Mongoose pre-save hooks for version increment.
 */

import { ObjectId } from 'mongodb';
import { getConnection } from '@/lib/database';
import JobSearchProfile from '@/models/JobSearchProfile';
import type { IJobSearchProfileDocument } from '@/models/JobSearchProfile';

// Default profile values
const DEFAULT_PROFILE = {
  targetRoles: [],
  locations: [],
  workplaceTypes: ['remote'],
  remoteOnly: false,
  minSalary: 0,
  salaryCurrency: 'GBP',
  experienceYears: 2,
  maxNoticePeriodDays: 30,
  searchIntensity: 'exploring',
  expectedApplicationsPerMonth: 50,
  applicationMode: 'manual_review',
};

export class JobSearchProfileService {
  /**
   * Get canonical job-search profile for a user.
   * Returns null if no profile exists.
   */
  static async getProfile(userId: string): Promise<IJobSearchProfileDocument | null> {
    try {
      await getConnection();
      const profile = await JobSearchProfile.findOne({ userId: new ObjectId(userId) }).lean();
      return profile as IJobSearchProfileDocument | null;
    } catch (error) {
      console.error('[JobSearchProfileService] getProfile error:', error);
      throw new Error('Failed to fetch job search profile');
    }
  }

  /**
   * Get or create canonical job-search profile for a user.
   * Always returns a profile (creates if needed).
   */
  static async getOrCreateProfile(userId: string): Promise<IJobSearchProfileDocument> {
    try {
      await getConnection();
      
      let profile = await JobSearchProfile.findOne({ userId: new ObjectId(userId) });
      
      if (!profile) {
        profile = await JobSearchProfile.create({
          userId: new ObjectId(userId),
          ...DEFAULT_PROFILE,
          profileVersion: 1,
        });
        console.log(`[JobSearchProfileService] Created new profile for user ${userId}`);
      }
      
      return profile;
    } catch (error) {
      console.error('[JobSearchProfileService] getOrCreateProfile error:', error);
      throw new Error('Failed to get or create job search profile');
    }
  }

  /**
   * Update canonical job-search profile with atomic version increment.
   * 
   * CRITICAL: Version is incremented atomically using MongoDB's $inc operator.
   * This guarantees: read version = N, update profile, write version = N+1
   * 
   * The version must not be accidentally skipped or left unchanged.
   * 
   * @param skipVersionIncrement - If true, does not increment version (for non-matching-affecting changes)
   */
  static async updateProfile(
    userId: string,
    updates: Partial<Omit<IJobSearchProfileDocument, '_id' | 'userId' | 'profileVersion' | 'createdAt' | 'updatedAt'>>,
    skipVersionIncrement: boolean = false
  ): Promise<IJobSearchProfileDocument> {
    try {
      await getConnection();
      
      // Use atomic $inc for version to guarantee consistency
      // This handles concurrent updates safely
      const updateOperation: any = {
        $set: updates,
      };
      
      // Only increment version if matching-affecting fields changed
      if (!skipVersionIncrement) {
        updateOperation.$inc = { profileVersion: 1 };
      }
      
      const profile = await JobSearchProfile.findOneAndUpdate(
        { userId: new ObjectId(userId) },
        updateOperation,
        { new: true, upsert: true }
      );
      
      if (!profile) {
        throw new Error('Failed to update profile');
      }
      
      // Invalidate caches asynchronously (non-blocking) only if version changed
      if (!skipVersionIncrement) {
        this.invalidateCaches(userId, profile.profileVersion).catch(() => {});
      }
      
      return profile;
    } catch (error) {
      console.error('[JobSearchProfileService] updateProfile error:', error);
      throw new Error('Failed to update job search profile');
    }
  }

  /**
   * Patch partial updates to canonical job-search profile.
   * Convenience method for partial updates.
   * Only increments profileVersion if matching-affecting fields changed.
   */
  static async patchProfile(
    userId: string,
    partialUpdates: Partial<Omit<IJobSearchProfileDocument, '_id' | 'userId' | 'profileVersion' | 'createdAt' | 'updatedAt'>>
  ): Promise<IJobSearchProfileDocument> {
    // Check if any matching-affecting fields changed
    const matchingAffectingFields = [
      'targetRoles', 'locations', 'workplaceTypes', 'remoteOnly',
      'minSalary', 'salaryCurrency', 'experienceYears', 'maxNoticePeriodDays'
    ];
    
    const hasMatchingAffectingChanges = matchingAffectingFields.some(field => 
      partialUpdates[field as keyof typeof partialUpdates] !== undefined
    );
    
    return this.updateProfile(userId, partialUpdates, !hasMatchingAffectingChanges);
  }

  /**
   * Increment profile version atomically.
   * Used for external cache invalidation.
   */
  static async incrementProfileVersion(userId: string): Promise<number> {
    try {
      await getConnection();
      
      const profile = await JobSearchProfile.findOneAndUpdate(
        { userId: new ObjectId(userId) },
        { $inc: { profileVersion: 1 } },
        { new: true }
      );
      
      if (!profile) {
        throw new Error('Profile not found');
      }
      
      return profile.profileVersion;
    } catch (error) {
      console.error('[JobSearchProfileService] incrementProfileVersion error:', error);
      throw new Error('Failed to increment profile version');
    }
  }

  /**
   * Validate profile data before saving.
   * Returns validation errors if any.
   */
  static validateProfile(profile: Partial<IJobSearchProfileDocument>): string[] {
    const errors: string[] = [];
    
    if (profile.targetRoles && profile.targetRoles.length === 0) {
      errors.push('At least one target role is required');
    }
    
    if (profile.targetRoles && profile.targetRoles.length > 20) {
      errors.push('Maximum 20 target roles allowed');
    }
    
    if (profile.locations && profile.locations.length > 20) {
      errors.push('Maximum 20 locations allowed');
    }
    
    if (profile.minSalary !== undefined && profile.minSalary < 0) {
      errors.push('Minimum salary cannot be negative');
    }
    
    if (profile.experienceYears !== undefined && (profile.experienceYears < 0 || profile.experienceYears > 50)) {
      errors.push('Experience years must be between 0 and 50');
    }
    
    if (profile.maxNoticePeriodDays !== undefined && (profile.maxNoticePeriodDays < 0 || profile.maxNoticePeriodDays > 365)) {
      errors.push('Notice period must be between 0 and 365 days');
    }
    
    if (profile.expectedApplicationsPerMonth !== undefined && (profile.expectedApplicationsPerMonth < 0 || profile.expectedApplicationsPerMonth > 1000)) {
      errors.push('Expected applications per month must be between 0 and 1000');
    }
    
    return errors;
  }

  /**
   * Migrate profile from legacy data sources.
   * This is used during the migration phase.
   */
  static async migrateProfile(
    userId: string,
    legacyData: {
      autoApplyPreferences?: any;
      jobPreferences?: any;
      naukriPreferences?: any;
      indeedPreferences?: any;
    }
  ): Promise<IJobSearchProfileDocument> {
    try {
      await getConnection();
      
      const profileData = this.extractProfileFromLegacy(legacyData);
      
      return this.updateProfile(userId, profileData);
    } catch (error) {
      console.error('[JobSearchProfileService] migrateProfile error:', error);
      throw new Error('Failed to migrate profile');
    }
  }

  /**
   * Compare two profiles for equality.
   * Used for migration validation.
   */
  static compareProfile(
    profile1: IJobSearchProfileDocument,
    profile2: IJobSearchProfileDocument
  ): { equal: boolean; differences: string[] } {
    const differences: string[] = [];
    
    if (JSON.stringify(profile1.targetRoles?.sort()) !== JSON.stringify(profile2.targetRoles?.sort())) {
      differences.push('targetRoles');
    }
    
    if (JSON.stringify(profile1.locations?.sort()) !== JSON.stringify(profile2.locations?.sort())) {
      differences.push('locations');
    }
    
    if (JSON.stringify(profile1.workplaceTypes?.sort()) !== JSON.stringify(profile2.workplaceTypes?.sort())) {
      differences.push('workplaceTypes');
    }
    
    if (profile1.remoteOnly !== profile2.remoteOnly) {
      differences.push('remoteOnly');
    }
    
    if (profile1.minSalary !== profile2.minSalary) {
      differences.push('minSalary');
    }
    
    if (profile1.salaryCurrency !== profile2.salaryCurrency) {
      differences.push('salaryCurrency');
    }
    
    if (profile1.experienceYears !== profile2.experienceYears) {
      differences.push('experienceYears');
    }
    
    if (profile1.maxNoticePeriodDays !== profile2.maxNoticePeriodDays) {
      differences.push('maxNoticePeriodDays');
    }
    
    if (profile1.searchIntensity !== profile2.searchIntensity) {
      differences.push('searchIntensity');
    }
    
    if (profile1.expectedApplicationsPerMonth !== profile2.expectedApplicationsPerMonth) {
      differences.push('expectedApplicationsPerMonth');
    }
    
    if (profile1.applicationMode !== profile2.applicationMode) {
      differences.push('applicationMode');
    }
    
    return {
      equal: differences.length === 0,
      differences,
    };
  }

  /**
   * Delete canonical job-search profile.
   */
  static async deleteProfile(userId: string): Promise<void> {
    try {
      await getConnection();
      await JobSearchProfile.deleteOne({ userId: new ObjectId(userId) });
    } catch (error) {
      console.error('[JobSearchProfileService] deleteProfile error:', error);
      throw new Error('Failed to delete job search profile');
    }
  }

  /**
   * Invalidate all caches for a user.
   */
  private static async invalidateCaches(userId: string, newVersion: number): Promise<void> {
    try {
      // Invalidate discovery cache (user-isolated)
      const { invalidateDiscoveryCache } = await import('./jobDiscoveryService');
      invalidateDiscoveryCache(userId);
      
      // Invalidate recommendation cache
      const { cacheManager } = await import('@/lib/cache/cache-manager');
      if (cacheManager && typeof cacheManager.delete === 'function') {
        await cacheManager.delete(`recommendations:${userId}`);
      }
      
      console.log(`[JobSearchProfileService] Invalidated caches for user ${userId}, version ${newVersion}`);
    } catch (error) {
      // Cache module may not be available; non-critical
      console.warn('[JobSearchProfileService] Cache invalidation failed:', error);
    }
  }

  /**
   * Extract profile data from legacy stores.
   * Used during migration.
   */
  private static extractProfileFromLegacy(legacyData: {
    autoApplyPreferences?: any;
    jobPreferences?: any;
    naukriPreferences?: any;
    indeedPreferences?: any;
  }): Partial<IJobSearchProfileDocument> {
    const { autoApplyPreferences, jobPreferences, naukriPreferences, indeedPreferences } = legacyData;
    
    // Helper to get first non-empty value
    const getFirst = (...values: any[]) => {
      for (const value of values) {
        if (value !== undefined && value !== null && value !== '') {
          return value;
        }
      }
      return undefined;
    };
    
    return {
      targetRoles: getFirst(
        autoApplyPreferences?.targetRoles,
        jobPreferences?.titles,
        naukriPreferences?.targetTitles,
        indeedPreferences?.targetTitles,
        []
      ),
      locations: getFirst(
        autoApplyPreferences?.locations,
        jobPreferences?.locations,
        naukriPreferences?.targetLocations,
        indeedPreferences?.targetLocations,
        []
      ),
      workplaceTypes: autoApplyPreferences?.workplaceTypes || 
        (autoApplyPreferences?.remoteOnly ? ['remote'] : ['remote', 'hybrid', 'onsite']),
      remoteOnly: getFirst(
        autoApplyPreferences?.remoteOnly,
        jobPreferences?.remoteOnly,
        indeedPreferences?.remoteOnly,
        false
      ),
      minSalary: getFirst(
        autoApplyPreferences?.minSalary,
        jobPreferences?.salaryMin,
        naukriPreferences?.minCtcLakhs,
        indeedPreferences?.minSalary ? indeedPreferences.minSalary / 10000 : undefined,
        0
      ),
      salaryCurrency: getFirst(
        autoApplyPreferences?.salaryCurrency,
        jobPreferences?.salaryCurrency,
        indeedPreferences?.salaryCurrency,
        'GBP'
      ),
      experienceYears: getFirst(
        autoApplyPreferences?.experienceYears,
        naukriPreferences?.experienceYears,
        2
      ),
      maxNoticePeriodDays: getFirst(
        autoApplyPreferences?.maxNoticePeriodDays,
        naukriPreferences?.maxNoticePeriodDays,
        30
      ),
      searchIntensity: autoApplyPreferences?.searchIntensity || 'exploring',
      expectedApplicationsPerMonth: autoApplyPreferences?.expectedApplicationsPerMonth || 50,
      applicationMode: autoApplyPreferences?.applicationMode || 'manual_review',
    };
  }
}
