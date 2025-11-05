#!/usr/bin/env ts-node

/**
 * Generate Thumbnails for All CVs
 * 
 * This script generates and saves thumbnails for all CVs in the database.
 * It processes CVs that have cvData and templateId, and uploads thumbnails to S3.
 * 
 * Usage:
 *   npx tsx scripts/generate-all-cv-thumbnails.ts
 *   npx tsx scripts/generate-all-cv-thumbnails.ts --force  # Regenerate even if recent thumbnail exists
 *   npx tsx scripts/generate-all-cv-thumbnails.ts --limit 10  # Only process first 10 CVs
 * 
 * Environment Variables Required:
 *   MONGODB_URI
 *   AWS_ACCESS_KEY_ID
 *   AWS_SECRET_ACCESS_KEY
 *   AWS_S3_BUCKET_NAME
 *   AWS_S3_REGION
 */

import mongoose from 'mongoose';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Hardcoded templates with their globalStyles for thumbnail generation
const HARDCODED_TEMPLATES: any[] = [
  {
    id: 'data-driven-pro-template',
    name: 'Data Driven Pro',
    globalStyles: {
      fontFamily: 'Inter, sans-serif',
      primaryColor: '#1E40AF',
      secondaryColor: '#374151',
      backgroundColor: '#ffffff',
      fontSize: '14px',
      lineHeight: '1.4',
      accentColor: '#1E40AF'
    }
  },
  {
    id: 'designer-modern-template',
    name: 'Designer Modern',
    globalStyles: {
      fontFamily: 'Helvetica Neue, sans-serif',
      primaryColor: '#000000',
      secondaryColor: '#666666',
      backgroundColor: '#ffffff',
      fontSize: '14px',
      lineHeight: '1.6',
      accentColor: '#000000'
    }
  },
  {
    id: 'elegant-timeline-template',
    name: 'Elegant Timeline',
    globalStyles: {
      fontFamily: 'Playfair Display, serif',
      primaryColor: '#1F2937',
      secondaryColor: '#6B7280',
      backgroundColor: '#ffffff',
      fontSize: '14px',
      lineHeight: '1.5',
      accentColor: '#1F2937'
    }
  },
  {
    id: 'executive-professional-layout-template',
    name: 'Executive Professional',
    globalStyles: {
      fontFamily: 'Montserrat, Arial, sans-serif',
      primaryColor: '#000000',
      secondaryColor: '#666666',
      backgroundColor: '#ffffff',
      fontSize: '14px',
      lineHeight: '1.5',
      accentColor: '#000000'
    }
  },
  {
    id: 'executive-standard-template',
    name: 'Executive Standard',
    globalStyles: {
      fontFamily: 'Calibri, sans-serif',
      primaryColor: '#1E3A8A',
      secondaryColor: '#334155',
      backgroundColor: '#ffffff',
      fontSize: '14px',
      lineHeight: '1.3',
      accentColor: '#1E3A8A'
    }
  },
  {
    id: 'tech-pro-blue-template',
    name: 'Tech Pro Blue',
    globalStyles: {
      fontFamily: 'Inter, sans-serif',
      primaryColor: '#2563EB',
      secondaryColor: '#374151',
      backgroundColor: '#ffffff',
      fontSize: '14px',
      lineHeight: '1.4',
      accentColor: '#2563EB'
    }
  },
  {
    id: 'the-modern-cv-template',
    name: 'The Modern CV',
    globalStyles: {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
      primaryColor: '#111827',
      secondaryColor: '#374151',
      backgroundColor: '#ffffff',
      fontSize: '14px',
      lineHeight: '1.5',
      accentColor: '#111827'
    }
  },
  {
    id: 'executive-minimal-template',
    name: 'Executive Minimal',
    globalStyles: {
      fontFamily: 'Calibri, Arial, sans-serif',
      primaryColor: '#000000',
      secondaryColor: '#374151',
      backgroundColor: '#ffffff',
      fontSize: '14px',
      lineHeight: '1.3',
      accentColor: '#000000'
    }
  },
  {
    id: 'header-professional-template',
    name: 'Header Professional',
    globalStyles: {
      fontFamily: 'Arial, sans-serif',
      primaryColor: '#1E3A8A',
      secondaryColor: '#374151',
      backgroundColor: '#ffffff',
      fontSize: '14px',
      lineHeight: '1.4',
      accentColor: '#1E3A8A'
    }
  },
  {
    id: 'minimal-professional-template',
    name: 'Minimal Professional',
    globalStyles: {
      fontFamily: 'Helvetica Neue, sans-serif',
      primaryColor: '#000000',
      secondaryColor: '#666666',
      backgroundColor: '#ffffff',
      fontSize: '14px',
      lineHeight: '1.5',
      accentColor: '#000000'
    }
  },
  {
    id: 'one-pager-professional-template',
    name: 'One Pager Professional',
    globalStyles: {
      fontFamily: 'Calibri, Arial, sans-serif',
      primaryColor: '#1E40AF',
      secondaryColor: '#374151',
      backgroundColor: '#ffffff',
      fontSize: '12px',
      lineHeight: '1.3',
      accentColor: '#1E40AF'
    }
  },
  {
    id: 'professional-minimal-template',
    name: 'Professional Minimal',
    globalStyles: {
      fontFamily: 'Inter, sans-serif',
      primaryColor: '#111827',
      secondaryColor: '#6B7280',
      backgroundColor: '#ffffff',
      fontSize: '14px',
      lineHeight: '1.5',
      accentColor: '#111827'
    }
  }
];

// Load environment variables
dotenv.config({ path: '.env.local' });

// Import models
const CVSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  title: String,
  cvData: mongoose.Schema.Types.Mixed,
  templateId: mongoose.Schema.Types.ObjectId,
  metadata: {
    thumbnailUrl: String,
    thumbnailGeneratedAt: Date,
    isMaster: mongoose.Schema.Types.Mixed
  },
  isMaster: Boolean,
  status: String,
  createdAt: Date,
  updatedAt: Date
}, { strict: false });

const TemplateSchema = new mongoose.Schema({
  name: String,
  globalStyles: mongoose.Schema.Types.Mixed,
  availableSections: [String]
}, { strict: false });

const CV = mongoose.models.CV || mongoose.model('CV', CVSchema);
const Template = mongoose.models.Template || mongoose.model('Template', TemplateSchema);

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

interface ProcessResult {
  cvId: string;
  title: string;
  userId: string;
  success: boolean;
  thumbnailUrl?: string;
  error?: string;
  skipped?: boolean;
  reason?: string;
}

function generateCVThumbnailSVG(cv: any, template: any): string {
  const cvData = cv.cvData || {};
  const templateStyles = template?.globalStyles || {};
  
  const width = 300;
  const height = 400;
  const padding = 15;
  
  // Get CV data
  const name = cvData.basics?.name || 'Your Name';
  const title = cvData.basics?.label || 'Professional Title';
  const email = cvData.basics?.email || 'email@example.com';
  const phone = cvData.basics?.phone || 'Phone';
  
  // Get work experience (first 2 items)
  const workItems = cvData.work?.slice(0, 2) || [];
  
  // Get education (first 2 items)
  const educationItems = cvData.education?.slice(0, 2) || [];
  
  // Get skills (first 8 items)
  const skills = cvData.skills?.slice(0, 8).map((skill: any) => {
    if (typeof skill === 'string') return skill;
    return skill.name || skill.skill || '';
  }).filter(Boolean).join(', ') || '';
  
  // Template colors and styles
  const primaryColor = templateStyles.primaryColor || '#333';
  const backgroundColor = templateStyles.backgroundColor || '#fff';
  const fontFamily = templateStyles.fontFamily || 'Arial, sans-serif';
  const fontSize = templateStyles.fontSize || '14px';
  const lineHeight = templateStyles.lineHeight || '1.4';
  
  // Extract template accent color if available
  const accentColor = templateStyles.accentColor || primaryColor;
  
  // Escape HTML entities
  const escapeHtml = (text: string) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };
  
  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          .cv-text { font-family: ${fontFamily}; }
          .cv-title { font-size: 16px; font-weight: bold; fill: ${primaryColor}; }
          .cv-subtitle { font-size: 12px; fill: #666; }
          .cv-body { font-size: 10px; fill: ${primaryColor}; }
          .cv-small { font-size: 8px; fill: #666; }
          .cv-section { font-size: 12px; font-weight: bold; fill: ${accentColor}; }
        </style>
      </defs>
      
      <!-- Background -->
      <rect width="${width}" height="${height}" fill="${backgroundColor}" stroke="#e5e7eb" stroke-width="1"/>
      
      <!-- Header -->
      <text x="${padding}" y="25" class="cv-text cv-title">${escapeHtml(name)}</text>
      <text x="${padding}" y="40" class="cv-text cv-subtitle">${escapeHtml(title)}</text>
      <text x="${padding}" y="55" class="cv-text cv-small">${escapeHtml(email)} | ${escapeHtml(phone)}</text>
      
      <!-- Work Experience -->
      ${workItems.length > 0 ? `
        <text x="${padding}" y="80" class="cv-text cv-section">Work Experience</text>
        <line x1="${padding}" y1="85" x2="${width - padding}" y2="85" stroke="${accentColor}" stroke-width="1"/>
        ${workItems.map((job: any, index: number) => `
          <text x="${padding}" y="${100 + index * 35}" class="cv-text cv-body">${escapeHtml(job.position || job.title || 'Position')}</text>
          <text x="${padding}" y="${112 + index * 35}" class="cv-text cv-small">${escapeHtml(job.name || job.company || 'Company')} | ${escapeHtml(job.startDate || 'Start')} - ${escapeHtml(job.endDate || 'End')}</text>
        `).join('')}
      ` : ''}
      
      <!-- Education -->
      ${educationItems.length > 0 ? `
        <text x="${padding}" y="${workItems.length > 0 ? 170 + workItems.length * 35 : 80}" class="cv-text cv-section">Education</text>
        <line x1="${padding}" y1="${workItems.length > 0 ? 175 + workItems.length * 35 : 85}" x2="${width - padding}" y2="${workItems.length > 0 ? 175 + workItems.length * 35 : 85}" stroke="${accentColor}" stroke-width="1"/>
        ${educationItems.map((edu: any, index: number) => `
          <text x="${padding}" y="${(workItems.length > 0 ? 190 : 100) + workItems.length * 35 + index * 25}" class="cv-text cv-body">${escapeHtml(edu.institution || 'Institution')}</text>
          <text x="${padding}" y="${(workItems.length > 0 ? 202 : 112) + workItems.length * 35 + index * 25}" class="cv-text cv-small">${escapeHtml(edu.area || 'Field of Study')} | ${escapeHtml(edu.startDate || 'Start')} - ${escapeHtml(edu.endDate || 'End')}</text>
        `).join('')}
      ` : ''}
      
      <!-- Skills -->
      ${skills ? `
        <text x="${padding}" y="${height - 30}" class="cv-text cv-section">Skills</text>
        <text x="${padding}" y="${height - 15}" class="cv-text cv-small">${escapeHtml(skills)}</text>
      ` : ''}
    </svg>
  `;
}

async function generateCVThumbnail(cv: any, template: any): Promise<string> {
  try {
    // Generate SVG-based thumbnail
    const svgContent = generateCVThumbnailSVG(cv, template);
    
    // Create S3 key for thumbnail
    const userId = cv.userId?.toString() || 'unknown';
    const cvId = cv._id?.toString() || 'unknown';
    const timestamp = Date.now();
    const s3Key = `thumbnails/${userId}/${cvId}-${timestamp}.svg`;

    // Upload SVG to S3
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: s3Key,
      ContentType: 'image/svg+xml',
      Body: Buffer.from(svgContent),
      Metadata: {
        cvId: cvId,
        userId: userId,
        generatedAt: new Date().toISOString(),
      },
    });

    await s3Client.send(command);

    // Return public URL
    const publicUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${s3Key}`;
    
    return publicUrl;

  } catch (error) {
    console.error('Error creating CV thumbnail:', error);
    throw error;
  }
}

async function processCV(cv: any, template: any, force: boolean = false): Promise<ProcessResult> {
  const cvId = cv._id.toString();
  const title = cv.title || 'Untitled CV';
  const userId = cv.userId?.toString() || 'unknown';

  try {
    // Check if thumbnail is recent (less than 7 days old)
    const now = new Date();
    const thumbnailAge = cv.metadata?.thumbnailGeneratedAt 
      ? now.getTime() - new Date(cv.metadata.thumbnailGeneratedAt).getTime()
      : Infinity;
    
    const isThumbnailRecent = thumbnailAge < 7 * 24 * 60 * 60 * 1000; // 7 days

    if (!force && cv.metadata?.thumbnailUrl && isThumbnailRecent) {
      return {
        cvId,
        title,
        userId,
        success: true,
        thumbnailUrl: cv.metadata.thumbnailUrl,
        skipped: true,
        reason: 'Recent thumbnail exists'
      };
    }

    // Generate new thumbnail
    const thumbnailUrl = await generateCVThumbnail(cv, template);

    // Update CV with new thumbnail
    await CV.findByIdAndUpdate(cvId, {
      $set: {
        'metadata.thumbnailUrl': thumbnailUrl,
        'metadata.thumbnailGeneratedAt': now
      }
    });

    return {
      cvId,
      title,
      userId,
      success: true,
      thumbnailUrl
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      cvId,
      title,
      userId,
      success: false,
      error: errorMessage
    };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;

  console.log('🚀 Starting thumbnail generation for all CVs...\n');

  // Validate environment variables
  const requiredEnvVars = [
    'MONGODB_URI',
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
  console.log(`🌍 Region: ${process.env.AWS_S3_REGION}`);
  console.log(`🔄 Force regenerate: ${force ? 'Yes' : 'No'}`);
  if (limit) {
    console.log(`📊 Limit: ${limit} CVs`);
  }
  console.log('');

  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB\n');

    // Find all CVs that have cvData and templateId
    let query = CV.find({
      cvData: { $exists: true, $ne: null },
      templateId: { $exists: true, $ne: null }
    });

    if (limit) {
      query = query.limit(limit);
    }

    const cvs = await query.lean();
    console.log(`📊 Found ${cvs.length} CVs to process\n`);

    if (cvs.length === 0) {
      console.log('ℹ️  No CVs found with cvData and templateId');
      await mongoose.disconnect();
      return;
    }

    const results: ProcessResult[] = [];
    let processed = 0;

    // Process CVs in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < cvs.length; i += batchSize) {
      const batch = cvs.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (cv: any) => {
        try {
          const templateId = cv.templateId?.toString() || '';
          
          // Check if it's a hardcoded template first
          let template: any = null;
          
          if (HARDCODED_TEMPLATES.length > 0) {
            const hardcodedTemplate = HARDCODED_TEMPLATES.find(
              t => t.id === templateId || t._id === templateId
            );
            
            if (hardcodedTemplate) {
              // For hardcoded templates, we need to get the actual template data
              // Try to load from the actual file or use a default template structure
              template = {
                _id: hardcodedTemplate.id,
                name: hardcodedTemplate.name,
                globalStyles: hardcodedTemplate.globalStyles || {
                  primaryColor: '#333',
                  backgroundColor: '#fff',
                  fontFamily: 'Arial, sans-serif',
                  fontSize: '14px',
                  lineHeight: '1.4',
                  accentColor: '#333'
                },
                availableSections: hardcodedTemplate.availableSections || []
              };
            }
          }
          
          // If not found in hardcoded templates, try database
          if (!template && mongoose.Types.ObjectId.isValid(templateId)) {
            template = await Template.findById(cv.templateId).lean();
          }
          
          if (!template) {
            results.push({
              cvId: cv._id.toString(),
              title: cv.title || 'Untitled CV',
              userId: cv.userId?.toString() || 'unknown',
              success: false,
              error: 'Template not found',
              skipped: true,
              reason: 'Template not found'
            });
            return;
          }

          const result = await processCV(cv, template, force);
          results.push(result);
          processed++;

          if (result.success && !result.skipped) {
            console.log(`✅ [${processed}/${cvs.length}] Generated thumbnail for: ${result.title} (${result.cvId})`);
          } else if (result.skipped) {
            console.log(`⏭️  [${processed}/${cvs.length}] Skipped: ${result.title} - ${result.reason}`);
          } else {
            console.log(`❌ [${processed}/${cvs.length}] Failed: ${result.title} - ${result.error}`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.push({
            cvId: cv._id.toString(),
            title: cv.title || 'Untitled CV',
            userId: cv.userId?.toString() || 'unknown',
            success: false,
            error: errorMessage
          });
          processed++;
          console.log(`❌ [${processed}/${cvs.length}] Error processing CV: ${errorMessage}`);
        }
      }));

      // Small delay between batches
      if (i + batchSize < cvs.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Processing Summary');
    console.log('='.repeat(60));
    const successful = results.filter((r) => r.success && !r.skipped).length;
    const skipped = results.filter((r) => r.skipped).length;
    const failed = results.filter((r) => !r.success && !r.skipped).length;

    console.log(`✅ Successfully generated: ${successful}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📁 Total processed: ${results.length}\n`);

    if (failed > 0) {
      console.log('❌ Failed CVs:');
      results
        .filter((r) => !r.success && !r.skipped)
        .forEach((r) => {
          console.log(`   - ${r.title} (${r.cvId}): ${r.error}`);
        });
      console.log('');
    }

    if (successful > 0) {
      console.log('✅ All thumbnails generated and saved successfully!');
    }

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

