/**
 * Validation Script: JobSearchProfile Migration
 * 
 * This script validates that migrated JobSearchProfile data matches
 * legacy preference data for all users.
 * 
 * Usage:
 *   npx tsx scripts/validate-job-search-profile-migration.ts [--dry-run] [--verbose] [--user-id=xxx]
 * 
 * Flags:
 *   --dry-run    Show what would be validated without making changes
 *   --verbose    Show detailed validation logs
 *   --user-id    Validate only a specific user
 */

import mongoose from 'mongoose';
import { MongoClient, Db } from 'mongodb';
import { validateMigration, ValidationResult } from '../src/lib/migration/jobSearchProfileValidation';

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');
const SPECIFIC_USER_ID = process.argv.find(arg => arg.startsWith('--user-id='))?.split('=')[1];

async function runValidation() {
  console.log('=== JobSearchProfile Migration Validation ===');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Verbose: ${VERBOSE}`);
  console.log(`Target: ${SPECIFIC_USER_ID || 'ALL USERS'}`);
  console.log('');

  // Connect to MongoDB
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/buildairesume';
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    
    // Run validation
    const result = await validateMigration(db, {
      dryRun: DRY_RUN,
      verbose: VERBOSE,
      specificUserId: SPECIFIC_USER_ID,
    });
    
    // Print summary
    printSummary(result);
    
  } catch (error: any) {
    console.error('Validation failed:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('');
    console.log('Disconnected from MongoDB');
  }
}

function printSummary(result: ValidationResult) {
  console.log('');
  console.log('=== Validation Summary ===');
  console.log(`Total users: ${result.totalUsers}`);
  console.log(`Migrated users: ${result.migratedUsers}`);
  console.log(`Missing profiles: ${result.missingProfiles}`);
  console.log(`Passed: ${result.passed}`);
  console.log(`Failed: ${result.failed}`);
  console.log(`Warnings: ${result.warnings}`);
  
  if (result.fieldMismatches.length > 0) {
    console.log('');
    console.log('=== Field Mismatches ===');
    for (const mismatch of result.fieldMismatches) {
      console.log(`[${mismatch.userId}] ${mismatch.field}:`);
      console.log(`  Legacy (${mismatch.source}): ${JSON.stringify(mismatch.legacy)}`);
      console.log(`  New:    ${JSON.stringify(mismatch.new)}`);
    }
  }
  
  console.log('');
  if (result.failed === 0) {
    console.log('✓ All validations passed');
  } else {
    console.log(`✗ ${result.failed} validation(s) failed`);
  }
}

runValidation().catch(console.error);
