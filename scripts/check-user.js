#!/usr/bin/env node

/**
 * Check if a specific user exists in the database
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

async function checkUser(email) {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Search for user by email (case insensitive)
    const user = await User.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') } 
    }).lean();

    if (user) {
      console.log('✅ User found:');
      console.log('   Email:', user.email);
      console.log('   Name:', user.firstName, user.lastName);
      console.log('   Username:', user.username);
      console.log('   Auth Provider:', user.authProvider);
      console.log('   Firebase UID:', user.firebaseUid);
      console.log('   Email Verified:', user.isEmailVerified);
      console.log('   Created:', user.createdAt);
      console.log('   Updated:', user.updatedAt);
      
      // Check if user has password
      const hasPassword = user.password && user.password.length > 0;
      console.log('   Has Password:', hasPassword);
      
      // Check if user can reset password
      const canResetPassword = hasPassword || 
                              (!email.includes('@gmail.com') && 
                               !email.includes('@googlemail.com') && 
                               !email.includes('@google.com'));
      
      console.log('   Can Reset Password:', canResetPassword);
      
    } else {
      console.log('❌ User not found with email:', email);
      
      // Check for similar emails
      const similarUsers = await User.find({
        email: { $regex: email.split('@')[0], $options: 'i' }
      }).select('email').lean();
      
      if (similarUsers.length > 0) {
        console.log('🔍 Similar emails found:');
        similarUsers.forEach(u => console.log('   -', u.email));
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.log('Usage: node check-user.js <email>');
  console.log('Example: node check-user.js amarl@cvcircle.io');
  process.exit(1);
}

console.log('🔍 Checking for user:', email);
checkUser(email);
