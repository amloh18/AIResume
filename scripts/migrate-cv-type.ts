/**
 * Migration Script: Add cvType field to existing CVs
 * 
 * This script migrates existing CV documents to include the new cvType field:
 * - CVs with metadata.isMaster=true → cvType='master'
 * - CVs with journeyId present → cvType='journey'
 * - All others → cvType='standalone'
 * 
 * Also fixes CVs with invalid cvType values (empty strings, invalid values)
 * 
 * Usage: npx ts-node scripts/migrate-cv-type.ts
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Import models after environment is loaded
import CV from '../src/models/CV';

async function migrateCVTypes() {
  try {
    console.log('🚀 Starting CV Type Migration...\n');

    // Connect directly to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database\n');

    // Get total count of CVs
    const totalCVs = await CV.countDocuments();
    console.log(`📊 Total CVs in database: ${totalCVs}\n`);

    // Get counts before migration
    const cvsWithoutType = await CV.countDocuments({ 
      $or: [
        { cvType: { $exists: false } },
        { cvType: null },
        { cvType: '' }
      ]
    });
    
    const cvsWithInvalidType = await CV.countDocuments({
      cvType: { $nin: ['master', 'journey', 'standalone'] },
      cvType: { $exists: true, $ne: null, $ne: '' }
    });
    
    console.log(`📋 CVs without cvType field: ${cvsWithoutType}`);
    console.log(`📋 CVs with invalid cvType: ${cvsWithInvalidType}\n`);

    if (cvsWithoutType === 0 && cvsWithInvalidType === 0) {
      console.log('✅ All CVs already have valid cvType field. No migration needed.');
      process.exit(0);
    }

    let migratedCount = 0;
    let masterCount = 0;
    let journeyCount = 0;
    let standaloneCount = 0;
    let fixedInvalidCount = 0;

    console.log('🔄 Starting migration process...\n');

    // Step 1: Fix invalid cvType values first (set to null so they get reclassified)
    console.log('0️⃣ Fixing invalid cvType values...');
    const invalidResult = await CV.updateMany(
      {
        cvType: { $nin: ['master', 'journey', 'standalone'] },
        cvType: { $exists: true, $ne: null, $ne: '' }
      },
      {
        $set: { cvType: null }
      }
    );
    fixedInvalidCount = invalidResult.modifiedCount;
    console.log(`   ✅ Fixed ${fixedInvalidCount} CVs with invalid cvType values\n`);

    // Step 2: Migrate Master CVs (highest priority - check first)
    console.log('1️⃣ Migrating Master CVs...');
    const masterResult = await CV.updateMany(
      {
        $and: [
          {
            $or: [
              { cvType: { $exists: false } },
              { cvType: null },
              { cvType: '' }
            ]
          },
          {
            $or: [
              { 'metadata.isMaster': true },
              { 'metadata.isMaster': 'true' },
              { 'metadata.createdVia': 'ai-career-report' }
            ]
          }
        ]
      },
      {
        $set: { cvType: 'master' }
      }
    );
    masterCount = masterResult.modifiedCount;
    migratedCount += masterCount;
    console.log(`   ✅ Migrated ${masterCount} Master CVs\n`);

    // Step 3: Migrate Journey CVs (check journeyId)
    console.log('2️⃣ Migrating Journey CVs...');
    const journeyResult = await CV.updateMany(
      {
        $or: [
          { cvType: { $exists: false } },
          { cvType: null },
          { cvType: '' }
        ],
        journeyId: { $exists: true, $ne: null }
      },
      {
        $set: { cvType: 'journey' }
      }
    );
    journeyCount = journeyResult.modifiedCount;
    migratedCount += journeyCount;
    console.log(`   ✅ Migrated ${journeyCount} Journey CVs\n`);

    // Step 4: Migrate Standalone CVs (all remaining)
    console.log('3️⃣ Migrating Standalone CVs...');
    const standaloneResult = await CV.updateMany(
      {
        $or: [
          { cvType: { $exists: false } },
          { cvType: null },
          { cvType: '' }
        ]
      },
      {
        $set: { cvType: 'standalone' }
      }
    );
    standaloneCount = standaloneResult.modifiedCount;
    migratedCount += standaloneCount;
    console.log(`   ✅ Migrated ${standaloneCount} Standalone CVs\n`);

    // Verify migration
    console.log('🔍 Verifying migration...\n');
    const remainingWithoutType = await CV.countDocuments({ 
      $or: [
        { cvType: { $exists: false } },
        { cvType: null },
        { cvType: '' }
      ]
    });
    
    const remainingInvalid = await CV.countDocuments({
      $and: [
        { cvType: { $exists: true } },
        { cvType: { $ne: null } },
        { cvType: { $ne: '' } },
        { cvType: { $nin: ['master', 'journey', 'standalone'] } }
      ]
    });
    
    // Get final counts
    const finalMasterCount = await CV.countDocuments({ cvType: 'master' });
    const finalJourneyCount = await CV.countDocuments({ cvType: 'journey' });
    const finalStandaloneCount = await CV.countDocuments({ cvType: 'standalone' });

    console.log('📊 Migration Summary:');
    console.log('═══════════════════════════════════════');
    console.log(`Total CVs processed:       ${migratedCount}`);
    console.log(`Invalid values fixed:      ${fixedInvalidCount}`);
    console.log(`Master CVs:                ${finalMasterCount}`);
    console.log(`Journey CVs:               ${finalJourneyCount}`);
    console.log(`Standalone CVs:            ${finalStandaloneCount}`);
    console.log(`Remaining without cvType:  ${remainingWithoutType}`);
    console.log(`Remaining invalid cvType: ${remainingInvalid}`);
    console.log('═══════════════════════════════════════\n');

    if (remainingWithoutType === 0 && remainingInvalid === 0) {
      console.log('✅ Migration completed successfully!');
    } else {
      console.log(`⚠️  Warning: ${remainingWithoutType} CVs still without cvType field`);
      console.log(`⚠️  Warning: ${remainingInvalid} CVs still with invalid cvType`);
    }

    await mongoose.disconnect();
    console.log('✅ Disconnected from database\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run migration
migrateCVTypes();

