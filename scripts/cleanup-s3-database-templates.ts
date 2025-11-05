#!/usr/bin/env ts-node

/**
 * Cleanup S3 Database Template Thumbnails
 * 
 * This script removes database template thumbnails from S3 bucket.
 * Only hardcoded templates are kept (they use /templates/ path, not thumbnails/templates/)
 * 
 * Usage:
 *   npx tsx scripts/cleanup-s3-database-templates.ts
 *   npx tsx scripts/cleanup-s3-database-templates.ts --dry-run  # Preview what will be deleted
 */

import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Hardcoded template IDs (these should NOT be deleted)
const HARDCODED_TEMPLATE_IDS = [
  'data-driven-pro-template',
  'designer-modern-template',
  'elegant-timeline-template',
  'executive-professional-layout-template',
  'executive-standard-template',
  'executive-minimal-template',
  'header-professional-template',
  'minimal-professional-template',
  'one-pager-professional-template',
  'professional-minimal-template',
  'tech-pro-blue-template',
  'the-modern-cv-template'
];

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

interface CleanupResult {
  totalObjects: number;
  deletedObjects: number;
  failedDeletions: number;
  skippedObjects: number;
  deletedKeys: string[];
  failedKeys: string[];
}

async function listTemplateThumbnails(bucketName: string): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: 'thumbnails/templates/',
      ContinuationToken: continuationToken,
    });

    const response = await s3Client.send(command);
    
    if (response.Contents) {
      for (const object of response.Contents) {
        if (object.Key) {
          keys.push(object.Key);
        }
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return keys;
}

function isHardcodedTemplate(key: string): boolean {
  // Hardcoded templates use /templates/ path, not thumbnails/templates/
  // Database template thumbnails are in format: thumbnails/templates/{name}-{id}-{timestamp}.svg
  // We check if the key contains any hardcoded template ID
  const keyLower = key.toLowerCase();
  return HARDCODED_TEMPLATE_IDS.some(templateId => 
    keyLower.includes(templateId.toLowerCase())
  );
}

async function deleteObjects(bucketName: string, keys: string[], dryRun: boolean): Promise<CleanupResult> {
  const result: CleanupResult = {
    totalObjects: keys.length,
    deletedObjects: 0,
    failedDeletions: 0,
    skippedObjects: 0,
    deletedKeys: [],
    failedKeys: [],
  };

  if (keys.length === 0) {
    return result;
  }

  // Filter out hardcoded templates
  const keysToDelete = keys.filter(key => {
    if (isHardcodedTemplate(key)) {
      result.skippedObjects++;
      return false;
    }
    return true;
  });

  console.log(`\n📊 Cleanup Summary:`);
  console.log(`   Total objects found: ${result.totalObjects}`);
  console.log(`   Hardcoded templates (skipped): ${result.skippedObjects}`);
  console.log(`   Database templates to delete: ${keysToDelete.length}\n`);

  if (keysToDelete.length === 0) {
    console.log('✅ No database template thumbnails to delete.\n');
    return result;
  }

  if (dryRun) {
    console.log('🔍 DRY RUN - Would delete the following objects:\n');
    keysToDelete.forEach(key => {
      console.log(`   - ${key}`);
    });
    console.log(`\n💡 Run without --dry-run to actually delete these files.\n`);
    result.deletedObjects = keysToDelete.length;
    result.deletedKeys = keysToDelete;
    return result;
  }

  // Delete in batches of 1000 (S3 limit)
  const batchSize = 1000;
  for (let i = 0; i < keysToDelete.length; i += batchSize) {
    const batch = keysToDelete.slice(i, i + batchSize);
    
    const deleteCommand = new DeleteObjectsCommand({
      Bucket: bucketName,
      Delete: {
        Objects: batch.map(key => ({ Key: key })),
        Quiet: false,
      },
    });

    try {
      const response = await s3Client.send(deleteCommand);
      
      if (response.Deleted) {
        result.deletedObjects += response.Deleted.length;
        result.deletedKeys.push(...response.Deleted.map(obj => obj.Key || ''));
        console.log(`✅ Deleted ${response.Deleted.length} objects (batch ${Math.floor(i / batchSize) + 1})`);
      }
      
      if (response.Errors && response.Errors.length > 0) {
        result.failedDeletions += response.Errors.length;
        result.failedKeys.push(...response.Errors.map(err => err.Key || ''));
        console.error(`❌ Failed to delete ${response.Errors.length} objects:`);
        response.Errors.forEach(err => {
          console.error(`   - ${err.Key}: ${err.Message}`);
        });
      }
    } catch (error) {
      console.error(`❌ Error deleting batch:`, error);
      result.failedDeletions += batch.length;
      result.failedKeys.push(...batch);
    }
  }

  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('🧹 Starting S3 Database Template Cleanup...\n');
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No files will be deleted\n');
  }

  // Validate environment variables
  const requiredEnvVars = [
    'AWS_S3_BUCKET_NAME',
    'AWS_S3_REGION',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
  ];

  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach((varName) => console.error(`   - ${varName}`));
    process.exit(1);
  }

  const bucketName = process.env.AWS_S3_BUCKET_NAME!;
  const region = process.env.AWS_S3_REGION!;

  console.log(`📦 Bucket: ${bucketName}`);
  console.log(`🌍 Region: ${region}\n`);

  try {
    // List all template thumbnails
    console.log('📋 Listing template thumbnails in S3...');
    const keys = await listTemplateThumbnails(bucketName);
    console.log(`   Found ${keys.length} template thumbnail objects\n`);

    if (keys.length === 0) {
      console.log('✅ No template thumbnails found in S3.\n');
      return;
    }

    // Delete database template thumbnails
    const result = await deleteObjects(bucketName, keys, dryRun);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Cleanup Summary');
    console.log('='.repeat(60));
    console.log(`✅ Deleted: ${result.deletedObjects}`);
    console.log(`⏭️  Skipped (hardcoded): ${result.skippedObjects}`);
    console.log(`❌ Failed: ${result.failedDeletions}`);
    console.log(`📁 Total processed: ${result.totalObjects}\n`);

    if (result.failedDeletions > 0) {
      console.log('❌ Failed deletions:');
      result.failedKeys.forEach(key => {
        console.log(`   - ${key}`);
      });
      console.log('');
    }

    if (result.deletedObjects > 0 && !dryRun) {
      console.log('✅ Database template thumbnails cleaned up successfully!\n');
    } else if (dryRun && result.deletedObjects > 0) {
      console.log('💡 Run without --dry-run to actually delete these files.\n');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

