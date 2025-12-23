/**
 * Migration Script: CV Types Classification
 * 
 * This script classifies existing CVs based on their metadata:
 * - CVs with `metadata.isMaster: true` → cvType: 'master'
 * - CVs with valid `journeyId` → cvType: 'journey'
 * - All others → cvType: 'standalone'
 * 
 * Also sets the `metadata.isUserMaster` flag for the definitive Master CV per user.
 * 
 * Run with: npx ts-node scripts/migrate-cv-types-classification.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

// CV Schema for migration (minimal)
const cvSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  cvType: String,
  journeyId: mongoose.Schema.Types.ObjectId,
  metadata: {
    isMaster: Boolean,
    isUserMaster: Boolean,
    atsScoreCap: Number,
    fresherMode: Boolean
  },
  cvData: mongoose.Schema.Types.Mixed,
  createdAt: Date,
  updatedAt: Date
}, { strict: false });

const CV = mongoose.models.CV || mongoose.model('CV', cvSchema);

interface MigrationStats {
  total: number;
  alreadyMaster: number;
  alreadyJourney: number;
  alreadyStandalone: number;
  migratedToMaster: number;
  migratedToJourney: number;
  migratedToStandalone: number;
  userMasterSet: number;
  fresherModeSet: number;
  errors: number;
}

async function detectFresherMode(cvData: any): Promise<boolean> {
  // Fresher mode if no work experience or all entries are empty
  if (!cvData?.work || !Array.isArray(cvData.work)) {
    return true;
  }
  
  // Check if work array has meaningful entries
  const hasValidWork = cvData.work.some((work: any) => 
    work && (work.name || work.company || work.position)
  );
  
  return !hasValidWork;
}

async function migrateCV(cv: any, stats: MigrationStats): Promise<void> {
  try {
    let needsUpdate = false;
    const updates: any = {};
    
    // Determine the correct cvType
    let targetType: 'master' | 'journey' | 'standalone' = 'standalone';
    
    if (cv.journeyId && mongoose.Types.ObjectId.isValid(cv.journeyId.toString())) {
      targetType = 'journey';
    } else if (cv.metadata?.isMaster === true) {
      targetType = 'master';
    }
    
    // Update cvType if different
    if (cv.cvType !== targetType) {
      updates.cvType = targetType;
      needsUpdate = true;
      
      if (targetType === 'master') stats.migratedToMaster++;
      else if (targetType === 'journey') stats.migratedToJourney++;
      else stats.migratedToStandalone++;
    } else {
      if (targetType === 'master') stats.alreadyMaster++;
      else if (targetType === 'journey') stats.alreadyJourney++;
      else stats.alreadyStandalone++;
    }
    
    // Set atsScoreCap default if not set
    if (cv.metadata?.atsScoreCap === undefined) {
      updates['metadata.atsScoreCap'] = 100;
      needsUpdate = true;
    }
    
    // Detect fresher mode
    const isFresher = await detectFresherMode(cv.cvData);
    if (cv.metadata?.fresherMode === undefined && isFresher) {
      updates['metadata.fresherMode'] = true;
      needsUpdate = true;
      stats.fresherModeSet++;
    }
    
    if (needsUpdate) {
      await CV.updateOne({ _id: cv._id }, { $set: updates });
    }
  } catch (error) {
    console.error(`❌ Error migrating CV ${cv._id}:`, error);
    stats.errors++;
  }
}

async function setUserMasterCVs(stats: MigrationStats): Promise<void> {
  console.log('\n📍 Setting isUserMaster flag for each user\'s primary Master CV...');
  
  // Get all users with CVs
  const userIds = await CV.distinct('userId');
  console.log(`   Found ${userIds.length} users with CVs`);
  
  for (const userId of userIds) {
    try {
      // Find the user's master CV (prefer the one with isMaster: true, or most recent)
      const masterCV = await CV.findOne({
        userId,
        cvType: 'master'
      }).sort({ 'metadata.isMaster': -1, createdAt: -1 });
      
      if (masterCV) {
        // Set isUserMaster for this CV
        await CV.updateOne(
          { _id: masterCV._id },
          { $set: { 'metadata.isUserMaster': true } }
        );
        
        // Ensure no other CVs for this user have isUserMaster
        await CV.updateMany(
          { userId, _id: { $ne: masterCV._id } },
          { $set: { 'metadata.isUserMaster': false } }
        );
        
        stats.userMasterSet++;
      }
    } catch (error) {
      console.error(`❌ Error setting master CV for user ${userId}:`, error);
      stats.errors++;
    }
  }
}

async function runMigration(): Promise<void> {
  console.log('🚀 CV Types Classification Migration');
  console.log('=====================================\n');
  
  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI as string);
    console.log('✅ Connected to MongoDB\n');
    
    const stats: MigrationStats = {
      total: 0,
      alreadyMaster: 0,
      alreadyJourney: 0,
      alreadyStandalone: 0,
      migratedToMaster: 0,
      migratedToJourney: 0,
      migratedToStandalone: 0,
      userMasterSet: 0,
      fresherModeSet: 0,
      errors: 0
    };
    
    // Get total count
    stats.total = await CV.countDocuments();
    console.log(`📊 Total CVs to process: ${stats.total}\n`);
    
    if (stats.total === 0) {
      console.log('ℹ️  No CVs found to migrate');
      return;
    }
    
    // Process CVs in batches
    const batchSize = 100;
    let processed = 0;
    
    console.log('🔄 Processing CVs...');
    
    const cursor = CV.find({}).cursor();
    
    for await (const cv of cursor) {
      await migrateCV(cv, stats);
      processed++;
      
      if (processed % batchSize === 0) {
        console.log(`   Processed ${processed}/${stats.total} CVs...`);
      }
    }
    
    // Set isUserMaster for each user
    await setUserMasterCVs(stats);
    
    // Print summary
    console.log('\n=====================================');
    console.log('📊 Migration Summary');
    console.log('=====================================');
    console.log(`Total CVs processed: ${stats.total}`);
    console.log('');
    console.log('Already classified:');
    console.log(`  - Master CVs: ${stats.alreadyMaster}`);
    console.log(`  - Journey CVs: ${stats.alreadyJourney}`);
    console.log(`  - Standalone CVs: ${stats.alreadyStandalone}`);
    console.log('');
    console.log('Migrated:');
    console.log(`  - To Master: ${stats.migratedToMaster}`);
    console.log(`  - To Journey: ${stats.migratedToJourney}`);
    console.log(`  - To Standalone: ${stats.migratedToStandalone}`);
    console.log('');
    console.log('Additional updates:');
    console.log(`  - User Master flags set: ${stats.userMasterSet}`);
    console.log(`  - Fresher mode detected: ${stats.fresherModeSet}`);
    console.log('');
    console.log(`Errors: ${stats.errors}`);
    console.log('=====================================\n');
    
    if (stats.errors > 0) {
      console.log('⚠️  Migration completed with errors. Review logs above.');
    } else {
      console.log('✅ Migration completed successfully!');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB');
  }
}

// Run the migration
runMigration();

