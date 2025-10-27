#!/usr/bin/env node

/**
 * Check recent verification codes for an email
 */

const mongoose = require('mongoose');
require('dotenv').config();

// VerificationToken model (simplified)
const verificationTokenSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  email: String,
  token: String,
  type: String,
  attempts: { type: Number, default: 0 },
  expiresAt: Date,
  createdAt: { type: Date, default: Date.now }
});

const VerificationToken = mongoose.model('VerificationToken', verificationTokenSchema);

async function checkRecentCodes(email) {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log(`🔍 Checking recent codes for: ${email}`);
    
    // Check codes from last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCodes = await VerificationToken.find({
      email: email.toLowerCase(),
      createdAt: { $gte: oneDayAgo }
    }).sort({ createdAt: -1 }).lean();
    
    console.log(`📊 Found ${recentCodes.length} codes in the last 24 hours:`);
    
    recentCodes.forEach((code, index) => {
      const timeAgo = Math.floor((Date.now() - new Date(code.createdAt)) / 1000);
      const isRecent = timeAgo < 60;
      console.log(`   ${index + 1}. Type: ${code.type}, Created: ${code.createdAt}, ${timeAgo}s ago ${isRecent ? '⚠️ RECENT' : ''}`);
    });
    
    // Check if there's a code within the last 60 seconds (cooldown period)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const cooldownCode = await VerificationToken.findOne({
      email: email.toLowerCase(),
      type: { $in: ['email-verification', 'passwordless-login', 'password-reset'] },
      createdAt: { $gte: oneMinuteAgo }
    });
    
    if (cooldownCode) {
      console.log('❌ COOLDOWN ACTIVE: There is a recent code request within the last 60 seconds');
      console.log(`   Recent code: ${cooldownCode.type} created at ${cooldownCode.createdAt}`);
    } else {
      console.log('✅ No cooldown: No recent code requests in the last 60 seconds');
    }
    
    // Check rate limit (3 codes per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const hourlyCodes = await VerificationToken.countDocuments({
      email: email.toLowerCase(),
      type: { $in: ['email-verification', 'passwordless-login', 'password-reset'] },
      createdAt: { $gte: oneHourAgo }
    });
    
    console.log(`📈 Rate limit status: ${hourlyCodes}/3 codes in the last hour`);
    if (hourlyCodes >= 3) {
      console.log('❌ RATE LIMIT EXCEEDED: Too many code requests in the last hour');
    } else {
      console.log('✅ Rate limit OK: Within hourly limit');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.log('Usage: node check-recent-codes.js <email>');
  console.log('Example: node check-recent-codes.js test@example.com');
  process.exit(1);
}

checkRecentCodes(email);
