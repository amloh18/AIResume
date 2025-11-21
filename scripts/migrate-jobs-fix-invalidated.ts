/**
 * Migration script to fix jobs invalidated by new job details system
 * 
 * This script fixes:
 * 1. Normalizes userId to ObjectId format for consistent querying
 * 2. Ensures required fields are present (status, priority, sponsorship, source)
 * 3. Fixes invalid enum values
 * 4. Cleans up invalid dates (deadline, applicationDate)
 * 5. Ensures salary structure is valid
 * 6. Sets default deadline if missing (15 days from creation)
 * 7. Cleans up invalid jobUrl values
 * 8. Ensures tags is an array
 * 9. Ensures contactDetails structure is valid
 * 
 * Usage: Run this script manually via Node.js
 *   npx ts-node scripts/migrate-jobs-fix-invalidated.ts
 * 
 * Or with tsx:
 *   npx tsx scripts/migrate-jobs-fix-invalidated.ts
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import mongoose from 'mongoose';
import { JobApplication, User } from '../src/models';

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const VALID_STATUSES = ['draft', 'created', 'applied', 'screening', 'interview', 'offer', 'rejected', 'accepted', 'withdrawn'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];
const VALID_SPONSORSHIPS = ['yes', 'no', 'unknown'];
const VALID_SOURCES = ['extension', 'manual', 'import', 'linkedin', 'indeed', 'company-website', 'referral', 'other'];
const VALID_SALARY_PERIODS = ['hourly', 'monthly', 'yearly'];

interface MigrationStats {
  totalJobs: number;
  fixedUserId: number;
  fixedStatus: number;
  fixedPriority: number;
  fixedSponsorship: number;
  fixedSource: number;
  fixedDeadline: number;
  fixedApplicationDate: number;
  fixedSalary: number;
  fixedJobUrl: number;
  fixedTags: number;
  fixedContactDetails: number;
  skippedInvalid: number;
  errors: number;
}

async function migrateJobs() {
  const stats: MigrationStats = {
    totalJobs: 0,
    fixedUserId: 0,
    fixedStatus: 0,
    fixedPriority: 0,
    fixedSponsorship: 0,
    fixedSource: 0,
    fixedDeadline: 0,
    fixedApplicationDate: 0,
    fixedSalary: 0,
    fixedJobUrl: 0,
    fixedTags: 0,
    fixedContactDetails: 0,
    skippedInvalid: 0,
    errors: 0
  };

  try {
    console.log('🔍 Migration Script - Starting job migration...');
    console.log('🔍 Connecting to database...');
    
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI environment variable is not set');
      process.exit(1);
    }
    
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
      console.log('✅ Connected to database');
    } else {
      console.log('✅ Already connected to database');
    }

    // Get all jobs
    const allJobs = await JobApplication.find({}).lean();
    stats.totalJobs = allJobs.length;
    console.log(`🔍 Found ${stats.totalJobs} jobs to process`);

    if (stats.totalJobs === 0) {
      console.log('✅ No jobs to migrate');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Process each job
    for (let i = 0; i < allJobs.length; i++) {
      const job = allJobs[i];
      const updateData: any = {};
      let needsUpdate = false;

      try {
        // 1. Normalize userId to ObjectId
        if (job.userId) {
          let normalizedUserId: mongoose.Types.ObjectId | string = job.userId;
          
          if (typeof job.userId === 'string') {
            if (mongoose.Types.ObjectId.isValid(job.userId)) {
              normalizedUserId = new mongoose.Types.ObjectId(job.userId);
              // Only update if it's different from current
              if (job.userId !== normalizedUserId.toString()) {
                updateData.userId = normalizedUserId;
                needsUpdate = true;
                stats.fixedUserId++;
              }
            } else {
              // Try to find user by authProviderId or email
              const user = await User.findOne({
                $or: [
                  { authProviderId: job.userId },
                  { email: job.userId }
                ]
              }).lean();
              
              if (user && user._id) {
                normalizedUserId = user._id as mongoose.Types.ObjectId;
                updateData.userId = normalizedUserId;
                needsUpdate = true;
                stats.fixedUserId++;
              } else {
                console.warn(`⚠️  Job ${job._id}: Could not resolve userId ${job.userId}, skipping...`);
                stats.skippedInvalid++;
                continue;
              }
            }
          } else if (job.userId instanceof mongoose.Types.ObjectId) {
            // Already an ObjectId, no change needed
            normalizedUserId = job.userId;
          }
        } else {
          console.warn(`⚠️  Job ${job._id}: Missing userId, skipping...`);
          stats.skippedInvalid++;
          continue;
        }

        // 2. Fix status
        if (!job.status || !VALID_STATUSES.includes(job.status)) {
          updateData.status = 'created'; // Default status
          needsUpdate = true;
          stats.fixedStatus++;
        }

        // 3. Fix priority
        if (!job.priority || !VALID_PRIORITIES.includes(job.priority)) {
          updateData.priority = 'medium'; // Default priority
          needsUpdate = true;
          stats.fixedPriority++;
        }

        // 4. Fix sponsorship
        if (!job.sponsorship || !VALID_SPONSORSHIPS.includes(job.sponsorship)) {
          updateData.sponsorship = 'unknown'; // Default sponsorship
          needsUpdate = true;
          stats.fixedSponsorship++;
        }

        // 5. Fix source
        if (!job.source || !VALID_SOURCES.includes(job.source)) {
          let source = 'manual'; // Default
          
          // Try to determine from tags or jobUrl
          if (job.tags && Array.isArray(job.tags) && job.tags.includes('extension-saved')) {
            source = 'extension';
          } else if (job.jobUrl) {
            if (job.jobUrl.includes('linkedin.com')) {
              source = 'linkedin';
            } else if (job.jobUrl.includes('indeed.com')) {
              source = 'indeed';
            } else if (job.jobUrl.includes('company-website') || job.jobUrl.match(/^https?:\/\/[^/]+\.(com|org|net|io)/)) {
              source = 'company-website';
            } else {
              source = 'extension'; // If it has a jobUrl, likely from extension
            }
          }
          
          updateData.source = source;
          needsUpdate = true;
          stats.fixedSource++;
        }

        // 6. Fix deadline - set default to 15 days from creation if missing
        if (!job.deadline) {
          const createdAt = job.createdAt ? new Date(job.createdAt) : new Date();
          const defaultDeadline = new Date(createdAt);
          defaultDeadline.setDate(defaultDeadline.getDate() + 15);
          updateData.deadline = defaultDeadline;
          needsUpdate = true;
          stats.fixedDeadline++;
        } else {
          // Validate deadline date
          const deadlineDate = new Date(job.deadline);
          if (isNaN(deadlineDate.getTime())) {
            const createdAt = job.createdAt ? new Date(job.createdAt) : new Date();
            const defaultDeadline = new Date(createdAt);
            defaultDeadline.setDate(defaultDeadline.getDate() + 15);
            updateData.deadline = defaultDeadline;
            needsUpdate = true;
            stats.fixedDeadline++;
          }
        }

        // 7. Fix applicationDate - validate or remove if invalid
        if (job.applicationDate) {
          const appDate = new Date(job.applicationDate);
          if (isNaN(appDate.getTime())) {
            // Invalid date, remove it
            if (!updateData.$unset) {
              updateData.$unset = {};
            }
            updateData.$unset.applicationDate = '';
            needsUpdate = true;
            stats.fixedApplicationDate++;
          }
        }

        // 8. Fix salary structure
        if (job.salary) {
          const salary: any = {};
          let salaryNeedsFix = false;

          if (job.salary.min !== undefined && typeof job.salary.min === 'number' && job.salary.min >= 0) {
            salary.min = job.salary.min;
          }
          if (job.salary.max !== undefined && typeof job.salary.max === 'number' && job.salary.max >= 0) {
            salary.max = job.salary.max;
          }
          if (job.salary.currency && typeof job.salary.currency === 'string') {
            salary.currency = job.salary.currency;
          } else {
            salary.currency = 'USD'; // Default currency
            salaryNeedsFix = true;
          }
          if (job.salary.period && VALID_SALARY_PERIODS.includes(job.salary.period)) {
            salary.period = job.salary.period;
          } else {
            salary.period = 'yearly'; // Default period
            salaryNeedsFix = true;
          }

          if (salaryNeedsFix || Object.keys(salary).length !== Object.keys(job.salary || {}).length) {
            updateData.salary = salary;
            needsUpdate = true;
            stats.fixedSalary++;
          }
        }

        // 9. Fix jobUrl - validate or remove if invalid
        if (job.jobUrl) {
          try {
            new URL(job.jobUrl);
            // Valid URL, keep it
          } catch {
            // Invalid URL, remove it
            updateData.jobUrl = undefined;
            needsUpdate = true;
            stats.fixedJobUrl++;
          }
        }

        // 10. Fix tags - ensure it's an array
        if (!Array.isArray(job.tags)) {
          updateData.tags = [];
          needsUpdate = true;
          stats.fixedTags++;
        } else {
          // Clean up tags - remove empty strings and null values
          const cleanedTags = job.tags.filter(tag => tag && typeof tag === 'string' && tag.trim().length > 0);
          if (cleanedTags.length !== job.tags.length) {
            updateData.tags = cleanedTags;
            needsUpdate = true;
            stats.fixedTags++;
          }
        }

        // 11. Fix contactDetails structure
        if (job.contactDetails) {
          const contactDetails: any = {};
          let contactNeedsFix = false;

          if (job.contactDetails.name !== undefined) {
            contactDetails.name = typeof job.contactDetails.name === 'string' ? job.contactDetails.name.trim() : '';
          }
          if (job.contactDetails.email !== undefined) {
            contactDetails.email = typeof job.contactDetails.email === 'string' ? job.contactDetails.email.trim() : '';
          }
          if (job.contactDetails.phone !== undefined) {
            contactDetails.phone = typeof job.contactDetails.phone === 'string' ? job.contactDetails.phone.trim() : '';
          }
          if (job.contactDetails.role !== undefined) {
            contactDetails.role = typeof job.contactDetails.role === 'string' ? job.contactDetails.role.trim() : '';
          }

          // Check if structure needs fixing
          const originalKeys = Object.keys(job.contactDetails || {});
          const newKeys = Object.keys(contactDetails);
          if (originalKeys.length !== newKeys.length || 
              originalKeys.some(key => job.contactDetails?.[key] !== contactDetails[key])) {
            contactNeedsFix = true;
          }

          if (contactNeedsFix) {
            updateData.contactDetails = contactDetails;
            needsUpdate = true;
            stats.fixedContactDetails++;
          }
        }

        // Apply updates if needed
        if (needsUpdate) {
          // Handle $unset separately if present
          if (updateData.$unset) {
            await JobApplication.findByIdAndUpdate(job._id, {
              $set: { ...updateData },
              $unset: updateData.$unset
            });
            delete updateData.$unset;
          } else {
            await JobApplication.findByIdAndUpdate(job._id, {
              $set: updateData
            });
          }

          if ((i + 1) % 100 === 0) {
            console.log(`✅ Processed ${i + 1}/${stats.totalJobs} jobs...`);
          }
        }

      } catch (error) {
        console.error(`❌ Error processing job ${job._id}:`, error);
        stats.errors++;
      }
    }

    console.log('\n✅ Migration completed!');
    console.log('📊 Migration Statistics:');
    console.log(`   Total jobs processed: ${stats.totalJobs}`);
    console.log(`   Fixed userId: ${stats.fixedUserId}`);
    console.log(`   Fixed status: ${stats.fixedStatus}`);
    console.log(`   Fixed priority: ${stats.fixedPriority}`);
    console.log(`   Fixed sponsorship: ${stats.fixedSponsorship}`);
    console.log(`   Fixed source: ${stats.fixedSource}`);
    console.log(`   Fixed deadline: ${stats.fixedDeadline}`);
    console.log(`   Fixed applicationDate: ${stats.fixedApplicationDate}`);
    console.log(`   Fixed salary: ${stats.fixedSalary}`);
    console.log(`   Fixed jobUrl: ${stats.fixedJobUrl}`);
    console.log(`   Fixed tags: ${stats.fixedTags}`);
    console.log(`   Fixed contactDetails: ${stats.fixedContactDetails}`);
    console.log(`   Skipped invalid: ${stats.skippedInvalid}`);
    console.log(`   Errors: ${stats.errors}`);

    // Close database connection
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration Script - Fatal error:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  migrateJobs();
}

export { migrateJobs };

