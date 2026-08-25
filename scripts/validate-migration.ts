/**
 * Validation Script: Compare old vs new service outputs
 * 
 * This script validates that the new JobSearchProfile service produces
 * identical results to the legacy services for the same inputs.
 * 
 * Usage:
 *   npx ts-node scripts/validate-migration.ts [--dry-run] [--verbose] [--user-id=xxx]
 */

import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');
const SPECIFIC_USER_ID = process.argv.find(arg => arg.startsWith('--user-id='))?.split('=')[1];

// Validation statistics
const stats = {
  totalUsers: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  fieldMismatches: [] as Array<{
    userId: string;
    field: string;
    legacy: any;
    new: any;
    source: string;
  }>,
};

// Database connection
async function connectDB() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/buildairesume';
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');
}

// Models
let User: any;
let JobSearchProfile: any;
let AutoApplyConfiguration: any;

async function loadModels() {
  const UserModule = await import('../src/models/User');
  User = UserModule.default;
  
  const JobSearchProfileModule = await import('../src/models/JobSearchProfile');
  JobSearchProfile = JobSearchProfileModule.default;
  
  const AutoApplyConfigurationModule = await import('../src/models/AutoApplyConfiguration');
  AutoApplyConfiguration = AutoApplyConfigurationModule.default;
}

// Services
let LegacyPreferencesService: any;
let NewProfileService: any;

async function loadServices() {
  const LegacyModule = await import('../src/lib/services/userJobPreferencesService');
  LegacyPreferencesService = LegacyModule.UserJobPreferencesService;
  
  const NewModule = await import('../src/lib/services/jobSearchProfileService');
  NewProfileService = NewModule.JobSearchProfileService;
}

/**
 * Main validation function
 */
async function validate() {
  console.log('=== Migration Validation ===');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Verbose: ${VERBOSE}`);
  console.log(`Target: ${SPECIFIC_USER_ID || 'ALL USERS'}`);
  console.log('');
  
  await connectDB();
  await loadModels();
  await loadServices();
  
  // Build query
  const query: any = {};
  if (SPECIFIC_USER_ID) {
    query._id = new ObjectId(SPECIFIC_USER_ID);
  }
  
  // Get all users with migrated profiles
  const profiles = await JobSearchProfile.find(query);
  stats.totalUsers = profiles.length;
  
  console.log(`Found ${profiles.length} migrated profiles to validate`);
  console.log('');
  
  // Validate each profile
  for (const profile of profiles) {
    try {
      await validateProfile(profile);
    } catch (error: any) {
      console.error(`Error validating profile ${profile._id}:`, error.message);
      stats.failed++;
    }
  }
  
  // Print summary
  console.log('');
  console.log('=== Validation Summary ===');
  console.log(`Total profiles: ${stats.totalUsers}`);
  console.log(`Passed: ${stats.passed}`);
  console.log(`Failed: ${stats.failed}`);
  console.log(`Warnings: ${stats.warnings}`);
  
  if (stats.fieldMismatches.length > 0) {
    console.log('');
    console.log('=== Field Mismatches ===');
    for (const mismatch of stats.fieldMismatches) {
      console.log(`[${mismatch.userId}] ${mismatch.field}:`);
      console.log(`  Legacy (${mismatch.source}): ${JSON.stringify(mismatch.legacy)}`);
      console.log(`  New:    ${JSON.stringify(mismatch.new)}`);
    }
  }
  
  await mongoose.disconnect();
  console.log('');
  console.log('Validation complete');
  
  // Exit with appropriate code
  if (stats.failed > 0) {
    process.exit(1);
  }
}

/**
 * Validate a single profile against legacy data
 */
async function validateProfile(profile: any) {
  const userId = profile.userId.toString();
  
  if (VERBOSE) {
    console.log(`[${userId}] Validating...`);
  }
  
  // Get legacy preferences
  const legacyPrefs = await LegacyPreferencesService.getPreferences(userId);
  
  // Compare fields
  const mismatches: string[] = [];
  
  // Compare target roles
  if (!arraysEqual(profile.targetRoles, legacyPrefs.targetRoles)) {
    mismatches.push('targetRoles');
    stats.fieldMismatches.push({
      userId,
      field: 'targetRoles',
      legacy: legacyPrefs.targetRoles,
      new: profile.targetRoles,
      source: 'autoApplyPreferences',
    });
  }
  
  // Compare locations
  if (!arraysEqual(profile.locations, legacyPrefs.locations)) {
    mismatches.push('locations');
    stats.fieldMismatches.push({
      userId,
      field: 'locations',
      legacy: legacyPrefs.locations,
      new: profile.locations,
      source: 'autoApplyPreferences',
    });
  }
  
  // Compare workplace types
  if (!arraysEqual(profile.workplaceTypes, legacyPrefs.workplaceTypes)) {
    mismatches.push('workplaceTypes');
    stats.fieldMismatches.push({
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
    stats.fieldMismatches.push({
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
    stats.fieldMismatches.push({
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
    stats.fieldMismatches.push({
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
    stats.fieldMismatches.push({
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
    stats.fieldMismatches.push({
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
    stats.fieldMismatches.push({
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
    stats.fieldMismatches.push({
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
    stats.fieldMismatches.push({
      userId,
      field: 'applicationMode',
      legacy: legacyPrefs.applicationMode,
      new: profile.applicationMode,
      source: 'autoApplyPreferences',
    });
  }
  
  // Check AutoApplyConfiguration
  const autoApplyConfig = await AutoApplyConfiguration.findOne({ userId: profile.userId });
  if (!autoApplyConfig) {
    mismatches.push('AutoApplyConfiguration (missing)');
    stats.warnings++;
  } else {
    // Compare auto-apply settings
    if (autoApplyConfig.enabled !== legacyPrefs.enabled) {
      mismatches.push('autoApply.enabled');
      stats.fieldMismatches.push({
        userId,
        field: 'autoApply.enabled',
        legacy: legacyPrefs.enabled,
        new: autoApplyConfig.enabled,
        source: 'autoApplyPreferences',
      });
    }
    
    if (autoApplyConfig.maxPerDay !== legacyPrefs.maxPerDay) {
      mismatches.push('autoApply.maxPerDay');
      stats.fieldMismatches.push({
        userId,
        field: 'autoApply.maxPerDay',
        legacy: legacyPrefs.maxPerDay,
        new: autoApplyConfig.maxPerDay,
        source: 'autoApplyPreferences',
      });
    }
  }
  
  // Report result
  if (mismatches.length === 0) {
    console.log(`[${userId}] ✓ PASSED`);
    stats.passed++;
  } else {
    console.log(`[${userId}] ✗ FAILED (${mismatches.length} mismatches)`);
    if (VERBOSE) {
      console.log(`  Mismatches: ${mismatches.join(', ')}`);
    }
    stats.failed++;
  }
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

// Run validation
validate().catch(console.error);
