const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Define User schema inline since we can't import TypeScript models directly
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: String,
  firebaseUid: String,
  clerkId: String,
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  username: String,
  avatar: String,
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  userRole: { type: String, enum: ['Student', 'Professional', 'Recruiter'] },
  isEmailVerified: { type: Boolean, default: false },
  currentPlanKey: { type: String, enum: ['free', 'day_pass', 'pro_monthly', 'pro_quarterly', 'pro_yearly'], default: 'free' },
  monthlyGoal: { type: Number, default: 20 },
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
  lastLogin: Date,
  region: String,
  subscription: {
    planKey: { type: String, enum: ['free', 'day_pass', 'pro_monthly', 'pro_quarterly', 'pro_yearly'], default: 'free' },
    status: { type: String, enum: ['active', 'inactive', 'cancelled', 'expired'], default: 'inactive' },
    startDate: { type: Date, default: Date.now },
    endDate: Date,
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    provider: { type: String, enum: ['stripe', 'razorpay', 'admin'], default: 'stripe' },
    providerSubscriptionId: String,
    providerCustomerId: String,
    interval: { type: String, enum: ['one-time', 'monthly', 'quarterly', 'yearly'], default: 'monthly' },
    seats: { type: Number, default: 3 },
    storageUsed: { type: Number, default: 0 }
  },
  settings: {
    theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'auto' },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    phone: String,
    company: String,
    address: String,
    timezone: { type: String, default: 'UTC +07:00 - Asia / Jakarta' },
    languagePreference: { type: String, default: 'English' },
    dateOfBirth: String,
    gender: { type: String, enum: ['male', 'female', 'other', 'prefer-not-to-say', ''] },
    nationality: String
  }
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function createDevUserForGoogleAuth() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if dev@cvcircle.io already exists
    const existingUser = await User.findOne({ email: 'dev@cvcircle.io' });
    
    if (existingUser) {
      console.log('✅ dev@cvcircle.io user already exists:');
      console.log('  - ID:', existingUser._id);
      console.log('  - Name:', existingUser.firstName, existingUser.lastName);
      console.log('  - Role:', existingUser.role);
      console.log('  - Has Password:', !!existingUser.password);
      console.log('  - Email Verified:', existingUser.isEmailVerified);
      
      // Update for Google Auth
      await User.updateOne(
        { email: 'dev@cvcircle.io' },
        {
          $unset: { password: 1 }, // Remove password field
          $set: {
            isEmailVerified: true, // Mark email as verified
            lastLogin: new Date(),
            updatedAt: new Date()
          }
        }
      );
      
      console.log('✅ User updated for Google Auth');
    } else {
      // Create new dev user
      const devUser = new User({
        email: 'dev@cvcircle.io',
        firstName: 'Dev',
        lastName: 'User',
        role: 'admin',
        userRole: 'Professional',
        isEmailVerified: true,
        currentPlanKey: 'pro_monthly',
        monthlyGoal: 50,
        usage: {
          cvJourneyCount: 0,
          cvCreatedCount: 0,
          journeysCreated: 0,
          exportCount: 0,
          atsCheckCount: 0,
          lastResetDate: new Date(),
          deviceFingerprint: 'dev-user'
        },
        subscription: {
          planKey: 'pro_monthly',
          status: 'active',
          startDate: new Date(),
          provider: 'admin',
          interval: 'monthly',
          seats: 5,
          storageUsed: 0
        },
        settings: {
          theme: 'auto',
          notifications: {
            email: true,
            push: true
          },
          timezone: 'UTC +07:00 - Asia / Jakarta',
          languagePreference: 'English'
        },
        lastLogin: new Date()
      });

      await devUser.save();
      console.log('✅ Created new dev@cvcircle.io user:');
      console.log('  - ID:', devUser._id);
      console.log('  - Name:', devUser.firstName, devUser.lastName);
      console.log('  - Role:', devUser.role);
      console.log('  - Plan:', devUser.currentPlanKey);
    }

    // Export user data
    const user = await User.findOne({ email: 'dev@cvcircle.io' });
    const userData = {
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      avatar: user.avatar,
      role: user.role,
      userRole: user.userRole,
      isEmailVerified: user.isEmailVerified,
      currentPlanKey: user.currentPlanKey,
      monthlyGoal: user.monthlyGoal,
      usage: user.usage,
      phone: user.phone,
      location: user.location,
      website: user.website,
      linkedin: user.linkedin,
      github: user.github,
      summary: user.summary,
      lastLogin: user.lastLogin,
      region: user.region,
      subscription: user.subscription,
      settings: user.settings,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      // Auth fields
      hasPassword: !!user.password,
      firebaseUid: user.firebaseUid,
      clerkId: user.clerkId
    };

    // Save to JSON file
    const fs = require('fs');
    const path = require('path');
    
    const exportPath = path.join(__dirname, 'dev-user-export.json');
    fs.writeFileSync(exportPath, JSON.stringify(userData, null, 2));
    
    console.log('📁 User data exported to:', exportPath);

    // Instructions for Google Auth setup
    console.log('\n🔧 Google Auth Setup Instructions:');
    console.log('1. Go to Google Cloud Console (https://console.cloud.google.com/)');
    console.log('2. Create a new project or select existing one');
    console.log('3. Enable Google+ API');
    console.log('4. Go to "Credentials" and create OAuth 2.0 Client ID');
    console.log('5. Add authorized redirect URIs:');
    console.log('   - http://localhost:3001/api/auth/callback/google');
    console.log('   - https://yourdomain.com/api/auth/callback/google');
    console.log('6. Copy Client ID and Client Secret to .env.local:');
    console.log('   GOOGLE_CLIENT_ID=your_client_id_here');
    console.log('   GOOGLE_CLIENT_SECRET=your_client_secret_here');
    console.log('7. The user is now ready for Google Auth!');
    console.log('   - No password required');
    console.log('   - Email verified');
    console.log('   - Admin role assigned');

    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
  }
}

// Run the script
createDevUserForGoogleAuth();
