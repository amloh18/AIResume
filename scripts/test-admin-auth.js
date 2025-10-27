#!/usr/bin/env node

/**
 * Script to test admin authentication
 * Usage: node scripts/test-admin-auth.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// AdminAuth schema (simplified for script)
const AdminAuthSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    default: 'superadmin',
    enum: ['superadmin', 'admin', 'editor'],
    required: true,
  },
  lastLogin: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Password hashing middleware
AdminAuthSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Password comparison method
AdminAuthSchema.methods.comparePassword = async function (candidatePassword) {
  const passwordHash = this.password;
  return bcrypt.compare(candidatePassword, passwordHash);
};

const AdminAuth = mongoose.model('AdminAuth', AdminAuthSchema);

async function testAdminAuth() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cvcircle');
    console.log('✅ Connected to MongoDB');

    // Test admin user lookup
    const adminUser = await AdminAuth.findOne({ email: 'admin@cvcircle.io' }).select('+password');
    
    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log('✅ Admin user found:', adminUser.email);
    console.log('   Role:', adminUser.role);
    console.log('   Created:', adminUser.createdAt);

    // Test password comparison
    const isMatch = await adminUser.comparePassword('admin123');
    console.log('✅ Password verification:', isMatch ? 'SUCCESS' : 'FAILED');

    if (isMatch) {
      console.log('🎉 Admin authentication test PASSED');
    } else {
      console.log('❌ Admin authentication test FAILED');
    }

  } catch (error) {
    console.error('❌ Error testing admin auth:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the test
testAdminAuth();
