import dotenv from 'dotenv';
import { resolve } from 'path';
import mongoose from 'mongoose';
import { JobApplication } from '../src/models';

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function fixMissingSourceField() {
  try {
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

    // Find all jobs without a source field
    const jobsWithoutSource = await JobApplication.find({
      $or: [
        { source: { $exists: false } },
        { source: null },
        { source: '' }
      ]
    });

    console.log(`🔍 Found ${jobsWithoutSource.length} jobs without source field`);

    if (jobsWithoutSource.length === 0) {
      console.log('✅ No jobs need updating');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Update jobs based on tags or other indicators
    let updated = 0;
    for (const job of jobsWithoutSource) {
      let source = 'manual'; // Default
      
      // Check if job has extension-saved tag
      if (job.tags && job.tags.includes('extension-saved')) {
        source = 'extension';
      } else if (job.jobUrl) {
        // Try to determine source from URL
        if (job.jobUrl.includes('linkedin.com')) {
          source = 'linkedin';
        } else if (job.jobUrl.includes('indeed.com')) {
          source = 'indeed';
        } else {
          source = 'extension'; // If it has a jobUrl, likely from extension
        }
      }
      
      await JobApplication.findByIdAndUpdate(job._id, {
        $set: { source }
      });
      
      updated++;
      console.log(`✅ Updated job ${job._id}: ${job.jobTitle} at ${job.company} -> source: ${source}`);
    }

    console.log(`\n✅ Updated ${updated} jobs with source field`);

    // Close database connection
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing source field:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

fixMissingSourceField();

