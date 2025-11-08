/**
 * Migration script to add credits object to users who don't have it
 * 
 * This script initializes the credits field for existing users who don't have
 * the credits object in their database document. It sets default values based
 * on their current plan.
 * 
 * Usage:
 *   npx tsx scripts/add-credits-schema-to-users.ts
 *   npx tsx scripts/add-credits-schema-to-users.ts --dry-run
 *   npx tsx scripts/add-credits-schema-to-users.ts --plan free
 * 
 * Options:
 *   --dry-run    Show what would be updated without making changes
 *   --plan       Only update users with specific plan (free, day_pass, etc.)
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Import User model after environment is loaded
const User = require('../src/models/User').default;

interface ScriptOptions {
  dryRun?: boolean;
  plan?: string;
}

/**
 * Get default credits for a plan
 */
function getDefaultCreditsForPlan(planKey: string): { jobCredits: number; resetSchedule: string } {
  switch (planKey) {
    case 'free':
      return { jobCredits: 1, resetSchedule: 'monthly' };
    case 'day_pass':
      return { jobCredits: 5, resetSchedule: 'never' };
    case 'pro_monthly':
    case 'pro_quarterly':
    case 'pro_yearly':
      return { jobCredits: -1, resetSchedule: 'never' }; // Unlimited
    default:
      return { jobCredits: 1, resetSchedule: 'monthly' }; // Default to free plan
  }
}

/**
 * Add credits schema to users who don't have it
 */
async function addCreditsSchemaToUsers(options: ScriptOptions): Promise<void> {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ Error: MONGODB_URI not found in environment variables');
      process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Build query to find users without credits object or with incomplete credits
    let query: any = {
      $or: [
        { credits: { $exists: false } },
        { 'credits.jobCredits': { $exists: false } },
        { 'credits.lastResetDate': { $exists: false } },
        { 'credits.resetSchedule': { $exists: false } },
        { 'credits.totalCreated': { $exists: false } },
        { 'credits.totalCreated.jobs': { $exists: false } }
      ]
    };

    // Filter by plan if specified
    if (options.plan) {
      query.currentPlanKey = options.plan;
      console.log(`📦 Filtering users with plan: ${options.plan}`);
    }

    // Find users that need credits initialization
    const users = await User.find(query);
    console.log(`📊 Found ${users.length} user(s) that need credits initialization\n`);

    if (users.length === 0) {
      console.log('✅ All users already have credits object initialized');
      await mongoose.disconnect();
      return;
    }

    // Show users that will be updated
    console.log('👥 Users to update:');
    users.forEach((user: any, index: number) => {
      const planKey = user.currentPlanKey || 'free';
      const defaultCredits = getDefaultCreditsForPlan(planKey);
      const hasCredits = user.credits && user.credits.jobCredits !== undefined;
      
      console.log(`  ${index + 1}. ${user.email} (ID: ${user._id})`);
      console.log(`     Plan: ${planKey}`);
      console.log(`     Current credits: ${hasCredits ? (user.credits.jobCredits === -1 ? 'Unlimited' : user.credits.jobCredits) : 'MISSING'}`);
      console.log(`     Will set to: ${defaultCredits.jobCredits === -1 ? 'Unlimited' : defaultCredits.jobCredits} (${defaultCredits.resetSchedule} reset)`);
    });

    if (options.dryRun) {
      console.log('\n🔍 DRY RUN MODE - No changes will be made');
      await mongoose.disconnect();
      return;
    }

    // Confirm before proceeding
    console.log(`\n⚠️  About to initialize credits for ${users.length} user(s)`);
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Update users
    let updated = 0;
    let skipped = 0;

    for (const user of users) {
      const planKey = user.currentPlanKey || 'free';
      const defaultCredits = getDefaultCreditsForPlan(planKey);
      
      // Get existing values or use defaults
      const existingJobCredits = user.credits?.jobCredits;
      const existingLastResetDate = user.credits?.lastResetDate || new Date();
      const existingResetSchedule = user.credits?.resetSchedule || defaultCredits.resetSchedule;
      const existingTotalCreated = user.credits?.totalCreated || { jobs: 0 };

      // Only set jobCredits if it doesn't exist or is invalid
      const jobCredits = existingJobCredits !== undefined && existingJobCredits !== null 
        ? existingJobCredits 
        : defaultCredits.jobCredits;

      // Prepare update object
      const updateData: any = {
        $set: {
          'credits.jobCredits': jobCredits,
          'credits.lastResetDate': existingLastResetDate,
          'credits.resetSchedule': existingResetSchedule,
          'credits.totalCreated.jobs': existingTotalCreated.jobs || 0
        }
      };

      // Update user
      await User.findByIdAndUpdate(user._id, updateData);

      console.log(`✅ Updated ${user.email}:`);
      console.log(`   - jobCredits: ${jobCredits === -1 ? 'Unlimited' : jobCredits}`);
      console.log(`   - resetSchedule: ${existingResetSchedule}`);
      console.log(`   - totalCreated.jobs: ${existingTotalCreated.jobs || 0}`);
      updated++;
    }

    console.log(`\n✅ Successfully initialized credits for ${updated} user(s)`);
    if (skipped > 0) {
      console.log(`⏭️  Skipped ${skipped} user(s)`);
    }

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error adding credits schema:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Parse command line arguments
function parseArgs(): ScriptOptions {
  const args = process.argv.slice(2);
  const options: ScriptOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--plan':
        options.plan = nextArg;
        i++;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--help':
      case '-h':
        console.log(`
Usage: npx tsx scripts/add-credits-schema-to-users.ts [options]

Options:
  --plan <planKey>    Only update users with specific plan (free, day_pass, etc.)
  --dry-run           Show what would be updated without making changes
  --help, -h          Show this help message

Examples:
  npx tsx scripts/add-credits-schema-to-users.ts
  npx tsx scripts/add-credits-schema-to-users.ts --dry-run
  npx tsx scripts/add-credits-schema-to-users.ts --plan free
        `);
        process.exit(0);
        break;
    }
  }

  return options;
}

// Run the script
const options = parseArgs();
addCreditsSchemaToUsers(options)
  .then(() => {
    console.log('\n✨ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

