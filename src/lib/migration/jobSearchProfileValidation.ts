/**
 * Migration Validation Module
 * 
 * Standalone validation logic for comparing legacy vs new profiles.
 * This module does NOT import server-only or client-only modules.
 * It only uses MongoDB primitives.
 * 
 * Usage:
 *   import { validateMigration } from '@/lib/migration/jobSearchProfileValidation';
 */

import { ObjectId, Db } from 'mongodb';

export interface ValidationConfig {
  dryRun?: boolean;
  verbose?: boolean;
  specificUserId?: string;
}

export interface FieldMismatch {
  userId: string;
  field: string;
  legacy: any;
  new: any;
  source: string;
}

export interface ValidationResult {
  totalUsers: number;
  passed: number;
  failed: number;
  warnings: number;
  fieldMismatches: FieldMismatch[];
  legacyOnlyUsers: number;
  migratedUsers: number;
  missingProfiles: number;
}

/**
 * Extract effective legacy preferences from user document.
 * This replicates the logic from UserJobPreferencesService.getPreferences
 * without importing the service directly.
 */
function extractLegacyPreferences(user: any): Record<string, any> {
  const saved = user.autoApplyPreferences || {};
  const naukriPrefs = user.naukriIntegration?.preferences || {};
  const indeedPrefs = user.indeedIntegration?.preferences || {};

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
    enabled: getFirst(saved.enabled, naukriPrefs.autoApplyEnabled, indeedPrefs.autoApplyEnabled, false),
    targetRoles: getFirst(saved.targetRoles, naukriPrefs.targetTitles, indeedPrefs.targetTitles, []),
    locations: getFirst(saved.locations, naukriPrefs.targetLocations, indeedPrefs.targetLocations, []),
    remoteOnly: getFirst(saved.remoteOnly, indeedPrefs.remoteOnly, false),
    workplaceTypes: getFirst(saved.workplaceTypes, (saved.remoteOnly ? ['remote'] : ['remote', 'hybrid', 'onsite'])),
    minSalary: getFirst(saved.minSalary, naukriPrefs.minCtcLakhs, indeedPrefs.minSalary ? indeedPrefs.minSalary / 10000 : undefined, 0),
    salaryCurrency: getFirst(saved.salaryCurrency, indeedPrefs.salaryCurrency, 'GBP'),
    experienceYears: getFirst(saved.experienceYears, naukriPrefs.experienceYears, 2),
    maxNoticePeriodDays: getFirst(saved.maxNoticePeriodDays, naukriPrefs.maxNoticePeriodDays, 30),
    maxPerDay: getFirst(saved.maxPerDay, naukriPrefs.dailyLimit, indeedPrefs.dailyLimit, 25),
    useTailoredCV: getFirst(saved.useTailoredCV, true),
    useCoverLetter: getFirst(saved.useCoverLetter, true),
    autoAnswerQuestions: getFirst(saved.autoAnswerQuestions, true),
    enabledPortals: getFirst(saved.enabledPortals, ['naukri', 'indeed', 'greenhouse', 'adzuna']),
    searchIntensity: getFirst(saved.searchIntensity, 'exploring'),
    expectedApplicationsPerMonth: getFirst(saved.expectedApplicationsPerMonth, 50),
    applicationMode: getFirst(saved.applicationMode, 'manual_review'),
  };
}

/**
 * Compare two arrays for equality
 */
function arraysEqual(a: any[], b: any[]): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;

  const sortedA = [...a].sort();
  const sortedB = [...b].sort();

  return JSON.stringify(sortedA) === JSON.stringify(sortedB);
}

/**
 * Validate migration for all users or a specific user
 */
export async function validateMigration(
  db: Db,
  config: ValidationConfig = {}
): Promise<ValidationResult> {
  const { verbose = false, specificUserId } = config;

  const result: ValidationResult = {
    totalUsers: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
    fieldMismatches: [],
    legacyOnlyUsers: 0,
    migratedUsers: 0,
    missingProfiles: 0,
  };

  // Build query
  const query: any = {};
  if (specificUserId) {
    query._id = new ObjectId(specificUserId);
  }

  // Get all users
  const users = await db.collection('users').find(query).toArray();
  result.totalUsers = users.length;

  if (verbose) {
    console.log(`Found ${users.length} users to validate`);
  }

  // Get all JobSearchProfiles
  const profiles = await db.collection('jobsearchprofiles').find({}).toArray();
  const profileMap = new Map(profiles.map(p => [p.userId.toString(), p]));

  // Validate each user
  for (const user of users) {
    const userId = user._id.toString();
    const profile = profileMap.get(userId);

    if (!profile) {
      result.missingProfiles++;
      if (verbose) {
        console.log(`[${userId}] No JobSearchProfile found`);
      }
      continue;
    }

    result.migratedUsers++;

    // Extract legacy preferences
    const legacyPrefs = extractLegacyPreferences(user);

    // Compare fields
    const mismatches: string[] = [];

    // Compare target roles
    if (!arraysEqual(profile.targetRoles || [], legacyPrefs.targetRoles || [])) {
      mismatches.push('targetRoles');
      result.fieldMismatches.push({
        userId,
        field: 'targetRoles',
        legacy: legacyPrefs.targetRoles,
        new: profile.targetRoles,
        source: 'autoApplyPreferences',
      });
    }

    // Compare locations
    if (!arraysEqual(profile.locations || [], legacyPrefs.locations || [])) {
      mismatches.push('locations');
      result.fieldMismatches.push({
        userId,
        field: 'locations',
        legacy: legacyPrefs.locations,
        new: profile.locations,
        source: 'autoApplyPreferences',
      });
    }

    // Compare workplace types
    if (!arraysEqual(profile.workplaceTypes || [], legacyPrefs.workplaceTypes || [])) {
      mismatches.push('workplaceTypes');
      result.fieldMismatches.push({
        userId,
        field: 'workplaceTypes',
        legacy: legacyPrefs.workplaceTypes,
        new: profile.workplaceTypes,
        source: 'autoApplyPreferences',
      });
    }

    // Compare remote only
    if (profile.remoteOnly !== legacyPrefs.remoteOnly) {
      mismatches.push('remoteOnly');
      result.fieldMismatches.push({
        userId,
        field: 'remoteOnly',
        legacy: legacyPrefs.remoteOnly,
        new: profile.remoteOnly,
        source: 'autoApplyPreferences',
      });
    }

    // Compare min salary
    if (profile.minSalary !== legacyPrefs.minSalary) {
      mismatches.push('minSalary');
      result.fieldMismatches.push({
        userId,
        field: 'minSalary',
        legacy: legacyPrefs.minSalary,
        new: profile.minSalary,
        source: 'autoApplyPreferences',
      });
    }

    // Compare salary currency
    if (profile.salaryCurrency !== legacyPrefs.salaryCurrency) {
      mismatches.push('salaryCurrency');
      result.fieldMismatches.push({
        userId,
        field: 'salaryCurrency',
        legacy: legacyPrefs.salaryCurrency,
        new: profile.salaryCurrency,
        source: 'autoApplyPreferences',
      });
    }

    // Compare experience years
    if (profile.experienceYears !== legacyPrefs.experienceYears) {
      mismatches.push('experienceYears');
      result.fieldMismatches.push({
        userId,
        field: 'experienceYears',
        legacy: legacyPrefs.experienceYears,
        new: profile.experienceYears,
        source: 'autoApplyPreferences',
      });
    }

    // Compare max notice period
    if (profile.maxNoticePeriodDays !== legacyPrefs.maxNoticePeriodDays) {
      mismatches.push('maxNoticePeriodDays');
      result.fieldMismatches.push({
        userId,
        field: 'maxNoticePeriodDays',
        legacy: legacyPrefs.maxNoticePeriodDays,
        new: profile.maxNoticePeriodDays,
        source: 'autoApplyPreferences',
      });
    }

    // Compare search intensity
    if (profile.searchIntensity !== legacyPrefs.searchIntensity) {
      mismatches.push('searchIntensity');
      result.fieldMismatches.push({
        userId,
        field: 'searchIntensity',
        legacy: legacyPrefs.searchIntensity,
        new: profile.searchIntensity,
        source: 'autoApplyPreferences',
      });
    }

    // Compare expected applications per month
    if (profile.expectedApplicationsPerMonth !== legacyPrefs.expectedApplicationsPerMonth) {
      mismatches.push('expectedApplicationsPerMonth');
      result.fieldMismatches.push({
        userId,
        field: 'expectedApplicationsPerMonth',
        legacy: legacyPrefs.expectedApplicationsPerMonth,
        new: profile.expectedApplicationsPerMonth,
        source: 'autoApplyPreferences',
      });
    }

    // Compare application mode
    if (profile.applicationMode !== legacyPrefs.applicationMode) {
      mismatches.push('applicationMode');
      result.fieldMismatches.push({
        userId,
        field: 'applicationMode',
        legacy: legacyPrefs.applicationMode,
        new: profile.applicationMode,
        source: 'autoApplyPreferences',
      });
    }

    // Report result
    if (mismatches.length === 0) {
      if (verbose) {
        console.log(`[${userId}] ✓ PASSED`);
      }
      result.passed++;
    } else {
      console.log(`[${userId}] ✗ FAILED (${mismatches.length} mismatches)`);
      if (verbose) {
        console.log(`  Mismatches: ${mismatches.join(', ')}`);
      }
      result.failed++;
    }
  }

  return result;
}
