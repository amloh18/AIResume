#!/usr/bin/env node

/**
 * Script to create an initial admin user for testing
 * Usage: node scripts/create-admin-user.js
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

async function createAdminUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cvcircle');
    console.log('✅ Connected to MongoDB');

    // Check if admin user already exists
    const existingAdmin = await AdminAuth.findOne({ email: 'admin@cvcircle.io' });
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists:', existingAdmin.email);
      console.log('   Role:', existingAdmin.role);
      console.log('   Created:', existingAdmin.createdAt);
      return;
    }

    // Create new admin user
    const adminUser = new AdminAuth({
      email: 'admin@cvcircle.io',
      password: 'admin123', // This will be hashed by the pre-save middleware
      role: 'superadmin',
    });

    await adminUser.save();
    console.log('✅ Admin user created successfully!');
    console.log('   Email: admin@cvcircle.io');
    console.log('   Password: admin123');
    console.log('   Role: superadmin');
    console.log('');
    console.log('🔐 You can now sign in at: /admin/signin');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the script
createAdminUser();
