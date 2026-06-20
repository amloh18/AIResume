/**
 * Migration Script: Migrate legacy template IDs to the new canvas template system
 * 
 * This script connects to the MongoDB database, finds all CV documents that use legacy template IDs
 * (V1, V2, or cover letter templates used as CV templates), and migrates them to the new canvas
 * template system IDs (e.g., 'tpl-1' to 'tpl-15') as defined in the editor.
 * 
 * Usage: npx tsx scripts/migrate-legacy-templates.ts
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Import CV model after environment is loaded
import CV from '../src/models/CV';

// Legacy mapping dictionary (from template-utils.ts)
const legacyMap: Record<string, string> = {
  // V1 legacy templates
  'data-driven-pro-template': 'tpl-2',
  'designer-modern-template': 'tpl-7',
  'elegant-timeline-template': 'tpl-14',
  'executive-professional-layout-template': 'tpl-3',
  'executive-standard-template': 'tpl-6',
  'tech-pro-blue-template': 'tpl-8',
  'the-modern-cv-template': 'tpl-2',
  'executive-minimal-template': 'tpl-1',
  'header-professional-template': 'tpl-6',
  'minimal-professional-template': 'tpl-1',
  'one-pager-professional-template': 'tpl-1',
  'professional-minimal-template': 'tpl-1',
  'professional-extended-template': 'tpl-3',

  // V2 legacy templates
  'professional-extended-v2': 'tpl-3',
  'modern-minimal-v2': 'tpl-1',
  'two-column-sidebar-v2': 'tpl-2',
  'creative-bold-v2': 'tpl-9',
  'academic-cv-v2': 'tpl-14',

  // Cover letter templates incorrectly used as CV templates
  'zurich-minimalist': 'tpl-1',
  'oxford-traditional': 'tpl-6',
  'london-corporate': 'tpl-3',
  'paris-creative': 'tpl-9',
  'silicon-valley-tech': 'tpl-8',
  
  // Fallbacks
  'default': 'tpl-1',
  'generic': 'tpl-1'
};

function migrateLegacyTemplateId(templateId: string | null | undefined): string {
  if (!templateId) return 'tpl-1';

  const templateIdStr = String(templateId).trim();
  if (templateIdStr.startsWith('tpl-')) {
    return templateIdStr;
  }

  return legacyMap[templateIdStr] || 'tpl-1';
}

async function migrateLegacyTemplates() {
  try {
    console.log('🚀 Starting Legacy Template Migration...\n');

    // Connect to database
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database\n');

    // Get total count of CVs
    const totalCVs = await CV.countDocuments();
    console.log(`📊 Total CVs in database: ${totalCVs}`);

    // Fetch all CVs to inspect their templateId
    console.log('🔍 Fetching all CV documents...');
    const cvs = await CV.find({}).select('_id title templateId userId').lean();
    
    const legacyCVsToMigrate: Array<{ _id: any; title: string; oldTemplateId: string; newTemplateId: string; userId: any }> = [];

    for (const cv of cvs) {
      const templateIdStr = cv.templateId ? cv.templateId.toString() : '';
      
      // If it doesn't start with 'tpl-' and is not a valid ObjectId, it's a legacy template ID
      if (templateIdStr && !templateIdStr.startsWith('tpl-') && !mongoose.Types.ObjectId.isValid(templateIdStr)) {
        const newTemplateId = migrateLegacyTemplateId(templateIdStr);
        legacyCVsToMigrate.push({
          _id: cv._id,
          title: cv.title,
          oldTemplateId: templateIdStr,
          newTemplateId,
          userId: cv.userId
        });
      }
    }

    console.log(`📋 Found ${legacyCVsToMigrate.length} CVs with legacy template IDs needing migration.\n`);

    if (legacyCVsToMigrate.length === 0) {
      console.log('✅ No CVs with legacy template IDs found. Database is fully up-to-date!');
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log('🔄 Executing migration updates...');
    let migratedCount = 0;
    
    for (const item of legacyCVsToMigrate) {
      console.log(`  👉 Migrating CV: "${item.title}" (${item._id})`);
      console.log(`     Template: "${item.oldTemplateId}" ➔ "${item.newTemplateId}"`);
      
      const result = await CV.updateOne(
        { _id: item._id },
        { 
          $set: { 
            templateId: item.newTemplateId,
            // Clear or update templateName/templateData if they are outdated so the new system reloads them
            templateName: undefined,
            templateData: undefined
          }
        }
      );
      
      if (result.modifiedCount > 0) {
        migratedCount++;
      } else {
        console.log(`     ⚠️ Failed to update database record for CV: ${item._id}`);
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log('═══════════════════════════════════════');
    console.log(`Total CVs checked:           ${totalCVs}`);
    console.log(`Legacy CVs identified:       ${legacyCVsToMigrate.length}`);
    console.log(`Successfully migrated:       ${migratedCount}`);
    console.log('═══════════════════════════════════════\n');

    console.log('✅ Migration completed successfully!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    try {
      await mongoose.disconnect();
    } catch (_) {}
    process.exit(1);
  }
}

// Run the migration
migrateLegacyTemplates();
