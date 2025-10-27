/**
 * Authentication System Migration Script
 * 
 * This script migrates users from the old Firebase/Custom JWT system to NextAuth-only authentication.
 * 
 * Migration Steps:
 * 1. Find all users with authProvider: 'firebase' or 'local'
 * 2. Update authProvider to 'nextauth'
 * 3. Clear any old session/token fields (if they exist)
 * 4. Log migration statistics
 * 
 * Usage:
 *   node scripts/migrate-auth-system.js
 * 
 * Requirements:
 *   - MongoDB connection string in .env
 *   - MONGODB_URI environment variable set
 */

const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI environment variable is not set');
  process.exit(1);
}

// User schema (simplified for migration)
const userSchema = new mongoose.Schema({
  authProvider: String,
  authProviderId: String,
  firebaseUid: String,
  email: String,
  firstName: String,
  lastName: String,
  // Add other fields as needed
}, { strict: false }); // Allow additional fields

const User = mongoose.model('User', userSchema);

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function migrateUsers() {
  try {
    console.log('\n🚀 Starting authentication system migration...\n');
    
    // Find all users with old auth providers
    const usersToMigrate = await User.find({
      authProvider: { $in: ['firebase', 'local'] }
    });
    
    console.log(`📊 Found ${usersToMigrate.length} users to migrate`);
    
    if (usersToMigrate.length === 0) {
      console.log('✅ No users need migration. All users are already using NextAuth.');
      return { migrated: 0, errors: 0 };
    }
    
    let migratedCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (const user of usersToMigrate) {
      try {
        const oldProvider = user.authProvider;
        
        // Update authProvider to 'nextauth'
        user.authProvider = 'nextauth';
        
        // Keep firebaseUid for historical reference if it exists
        // Don't delete it - might be useful for debugging or user support
        
        await user.save();
        
        console.log(`✅ Migrated user: ${user.email} (${oldProvider} → nextauth)`);
        migratedCount++;
        
      } catch (error) {
        console.error(`❌ Error migrating user ${user.email}:`, error.message);
        errors.push({ email: user.email, error: error.message });
        errorCount++;
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`   Total users found: ${usersToMigrate.length}`);
    console.log(`   ✅ Successfully migrated: ${migratedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Migration errors:');
      errors.forEach(err => {
        console.log(`   - ${err.email}: ${err.error}`);
      });
    }
    
    return { migrated: migratedCount, errors: errorCount };
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  }
}

async function verifyMigration() {
  try {
    console.log('\n🔍 Verifying migration...\n');
    
    // Check if any users still have old auth providers
    const remainingOldUsers = await User.find({
      authProvider: { $in: ['firebase', 'local'] }
    });
    
    if (remainingOldUsers.length > 0) {
      console.log(`⚠️  Warning: ${remainingOldUsers.length} users still have old auth providers:`);
      remainingOldUsers.forEach(user => {
        console.log(`   - ${user.email}: ${user.authProvider}`);
      });
      return false;
    }
    
    // Count users by auth provider
    const nextAuthUsers = await User.countDocuments({ authProvider: 'nextauth' });
    const totalUsers = await User.countDocuments({});
    
    console.log('📊 Current authentication status:');
    console.log(`   NextAuth users: ${nextAuthUsers}`);
    console.log(`   Total users: ${totalUsers}`);
    
    if (nextAuthUsers === totalUsers) {
      console.log('\n✅ All users successfully migrated to NextAuth!');
      return true;
    } else {
      console.log('\n⚠️  Some users may not have authProvider set.');
      const usersWithoutProvider = await User.find({
        $or: [
          { authProvider: { $exists: false } },
          { authProvider: null }
        ]
      });
      console.log(`   Users without authProvider: ${usersWithoutProvider.length}`);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Verification error:', error);
    return false;
  }
}

async function main() {
  try {
    // Connect to database
    await connectDB();
    
    // Run migration
    const result = await migrateUsers();
    
    // Verify migration
    const verified = await verifyMigration();
    
    if (verified && result.errors === 0) {
      console.log('\n🎉 Migration completed successfully!\n');
      process.exit(0);
    } else if (result.errors > 0) {
      console.log('\n⚠️  Migration completed with errors. Please review the errors above.\n');
      process.exit(1);
    } else {
      console.log('\n⚠️  Migration completed but verification failed. Please review manually.\n');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    // Close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('🔌 Disconnected from MongoDB');
    }
  }
}

// Run migration
main();

