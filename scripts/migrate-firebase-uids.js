/**
 * Migration Script: Add Firebase UIDs to Existing Records
 * 
 * This script migrates existing data to include Firebase UIDs based on user relationships.
 * It handles the mapping between Firebase UIDs and existing MongoDB records.
 * 
 * Usage:
 * node scripts/migrate-firebase-uids.js
 * 
 * Environment Variables Required:
 * - MONGODB_URI: MongoDB connection string
 */

const mongoose = require('mongoose');

// Import models (adjust paths as needed)
const { User, CV, JobApplication, CVJourney, CoverLetter, Subscription, Invoice, UserSettings, AIUsageLog, PaymentMethod } = require('../src/models');

async function connectDB() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is required');
  }

  await mongoose.connect(mongoUri);
  console.log('📊 Connected to MongoDB');
}

async function migrateFirebaseUIDs() {
  console.log('🚀 Starting Firebase UID migration...');

  try {
    await connectDB();

    // Step 1: Get all users with Firebase UIDs
    const firebaseUsers = await User.find({ 
      firebaseUid: { $exists: true, $ne: null, $ne: '' } 
    }).lean();

    console.log(`📊 Found ${firebaseUsers.length} users with Firebase UIDs`);

    if (firebaseUsers.length === 0) {
      console.log('✅ No Firebase users found to migrate. Migration complete.');
      return;
    }

    // Create mapping of MongoDB userId to Firebase UID
    const userIdToFirebaseUid = {};
    firebaseUsers.forEach(user => {
      userIdToFirebaseUid[user._id.toString()] = user.firebaseUid;
    });

    console.log('📊 User ID to Firebase UID mapping created');

    // Step 2: Define collections to migrate
    const collectionsToMigrate = [
      { model: CV, name: 'CVs' },
      { model: JobApplication, name: 'JobApplications' },
      { model: CVJourney, name: 'CVJourneys' },
      { model: CoverLetter, name: 'CoverLetters' },
      { model: Subscription, name: 'Subscriptions' },
      { model: Invoice, name: 'Invoices' },
      { model: UserSettings, name: 'UserSettings' },
      { model: AIUsageLog, name: 'AIUsageLogs' },
      { model: PaymentMethod, name: 'PaymentMethods' }
    ];

    // Step 3: Migrate each collection
    for (const { model, name } of collectionsToMigrate) {
      console.log(`\n🔄 Migrating ${name}...`);
      
      try {
        // Find all documents that don't have firebaseUid but have a userId that maps to a Firebase user
        const documentsToUpdate = await model.find({
          firebaseUid: { $exists: false },
          userId: { $exists: true }
        }).lean();

        console.log(`📊 Found ${documentsToUpdate.length} ${name} documents to migrate`);

        let updatedCount = 0;
        let skippedCount = 0;

        for (const doc of documentsToUpdate) {
          const userIdString = doc.userId.toString();
          const firebaseUid = userIdToFirebaseUid[userIdString];

          if (firebaseUid) {
            // Update document with Firebase UID
            await model.updateOne(
              { _id: doc._id },
              { $set: { firebaseUid } }
            );
            updatedCount++;
            
            if (updatedCount % 100 === 0) {
              console.log(`   ⏳ Updated ${updatedCount} ${name} documents...`);
            }
          } else {
            skippedCount++;
          }
        }

        console.log(`✅ ${name} migration complete:`);
        console.log(`   📈 Updated: ${updatedCount} documents`);
        console.log(`   ⏭️  Skipped: ${skippedCount} documents (no Firebase UID)`);

      } catch (error) {
        console.error(`❌ Error migrating ${name}:`, error.message);
      }
    }

    // Step 4: Verify migration
    console.log('\n🔍 Verifying migration...');
    
    for (const { model, name } of collectionsToMigrate) {
      const totalDocs = await model.countDocuments({});
      const docsWithFirebaseUid = await model.countDocuments({
        firebaseUid: { $exists: true, $ne: null, $ne: '' }
      });
      
      const percentage = totalDocs > 0 ? ((docsWithFirebaseUid / totalDocs) * 100).toFixed(1) : 0;
      
      console.log(`📊 ${name}: ${docsWithFirebaseUid}/${totalDocs} (${percentage}%) have Firebase UIDs`);
    }

    console.log('\n✅ Firebase UID migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('📊 Disconnected from MongoDB');
  }
}

// Additional helper functions

async function verifyMigration() {
  console.log('🔍 Starting migration verification...');

  try {
    await connectDB();

    const firebaseUsers = await User.find({ 
      firebaseUid: { $exists: true, $ne: null, $ne: '' } 
    }).lean();

    console.log(`📊 Verifying data for ${firebaseUsers.length} Firebase users`);

    for (const user of firebaseUsers.slice(0, 5)) { // Check first 5 users
      console.log(`\n👤 Checking user: ${user.email} (Firebase UID: ${user.firebaseUid})`);
      
      const cvCount = await CV.countDocuments({ firebaseUid: user.firebaseUid });
      const jobAppCount = await JobApplication.countDocuments({ firebaseUid: user.firebaseUid });
      const journeyCount = await CVJourney.countDocuments({ firebaseUid: user.firebaseUid });
      
      console.log(`   📄 CVs: ${cvCount}`);
      console.log(`   💼 Job Applications: ${jobAppCount}`);
      console.log(`   🚀 CV Journeys: ${journeyCount}`);
    }

    console.log('\n✅ Verification complete!');

  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

async function cleanupDuplicateData() {
  console.log('🧹 Starting duplicate data cleanup...');

  try {
    await connectDB();

    // This function can be extended to remove duplicate records
    // For now, it just reports potential duplicates
    
    const firebaseUsers = await User.find({ 
      firebaseUid: { $exists: true, $ne: null, $ne: '' } 
    }).lean();

    for (const user of firebaseUsers) {
      // Check for potential duplicates in CV collection
      const cvsByUserId = await CV.countDocuments({ userId: user._id });
      const cvsByFirebaseUid = await CV.countDocuments({ firebaseUid: user.firebaseUid });
      
      if (cvsByUserId !== cvsByFirebaseUid) {
        console.log(`⚠️  Potential CV duplicates for user ${user.email}:`);
        console.log(`   By userId: ${cvsByUserId}, By firebaseUid: ${cvsByFirebaseUid}`);
      }
    }

    console.log('✅ Cleanup analysis complete!');

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Main execution
async function main() {
  const action = process.argv[2] || 'migrate';

  switch (action) {
    case 'migrate':
      await migrateFirebaseUIDs();
      break;
    case 'verify':
      await verifyMigration();
      break;
    case 'cleanup':
      await cleanupDuplicateData();
      break;
    default:
      console.log('Usage: node scripts/migrate-firebase-uids.js [migrate|verify|cleanup]');
      console.log('  migrate: Migrate existing data to include Firebase UIDs');
      console.log('  verify:  Verify the migration was successful');
      console.log('  cleanup: Analyze and cleanup potential duplicates');
      process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = {
  migrateFirebaseUIDs,
  verifyMigration,
  cleanupDuplicateData
};
