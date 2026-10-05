/**
 * Script to delete users and their associated data
 * 
 * This script deletes all users except the specified ones to keep,
 * along with all their associated data (jobs, CVs, cover letters, journeys).
 * 
 * Usage:
 *   npx tsx scripts/cleanup-users.ts
 *   npx tsx scripts/cleanup-users.ts --dry-run
 * 
 * Options:
 *   --dry-run    Show what would be deleted without making changes
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Import models after environment is loaded
const { User, JobApplication, ApplicationJourney, CV, CoverLetter } = require('../src/models');

// Users to keep
const USERS_TO_KEEP = [
  'haywhyogs1@gmail.com',
  'testuser@cvcircle.io',
  'amlohsl@icloud.com',
  'ahopper300@gmail.com'
];

interface ScriptOptions {
  dryRun?: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): ScriptOptions {
  const args = process.argv.slice(2);
  const options: ScriptOptions = {};

  for (const arg of args) {
    switch (arg) {
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--help':
      case '-h':
        console.log(`
Usage: npx tsx scripts/cleanup-users.ts [options]

Options:
  --dry-run    Show what would be deleted without making changes
  --help, -h   Show this help message

This script will delete all users except:
  - haywhyogs1@gmail.com
  - testuser@cvcircle.io
  - amlohsl@icloud.com
  - ahopper300@gmail.com

All associated data (jobs, CVs, cover letters, journeys) will also be deleted.
        `);
        process.exit(0);
        break;
    }
  }

  return options;
}

/**
 * Delete users and their associated data
 */
async function cleanupUsers(options: ScriptOptions): Promise<void> {
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

    // Find users to keep
    const usersToKeep = await User.find({ email: { $in: USERS_TO_KEEP } });
    const keepUserIds = usersToKeep.map((u: any) => u._id.toString());
    const keepEmails = usersToKeep.map((u: any) => u.email);

    console.log('👥 Users to keep:');
    usersToKeep.forEach((user: any) => {
      console.log(`  - ${user.email} (ID: ${user._id})`);
    });
    console.log('');

    // Find users to delete
    const usersToDelete = await User.find({ 
      email: { $nin: USERS_TO_KEEP } 
    });

    console.log(`📊 Found ${usersToDelete.length} user(s) to delete\n`);

    if (usersToDelete.length === 0) {
      console.log('✅ No users to delete');
      await mongoose.disconnect();
      return;
    }

    // Show users that will be deleted
    console.log('👥 Users to delete:');
    usersToDelete.forEach((user: any, index: number) => {
      console.log(`  ${index + 1}. ${user.email} (ID: ${user._id})`);
    });
    console.log('');

    // Count associated data for each user
    let totalJobs = 0;
    let totalJourneys = 0;
    let totalCVs = 0;
    let totalCoverLetters = 0;

    for (const user of usersToDelete) {
      const userId = user._id.toString();
      
      const jobs = await JobApplication.find({ userId });
      const journeys = await ApplicationJourney.find({ userId });
      const cvs = await CV.find({ userId });
      const coverLetters = await CoverLetter.find({ userId });

      totalJobs += jobs.length;
      totalJourneys += journeys.length;
      totalCVs += cvs.length;
      totalCoverLetters += coverLetters.length;

      console.log(`📦 ${user.email}:`);
      console.log(`   - Jobs: ${jobs.length}`);
      console.log(`   - Journeys: ${journeys.length}`);
      console.log(`   - CVs: ${cvs.length}`);
      console.log(`   - Cover Letters: ${coverLetters.length}`);
    }

    console.log(`\n📊 Total to delete:`);
    console.log(`   - Users: ${usersToDelete.length}`);
    console.log(`   - Jobs: ${totalJobs}`);
    console.log(`   - Journeys: ${totalJourneys}`);
    console.log(`   - CVs: ${totalCVs}`);
    console.log(`   - Cover Letters: ${totalCoverLetters}`);

    if (options.dryRun) {
      console.log('\n🔍 DRY RUN MODE - No changes will be made');
      await mongoose.disconnect();
      return;
    }

    // Confirm before proceeding
    console.log(`\n⚠️  WARNING: About to delete ${usersToDelete.length} user(s) and all their associated data!`);
    console.log('Press Ctrl+C to cancel, or wait 10 seconds to continue...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Delete associated data and users
    let deletedJobs = 0;
    let deletedJourneys = 0;
    let deletedCVs = 0;
    let deletedCoverLetters = 0;
    let deletedUsers = 0;

    for (const user of usersToDelete) {
      const userId = user._id.toString();
      const userEmail = user.email;

      console.log(`\n🗑️  Deleting data for ${userEmail}...`);

      // Delete jobs
      const jobsResult = await JobApplication.deleteMany({ userId });
      deletedJobs += jobsResult.deletedCount;
      console.log(`   ✅ Deleted ${jobsResult.deletedCount} job(s)`);

      // Delete journeys
      const journeysResult = await ApplicationJourney.deleteMany({ userId });
      deletedJourneys += journeysResult.deletedCount;
      console.log(`   ✅ Deleted ${journeysResult.deletedCount} journey(s)`);

      // Delete CVs (including Master CVs)
      const cvsResult = await CV.deleteMany({ userId });
      deletedCVs += cvsResult.deletedCount;
      console.log(`   ✅ Deleted ${cvsResult.deletedCount} CV(s)`);

      // Delete cover letters
      const coverLettersResult = await CoverLetter.deleteMany({ userId });
      deletedCoverLetters += coverLettersResult.deletedCount;
      console.log(`   ✅ Deleted ${coverLettersResult.deletedCount} cover letter(s)`);

      // Delete user
      await User.findByIdAndDelete(userId);
      deletedUsers++;
      console.log(`   ✅ Deleted user: ${userEmail}`);
    }

    console.log(`\n✅ Cleanup completed:`);
    console.log(`   - Users deleted: ${deletedUsers}`);
    console.log(`   - Jobs deleted: ${deletedJobs}`);
    console.log(`   - Journeys deleted: ${deletedJourneys}`);
    console.log(`   - CVs deleted: ${deletedCVs}`);
    console.log(`   - Cover Letters deleted: ${deletedCoverLetters}`);

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
const options = parseArgs();
cleanupUsers(options)
  .then(() => {
    console.log('\n✨ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

