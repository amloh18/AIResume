/**
 * Migration script to convert old cover letters to new format
 * 
 * Old format: Single `content` field with everything
 * New format: Separate `header`, `body`, and `footer` fields
 * 
 * This script:
 * 1. Extracts header, body, and footer from existing content
 * 2. Updates cover letters with the new structure
 * 3. Preserves the original content for backward compatibility
 * 
 * Run with: npx tsx scripts/migrate-cover-letters-to-new-format.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { resolve } from 'path';
import { extractHeaderFromContent, extractBodyFromContent, extractFooterFromContent } from '../src/lib/utils/coverLetterUtils';

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
    throw new Error('MONGODB_URI not found in environment variables. Please set it in .env.local');
  }
  
  await mongoose.connect(MONGODB_URI);
  return mongoose.connection;
}

// Import CoverLetter model after connection
let CoverLetter: any;

async function migrateCoverLetters() {
  try {
    console.log('🔄 Starting cover letter migration...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database');

    // Dynamically import CoverLetter model after connection
    const CoverLetterModule = await import('../src/models/CoverLetter');
    CoverLetter = CoverLetterModule.default;

    // Find all cover letters that don't have header/body/footer set
    const coverLettersToMigrate = await CoverLetter.find({
      $or: [
        { header: { $exists: false } },
        { body: { $exists: false } },
        { footer: { $exists: false } },
        { header: null },
        { body: null },
        { footer: null }
      ],
      content: { $exists: true, $ne: '' }
    });

    console.log(`📊 Found ${coverLettersToMigrate.length} cover letters to migrate`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const coverLetter of coverLettersToMigrate) {
      try {
        // Skip if already has all three fields
        if (coverLetter.header && coverLetter.body && coverLetter.footer) {
          skipped++;
          continue;
        }

        const content = coverLetter.content || '';
        
        // Extract header, body, and footer from content
        let header = coverLetter.header;
        let body = coverLetter.body;
        let footer = coverLetter.footer;

        if (!header) {
          header = extractHeaderFromContent(content);
        }

        if (!body) {
          body = extractBodyFromContent(content);
        }

        if (!footer) {
          footer = extractFooterFromContent(content);
        }

        // If extraction didn't work well, try to preserve original content in body
        if (!body || body.trim().length < 50) {
          // If body is too short, use the original content as body
          // This handles edge cases where extraction might fail
          const lines = content.split('\n');
          // Remove first 6 lines (likely header) and last 10 lines (likely footer)
          const bodyLines = lines.slice(6, Math.max(6, lines.length - 10));
          body = bodyLines.join('\n').trim() || content;
        }

        // Update the cover letter
        await CoverLetter.findByIdAndUpdate(
          coverLetter._id,
          {
            $set: {
              header: header || undefined,
              body: body || undefined,
              footer: footer || undefined
            }
          },
          { new: true }
        );

        migrated++;
        
        if (migrated % 100 === 0) {
          console.log(`⏳ Migrated ${migrated} cover letters...`);
        }
      } catch (error) {
        console.error(`❌ Error migrating cover letter ${coverLetter._id}:`, error);
        errors++;
      }
    }

    console.log('\n✅ Migration completed!');
    console.log(`📈 Statistics:`);
    console.log(`   - Migrated: ${migrated}`);
    console.log(`   - Skipped: ${skipped}`);
    console.log(`   - Errors: ${errors}`);
    console.log(`   - Total processed: ${migrated + skipped + errors}`);

    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run migration
migrateCoverLetters();

