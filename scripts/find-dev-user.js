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

async function findDevUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // List all users
    const allUsers = await User.find({}).select('_id email firstName lastName role createdAt');
    console.log('📋 All users in database:');
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user._id}, Email: ${user.email}, Name: ${user.firstName} ${user.lastName}, Role: ${user.role}, Created: ${user.createdAt}`);
    });

    // Try to find dev@cvcircle.io user
    const devUser = await User.findOne({ email: 'dev@cvcircle.io' });
    if (devUser) {
      console.log('\n✅ Found dev@cvcircle.io user:');
      console.log('  - ID:', devUser._id);
      console.log('  - Name:', devUser.firstName, devUser.lastName);
      console.log('  - Role:', devUser.role);
      console.log('  - Created:', devUser.createdAt);
      console.log('  - Has Password:', !!devUser.password);
      console.log('  - Firebase UID:', devUser.firebaseUid);
      console.log('  - Clerk ID:', devUser.clerkId);
    } else {
      console.log('\n❌ dev@cvcircle.io user not found');
    }

    // Try different ObjectId formats
    const objectIdStrings = [
      '68acb59862b29847beab0491',
      new mongoose.Types.ObjectId('68acb59862b29847beab0491').toString(),
      mongoose.Types.ObjectId('68acb59862b29847beab0491')
    ];

    console.log('\n🔍 Trying different ObjectId formats:');
    for (const id of objectIdStrings) {
      try {
        const user = await User.findById(id);
        if (user) {
          console.log(`✅ Found user with ID ${id}:`, user.email);
        } else {
          console.log(`❌ No user found with ID ${id}`);
        }
      } catch (error) {
        console.log(`❌ Error with ID ${id}:`, error.message);
      }
    }

    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
  }
}

// Run the script
findDevUser();
