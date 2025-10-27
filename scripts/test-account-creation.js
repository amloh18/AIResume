#!/usr/bin/env node

/**
 * Test account creation and code sending flow
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
  attempts: { type: Number, default: 0 },
  expiresAt: Date,
  createdAt: { type: Date, default: Date.now }
});

const VerificationToken = mongoose.model('VerificationToken', verificationTokenSchema);

async function testAccountCreation(email) {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log(`🧪 Testing account creation for: ${email}`);
    
    // Step 1: Check if user already exists
    const existingUser = await User.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') } 
    }).lean();
    
    if (existingUser) {
      console.log('⚠️ User already exists:');
      console.log('   Email:', existingUser.email);
      console.log('   Verified:', existingUser.isEmailVerified);
      console.log('   Auth Provider:', existingUser.authProvider);
      console.log('   Created:', existingUser.createdAt);
      
      // Check if user can receive verification codes
      if (existingUser.isEmailVerified) {
        console.log('❌ User is already verified - cannot send verification code');
        return;
      }
    } else {
      console.log('✅ User does not exist - can create new account');
    }
    
    // Step 2: Simulate account creation (if user doesn't exist)
    if (!existingUser) {
      console.log('📝 Creating new user account...');
      
      const newUser = new User({
        email: email.toLowerCase(),
        password: 'testpassword123', // This would be hashed in real implementation
        firstName: 'Test',
        lastName: 'User',
        isEmailVerified: false,
        authProvider: 'email',
        currentPlanKey: 'free',
        subscription: {
          planKey: 'free',
          status: 'inactive',
          startDate: new Date(),
          provider: 'stripe',
          interval: 'monthly',
          seats: 3,
          storageUsed: 0
        },
        settings: {
          theme: 'auto',
          notifications: {
            email: true,
            push: true
          },
          timezone: 'UTC',
          languagePreference: 'en'
        }
      });
      
      try {
        await newUser.save();
        console.log('✅ User account created successfully');
      } catch (error) {
        if (error.code === 11000) {
          console.log('⚠️ User already exists (duplicate key error)');
        } else {
          console.log('❌ Failed to create user:', error.message);
          return;
        }
      }
    }
    
    // Step 3: Simulate sending verification code
    console.log('📧 Simulating verification code sending...');
    
    // Check cooldown
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const cooldownCode = await VerificationToken.findOne({
      email: email.toLowerCase(),
      type: { $in: ['email-verification', 'passwordless-login', 'password-reset'] },
      createdAt: { $gte: oneMinuteAgo }
    });
    
    if (cooldownCode) {
      console.log('❌ COOLDOWN ACTIVE: Cannot send code - recent request within 60 seconds');
      console.log(`   Recent code: ${cooldownCode.type} created at ${cooldownCode.createdAt}`);
      return;
    }
    
    // Check rate limit
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const hourlyCodes = await VerificationToken.countDocuments({
      email: email.toLowerCase(),
      type: { $in: ['email-verification', 'passwordless-login', 'password-reset'] },
      createdAt: { $gte: oneHourAgo }
    });
    
    if (hourlyCodes >= 3) {
      console.log('❌ RATE LIMIT EXCEEDED: Too many code requests in the last hour');
      return;
    }
    
    // Generate verification code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    console.log('🔐 Generated verification code:', code);
    
    // Create verification token
    const verificationToken = new VerificationToken({
      userId: existingUser ? existingUser._id : null,
      email: email.toLowerCase(),
      token: code,
      type: 'email-verification',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    });
    
    try {
      await verificationToken.save();
      console.log('✅ Verification token created successfully');
      console.log('📧 Code should be sent to email (this is where email service would be called)');
      console.log('🎯 User should now see the code verification screen');
    } catch (error) {
      console.log('❌ Failed to create verification token:', error.message);
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
  console.log('Usage: node test-account-creation.js <email>');
  console.log('Example: node test-account-creation.js test@example.com');
  process.exit(1);
}

testAccountCreation(email);
