/**
 * Migration Script: Add cvType field to existing CVs
 * 
 * This script migrates existing CV documents to include the new cvType field:
 * - CVs with metadata.isMaster=true → cvType='master'
 * - CVs with journeyId present → cvType='journey'
 * - All others → cvType='standalone'
 * 
 * Usage: npx ts-node scripts/migrate-cv-type.ts
 */

import mongoose from 'mongoose';
import { getConnection } from '../src/lib/database';
import CV from '../src/models/CV';

async function migrateCVTypes() {
  try {
    console.log('🚀 Starting CV Type Migration...\n');

    // Connect to database
    await getConnection();
    console.log('✅ Connected to database\n');

    // Get total count of CVs
    const totalCVs = await CV.countDocuments();
    console.log(`📊 Total CVs to migrate: ${totalCVs}\n`);

    // Get counts before migration
    const cvsWithoutType = await CV.countDocuments({ cvType: { $exists: false } });
    console.log(`📋 CVs without cvType field: ${cvsWithoutType}\n`);

    if (cvsWithoutType === 0) {
      console.log('✅ All CVs already have cvType field. No migration needed.');
      process.exit(0);
    }

    let migratedCount = 0;
    let masterCount = 0;
    let journeyCount = 0;
    let standaloneCount = 0;

    console.log('🔄 Starting migration process...\n');

    // Migrate Master CVs
    console.log('1️⃣ Migrating Master CVs...');
    const masterResult = await CV.updateMany(
      {
        $or: [
          { cvType: { $exists: false } },
          { cvType: null }
        ],
        'metadata.isMaster': true
      },
      {
        $set: { cvType: 'master' }
      }
    );
    masterCount = masterResult.modifiedCount;
    migratedCount += masterCount;
    console.log(`   ✅ Migrated ${masterCount} Master CVs\n`);

    // Migrate Journey CVs
    console.log('2️⃣ Migrating Journey CVs...');
    const journeyResult = await CV.updateMany(
      {
        $or: [
          { cvType: { $exists: false } },
          { cvType: null }
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

    // Migrate Standalone CVs (all remaining)
    console.log('3️⃣ Migrating Standalone CVs...');
    const standaloneResult = await CV.updateMany(
      {
        $or: [
          { cvType: { $exists: false } },
          { cvType: null }
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
    const remainingWithoutType = await CV.countDocuments({ cvType: { $exists: false } });
    
    // Get final counts
    const finalMasterCount = await CV.countDocuments({ cvType: 'master' });
    const finalJourneyCount = await CV.countDocuments({ cvType: 'journey' });
    const finalStandaloneCount = await CV.countDocuments({ cvType: 'standalone' });

    console.log('📊 Migration Summary:');
    console.log('═══════════════════════════════════════');
    console.log(`Total CVs processed:       ${migratedCount}`);
    console.log(`Master CVs:                ${finalMasterCount}`);
    console.log(`Journey CVs:               ${finalJourneyCount}`);
    console.log(`Standalone CVs:            ${finalStandaloneCount}`);
    console.log(`Remaining without cvType:  ${remainingWithoutType}`);
    console.log('═══════════════════════════════════════\n');

    if (remainingWithoutType === 0) {
      console.log('✅ Migration completed successfully!');
    } else {
      console.log(`⚠️  Warning: ${remainingWithoutType} CVs still without cvType field`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateCVTypes();

