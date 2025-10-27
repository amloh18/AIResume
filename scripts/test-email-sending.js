#!/usr/bin/env node

/**
 * Test email sending to both test@example.com and amarl@cvcircle.io
 */

const mongoose = require('mongoose');
require('dotenv').config();

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

// VerificationToken model (simplified)
const verificationTokenSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  email: String,
  token: String,
  type: String,
  expiresAt: Date,
  createdAt: { type: Date, default: Date.now }
});

const VerificationToken = mongoose.model('VerificationToken', verificationTokenSchema);

async function testEmailSending() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const testEmails = ['test@example.com', 'amarl@cvcircle.io'];
    
    for (const email of testEmails) {
      console.log(`\n🔍 Testing email sending to: ${email}`);
      
      // Check if user exists
      const user = await User.findOne({ 
        email: { $regex: new RegExp(`^${email}$`, 'i') } 
      }).lean();
      
      console.log('   User exists:', !!user);
      if (user) {
        console.log('   Email verified:', user.isEmailVerified);
        console.log('   Auth provider:', user.authProvider);
        console.log('   Has password:', !!(user.password && user.password.length > 0));
      }
      
      // Check recent verification tokens
      const recentTokens = await VerificationToken.find({
        email: email.toLowerCase(),
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      }).sort({ createdAt: -1 }).limit(5).lean();
      
      console.log('   Recent verification attempts:', recentTokens.length);
      recentTokens.forEach((token, index) => {
        console.log(`     ${index + 1}. Type: ${token.type}, Created: ${token.createdAt}, Expires: ${token.expiresAt}`);
      });
      
      // Simulate sending verification code
      console.log('   Simulating verification code generation...');
      
      // Generate a test code
      const testCode = Math.floor(1000 + Math.random() * 9000).toString();
      console.log('   Generated test code:', testCode);
      
      // Create verification token
      const verificationToken = new VerificationToken({
        userId: user ? user._id : null,
        email: email.toLowerCase(),
        token: testCode,
        type: 'passwordless-login',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
      });
      
      try {
        await verificationToken.save();
        console.log('   ✅ Verification token created successfully');
      } catch (error) {
        console.log('   ❌ Failed to create verification token:', error.message);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

console.log('🧪 Testing email sending to both addresses...');
testEmailSending();
