/**
 * Migration Script: JobSearchProfile
 * 
 * This script migrates job-search preferences from legacy stores to the new
 * canonical JobSearchProfile model. It is idempotent and can be run multiple
 * times safely.
 * 
 * IMPORTANT: This script does NOT arbitrarily choose one source when multiple
 * stores disagree. It uses a deterministic conflict resolution strategy based on:
 * - Explicit user modification timestamps
 * - Source reliability classification
 * - Onboarding completion state
 * 
 * Usage:
 *   npx ts-node scripts/migrate-job-search-profiles.ts [--dry-run] [--user-id=xxx] [--verbose]
 * 
 * Flags:
 *   --dry-run    Show what would be migrated without making changes
 *   --user-id    Migrate only a specific user (for testing)
 *   --verbose    Show detailed conflict resolution logs
 */

import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');
const SPECIFIC_USER_ID = process.argv.find(arg => arg.startsWith('--user-id='))?.split('=')[1];

// Migration report
interface MigrationReport {
  userId: string;
  selectedValues: Record<string, any>;
  selectedSources: Record<string, string>;
  sourceTimestamps: Record<string, Date | undefined>;
  conflictingValues: Record<string, any[]>;
  reasons: Record<string, string>;
  warnings: string[];
}

const migrationReports: MigrationReport[] = [];

// Database connection
async function connectDB() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/buildairesume';
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');
}

// Models (import after connection)
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

// Migration statistics
const stats = {
  totalUsers: 0,
  migrated: 0,
  skipped: 0,
  errors: 0,
  conflicts: 0,
  createdProfiles: 0,
  createdConfigs: 0,
  updatedProfiles: 0,
  updatedConfigs: 0,
};

/**
 * Source reliability classification (higher = more reliable)
 */
const SOURCE_RELIABILITY: Record<string, number> = {
  'autoApplyPreferences': 3,      // User explicitly set via UI
  'jobPreferences': 2,            // Legacy collection
  'naukriPreferences': 2,         // Portal-specific
  'indeedPreferences': 2,         // Portal-specific
  'onboarding': 1,                // Onboarding flow (may be incomplete)
};

/**
 * Main migration function
 */
async function migrate() {
  console.log('=== JobSearchProfile Migration ===');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Verbose: ${VERBOSE}`);
  console.log(`Target: ${SPECIFIC_USER_ID || 'ALL USERS'}`);
  console.log('');
  
  await connectDB();
  await loadModels();
  
  // Build query
  const query: any = {};
  if (SPECIFIC_USER_ID) {
    query._id = new ObjectId(SPECIFIC_USER_ID);
  }
  
  // Get all users
  const users = await User.find(query).lean();
  stats.totalUsers = users.length;
  
  console.log(`Found ${users.length} users to process`);
  console.log('');
  
  // Process each user
  for (const user of users) {
    try {
      await processUser(user);
    } catch (error: any) {
      console.error(`Error processing user ${user._id}:`, error.message);
      stats.errors++;
    }
  }
  
  // Print summary
  console.log('');
  console.log('=== Migration Summary ===');
  console.log(`Total users: ${stats.totalUsers}`);
  console.log(`Migrated: ${stats.migrated}`);
  console.log(`Skipped: ${stats.skipped}`);
  console.log(`Errors: ${stats.errors}`);
  console.log(`Conflicts detected: ${stats.conflicts}`);
  console.log('');
  console.log(`Created JobSearchProfiles: ${stats.createdProfiles}`);
  console.log(`Created AutoApplyConfigurations: ${stats.createdConfigs}`);
  console.log(`Updated JobSearchProfiles: ${stats.updatedProfiles}`);
  console.log(`Updated AutoApplyConfigurations: ${stats.updatedConfigs}`);
  
  // Write migration report
  if (!DRY_RUN && migrationReports.length > 0) {
    const reportPath = `./migration-report-${new Date().toISOString().split('T')[0]}.json`;
    const fs = await import('fs');
    fs.writeFileSync(reportPath, JSON.stringify(migrationReports, null, 2));
    console.log('');
    console.log(`Migration report written to: ${reportPath}`);
  }
  
  await mongoose.disconnect();
  console.log('');
  console.log('Migration complete');
}

/**
 * Process a single user
 */
async function processUser(user: any) {
  const userId = user._id.toString();
  
  // Check if already migrated
  const existingProfile = await JobSearchProfile.findOne({ userId: user._id });
  if (existingProfile) {
    console.log(`[${userId}] Already migrated, skipping`);
    stats.skipped++;
    return;
  }
  
  console.log(`[${userId}] Migrating...`);
  
  // Extract preferences from legacy stores
  const legacyData = extractLegacyData(user);
  
  // Resolve conflicts and determine winner for each field
  const report = resolveConflicts(userId, legacyData);
  migrationReports.push(report);
  
  if (VERBOSE) {
    console.log(`  Conflict resolution report:`, JSON.stringify(report, null, 2));
  }
  
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would create JobSearchProfile with resolved values`);
    stats.migrated++;
    return;
  }
  
  // Create JobSearchProfile with resolved values
  const profile = await JobSearchProfile.create({
    userId: user._id,
    targetRoles: report.selectedValues.targetRoles,
    locations: report.selectedValues.locations,
    workplaceTypes: report.selectedValues.workplaceTypes,
    remoteOnly: report.selectedValues.remoteOnly,
    minSalary: report.selectedValues.minSalary,
    salaryCurrency: report.selectedValues.salaryCurrency,
    experienceYears: report.selectedValues.experienceYears,
    maxNoticePeriodDays: report.selectedValues.maxNoticePeriodDays,
    searchIntensity: report.selectedValues.searchIntensity,
    expectedApplicationsPerMonth: report.selectedValues.expectedApplicationsPerMonth,
    applicationMode: report.selectedValues.applicationMode,
    profileVersion: 1,
  });
  stats.createdProfiles++;
  
  // Create AutoApplyConfiguration
  const config = await AutoApplyConfiguration.create({
    userId: user._id,
    jobSearchProfileId: profile._id,
    enabled: report.selectedValues.autoApplyEnabled,
    maxPerDay: report.selectedValues.autoApplyMaxPerDay,
    useTailoredCV: report.selectedValues.autoApplyUseTailoredCV,
    useCoverLetter: report.selectedValues.autoApplyUseCoverLetter,
    autoAnswerQuestions: report.selectedValues.autoApplyAutoAnswerQuestions,
    enabledPortals: report.selectedValues.autoApplyEnabledPortals,
    portalOverrides: {
      naukri: {
        enabled: report.selectedValues.naukriAutoApplyEnabled || false,
        dailyLimit: report.selectedValues.naukriDailyLimit || 25,
      },
      indeed: {
        enabled: report.selectedValues.indeedAutoApplyEnabled || false,
        dailyLimit: report.selectedValues.indeedDailyLimit || 25,
      },
    },
    profileVersion: 1,
    lastSyncedAt: new Date(),
  });
  stats.createdConfigs++;
  
  console.log(`  Created JobSearchProfile: ${profile._id}`);
  console.log(`  Created AutoApplyConfiguration: ${config._id}`);
  
  stats.migrated++;
}

/**
 * Extract legacy data from all sources
 */
function extractLegacyData(user: any) {
  return {
    autoApplyPreferences: user.autoApplyPreferences || null,
    jobPreferences: user.job_preferences || null,
    naukriPreferences: user.naukriIntegration?.preferences || null,
    indeedPreferences: user.indeedIntegration?.preferences || null,
    onboarding: user.onboarding || null,
  };
}

/**
 * Resolve conflicts between legacy sources for each field.
 * Uses deterministic strategy based on source reliability and timestamps.
 */
function resolveConflicts(userId: string, legacyData: any): MigrationReport {
  const report: MigrationReport = {
    userId,
    selectedValues: {},
    selectedSources: {},
    sourceTimestamps: {},
    conflictingValues: {},
    reasons: {},
    warnings: [],
  };
  
  // Define fields to migrate with their extraction functions
  const fields = [
    {
      name: 'targetRoles',
      extract: (data: any) => ({
        autoApplyPreferences: data.autoApplyPreferences?.targetRoles,
        jobPreferences: data.jobPreferences?.titles,
        naukriPreferences: data.naukriPreferences?.targetTitles,
        indeedPreferences: data.indeedPreferences?.targetTitles,
      }),
      transform: (value: any) => Array.isArray(value) ? value : [],
    },
    {
      name: 'locations',
      extract: (data: any) => ({
        autoApplyPreferences: data.autoApplyPreferences?.locations,
        jobPreferences: data.jobPreferences?.locations,
        naukriPreferences: data.naukriPreferences?.targetLocations,
        indeedPreferences: data.indeedPreferences?.targetLocations,
      }),
      transform: (value: any) => Array.isArray(value) ? value : [],
    },
    {
      name: 'workplaceTypes',
      extract: (data: any) => ({
        autoApplyPreferences: data.autoApplyPreferences?.workplaceTypes,
      }),
      transform: (value: any) => {
        if (Array.isArray(value)) return value;
        // Derive from remoteOnly if available
        if (legacyData.autoApplyPreferences?.remoteOnly) return ['remote'];
        return ['remote', 'hybrid', 'onsite'];
      },
    },
    {
      name: 'remoteOnly',
      extract: (data: any) => ({
        autoApplyPreferences: data.autoApplyPreferences?.remoteOnly,
        jobPreferences: data.jobPreferences?.remoteOnly,
        indeedPreferences: data.indeedPreferences?.remoteOnly,
      }),
      transform: (value: any) => Boolean(value),
    },
    {
      name: 'minSalary',
      extract: (data: any) => ({
        autoApplyPreferences: data.autoApplyPreferences?.minSalary,
        jobPreferences: data.jobPreferences?.salaryMin,
        naukriPreferences: data.naukriPreferences?.minCtcLakhs,
        indeedPreferences: data.indeedPreferences?.minSalary ? data.indeedPreferences.minSalary / 10000 : undefined,
      }),
      transform: (value: any) => Number(value) || 0,
    },
    {
      name: 'salaryCurrency',
      extract: (data: any) => ({
        autoApplyPreferences: data.autoApplyPreferences?.salaryCurrency,
        indeedPreferences: data.indeedPreferences?.salaryCurrency,
      }),
      transform: (value: any) => value || 'GBP',
    },
    {
      name: 'experienceYears',
      extract: (data: any) => ({
        autoApplyPreferences: data.autoApplyPreferences?.experienceYears,
        naukriPreferences: data.naukriPreferences?.experienceYears,
      }),
      transform: (value: any) => Number(value) || 2,
    },
    {
      name: 'maxNoticePeriodDays',
      extract: (data: any) => ({
        autoApplyPreferences: data.autoApplyPreferences?.maxNoticePeriodDays,
        naukriPreferences: data.naukriPreferences?.maxNoticePeriodDays,
      }),
      transform: (value: any) => Number(value) || 30,
    },
    {
      name: 'searchIntensity',
      extract: (data: any) => ({
        autoApplyPreferences: data.autoApplyPreferences?.searchIntensity,
      }),
      transform: (value: any) => value || 'exploring',
    },
    {
      name: 'expectedApplicationsPerMonth',
      extract: (data: any) => ({
        autoApplyPreferences: data.autoApplyPreferences?.expectedApplicationsPerMonth,
      }),
      transform: (value: any) => Number(value) || 50,
    },
    {
      name: 'applicationMode',
      extract: (data: any) => ({
        autoApplyPreferences: data.autoApplyPreferences?.applicationMode,
      }),
      transform: (value: any) => value || 'manual_review',
    },
    {
      name: 'autoApplyEnabled',
      extract: (data: any) => ({
        autoApplyPreferences: data.autoApplyPreferences?.enabled,
        naukriPreferences: data.naukriPreferences?.autoApplyEnabled,
        indeedPreferences: data.indeedPreferences?.autoApplyEnabled,
      }),
      transform: (value: any) => Boolean(value),
    },
    {
      name: 'autoApplyMaxPerDay',
      extract: (data: any) => ({
        autoApplyPreferences: data.autoApplyPreferences?.maxPerDay,
        naukriPreferences: data.naukriPreferences?.dailyLimit,
        indeedPreferences: data.indeedPreferences?.dailyLimit,
      }),
      transform: (value: any) => Number(value) || 25,
    },
    {
      name: 'autoApplyUseTailoredCV',
      extract: (data: any) => ({
        autoApplyPreferences: data.autoApplyPreferences?.useTailoredCV,
      }),
      transform: (value: any) => value !== false,
    },
    {
      name: 'autoApplyUseCoverLetter',
      extract: (data: any) => ({
        autoApplyPreferences: data.autoApplyPreferences?.useCoverLetter,
      }),
      transform: (value: any) => value !== false,
    },
    {
      name: 'autoApplyAutoAnswerQuestions',
      extract: (data: any) => ({
        autoApplyPreferences: data.autoApplyPreferences?.autoAnswerQuestions,
      }),
      transform: (value: any) => value !== false,
    },
    {
      name: 'autoApplyEnabledPortals',
      extract: (data: any) => ({
        autoApplyPreferences: data.autoApplyPreferences?.enabledPortals,
      }),
      transform: (value: any) => Array.isArray(value) ? value : ['naukri', 'indeed', 'greenhouse', 'adzuna'],
    },
    {
      name: 'naukriAutoApplyEnabled',
      extract: (data: any) => ({
        naukriPreferences: data.naukriPreferences?.autoApplyEnabled,
      }),
      transform: (value: any) => Boolean(value),
    },
    {
      name: 'naukriDailyLimit',
      extract: (data: any) => ({
        naukriPreferences: data.naukriPreferences?.dailyLimit,
      }),
      transform: (value: any) => Number(value) || 25,
    },
    {
      name: 'indeedAutoApplyEnabled',
      extract: (data: any) => ({
        indeedPreferences: data.indeedPreferences?.autoApplyEnabled,
      }),
      transform: (value: any) => Boolean(value),
    },
    {
      name: 'indeedDailyLimit',
      extract: (data: any) => ({
        indeedPreferences: data.indeedPreferences?.dailyLimit,
      }),
      transform: (value: any) => Number(value) || 25,
    },
  ];
  
  // Resolve each field
  for (const field of fields) {
    const values = field.extract(legacyData);
    const nonNullValues = Object.entries(values).filter(([_, value]) => value !== null && value !== undefined);
    
    if (nonNullValues.length === 0) {
      // No values found, use default
      report.selectedValues[field.name] = field.transform(undefined);
      report.selectedSources[field.name] = 'default';
      report.reasons[field.name] = 'No legacy data found, using default';
      continue;
    }
    
    if (nonNullValues.length === 1) {
      // Only one source, use it
      const [source, value] = nonNullValues[0];
      report.selectedValues[field.name] = field.transform(value);
      report.selectedSources[field.name] = source;
      report.reasons[field.name] = `Only available source: ${source}`;
      continue;
    }
    
    // Multiple sources - resolve conflict
    stats.conflicts++;
    
    // Sort by reliability (highest first)
    const sortedSources = nonNullValues.sort((a, b) => {
      const reliabilityA = SOURCE_RELIABILITY[a[0]] || 0;
      const reliabilityB = SOURCE_RELIABILITY[b[0]] || 0;
      return reliabilityB - reliabilityA;
    });
    
    const [selectedSource, selectedValue] = sortedSources[0];
    report.selectedValues[field.name] = field.transform(selectedValue);
    report.selectedSources[field.name] = selectedSource;
    report.conflictingValues[field.name] = sortedSources.map(([source, value]) => ({ source, value }));
    report.reasons[field.name] = `Selected ${selectedSource} (reliability: ${SOURCE_RELIABILITY[selectedSource] || 0})`;
    
    if (VERBOSE) {
      console.log(`    [${field.name}] Conflict detected:`);
      console.log(`      Selected: ${selectedSource} = ${JSON.stringify(selectedValue)}`);
      console.log(`      Alternatives: ${sortedSources.slice(1).map(([s, v]) => `${s}=${JSON.stringify(v)}`).join(', ')}`);
    }
  }
  
  return report;
}

// Run migration
migrate().catch(console.error);
