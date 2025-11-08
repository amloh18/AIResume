import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { getConnection } from '@/lib/database';
import CV from '@/models/CV';
import Template from '@/models/Template';
import { HARDCODED_TEMPLATES } from '@/lib/templates/hardcoded-templates';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getS3Client, getS3PublicUrl } from '@/lib/s3-client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Use getAuthenticatedUser to support both session and JWT tokens
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      console.log('❌ Thumbnail API - Authentication failed');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: cvId } = await params;
    const userId = authResult.userId;

    console.log('🔍 Thumbnail API - Generating thumbnail for CV:', { cvId, userId });

    await getConnection();

    // Find the CV
    const cv = await CV.findOne({ _id: cvId, userId });
    if (!cv) {
      console.log('🔍 Thumbnail API - CV not found:', { cvId, userId });
      return NextResponse.json({ success: false, error: 'CV not found' }, { status: 404 });
    }

    console.log('🔍 Thumbnail API - CV found:', {
      id: cv._id,
      title: cv.title,
      hasCvData: !!cv.cvData,
      hasTemplateId: !!cv.templateId,
      isMaster: cv.metadata?.isMaster || cv.isMaster,
      cvDataKeys: cv.cvData ? Object.keys(cv.cvData) : 'No cvData'
    });

    // Check if thumbnail is recent (less than 7 days old)
    const now = new Date();
    const thumbnailAge = cv.metadata.thumbnailGeneratedAt 
      ? now.getTime() - cv.metadata.thumbnailGeneratedAt.getTime()
      : Infinity;
    
    const isThumbnailRecent = thumbnailAge < 7 * 24 * 60 * 60 * 1000; // 7 days

    if (cv.metadata.thumbnailUrl && isThumbnailRecent) {
      // Return existing thumbnail if it's recent
      return NextResponse.json({
        success: true,
        thumbnailUrl: cv.metadata.thumbnailUrl,
        cached: true
      });
    }

    // Get the template - handle both hardcoded and database templates
    let template: any = null;
    
    // Check hardcoded templates first
    const templateIdStr = cv.templateId?.toString() || '';
    const hardcodedTemplate = HARDCODED_TEMPLATES.find(t => 
      t.id === templateIdStr || t._id === templateIdStr
    );
    
    if (hardcodedTemplate) {
      template = hardcodedTemplate;
      console.log('🔍 Thumbnail API - Using hardcoded template:', {
        id: template.id || template._id,
        name: template.name,
        hasGlobalStyles: !!template.globalStyles
      });
    } else {
      // Try database template (only if templateId looks like an ObjectId)
      try {
        template = await Template.findById(cv.templateId);
        if (template) {
          console.log('🔍 Thumbnail API - Using database template:', {
            id: template._id,
            name: template.name,
            hasGlobalStyles: !!template.globalStyles
          });
        }
      } catch (error) {
        // If templateId is not a valid ObjectId, this will fail - that's OK, we'll check hardcoded templates
        console.log('🔍 Thumbnail API - Template ID is not a valid ObjectId, checking hardcoded templates...');
      }
    }
    
    if (!template) {
      console.log('❌ Thumbnail API - Template not found:', { templateId: cv.templateId });
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }

    // Generate new thumbnail
    console.log('🔍 Thumbnail API - Generating thumbnail...');
    const thumbnailUrl = await generateCVThumbnail(cv, template);
    console.log('🔍 Thumbnail API - Thumbnail generated:', thumbnailUrl ? 'Success' : 'Failed');

    // Update CV with new thumbnail
    await CV.findByIdAndUpdate(cvId, {
      'metadata.thumbnailUrl': thumbnailUrl,
      'metadata.thumbnailGeneratedAt': now
    });

    return NextResponse.json({
      success: true,
      thumbnailUrl,
      cached: false
    });

  } catch (error) {
    console.error('Error generating CV thumbnail:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate thumbnail' },
      { status: 500 }
    );
  }
}

async function generateCVThumbnail(cv: any, template: any): Promise<string> {
  try {
    // Generate SVG-based thumbnail
    const svgContent = generateCVThumbnailSVG(cv, template);
    
    // Get S3 client
    const s3Client = getS3Client();

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

    // Return public URL using centralized utility
    return getS3PublicUrl(s3Key);

  } catch (error) {
    console.error('Error creating CV thumbnail:', error);
    // Fallback to data URL if S3 upload fails
    const svgContent = generateCVThumbnailSVG(cv, template);
    const svgDataUrl = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;
    return svgDataUrl;
  }
}

function generateCVThumbnailSVG(cv: any, template: any): string {
  const cvData = cv.cvData;
  const templateStyles = template.globalStyles || {};
  
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
  const skills = cvData.skills?.slice(0, 8).map((skill: any) => skill.name || skill).join(', ') || '';
  
  // Template colors and styles
  const primaryColor = templateStyles.primaryColor || '#333';
  const backgroundColor = templateStyles.backgroundColor || '#fff';
  const fontFamily = templateStyles.fontFamily || 'Arial, sans-serif';
  const fontSize = templateStyles.fontSize || '14px';
  const lineHeight = templateStyles.lineHeight || '1.4';
  
  // Extract template accent color if available
  const accentColor = templateStyles.accentColor || primaryColor;
  
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
      <text x="${padding}" y="25" class="cv-text cv-title">${escapeXml(name)}</text>
      <text x="${padding}" y="40" class="cv-text cv-subtitle">${escapeXml(title)}</text>
      <text x="${padding}" y="55" class="cv-text cv-small">${escapeXml(email)} | ${escapeXml(phone)}</text>
      
      <!-- Work Experience -->
      ${workItems.length > 0 ? `
        <text x="${padding}" y="80" class="cv-text cv-section">Work Experience</text>
        <line x1="${padding}" y1="85" x2="${width - padding}" y2="85" stroke="${accentColor}" stroke-width="1"/>
        ${workItems.map((job: any, index: number) => `
          <text x="${padding}" y="${100 + index * 35}" class="cv-text cv-body">${escapeXml(job.position || 'Position')}</text>
          <text x="${padding}" y="${112 + index * 35}" class="cv-text cv-small">${escapeXml(job.name || job.company || 'Company')} | ${escapeXml(job.startDate || 'Start')} - ${escapeXml(job.endDate || 'End')}</text>
        `).join('')}
      ` : ''}
      
      <!-- Education -->
      ${educationItems.length > 0 ? `
        <text x="${padding}" y="${workItems.length > 0 ? 170 + workItems.length * 35 : 80}" class="cv-text cv-section">Education</text>
        <line x1="${padding}" y1="${workItems.length > 0 ? 175 + workItems.length * 35 : 85}" x2="${width - padding}" y2="${workItems.length > 0 ? 175 + workItems.length * 35 : 85}" stroke="${accentColor}" stroke-width="1"/>
        ${educationItems.map((edu: any, index: number) => `
          <text x="${padding}" y="${(workItems.length > 0 ? 190 : 100) + workItems.length * 35 + index * 25}" class="cv-text cv-body">${escapeXml(edu.institution || 'Institution')}</text>
          <text x="${padding}" y="${(workItems.length > 0 ? 202 : 112) + workItems.length * 35 + index * 25}" class="cv-text cv-small">${escapeXml(edu.area || 'Field of Study')} | ${escapeXml(edu.startDate || 'Start')} - ${escapeXml(edu.endDate || 'End')}</text>
        `).join('')}
      ` : ''}
      
      <!-- Skills -->
      ${skills ? `
        <text x="${padding}" y="${height - 30}" class="cv-text cv-section">Skills</text>
        <text x="${padding}" y="${height - 15}" class="cv-text cv-small">${escapeXml(skills)}</text>
      ` : ''}
    </svg>
  `;
}

function escapeXml(text: string): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
