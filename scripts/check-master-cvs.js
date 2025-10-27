#!/usr/bin/env node

/**
 * Check if master CVs exist in the database
 */

const mongoose = require('mongoose');
require('dotenv').config();

// CV model (simplified)
const cvSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  cvData: { type: mongoose.Schema.Types.Mixed, required: true },
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Template' },
  status: { type: String, default: 'draft' },
  isMaster: { type: Boolean, default: false },
  journeyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
  firebaseUid: String,
  metadata: {
    isMaster: { type: mongoose.Schema.Types.Mixed },
    lastModified: Date,
    tags: [String],
    isPublic: { type: Boolean, default: false },
    viewCount: { type: Number, default: 0 },
    downloadCount: { type: Number, default: 0 },
    atsScore: Number,
    atsScoreDate: Date,
    thumbnailUrl: String,
    thumbnailGeneratedAt: Date,
    starred: { type: Boolean, default: false }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const CV = mongoose.model('CV', cvSchema);

// User model (simplified)
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true, lowercase: true },
  username: String,
  password: String,
  avatar: String,
  role: { type: String, default: 'user' },
  isEmailVerified: { type: Boolean, default: false },
  authProvider: { type: String, default: 'email' },
  firebaseUid: String,
  authProviderId: String,
  currentPlanKey: { type: String, default: 'free' },
  subscription: {
    plan: { type: String, default: 'free' },
    status: { type: String, default: 'active' },
    startDate: Date,
    endDate: Date,
    autoRenew: { type: Boolean, default: false }
  },
  settings: {
    theme: { type: String, default: 'light' },
    notifications: { type: Boolean, default: true },
    language: { type: String, default: 'en' }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function checkMasterCVs() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all users
    const users = await User.find({}).limit(5);
    console.log(`📊 Found ${users.length} users`);

    for (const user of users) {
      console.log(`\n👤 Checking user: ${user.email} (ID: ${user._id})`);
      
      // Check for CVs with old format (isMaster at root)
      const oldFormatCVs = await CV.find({
        userId: user._id,
        isMaster: true
      });
      
      // Check for CVs with new format (metadata.isMaster)
      const newFormatCVs = await CV.find({
        userId: user._id,
        'metadata.isMaster': true
      });
      
      // Check for CVs with string format
      const stringFormatCVs = await CV.find({
        userId: user._id,
        'metadata.isMaster': 'true'
      });
      
      // Get all CVs for this user
      const allCVs = await CV.find({ userId: user._id });
      
      console.log(`  📄 Total CVs: ${allCVs.length}`);
      console.log(`  🎯 Old format master CVs: ${oldFormatCVs.length}`);
      console.log(`  🎯 New format master CVs: ${newFormatCVs.length}`);
      console.log(`  🎯 String format master CVs: ${stringFormatCVs.length}`);
      
      if (oldFormatCVs.length > 0) {
        console.log(`  ✅ Found old format master CV: ${oldFormatCVs[0].title}`);
        console.log(`     isMaster: ${oldFormatCVs[0].isMaster}`);
        console.log(`     metadata.isMaster: ${oldFormatCVs[0].metadata?.isMaster}`);
      }
      if (newFormatCVs.length > 0) {
        console.log(`  ✅ Found new format master CV: ${newFormatCVs[0].title}`);
        console.log(`     isMaster: ${newFormatCVs[0].isMaster}`);
        console.log(`     metadata.isMaster: ${newFormatCVs[0].metadata?.isMaster}`);
      }
      if (stringFormatCVs.length > 0) {
        console.log(`  ✅ Found string format master CV: ${stringFormatCVs[0].title}`);
        console.log(`     isMaster: ${stringFormatCVs[0].isMaster}`);
        console.log(`     metadata.isMaster: ${stringFormatCVs[0].metadata?.isMaster}`);
      }
      
      // Test the API query
      const apiQuery = {
        userId: user._id,
        $or: [
          { 'metadata.isMaster': true },
          { 'metadata.isMaster': 'true' },
          { isMaster: true },
          { isMaster: 'true' }
        ]
      };
      
      const apiResult = await CV.findOne(apiQuery);
      console.log(`  🔍 API query result: ${apiResult ? 'Found' : 'Not found'}`);
      if (apiResult) {
        console.log(`    Title: ${apiResult.title}`);
        console.log(`    isMaster: ${apiResult.isMaster}`);
        console.log(`    metadata.isMaster: ${apiResult.metadata?.isMaster}`);
      }
    }

    console.log('\n✅ Check completed');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

console.log('🔍 Checking for master CVs...');
checkMasterCVs();
