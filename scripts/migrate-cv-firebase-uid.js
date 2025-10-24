#!/usr/bin/env node

/**
 * Migration Script: Add Firebase UID to Existing CVs
 * 
 * This script updates existing CV documents to include the firebaseUid field
 * by looking up the associated user and copying their firebaseUid.
 * 
 * Usage:
 *   node scripts/migrate-cv-firebase-uid.js
 *   npm run migrate-cv-firebase-uid
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Import models - using dynamic imports for ES modules
let User, CV;

async function connectToDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });
    
    console.log('✅ Connected to MongoDB successfully');
    
    // Import models after connection
    const UserModule = await import('../src/models/User.js');
    const CVModule = await import('../src/models/CV.js');
    User = UserModule.default;
    CV = CVModule.default;
    
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    return false;
  }
}

async function getMigrationStats() {
  console.log('\n📊 Migration Statistics:');
  
  // Count total CVs
  const totalCVs = await CV.countDocuments();
  console.log(`   Total CVs: ${totalCVs}`);
  
  // Count CVs with firebaseUid
  const cvsWithFirebaseUid = await CV.countDocuments({ firebaseUid: { $exists: true, $ne: null } });
  console.log(`   CVs with firebaseUid: ${cvsWithFirebaseUid}`);
  
  // Count CVs without firebaseUid
  const cvsWithoutFirebaseUid = await CV.countDocuments({ 
    $or: [
      { firebaseUid: { $exists: false } },
      { firebaseUid: null }
    ]
  });
  console.log(`   CVs without firebaseUid: ${cvsWithoutFirebaseUid}`);
  
  // Count CVs with userId
  const cvsWithUserId = await CV.countDocuments({ userId: { $exists: true, $ne: null } });
  console.log(`   CVs with userId: ${cvsWithUserId}`);
  
  // Count users with firebaseUid
  const usersWithFirebaseUid = await User.countDocuments({ firebaseUid: { $exists: true, $ne: null } });
  console.log(`   Users with firebaseUid: ${usersWithFirebaseUid}`);
  
  return {
    totalCVs,
    cvsWithFirebaseUid,
    cvsWithoutFirebaseUid,
    cvsWithUserId,
    usersWithFirebaseUid
  };
}

async function migrateCVFirebaseUids(dryRun = false) {
  console.log(`\n🚀 Starting CV Firebase UID migration${dryRun ? ' (DRY RUN)' : ''}...`);
  
  try {
    // Get CVs that need migration
    const cvsToMigrate = await CV.find({
      $or: [
        { firebaseUid: { $exists: false } },
        { firebaseUid: null }
      ],
      userId: { $exists: true, $ne: null }
    }).lean();
    
    console.log(`📋 Found ${cvsToMigrate.length} CVs to migrate`);
    
    if (cvsToMigrate.length === 0) {
      console.log('✅ No CVs need migration');
      return { success: true, migrated: 0, errors: 0 };
    }
    
    let migrated = 0;
    let errors = 0;
    const errorDetails = [];
    
    // Process each CV
    for (const cv of cvsToMigrate) {
      try {
        console.log(`\n🔍 Processing CV: ${cv._id} (${cv.title || 'Untitled'})`);
        
        // Find the associated user
        const user = await User.findById(cv.userId);
        
        if (!user) {
          console.log(`   ⚠️  User not found for CV ${cv._id}`);
          errors++;
          errorDetails.push({
            cvId: cv._id,
            userId: cv.userId,
            error: 'User not found'
          });
          continue;
        }
        
        if (!user.firebaseUid) {
          console.log(`   ⚠️  User ${user._id} has no firebaseUid`);
          errors++;
          errorDetails.push({
            cvId: cv._id,
            userId: cv.userId,
            userEmail: user.email,
            error: 'User has no firebaseUid'
          });
          continue;
        }
        
        console.log(`   👤 Found user: ${user.email} (firebaseUid: ${user.firebaseUid})`);
        
        if (!dryRun) {
          // Update the CV with firebaseUid
          await CV.updateOne(
            { _id: cv._id },
            { $set: { firebaseUid: user.firebaseUid } }
          );
          console.log(`   ✅ Updated CV ${cv._id} with firebaseUid: ${user.firebaseUid}`);
        } else {
          console.log(`   🔍 [DRY RUN] Would update CV ${cv._id} with firebaseUid: ${user.firebaseUid}`);
        }
        
        migrated++;
        
      } catch (error) {
        console.error(`   ❌ Error processing CV ${cv._id}:`, error.message);
        errors++;
        errorDetails.push({
          cvId: cv._id,
          userId: cv.userId,
          error: error.message
        });
      }
    }
    
    console.log(`\n📈 Migration Summary:`);
    console.log(`   ✅ Successfully migrated: ${migrated}`);
    console.log(`   ❌ Errors: ${errors}`);
    
    if (errorDetails.length > 0) {
      console.log(`\n❌ Error Details:`);
      errorDetails.forEach((error, index) => {
        console.log(`   ${index + 1}. CV ${error.cvId}: ${error.error}`);
      });
    }
    
    return { success: true, migrated, errors, errorDetails };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return { success: false, error: error.message };
  }
}

async function verifyMigration() {
  console.log('\n🔍 Verifying migration...');
  
  try {
    // Check for CVs without firebaseUid
    const cvsStillMissingFirebaseUid = await CV.countDocuments({
      $or: [
        { firebaseUid: { $exists: false } },
        { firebaseUid: null }
      ]
    });
    
    if (cvsStillMissingFirebaseUid === 0) {
      console.log('✅ All CVs now have firebaseUid');
    } else {
      console.log(`⚠️  ${cvsStillMissingFirebaseUid} CVs still missing firebaseUid`);
    }
    
    // Check for orphaned CVs (CVs with userId but no matching user)
    const orphanedCVs = await CV.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $match: {
          user: { $size: 0 }
        }
      },
      {
        $count: 'orphaned'
      }
    ]);
    
    const orphanedCount = orphanedCVs[0]?.orphaned || 0;
    if (orphanedCount > 0) {
      console.log(`⚠️  Found ${orphanedCount} orphaned CVs (no matching user)`);
    } else {
      console.log('✅ No orphaned CVs found');
    }
    
    return { cvsStillMissingFirebaseUid, orphanedCount };
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    return { error: error.message };
  }
}

async function main() {
  console.log('🔄 CV Firebase UID Migration Script');
  console.log('=====================================');
  
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-d');
  const verify = args.includes('--verify') || args.includes('-v');
  
  if (dryRun) {
    console.log('🔍 Running in DRY RUN mode - no changes will be made');
  }
  
  try {
    // Connect to database
    const connected = await connectToDatabase();
    if (!connected) {
      process.exit(1);
    }
    
    // Show initial stats
    const initialStats = await getMigrationStats();
    
    if (verify) {
      // Just verify current state
      await verifyMigration();
    } else {
      // Run migration
      const result = await migrateCVFirebaseUids(dryRun);
      
      if (result.success) {
        console.log('\n✅ Migration completed successfully');
        
        // Show final stats
        console.log('\n📊 Final Statistics:');
        await getMigrationStats();
        
        // Verify migration
        await verifyMigration();
      } else {
        console.log('\n❌ Migration failed:', result.error);
        process.exit(1);
      }
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Handle script execution
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = {
  migrateCVFirebaseUids,
  verifyMigration,
  getMigrationStats
};
