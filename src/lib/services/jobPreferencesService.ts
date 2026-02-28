import { ObjectId } from 'mongodb';
import type { JobPreferences, ValidationResult } from '@/types/automation-schema';

export class JobPreferencesService {
  static async getPreferences(userId: string): Promise<JobPreferences | null> {
    try {
      const { getDb } = await import('@/lib/db');
      const db = await getDb();
      
      const preferences = await db.collection<JobPreferences>('job_preferences').findOne({
        userId: new ObjectId(userId),
      });
      
      return preferences;
    } catch (error) {
      console.error('[JobPreferencesService] getPreferences error:', error);
      throw new Error('Failed to fetch job preferences');
    }
  }

  static async updatePreferences(
    userId: string,
    prefs: Omit<JobPreferences, '_id' | 'userId' | 'updatedAt'>
  ): Promise<JobPreferences> {
    try {
      const validation = this.validatePreferences(prefs);
      if (!validation.valid) {
        throw new Error(`Invalid preferences: ${validation.errors?.join(', ')}`);
      }

      const { getDb } = await import('@/lib/db');
      const db = await getDb();
      
      const updatedPrefs: JobPreferences = {
        _id: new ObjectId(),
        userId: new ObjectId(userId),
        ...prefs,
        updatedAt: new Date(),
      };

      await db.collection<JobPreferences>('job_preferences').updateOne(
        { userId: new ObjectId(userId) },
        { $set: updatedPrefs },
        { upsert: true }
      );

      await this.triggerRematch(userId);

      const auditService = await import('./auditService');
      await auditService.AuditService.logAction(
        userId,
        'preferences_updated',
        undefined,
        { preferences: prefs }
      );

      return updatedPrefs;
    } catch (error) {
      console.error('[JobPreferencesService] updatePreferences error:', error);
      throw error;
    }
  }

  static validatePreferences(
    prefs: Partial<Omit<JobPreferences, '_id' | 'userId' | 'updatedAt'>>
  ): ValidationResult {
    const errors: string[] = [];

    if (prefs.country && prefs.country !== 'UK') {
      errors.push('Country must be UK for v1');
    }

    if (prefs.titles && prefs.titles.length === 0) {
      errors.push('At least one job title is required');
    }

    if (prefs.titles && prefs.titles.length > 10) {
      errors.push('Maximum 10 job titles allowed');
    }

    if (prefs.locations && prefs.locations.length > 10) {
      errors.push('Maximum 10 locations allowed');
    }

    if (prefs.salaryMin && (prefs.salaryMin < 0 || prefs.salaryMin > 500000)) {
      errors.push('Salary minimum must be between 0 and 500000');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private static async triggerRematch(userId: string): Promise<void> {
    try {
      const jobMatchingService = await import('./jobMatchingService');
      await jobMatchingService.JobMatchingService.rematchAllJobsForUser(userId);
    } catch (error) {
      console.error('[JobPreferencesService] triggerRematch error:', error);
    }
  }

  static async hasPreferences(userId: string): Promise<boolean> {
    const prefs = await this.getPreferences(userId);
    return prefs !== null && prefs.titles.length > 0;
  }
}
