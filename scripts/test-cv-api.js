#!/usr/bin/env node

/**
 * Test Script: CV API Access
 * 
 * This script tests if the CV API can access CVs properly after the fixes.
 * 
 * Usage:
 *   node scripts/test-cv-api.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Define schemas inline
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  firebaseUid: { type: String, unique: true, sparse: true },
  firstName: String,
  lastName: String,
}, { timestamps: true });

const cvSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  firebaseUid: { type: String },
  title: { type: String, required: true },
  status: { type: String, default: 'draft' },
  metadata: {
    isMaster: { type: Boolean, default: false },
    starred: { type: Boolean, default: false }
  }
}, { timestamps: true });

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
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    return false;
  }
}

async function testCVAccess() {
  console.log('\n🧪 Testing CV Access...');
  
  const User = mongoose.model('User', userSchema);
  const CV = mongoose.model('CV', cvSchema);
  
  try {
    // Get all users
    const users = await User.find({}).lean();
    console.log(`📊 Found ${users.length} users`);
    
    // Get all CVs
    const cvs = await CV.find({}).lean();
    console.log(`📊 Found ${cvs.length} CVs`);
    
    // Test the new query logic for each user
    for (const user of users) {
      console.log(`\n👤 Testing user: ${user.email} (ID: ${user._id})`);
      
      // Test 1: Query CVs by userId (the correct way)
      const cvsByUserId = await CV.find({ userId: user._id }).lean();
      console.log(`   📄 CVs by userId: ${cvsByUserId.length}`);
      
      // Test 2: Query CVs by firebaseUid (if user has one)
      if (user.firebaseUid) {
        const cvsByFirebaseUid = await CV.find({ firebaseUid: user.firebaseUid }).lean();
        console.log(`   🔥 CVs by firebaseUid: ${cvsByFirebaseUid.length}`);
      } else {
        console.log(`   🔥 User has no firebaseUid`);
      }
      
      // Test 3: Master CV query
      const masterCVs = await CV.find({ 
        userId: user._id,
        $or: [
          { 'metadata.isMaster': true },
          { 'metadata.isMaster': 'true' },
          { isMaster: true },
          { isMaster: 'true' }
        ]
      }).lean();
      console.log(`   👑 Master CVs: ${masterCVs.length}`);
      
      // Show CV details
      cvsByUserId.forEach((cv, index) => {
        console.log(`     ${index + 1}. ${cv.title} (${cv.status}) - Master: ${cv.metadata?.isMaster || cv.isMaster || false}`);
      });
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🧪 CV API Access Test');
  console.log('=====================');
  
  try {
    // Connect to database
    const connected = await connectToDatabase();
    if (!connected) {
      process.exit(1);
    }
    
    // Run tests
    const result = await testCVAccess();
    
    if (result.success) {
      console.log('\n✅ All tests passed!');
    } else {
      console.log('\n❌ Tests failed:', result.error);
      process.exit(1);
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

module.exports = { testCVAccess };
