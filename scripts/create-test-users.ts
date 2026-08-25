/**
 * Create Staging Test Users
 * 
 * Creates 3-5 controlled test users for behavioral validation.
 * 
 * Usage:
 *   npx tsx scripts/create-test-users.ts
 */

import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/buildairesume';

// Test user definitions
const TEST_USERS = [
  {
    _id: new ObjectId(),
    email: 'test-user-a@example.com',
    firstName: 'TestUserA',
    lastName: 'NewUser',
    isTestUser: true,
    testCategory: 'new_user_no_legacy',
    createdAt: new Date(),
    settings: {
      theme: 'auto',
      notifications: { email: true, push: true },
      timezone: 'UTC',
      languagePreference: 'en',
    },
    // No autoApplyPreferences (new user)
    // No job_preferences (new user)
    // No portal integrations (new user)
  },
  {
    _id: new ObjectId(),
    email: 'test-user-b@example.com',
    firstName: 'TestUserB',
    lastName: 'MigratedUser',
    isTestUser: true,
    testCategory: 'migrated_user_with_profile',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    autoApplyPreferences: {
      enabled: true,
      targetRoles: ['Software Engineer', 'Full Stack Developer'],
      locations: ['London', 'Remote'],
      workplaceTypes: ['remote', 'hybrid'],
      remoteOnly: false,
      minSalary: 50000,
      salaryCurrency: 'GBP',
      experienceYears: 5,
      maxNoticePeriodDays: 30,
      maxPerDay: 20,
      useTailoredCV: true,
      useCoverLetter: true,
      autoAnswerQuestions: true,
      enabledPortals: ['naukri', 'indeed'],
      searchIntensity: 'active',
      expectedApplicationsPerMonth: 100,
      applicationMode: 'manual_review',
    },
    settings: {
      theme: 'auto',
      notifications: { email: true, push: true },
      timezone: 'UTC',
      languagePreference: 'en',
    },
  },
  {
    _id: new ObjectId(),
    email: 'test-user-c@example.com',
    firstName: 'TestUserC',
    lastName: 'ConflictingUser',
    isTestUser: true,
    testCategory: 'conflicting_legacy_data',
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
    autoApplyPreferences: {
      enabled: false,
      targetRoles: ['Product Manager'],
      locations: ['Mumbai'],
      workplaceTypes: ['onsite'],
      remoteOnly: false,
      minSalary: 15,
      salaryCurrency: 'INR_LPA',
      experienceYears: 3,
      maxNoticePeriodDays: 45,
    },
    settings: {
      theme: 'auto',
      notifications: { email: true, push: true },
      timezone: 'UTC',
      languagePreference: 'en',
    },
  },
  {
    _id: new ObjectId(),
    email: 'test-user-d@example.com',
    firstName: 'TestUserD',
    lastName: 'CacheTestUser',
    isTestUser: true,
    testCategory: 'cache_isolation_test',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
    autoApplyPreferences: {
      enabled: true,
      targetRoles: ['Marketing Manager', 'Digital Marketing Specialist'],
      locations: ['Manchester', 'Leeds'],
      workplaceTypes: ['hybrid', 'onsite'],
      remoteOnly: false,
      minSalary: 40000,
      salaryCurrency: 'GBP',
      experienceYears: 7,
      maxNoticePeriodDays: 60,
    },
    settings: {
      theme: 'auto',
      notifications: { email: true, push: true },
      timezone: 'UTC',
      languagePreference: 'en',
    },
  },
];

async function createTestUsers() {
  console.log('=== Creating Staging Test Users ===');
  console.log('');
  
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');
  
  // Get User model
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  
  // Check for existing test users
  const existingCount = await User.countDocuments({ isTestUser: true });
  if (existingCount > 0) {
    console.log(`Found ${existingCount} existing test users. Cleaning up...`);
    await User.deleteMany({ isTestUser: true });
    console.log('Cleanup complete');
  }
  
  // Create test users
  for (const userData of TEST_USERS) {
    try {
      await User.create(userData);
      console.log(`Created test user: ${userData.email} (${userData.testCategory})`);
    } catch (error: any) {
      console.error(`Failed to create ${userData.email}:`, error.message);
    }
  }
  
  // Verify creation
  const newCount = await User.countDocuments({ isTestUser: true });
  console.log('');
  console.log(`Created ${newCount} test users`);
  
  // Print user IDs for reference
  console.log('');
  console.log('Test User IDs:');
  for (const userData of TEST_USERS) {
    console.log(`  ${userData.testCategory}: ${userData._id.toString()}`);
  }
  
  await mongoose.disconnect();
  console.log('');
  console.log('Done');
}

createTestUsers().catch(console.error);
