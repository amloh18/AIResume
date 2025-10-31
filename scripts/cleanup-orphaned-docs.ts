/**
 * One-time cleanup script to remove orphaned documents
 * 
 * This script finds CVs and Cover Letters that:
 * 1. Are not Master CVs
 * 2. Do not have a matching journeyId in any ApplicationJourney record
 * 
 * Usage: Run this script manually via Node.js
 *   node -r ts-node/register scripts/cleanup-orphaned-docs.ts
 * 
 * Or import and call from another script:
 *   import { cleanupOrphanedDocuments } from './scripts/cleanup-orphaned-docs';
 *   await cleanupOrphanedDocuments();
 */

import mongoose from 'mongoose';
import connectDB from '../src/lib/database';
import { CV, CoverLetter, ApplicationJourney } from '../src/models';

async function cleanupOrphanedDocuments() {
  try {
    console.log('🔍 Cleanup Script - Starting orphaned document cleanup...');
    
    await connectDB();
    
    // Get all journeys to build a set of referenced document IDs
    const journeys = await ApplicationJourney.find({}).lean();
    const referencedCVIds = new Set<string>();
    const referencedCoverLetterIds = new Set<string>();
    
    journeys.forEach(journey => {
      if (journey.cvId) {
        referencedCVIds.add(journey.cvId.toString());
      }
      if (journey.coverLetterId) {
        referencedCoverLetterIds.add(journey.coverLetterId.toString());
      }
    });
    
    console.log(`🔍 Cleanup Script - Found ${referencedCVIds.size} referenced CVs and ${referencedCoverLetterIds.size} referenced cover letters`);
    
    // Find orphaned CVs
    const allCVs = await CV.find({
      $or: [
        { isMaster: { $ne: true } },
        { 'metadata.isMaster': { $ne: true } },
        { 'metadata.isMaster': { $ne: 'true' } }
      ]
    }).lean();
    
    const orphanedCVs: string[] = [];
    for (const cv of allCVs) {
      const cvId = cv._id.toString();
      const isMaster = cv.isMaster === true || 
                       cv.metadata?.isMaster === true || 
                       cv.metadata?.isMaster === 'true';
      
      if (!isMaster && !referencedCVIds.has(cvId)) {
        orphanedCVs.push(cvId);
      }
    }
    
    console.log(`🔍 Cleanup Script - Found ${orphanedCVs.length} orphaned CVs`);
    
    // Find orphaned Cover Letters
    const allCoverLetters = await CoverLetter.find({}).lean();
    const orphanedCoverLetters: string[] = [];
    
    for (const cl of allCoverLetters) {
      const clId = cl._id.toString();
      if (!referencedCoverLetterIds.has(clId)) {
        orphanedCoverLetters.push(clId);
      }
    }
    
    console.log(`🔍 Cleanup Script - Found ${orphanedCoverLetters.length} orphaned cover letters`);
    
    // Delete orphaned CVs
    let deletedCVs = 0;
    for (const cvId of orphanedCVs) {
      try {
        await CV.findByIdAndDelete(cvId);
        deletedCVs++;
        console.log(`✅ Cleanup Script - Deleted orphaned CV: ${cvId}`);
      } catch (error) {
        console.error(`❌ Cleanup Script - Error deleting CV ${cvId}:`, error);
      }
    }
    
    // Delete orphaned Cover Letters
    let deletedCoverLetters = 0;
    for (const clId of orphanedCoverLetters) {
      try {
        await CoverLetter.findByIdAndDelete(clId);
        deletedCoverLetters++;
        console.log(`✅ Cleanup Script - Deleted orphaned cover letter: ${clId}`);
      } catch (error) {
        console.error(`❌ Cleanup Script - Error deleting cover letter ${clId}:`, error);
      }
    }
    
    console.log(`✅ Cleanup Script - Cleanup completed:`);
    console.log(`   - Deleted ${deletedCVs} orphaned CVs`);
    console.log(`   - Deleted ${deletedCoverLetters} orphaned cover letters`);
    
    return {
      success: true,
      deletedCVs,
      deletedCoverLetters,
      orphanedCVs: orphanedCVs.length,
      orphanedCoverLetters: orphanedCoverLetters.length
    };
    
  } catch (error) {
    console.error('❌ Cleanup Script - Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  } finally {
    await mongoose.connection.close();
    console.log('🔍 Cleanup Script - Database connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  cleanupOrphanedDocuments()
    .then((result) => {
      console.log('✅ Cleanup Script - Result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Cleanup Script - Fatal error:', error);
      process.exit(1);
    });
}

export { cleanupOrphanedDocuments };

