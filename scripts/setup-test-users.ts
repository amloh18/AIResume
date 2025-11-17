/**
 * Setup Test Users Script
 * 
 * Creates 3 test users for testing job credit system:
 * 1. Free user with 1 job credit (spent when moved to created and journey created cv/cl)
 * 2. Day pass user with unlimited credits for a day
 * 3. Pro user (monthly/quarterly/yearly) with unlimited credits for that duration
 * 
 * Usage:
 *   npx tsx scripts/setup-test-users.ts
 * 
 * Environment Variables Required:
 *   - MONGODB_URI: MongoDB connection string
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import mongoose from 'mongoose';

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || '';

/**
 * Connect to MongoDB
 */
async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI not found in environment variables');
  }
  
  await mongoose.connect(MONGODB_URI);
  return mongoose.connection;
}

/**
 * Create or update test user
 */
async function createOrUpdateTestUser(
  email: string,
  firstName: string,
  lastName: string,
  planKey: 'free' | 'day_pass' | 'pro_monthly' | 'pro_quarterly' | 'pro_yearly',
  config: {
    jobCredits: number; // -1 for unlimited
    subscriptionStatus: 'active' | 'inactive';
    accessExpiresAt?: Date;
    currentPeriodEnd?: Date;
    interval: 'one-time' | 'monthly' | 'quarterly' | 'yearly';
    dayPassPurchases?: Array<{
      purchaseDate: Date;
      expiresAt: Date;
      paymentId: string;
      region: string;
      currency: string;
      price: number;
      documentsAllowed: number;
    }>;
  }
) {
  await connectDB();
  
  const User = (await import('../src/models/User')).default;
  
  // Check if user exists
  let user = await User.findOne({ email });
  
  const now = new Date();
  
  // Determine reset schedule based on plan
  let resetSchedule: 'monthly' | 'quarterly' | 'yearly' | 'one-time' | 'never';
  if (planKey === 'free') {
    resetSchedule = 'monthly';
  } else if (planKey === 'day_pass') {
    resetSchedule = 'never';
  } else if (planKey === 'pro_monthly') {
    resetSchedule = 'monthly';
  } else if (planKey === 'pro_quarterly') {
    resetSchedule = 'quarterly';
  } else {
    resetSchedule = 'yearly';
  }
  
  const userData: any = {
    authProviderId: `test_${planKey}_${Date.now()}`,
    authProvider: 'local',
    email,
    firstName,
    lastName,
    isEmailVerified: true,
    role: 'user',
    currentPlanKey: planKey,
    monthlyGoal: 20,
    usage: {
      cvJourneyCount: 0,
      cvCreatedCount: 0,
      journeysCreated: 0,
      exportCount: 0,
      atsCheckCount: 0,
      lastResetDate: now
    },
    credits: {
      jobCredits: config.jobCredits,
      lastResetDate: now,
      resetSchedule: resetSchedule,
      totalCreated: {
        jobs: 0
      }
    },
    subscription: {
      planKey,
      status: config.subscriptionStatus,
      startDate: now,
      endDate: config.accessExpiresAt || config.currentPeriodEnd,
      currentPeriodStart: now,
      currentPeriodEnd: config.currentPeriodEnd || config.accessExpiresAt,
      accessExpiresAt: config.accessExpiresAt,
      usageResetDate: config.currentPeriodEnd || config.accessExpiresAt,
      provider: 'admin',
      interval: config.interval,
      seats: 1,
      storageUsed: 0,
      autoRenew: config.interval === 'monthly'
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
  };
  
  // Add day pass purchases if provided
  if (config.dayPassPurchases && config.dayPassPurchases.length > 0) {
    userData.dayPassPurchases = config.dayPassPurchases;
  }
  
  if (user) {
    // Update existing user
    await User.findByIdAndUpdate(user._id, userData, { new: true, runValidators: true });
    console.log(`✅ Updated test user: ${email} (${user._id})`);
  } else {
    // Create new user
    user = new User(userData);
    await user.save();
    console.log(`✅ Created test user: ${email} (${user._id})`);
  }
  
  // Refresh user to get updated data
  const updatedUser = await User.findById(user._id);
  
  return {
    userId: updatedUser!._id.toString(),
    email: updatedUser!.email,
    planKey: updatedUser!.currentPlanKey,
    jobCredits: updatedUser!.credits?.jobCredits,
    subscriptionStatus: updatedUser!.subscription.status,
    accessExpiresAt: updatedUser!.subscription.accessExpiresAt,
    currentPeriodEnd: updatedUser!.subscription.currentPeriodEnd
  };
}

/**
 * Main function to create all test users
 */
async function setupTestUsers() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 SETUP TEST USERS');
  console.log('='.repeat(60));
  
  if (!MONGODB_URI) {
    console.error('\n❌ MONGODB_URI environment variable is required');
    process.exit(1);
  }
  
  try {
    await connectDB();
    console.log('✅ Connected to database\n');
    
    const now = new Date();
    
    // 1. Free user with 1 job credit
    console.log('📝 Creating Free User (1 job credit)...');
    const freeUser = await createOrUpdateTestUser(
      'test-free@test.com',
      'Free',
      'User',
      'free',
      {
        jobCredits: 1,
        subscriptionStatus: 'active',
        interval: 'monthly'
      }
    );
    console.log(`   User ID: ${freeUser.userId}`);
    console.log(`   Plan: ${freeUser.planKey}`);
    console.log(`   Job Credits: ${freeUser.jobCredits}`);
    console.log(`   Status: ${freeUser.subscriptionStatus}\n`);
    
    // 2. Day pass user with unlimited credits for 24 hours
    console.log('📝 Creating Day Pass User (unlimited for 24 hours)...');
    const dayPassExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    const dayPassUser = await createOrUpdateTestUser(
      'test-daypass@test.com',
      'Day',
      'Pass',
      'day_pass',
      {
        jobCredits: -1, // Unlimited
        subscriptionStatus: 'active',
        interval: 'one-time',
        accessExpiresAt: dayPassExpiresAt,
        dayPassPurchases: [{
          purchaseDate: now,
          expiresAt: dayPassExpiresAt,
          paymentId: `test_daypass_${Date.now()}`,
          region: 'US',
          currency: 'USD',
          price: 9.99,
          documentsAllowed: 5
        }]
      }
    );
    console.log(`   User ID: ${dayPassUser.userId}`);
    console.log(`   Plan: ${dayPassUser.planKey}`);
    console.log(`   Job Credits: ${dayPassUser.jobCredits === -1 ? 'Unlimited' : dayPassUser.jobCredits}`);
    console.log(`   Status: ${dayPassUser.subscriptionStatus}`);
    console.log(`   Expires At: ${dayPassExpiresAt.toISOString()}\n`);
    
    // 3. Pro Monthly user with unlimited credits
    console.log('📝 Creating Pro Monthly User (unlimited credits)...');
    const proMonthlyEnd = new Date(now);
    proMonthlyEnd.setMonth(proMonthlyEnd.getMonth() + 1); // 1 month from now
    const proMonthlyUser = await createOrUpdateTestUser(
      'test-promonthly@test.com',
      'Pro',
      'Monthly',
      'pro_monthly',
      {
        jobCredits: -1, // Unlimited
        subscriptionStatus: 'active',
        interval: 'monthly',
        currentPeriodEnd: proMonthlyEnd
      }
    );
    console.log(`   User ID: ${proMonthlyUser.userId}`);
    console.log(`   Plan: ${proMonthlyUser.planKey}`);
    console.log(`   Job Credits: ${proMonthlyUser.jobCredits === -1 ? 'Unlimited' : proMonthlyUser.jobCredits}`);
    console.log(`   Status: ${proMonthlyUser.subscriptionStatus}`);
    console.log(`   Period End: ${proMonthlyEnd.toISOString()}\n`);
    
    // 4. Pro Quarterly user with unlimited credits
    console.log('📝 Creating Pro Quarterly User (unlimited credits)...');
    const proQuarterlyEnd = new Date(now);
    proQuarterlyEnd.setMonth(proQuarterlyEnd.getMonth() + 3); // 3 months from now
    const proQuarterlyUser = await createOrUpdateTestUser(
      'test-proquarterly@test.com',
      'Pro',
      'Quarterly',
      'pro_quarterly',
      {
        jobCredits: -1, // Unlimited
        subscriptionStatus: 'active',
        interval: 'quarterly',
        accessExpiresAt: proQuarterlyEnd,
        currentPeriodEnd: proQuarterlyEnd
      }
    );
    console.log(`   User ID: ${proQuarterlyUser.userId}`);
    console.log(`   Plan: ${proQuarterlyUser.planKey}`);
    console.log(`   Job Credits: ${proQuarterlyUser.jobCredits === -1 ? 'Unlimited' : proQuarterlyUser.jobCredits}`);
    console.log(`   Status: ${proQuarterlyUser.subscriptionStatus}`);
    console.log(`   Expires At: ${proQuarterlyEnd.toISOString()}\n`);
    
    // 5. Pro Yearly user with unlimited credits
    console.log('📝 Creating Pro Yearly User (unlimited credits)...');
    const proYearlyEnd = new Date(now);
    proYearlyEnd.setFullYear(proYearlyEnd.getFullYear() + 1); // 1 year from now
    const proYearlyUser = await createOrUpdateTestUser(
      'test-proyearly@test.com',
      'Pro',
      'Yearly',
      'pro_yearly',
      {
        jobCredits: -1, // Unlimited
        subscriptionStatus: 'active',
        interval: 'yearly',
        accessExpiresAt: proYearlyEnd,
        currentPeriodEnd: proYearlyEnd
      }
    );
    console.log(`   User ID: ${proYearlyUser.userId}`);
    console.log(`   Plan: ${proYearlyUser.planKey}`);
    console.log(`   Job Credits: ${proYearlyUser.jobCredits === -1 ? 'Unlimited' : proYearlyUser.jobCredits}`);
    console.log(`   Status: ${proYearlyUser.subscriptionStatus}`);
    console.log(`   Expires At: ${proYearlyEnd.toISOString()}\n`);
    
    // Summary
    console.log('='.repeat(60));
    console.log('📊 TEST USERS SUMMARY');
    console.log('='.repeat(60));
    console.log('\n✅ Free User:');
    console.log(`   Email: ${freeUser.email}`);
    console.log(`   User ID: ${freeUser.userId}`);
    console.log(`   Job Credits: ${freeUser.jobCredits}`);
    
    console.log('\n✅ Day Pass User:');
    console.log(`   Email: ${dayPassUser.email}`);
    console.log(`   User ID: ${dayPassUser.userId}`);
    console.log(`   Job Credits: Unlimited`);
    console.log(`   Expires: ${dayPassExpiresAt.toLocaleString()}`);
    
    console.log('\n✅ Pro Monthly User:');
    console.log(`   Email: ${proMonthlyUser.email}`);
    console.log(`   User ID: ${proMonthlyUser.userId}`);
    console.log(`   Job Credits: Unlimited`);
    console.log(`   Period End: ${proMonthlyEnd.toLocaleString()}`);
    
    console.log('\n✅ Pro Quarterly User:');
    console.log(`   Email: ${proQuarterlyUser.email}`);
    console.log(`   User ID: ${proQuarterlyUser.userId}`);
    console.log(`   Job Credits: Unlimited`);
    console.log(`   Expires: ${proQuarterlyEnd.toLocaleString()}`);
    
    console.log('\n✅ Pro Yearly User:');
    console.log(`   Email: ${proYearlyUser.email}`);
    console.log(`   User ID: ${proYearlyUser.userId}`);
    console.log(`   Job Credits: Unlimited`);
    console.log(`   Expires: ${proYearlyEnd.toLocaleString()}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 All test users created successfully!');
    console.log('='.repeat(60));
    console.log('\n💡 You can now use these test users for testing:');
    console.log('   - Free: test-free@test.com (1 credit)');
    console.log('   - Day Pass: test-daypass@test.com (unlimited for 24h)');
    console.log('   - Pro Monthly: test-promonthly@test.com (unlimited)');
    console.log('   - Pro Quarterly: test-proquarterly@test.com (unlimited)');
    console.log('   - Pro Yearly: test-proyearly@test.com (unlimited)');
    console.log('\n');
    
  } catch (error: any) {
    console.error('\n❌ Error setting up test users:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run if script is executed directly
if (require.main === module) {
  setupTestUsers()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { setupTestUsers };

