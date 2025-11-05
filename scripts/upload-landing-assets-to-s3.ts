#!/usr/bin/env ts-node

/**
 * Upload Landing Assets to S3
 * 
 * This script uploads landing page assets (hero banner, template images) to S3
 * for public access. Files are uploaded to:
 * - landing-assets/herobanner.png
 * - landing-assets/cv-templates/*.png
 * 
 * Usage:
 *   npx ts-node scripts/upload-landing-assets-to-s3.ts
 * 
 * Environment Variables Required:
 *   AWS_ACCESS_KEY_ID
 *   AWS_SECRET_ACCESS_KEY
 *   AWS_S3_BUCKET_NAME
 *   AWS_S3_REGION
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

interface UploadResult {
  filePath: string;
  s3Key: string;
  publicUrl: string;
  success: boolean;
  error?: string;
}

async function uploadToS3(
  filePath: string,
  s3Key: string,
  contentType: string
): Promise<UploadResult> {
  try {
    if (!fs.existsSync(filePath)) {
      return {
        filePath,
        s3Key,
        publicUrl: '',
        success: false,
        error: 'File not found',
      };
    }

    const fileContent = fs.readFileSync(filePath);

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: s3Key,
      Body: fileContent,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
      Metadata: {
        uploadedAt: new Date().toISOString(),
        type: 'landing-page-asset',
        originalPath: filePath,
      },
    });

    await s3Client.send(command);

    const publicUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${s3Key}`;

    console.log(`✅ Uploaded: ${path.basename(filePath)} → ${s3Key}`);
    console.log(`   Public URL: ${publicUrl}`);

    return {
      filePath,
      s3Key,
      publicUrl,
      success: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Failed to upload ${filePath}:`, errorMessage);
    return {
      filePath,
      s3Key,
      publicUrl: '',
      success: false,
      error: errorMessage,
    };
  }
}

async function main() {
  console.log('🚀 Starting landing assets upload to S3...\n');

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

  console.log(`📦 Bucket: ${process.env.AWS_S3_BUCKET_NAME}`);
  console.log(`🌍 Region: ${process.env.AWS_S3_REGION}\n`);

  const baseDir = process.cwd();
  const results: UploadResult[] = [];

  // Upload hero banner
  const heroBannerPath = path.join(baseDir, 'public', 'images', 'herobanner.png');
  if (fs.existsSync(heroBannerPath)) {
    const result = await uploadToS3(
      heroBannerPath,
      'landing-assets/herobanner.png',
      'image/png'
    );
    results.push(result);
  } else {
    console.log(`⚠️  Hero banner not found: ${heroBannerPath}`);
  }

  // Upload template images from CV templates directory (for landing page)
  const cvTemplatesDir = path.join(baseDir, 'public', 'CV templates');
  if (fs.existsSync(cvTemplatesDir)) {
    console.log(`\n📁 Uploading CV template images from: ${cvTemplatesDir}\n`);
    const files = fs.readdirSync(cvTemplatesDir);
    const imageFiles = files.filter(
      (file) =>
        file.endsWith('.png') ||
        file.endsWith('.jpeg') ||
        file.endsWith('.jpg') ||
        file.endsWith('.JPG')
    );

    for (const file of imageFiles) {
      const filePath = path.join(cvTemplatesDir, file);
      const contentType = file.endsWith('.png')
        ? 'image/png'
        : file.endsWith('.svg')
        ? 'image/svg+xml'
        : 'image/jpeg';
      // Use /templates/ prefix to match hardcoded template naming convention
      const s3Key = `landing-assets/templates/${file}`;

      const result = await uploadToS3(filePath, s3Key, contentType);
      results.push(result);
    }
  } else {
    console.log(`⚠️  CV Templates directory not found: ${cvTemplatesDir}`);
  }

  // Upload template images from templates directory (for hardcoded templates)
  const templatesDir = path.join(baseDir, 'public', 'templates');
  if (fs.existsSync(templatesDir)) {
    console.log(`\n📁 Uploading template images from: ${templatesDir}\n`);
    const files = fs.readdirSync(templatesDir);
    const imageFiles = files.filter(
      (file) =>
        file.endsWith('.png') ||
        file.endsWith('.jpeg') ||
        file.endsWith('.jpg') ||
        file.endsWith('.JPG')
    );

    for (const file of imageFiles) {
      const filePath = path.join(templatesDir, file);
      const contentType = file.endsWith('.png')
        ? 'image/png'
        : file.endsWith('.svg')
        ? 'image/svg+xml'
        : 'image/jpeg';
      // Use /templates/ prefix to match hardcoded template naming convention
      const s3Key = `landing-assets/templates/${file}`;

      const result = await uploadToS3(filePath, s3Key, contentType);
      results.push(result);
    }
  } else {
    console.log(`⚠️  Templates directory not found: ${templatesDir}`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Upload Summary');
  console.log('='.repeat(60));
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📁 Total: ${results.length}\n`);

  if (successful > 0) {
    console.log('📝 Public URLs:');
    results
      .filter((r) => r.success)
      .forEach((r) => {
        console.log(`   ${r.publicUrl}`);
      });
    console.log('\n💡 Add these URLs to your environment variables:');
    console.log(`   NEXT_PUBLIC_HERO_BANNER_S3_URL=${results.find((r) => r.s3Key === 'landing-assets/herobanner.png')?.publicUrl || ''}`);
    console.log(`   NEXT_PUBLIC_S3_BASE_URL=https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/landing-assets/templates`);
  }

  if (failed > 0) {
    console.log('\n❌ Failed uploads:');
    results
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`   ${r.filePath}: ${r.error}`);
      });
    process.exit(1);
  }

  console.log('\n✅ All assets uploaded successfully!');
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

