/**
 * Rollback Script: JobSearchProfile Migration
 * 
 * This script rolls back the migration by removing migrated data
 * and restoring legacy stores. Use with caution!
 * 
 * Usage:
 *   npx ts-node scripts/rollback-job-search-profile-migration.ts [--dry-run] [--user-id=xxx] [--confirm]
 * 
 * Flags:
 *   --dry-run    Show what would be rolled back without making changes
 *   --user-id    Rollback only a specific user (for testing)
 *   --confirm    Actually perform the rollback (safety switch)
 */

import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const CONFIRM = process.argv.includes('--confirm');
const SPECIFIC_USER_ID = process.argv.find(arg => arg.startsWith('--user-id='))?.split('=')[1];

// Rollback statistics
const stats = {
  totalProfiles: 0,
  rolledBack: 0,
  skipped: 0,
  errors: 0,
  deletedProfiles: 0,
  deletedConfigs: 0,
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

/**
 * Main rollback function
 */
async function rollback() {
  console.log('=== JobSearchProfile Migration Rollback ===');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Confirm: ${CONFIRM ? 'YES' : 'NO'}`);
  console.log(`Target: ${SPECIFIC_USER_ID || 'ALL USERS'}`);
  console.log('');
  
  if (!DRY_RUN && !CONFIRM) {
    console.log('ERROR: Rollback requires --confirm flag');
    console.log('This is a safety measure to prevent accidental data loss.');
    console.log('');
    console.log('To proceed, run:');
    console.log('  npx ts-node scripts/rollback-job-search-profile-migration.ts --confirm');
    console.log('');
    console.log('Or use --dry-run to see what would be rolled back:');
    console.log('  npx ts-node scripts/rollback-job-search-profile-migration.ts --dry-run');
    await mongoose.disconnect();
    return;
  }
  
  await connectDB();
  await loadModels();
  
  // Build query
  const query: any = {};
  if (SPECIFIC_USER_ID) {
    query.userId = new ObjectId(SPECIFIC_USER_ID);
  }
  
  // Get all migrated profiles
  const profiles = await JobSearchProfile.find(query);
  stats.totalProfiles = profiles.length;
  
  console.log(`Found ${profiles.length} migrated profiles to rollback`);
  console.log('');
  
  // Rollback each profile
  for (const profile of profiles) {
    try {
      await rollbackProfile(profile);
    } catch (error: any) {
      console.error(`Error rolling back profile ${profile._id}:`, error.message);
      stats.errors++;
    }
  }
  
  // Print summary
  console.log('');
  console.log('=== Rollback Summary ===');
  console.log(`Total profiles: ${stats.totalProfiles}`);
  console.log(`Rolled back: ${stats.rolledBack}`);
  console.log(`Skipped: ${stats.skipped}`);
  console.log(`Errors: ${stats.errors}`);
  console.log('');
  console.log(`Deleted JobSearchProfiles: ${stats.deletedProfiles}`);
  console.log(`Deleted AutoApplyConfigurations: ${stats.deletedConfigs}`);
  
  await mongoose.disconnect();
  console.log('');
  console.log('Rollback complete');
}

/**
 * Rollback a single profile
 */
async function rollbackProfile(profile: any) {
  const userId = profile.userId.toString();
  
  console.log(`[${userId}] Rolling back...`);
  
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would delete JobSearchProfile: ${profile._id}`);
    console.log(`  [DRY RUN] Would delete AutoApplyConfiguration for user: ${userId}`);
    stats.rolledBack++;
    return;
  }
  
  // Delete AutoApplyConfiguration
  const deletedConfig = await AutoApplyConfiguration.deleteOne({ userId: profile.userId });
  if (deletedConfig.deletedCount > 0) {
    console.log(`  Deleted AutoApplyConfiguration`);
    stats.deletedConfigs++;
  }
  
  // Delete JobSearchProfile
  const deletedProfile = await JobSearchProfile.deleteOne({ _id: profile._id });
  if (deletedProfile.deletedCount > 0) {
    console.log(`  Deleted JobSearchProfile: ${profile._id}`);
    stats.deletedProfiles++;
  }
  
  // Note: We do NOT restore legacy stores
  // Legacy stores should still have their original data
  // This rollback only removes the migrated data
  
  stats.rolledBack++;
}

// Run rollback
rollback().catch(console.error);
