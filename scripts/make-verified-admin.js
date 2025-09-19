const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB using the same connection as the app
async function connectDB() {
  try {
    // Use the MongoDB URI from environment or fallback
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cvcircle';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    console.log('💡 Make sure your .env file has MONGODB_URI set');
    process.exit(1);
  }
}

// User Schema (matching the actual User model)
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: false,
    minlength: 8,
    select: false
  },
  firebaseUid: {
    type: String,
    unique: true,
    sparse: true,
    required: false
  },
  clerkId: {
    type: String,
    unique: true,
    sparse: true,
    required: false
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true,
    minlength: 3,
    maxlength: 30
  },
  avatar: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  userRole: {
    type: String,
    enum: ['Student', 'Professional', 'Recruiter'],
    required: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  currentPlanKey: {
    type: String,
    enum: ['free', 'day_pass', 'pro_monthly', 'pro_quarterly', 'pro_yearly'],
    default: 'free'
  },
  monthlyGoal: Number,
  usage: {
    cvJourneyCount: { type: Number, default: 0 },
    cvCreatedCount: { type: Number, default: 0 },
    journeysCreated: { type: Number, default: 0 },
    exportCount: { type: Number, default: 0 },
    atsCheckCount: { type: Number, default: 0 },
    lastResetDate: { type: Date, default: Date.now },
    deviceFingerprint: String
  },
  phone: String,
  location: String,
  website: String,
  linkedin: String,
  github: String,
  summary: String,
  company: String,
  jobTitle: String,
  industry: String,
  experience: {
    type: String,
    enum: ['entry', 'mid', 'senior', 'executive']
  },
  lastLogin: Date,
  region: String,
  subscription: {
    planKey: {
      type: String,
      enum: ['free', 'day_pass', 'pro_monthly', 'pro_quarterly', 'pro_yearly'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled', 'expired'],
      default: 'active'
    },
    startDate: { type: Date, default: Date.now },
    endDate: Date,
    autoRenew: { type: Boolean, default: false },
    paymentMethod: String,
    billingCycle: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly'],
      default: 'monthly'
    }
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    language: {
      type: String,
      default: 'en'
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    },
    privacy: {
      profileVisibility: {
        type: String,
        enum: ['public', 'private', 'connections'],
        default: 'private'
      },
      showEmail: { type: Boolean, default: false },
      showPhone: { type: Boolean, default: false }
    }
  },
  referral: {
    code: String,
    referredBy: String,
    referralCount: { type: Number, default: 0 },
    referralEarnings: { type: Number, default: 0 }
  },
  achievements: [{
    type: {
      type: String,
      enum: ['first_cv', 'cv_milestone', 'export_milestone', 'referral_milestone', 'subscription_upgrade']
    },
    title: String,
    description: String,
    earnedAt: { type: Date, default: Date.now },
    points: { type: Number, default: 0 }
  }],
  analytics: {
    totalLogins: { type: Number, default: 0 },
    lastActiveAt: Date,
    deviceInfo: String,
    ipAddress: String,
    userAgent: String
  }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function makeVerifiedAdmin(email, firstName = 'Admin', lastName = 'User') {
  try {
    await connectDB();
    
    console.log(`🔍 Looking for user: ${email}`);
    
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.log(`❌ User with email ${email} not found`);
      console.log(`💡 Creating new admin user...`);
      
      // Create new admin user
      const adminPassword = 'admin123456'; // Default password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);
      
      const newAdminUser = new User({
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName: firstName,
        lastName: lastName,
        role: 'admin',
        isEmailVerified: true,
        currentPlanKey: 'pro_yearly', // Give them the best plan
        subscription: {
          planKey: 'pro_yearly',
          status: 'active',
          startDate: new Date(),
          autoRenew: true,
          billingCycle: 'yearly'
        },
        preferences: {
          theme: 'dark',
          language: 'en',
          timezone: 'UTC',
          notifications: {
            email: true,
            push: true,
            sms: false
          },
          privacy: {
            profileVisibility: 'private',
            showEmail: false,
            showPhone: false
          }
        },
        usage: {
          cvJourneyCount: 0,
          cvCreatedCount: 0,
          journeysCreated: 0,
          exportCount: 0,
          atsCheckCount: 0,
          lastResetDate: new Date()
        },
        analytics: {
          totalLogins: 0,
          lastActiveAt: new Date()
        }
      });
      
      await newAdminUser.save();
      
      console.log(`✅ Created new admin user: ${email}`);
      console.log(`📧 Email: ${newAdminUser.email}`);
      console.log(`👤 Name: ${newAdminUser.firstName} ${newAdminUser.lastName}`);
      console.log(`🔑 Role: ${newAdminUser.role}`);
      console.log(`✅ Email Verified: ${newAdminUser.isEmailVerified}`);
      console.log(`💎 Plan: ${newAdminUser.currentPlanKey}`);
      console.log(`🔐 Default Password: ${adminPassword}`);
      console.log(`\n🌐 Access admin dashboard at: http://localhost:3000/admin`);
      
    } else {
      console.log(`✅ Found existing user: ${email}`);
      
      // Update user to admin and verify email
      const wasAdmin = user.role === 'admin';
      const wasVerified = user.isEmailVerified;
      
      user.role = 'admin';
      user.isEmailVerified = true;
      
      // Upgrade to pro plan if not already
      if (user.currentPlanKey === 'free') {
        user.currentPlanKey = 'pro_yearly';
        user.subscription.planKey = 'pro_yearly';
        user.subscription.status = 'active';
        user.subscription.autoRenew = true;
        user.subscription.billingCycle = 'yearly';
      }
      
      await user.save();
      
      console.log(`✅ Successfully updated ${email} to verified admin`);
      console.log(`📧 Email: ${user.email}`);
      console.log(`👤 Name: ${user.firstName} ${user.lastName}`);
      console.log(`🔑 Role: ${user.role} ${wasAdmin ? '(was already admin)' : '(promoted to admin)'}`);
      console.log(`✅ Email Verified: ${user.isEmailVerified} ${wasVerified ? '(was already verified)' : '(now verified)'}`);
      console.log(`💎 Plan: ${user.currentPlanKey}`);
      console.log(`\n🌐 Access admin dashboard at: http://localhost:3000/admin`);
    }
    
  } catch (error) {
    console.error('❌ Error making user admin:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Get email from command line argument
const email = process.argv[2];
const firstName = process.argv[3] || 'Admin';
const lastName = process.argv[4] || 'User';

if (!email) {
  console.log('❌ Please provide an email address');
  console.log('Usage: node scripts/make-verified-admin.js <email> [firstName] [lastName]');
  console.log('Example: node scripts/make-verified-admin.js amarjotasl@gmail.com Amar Jota');
  process.exit(1);
}

makeVerifiedAdmin(email, firstName, lastName);
