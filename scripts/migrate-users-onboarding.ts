/**
 * Migration Script: Migrate all existing users to Type 1 Free CV onboarding state
 * 
 * Sets the default onboarding subdocument values:
 * - primary_goal: 'cv'
 * - confidence_score: 70
 * - recommended_plan: 'free'
 * - activation_status: 'completed' (so they can directly access their dashboard)
 * - activation_route: '/editor?doc=master-cv&mode=improve'
 * - dashboard_layout_type: 'cv'
 * 
 * Usage: npx ts-node scripts/migrate-users-onboarding.ts
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Import model after env is loaded
import User from '../src/models/User';

async function migrateUsersOnboarding() {
  try {
    console.log('🚀 Starting User Onboarding Migration...\n');

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database\n');

    const totalUsers = await User.countDocuments();
    console.log(`📊 Total users in database: ${totalUsers}\n`);

    // Get count of users who don't have onboarding completed
    const usersPendingOnboarding = await User.countDocuments({
      $or: [
        { 'onboarding.activation_status': { $exists: false } },
        { 'onboarding.activation_status': null },
        { 'onboarding.activation_status': { $ne: 'completed' } }
      ]
    });
    console.log(`📋 Users needing onboarding migration: ${usersPendingOnboarding}\n`);

    if (totalUsers === 0) {
      console.log('ℹ️ No users in database to migrate.');
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log('🔄 Updating users to Type 1 Free CV onboarding configurations...');
    const result = await User.updateMany(
      {}, // Update all existing users
      {
        $set: {
          onboarding: {
            primary_goal: 'cv',
            confidence_score: 70,
            recommended_plan: 'free',
            activation_status: 'completed',
            activation_route: '/editor?doc=master-cv&mode=improve',
            dashboard_layout_type: 'cv'
          }
        }
      }
    );

    console.log(`✅ Successfully updated ${result.modifiedCount} users.`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  }
}

// Execute migration
migrateUsersOnboarding();
