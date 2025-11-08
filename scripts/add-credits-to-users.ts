/**
 * Script to add credits to users
 * 
 * This script allows adding job credits to users in the database.
 * 
 * Usage:
 *   npx tsx scripts/add-credits-to-users.ts --credits 5
 *   npx tsx scripts/add-credits-to-users.ts --credits 5 --email user@example.com
 *   npx tsx scripts/add-credits-to-users.ts --credits 5 --userId 507f1f77bcf86cd799439011
 *   npx tsx scripts/add-credits-to-users.ts --credits 5 --plan free
 *   npx tsx scripts/add-credits-to-users.ts --credits 5 --all
 * 
 * Options:
 *   --credits <number>    Number of credits to add (required)
 *   --email <email>       Add credits to specific user by email
 *   --userId <id>         Add credits to specific user by ID
 *   --plan <planKey>      Add credits to all users with specific plan (free, day_pass, etc.)
 *   --all                 Add credits to all users (use with caution)
 *   --dry-run             Show what would be updated without making changes
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Import User model after environment is loaded
const User = require('../src/models/User').default;

interface ScriptOptions {
  credits: number;
  email?: string;
  userId?: string;
  plan?: string;
  all?: boolean;
  dryRun?: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): ScriptOptions {
  const args = process.argv.slice(2);
  const options: ScriptOptions = {
    credits: 0
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--credits':
        options.credits = parseInt(nextArg, 10);
        if (isNaN(options.credits) || options.credits <= 0) {
          console.error('❌ Error: --credits must be a positive number');
          process.exit(1);
        }
        i++;
        break;
      case '--email':
        options.email = nextArg;
        i++;
        break;
      case '--userId':
        options.userId = nextArg;
        i++;
        break;
      case '--plan':
        options.plan = nextArg;
        i++;
        break;
      case '--all':
        options.all = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--help':
      case '-h':
        console.log(`
Usage: npx tsx scripts/add-credits-to-users.ts [options]

Options:
  --credits <number>    Number of credits to add (required)
  --email <email>       Add credits to specific user by email
  --userId <id>         Add credits to specific user by ID
  --plan <planKey>      Add credits to all users with specific plan
  --all                 Add credits to all users (use with caution)
  --dry-run             Show what would be updated without making changes
  --help, -h            Show this help message

Examples:
  npx tsx scripts/add-credits-to-users.ts --credits 5 --email user@example.com
  npx tsx scripts/add-credits-to-users.ts --credits 10 --plan free
  npx tsx scripts/add-credits-to-users.ts --credits 3 --all --dry-run
        `);
        process.exit(0);
        break;
    }
  }

  if (options.credits === 0) {
    console.error('❌ Error: --credits is required');
    console.log('Use --help for usage information');
    process.exit(1);
  }

  // Validate that only one filter option is provided
  const filterCount = [options.email, options.userId, options.plan, options.all].filter(Boolean).length;
  if (filterCount === 0) {
    console.error('❌ Error: Must specify one of --email, --userId, --plan, or --all');
    console.log('Use --help for usage information');
    process.exit(1);
  }
  if (filterCount > 1) {
    console.error('❌ Error: Can only specify one filter option (--email, --userId, --plan, or --all)');
    process.exit(1);
  }

  return options;
}

/**
 * Add credits to users based on options
 */
async function addCreditsToUsers(options: ScriptOptions): Promise<void> {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ Error: MONGODB_URI not found in environment variables');
      process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Build query based on options
    let query: any = {};

    if (options.email) {
      query.email = options.email;
      console.log(`📧 Finding user by email: ${options.email}`);
    } else if (options.userId) {
      query._id = new mongoose.Types.ObjectId(options.userId);
      console.log(`🆔 Finding user by ID: ${options.userId}`);
    } else if (options.plan) {
      query.currentPlanKey = options.plan;
      console.log(`📦 Finding users with plan: ${options.plan}`);
    } else if (options.all) {
      console.log('🌍 Finding all users');
    }

    // Find users
    const users = await User.find(query);
    console.log(`\n📊 Found ${users.length} user(s)`);

    if (users.length === 0) {
      console.log('⚠️  No users found matching the criteria');
      await mongoose.disconnect();
      return;
    }

    // Show users that will be updated
    console.log('\n👥 Users to update:');
    users.forEach((user: any, index: number) => {
      const currentCredits = user.credits?.jobCredits ?? 0;
      const newCredits = currentCredits === -1 ? -1 : currentCredits + options.credits;
      console.log(`  ${index + 1}. ${user.email} (ID: ${user._id})`);
      console.log(`     Plan: ${user.currentPlanKey || 'free'}`);
      console.log(`     Current credits: ${currentCredits === -1 ? 'Unlimited' : currentCredits}`);
      console.log(`     New credits: ${newCredits === -1 ? 'Unlimited' : newCredits}`);
    });

    if (options.dryRun) {
      console.log('\n🔍 DRY RUN MODE - No changes will be made');
      await mongoose.disconnect();
      return;
    }

    // Confirm before proceeding
    console.log(`\n⚠️  About to add ${options.credits} credit(s) to ${users.length} user(s)`);
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Update users
    let updated = 0;
    let skipped = 0;

    for (const user of users) {
      const currentCredits = user.credits?.jobCredits ?? 0;
      
      // Skip users with unlimited credits (-1)
      if (currentCredits === -1) {
        console.log(`⏭️  Skipping ${user.email} - has unlimited credits`);
        skipped++;
        continue;
      }

      // Calculate new credits
      const newCredits = currentCredits + options.credits;

      // Update user
      await User.findByIdAndUpdate(user._id, {
        $set: {
          'credits.jobCredits': newCredits
        }
      });

      console.log(`✅ Updated ${user.email}: ${currentCredits} → ${newCredits} credits`);
      updated++;
    }

    console.log(`\n✅ Successfully updated ${updated} user(s)`);
    if (skipped > 0) {
      console.log(`⏭️  Skipped ${skipped} user(s) with unlimited credits`);
    }

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error adding credits:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
const options = parseArgs();
addCreditsToUsers(options)
  .then(() => {
    console.log('\n✨ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

