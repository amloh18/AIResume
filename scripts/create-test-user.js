const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Create a test user with known password
async function createTestUser() {
  try {
    await connectDB();
    
    const email = 'testuser@cvcircle.io';
    const password = 'test123';
    
    console.log(`🧪 Creating test user: ${email}`);
    
    // Define User schema
    const User = mongoose.model('User', new mongoose.Schema({
      authProviderId: String,
      authProvider: String,
      email: String,
      password: String,
      firstName: String,
      lastName: String,
      isEmailVerified: Boolean,
      role: String,
      currentPlanKey: String,
      monthlyGoal: Number,
      usage: {
        cvJourneyCount: Number,
        cvCreatedCount: Number,
        journeysCreated: Number,
        exportCount: Number,
        atsCheckCount: Number,
        lastResetDate: Date,
      },
      subscription: {
        planKey: String,
        status: String,
        startDate: Date,
        provider: String,
        interval: String,
        seats: Number,
        storageUsed: Number
      },
      settings: {
        theme: String,
        notifications: {
          email: Boolean,
          push: Boolean
        },
        timezone: String,
        languagePreference: String
      }
    }));
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.log('❌ User already exists, deleting...');
      await User.deleteOne({ _id: existingUser._id });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    console.log('🔐 Password hashed:', hashedPassword.substring(0, 20) + '...');
    
    // Create new user
    const user = new User({
      authProviderId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      authProvider: 'local',
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'User',
      isEmailVerified: true, // Mark as verified for testing
      role: 'user',
      currentPlanKey: 'free',
      monthlyGoal: 20,
      usage: {
        cvJourneyCount: 0,
        cvCreatedCount: 0,
        journeysCreated: 0,
        exportCount: 0,
        atsCheckCount: 0,
        lastResetDate: new Date(),
      },
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
    
    await user.save();
    console.log('✅ Test user created successfully!');
    console.log(`   Email: ${user.email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Email Verified: ${user.isEmailVerified}`);
    console.log(`   User ID: ${user._id}`);
    
  } catch (error) {
    console.error('❌ Error creating test user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the function
createTestUser();
