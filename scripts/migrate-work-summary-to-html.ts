/**
 * Migration script to fix work experience summary fields
 * 
 * This script converts plain text work.summary fields to HTML format
 * to fix the display issue where summaries saved as plain text don't show
 * in the WYSIWYG editor.
 * 
 * Usage: Run this script manually via Node.js
 *   npx tsx scripts/migrate-work-summary-to-html.ts
 * 
 * Or import and call from another script:
 *   import { migrateWorkSummariesToHTML } from './scripts/migrate-work-summary-to-html';
 *   await migrateWorkSummariesToHTML();
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Import models after environment is loaded
const { CV } = require('../src/models');

/**
 * Convert plain text to HTML format (matching WYSIWYG editor behavior)
 */
function convertPlainTextToHTML(text: string): string {
  if (!text || !text.trim()) return '';
  
  // If it already has HTML tags, return as is
  if (/<[^>]+>/.test(text)) {
    return text;
  }
  
  // Convert plain text to HTML paragraphs, preserving line breaks
  const paragraphs = text
    .split(/\n\n+/) // Split by double newlines for paragraphs
    .map(para => para.trim())
    .filter(para => para);
  
  if (paragraphs.length > 0) {
    return paragraphs
      .map(para => {
        // Split by single newlines for line breaks within paragraphs
        const lines = para.split(/\n/).filter(line => line.trim());
        return lines.map(line => `<p>${line.trim()}</p>`).join('');
      })
      .join('');
  }
  
  // If no paragraphs, just convert newlines to <br>
  return text.replace(/\n/g, '<br>');
}

/**
 * Check if a string is plain text (no HTML tags)
 */
function isPlainText(text: string): boolean {
  if (!text || !text.trim()) return false;
  return !/<[^>]+>/.test(text);
}

async function migrateWorkSummariesToHTML() {
  try {
    console.log('🔄 Migration Script - Starting work summary migration...');
    
    // Connect directly to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Migration Script - Database connected');
    
    // Find all CVs
    const cvs = await CV.find({}).lean();
    console.log(`🔍 Migration Script - Found ${cvs.length} CVs to check`);
    
    let totalUpdated = 0;
    let totalWorkItems = 0;
    let totalSummariesFixed = 0;
    
    for (const cv of cvs) {
      if (!cv.cvData || !cv.cvData.work || !Array.isArray(cv.cvData.work)) {
        continue;
      }
      
      let cvUpdated = false;
      const workItems = cv.cvData.work;
      totalWorkItems += workItems.length;
      
      // Check each work experience item
      for (let i = 0; i < workItems.length; i++) {
        const workItem = workItems[i];
        if (workItem && workItem.summary && typeof workItem.summary === 'string') {
          const summary = workItem.summary.trim();
          
          // Only convert if it's plain text (no HTML tags)
          if (summary && isPlainText(summary)) {
            const htmlSummary = convertPlainTextToHTML(summary);
            
            // Update the work item
            workItems[i] = {
              ...workItem,
              summary: htmlSummary
            };
            
            cvUpdated = true;
            totalSummariesFixed++;
            
            console.log(`  ✅ Fixed work item ${i} in CV ${cv._id}: "${summary.substring(0, 50)}..."`);
          }
        }
      }
      
      // Save the CV if it was updated
      if (cvUpdated) {
        try {
          await CV.updateOne(
            { _id: cv._id },
            { 
              $set: { 
                'cvData.work': workItems,
                'metadata.lastModified': new Date()
              } 
            }
          );
          totalUpdated++;
          console.log(`✅ Migration Script - Updated CV: ${cv._id}`);
        } catch (error) {
          console.error(`❌ Migration Script - Error updating CV ${cv._id}:`, error);
        }
      }
    }
    
    console.log('\n✅ Migration Script - Migration completed:');
    console.log(`   - Total CVs checked: ${cvs.length}`);
    console.log(`   - Total work items checked: ${totalWorkItems}`);
    console.log(`   - Total summaries fixed: ${totalSummariesFixed}`);
    console.log(`   - Total CVs updated: ${totalUpdated}`);
    
    return {
      success: true,
      totalCVs: cvs.length,
      totalWorkItems,
      totalSummariesFixed,
      totalUpdated
    };
    
  } catch (error) {
    console.error('❌ Migration Script - Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  } finally {
    await mongoose.connection.close();
    console.log('🔍 Migration Script - Database connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  migrateWorkSummariesToHTML()
    .then((result) => {
      console.log('\n✅ Migration Script - Result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Migration Script - Fatal error:', error);
      process.exit(1);
    });
}

export { migrateWorkSummariesToHTML };

