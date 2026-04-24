import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { getConnection } from '@/lib/database';
import CV from '@/models/CV';
import Template from '@/models/Template';
import { getTemplateById, getAllTemplates } from '@/lib/templates/template-utils';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getS3Client, getS3PublicUrl } from '@/lib/s3-client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Use getAuthenticatedUser to support both session and JWT tokens
    // request parameter is optional - getServerSession reads from cookies automatically
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      console.log('❌ Thumbnail API - Authentication failed');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('✅ Thumbnail API - Authentication successful:', { userId: authResult.userId, email: authResult.userEmail });

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
    
    if (templateIdStr) {
      const hardcodedTemplate = getTemplateById(templateIdStr);
      
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
          if (mongoose.Types.ObjectId.isValid(templateIdStr)) {
            template = await Template.findById(cv.templateId);
            if (template) {
              console.log('🔍 Thumbnail API - Using database template:', {
                id: template._id,
                name: template.name,
                hasGlobalStyles: !!template.globalStyles
              });
            }
          }
        } catch (error) {
          // If templateId is not a valid ObjectId, this will fail - that's OK, we'll use default
          console.log('🔍 Thumbnail API - Template ID is not a valid ObjectId, using default template...');
        }
      }
    }
    
    // If no template found, use default template
    if (!template) {
      console.log('⚠️ Thumbnail API - No templateId found, using default template');
      
      // Try to find Executive Professional as default (same as CV POST API)
      const templates = getAllTemplates();
      const executiveProfessional = templates.find(
        t => t.id === 'professional-extended-v2' || t.name === 'Professional Extended'
      );
      
      if (executiveProfessional) {
        template = executiveProfessional;
        console.log('✅ Thumbnail API - Using Professional Extended as default template');
      } else {
        // Fallback to any default template
        const hardcodedDefault = templates.find(
          t => t.isDefault === true && t.category === 'cv'
        );
        
        if (hardcodedDefault) {
          template = hardcodedDefault;
          console.log('✅ Thumbnail API - Using hardcoded default template:', hardcodedDefault.name);
        } else {
          // Fallback to first available template
          if (templates.length > 0) {
            template = templates[0];
            console.log('✅ Thumbnail API - Using first available template:', template.name);
          }
        }
      }
    }
    
    if (!template) {
      console.log('❌ Thumbnail API - No template available at all');
      return NextResponse.json({ success: false, error: 'No template available' }, { status: 500 });
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
  const cvData = cv.cvData || {};
  const templateStyles = template?.globalStyles || {};
  
  const width = 300;
  const padding = 15;
  const lineSpacing = 4;
  const sectionSpacing = 12;
  
  // Get CV data with better extraction
  const name = cvData.basics?.name || '';
  const title = cvData.basics?.label || cvData.basics?.title || '';
  const email = cvData.basics?.email || '';
  const phone = cvData.basics?.phone || '';
  const summary = cvData.basics?.summary || '';
  
  // Get work experience (first 2 items)
  const workItems = (cvData.work || []).slice(0, 2);
  
  // Get education (first 2 items)
  const educationItems = (cvData.education || []).slice(0, 2);
  
  // Get skills (first 10 items, better extraction)
  const skills = (cvData.skills || []).slice(0, 10).map((skill: any) => {
    if (typeof skill === 'string') return skill;
    return skill.name || skill.skill || '';
  }).filter(Boolean).join(', ') || '';
  
  // Get projects (first 1 item)
  const projects = (cvData.projects || []).slice(0, 1);
  
  // Template colors and styles
  const primaryColor = templateStyles.primaryColor || '#1e293b';
  const backgroundColor = templateStyles.backgroundColor || '#ffffff';
  const fontFamily = templateStyles.fontFamily || 'Arial, sans-serif';
  const accentColor = templateStyles.accentColor || primaryColor;
  
  // Calculate dynamic height based on content
  let currentY = padding + 20; // Start after top padding
  
  // Header section (name, title, contact)
  if (name) currentY += 18;
  if (title) currentY += 14;
  if (email || phone) currentY += 12;
  currentY += sectionSpacing;
  
  // Summary section
  if (summary) {
    const summaryLines = summary.length > 100 ? summary.substring(0, 100) + '...' : summary;
    const summaryLineCount = Math.ceil(summaryLines.length / 50);
    currentY += 16 + (summaryLineCount * 10) + sectionSpacing; // Section title + content
  }
  
  // Work Experience section
  if (workItems.length > 0) {
    currentY += 16 + lineSpacing; // Section title + line
    workItems.forEach(() => {
      currentY += 24; // Each work item takes ~24px
    });
    currentY += sectionSpacing;
  }
  
  // Education section
  if (educationItems.length > 0) {
    currentY += 16 + lineSpacing; // Section title + line
    educationItems.forEach(() => {
      currentY += 20; // Each education item takes ~20px
    });
    currentY += sectionSpacing;
  }
  
  // Projects section
  if (projects.length > 0) {
    currentY += 16 + lineSpacing; // Section title + line
    projects.forEach(() => {
      currentY += 20; // Each project takes ~20px
    });
    currentY += sectionSpacing;
  }
  
  // Skills section
  if (skills) {
    const skillLines = Math.ceil(skills.length / 45);
    currentY += 16 + (skillLines * 10); // Section title + content lines
  }
  
  // Add bottom padding
  const height = Math.max(350, currentY + padding); // Minimum 350px, but expand if needed
  
  // Build SVG content dynamically
  let yPos = padding + 20;
  const sections: string[] = [];
  
  // Header
  if (name) {
    sections.push(`<text x="${padding}" y="${yPos}" class="cv-text cv-title">${escapeXml(name)}</text>`);
    yPos += 18;
  }
  if (title) {
    sections.push(`<text x="${padding}" y="${yPos}" class="cv-text cv-subtitle">${escapeXml(title)}</text>`);
    yPos += 14;
  }
  if (email || phone) {
    const contact = [email, phone].filter(Boolean).join(' | ');
    sections.push(`<text x="${padding}" y="${yPos}" class="cv-text cv-small">${escapeXml(contact)}</text>`);
    yPos += 12;
  }
  yPos += sectionSpacing;
  
  // Summary
  if (summary) {
    const summaryText = summary.length > 100 ? summary.substring(0, 100) + '...' : summary;
    sections.push(`<text x="${padding}" y="${yPos}" class="cv-text cv-section">Summary</text>`);
    yPos += 16;
    sections.push(`<line x1="${padding}" y1="${yPos - 2}" x2="${width - padding}" y2="${yPos - 2}" stroke="${accentColor}" stroke-width="1"/>`);
    yPos += lineSpacing + 2;
    // Wrap summary text
    const words = summaryText.split(' ');
    let line = '';
    let lineY = yPos;
    words.forEach((word: string) => {
      if ((line + word).length > 50) {
        if (line) {
          sections.push(`<text x="${padding}" y="${lineY}" class="cv-text cv-body">${escapeXml(line.trim())}</text>`);
          lineY += 10;
        }
        line = word + ' ';
      } else {
        line += word + ' ';
      }
    });
    if (line) {
      sections.push(`<text x="${padding}" y="${lineY}" class="cv-text cv-body">${escapeXml(line.trim())}</text>`);
      lineY += 10;
    }
    yPos = lineY + sectionSpacing;
  }
  
  // Work Experience
  if (workItems.length > 0) {
    sections.push(`<text x="${padding}" y="${yPos}" class="cv-text cv-section">Work Experience</text>`);
    yPos += 16;
    sections.push(`<line x1="${padding}" y1="${yPos - 2}" x2="${width - padding}" y2="${yPos - 2}" stroke="${accentColor}" stroke-width="1"/>`);
    yPos += lineSpacing + 2;
    workItems.forEach((job: any) => {
      const position = job.position || job.title || '';
      const company = job.name || job.company || '';
      const dates = [job.startDate, job.endDate || 'Present'].filter(Boolean).join(' - ');
      if (position) {
        sections.push(`<text x="${padding}" y="${yPos}" class="cv-text cv-body">${escapeXml(position)}</text>`);
        yPos += 12;
      }
      if (company || dates) {
        sections.push(`<text x="${padding}" y="${yPos}" class="cv-text cv-small">${escapeXml(company)}${company && dates ? ' | ' : ''}${escapeXml(dates)}</text>`);
        yPos += 12;
      }
    });
    yPos += sectionSpacing;
  }
  
  // Education
  if (educationItems.length > 0) {
    sections.push(`<text x="${padding}" y="${yPos}" class="cv-text cv-section">Education</text>`);
    yPos += 16;
    sections.push(`<line x1="${padding}" y1="${yPos - 2}" x2="${width - padding}" y2="${yPos - 2}" stroke="${accentColor}" stroke-width="1"/>`);
    yPos += lineSpacing + 2;
    educationItems.forEach((edu: any) => {
      const institution = edu.institution || edu.school || '';
      const area = edu.area || edu.fieldOfStudy || edu.degree || '';
      const dates = [edu.startDate, edu.endDate || 'Present'].filter(Boolean).join(' - ');
      if (institution) {
        sections.push(`<text x="${padding}" y="${yPos}" class="cv-text cv-body">${escapeXml(institution)}</text>`);
        yPos += 12;
      }
      if (area || dates) {
        sections.push(`<text x="${padding}" y="${yPos}" class="cv-text cv-small">${escapeXml(area)}${area && dates ? ' | ' : ''}${escapeXml(dates)}</text>`);
        yPos += 12;
      }
    });
    yPos += sectionSpacing;
  }
  
  // Projects
  if (projects.length > 0) {
    sections.push(`<text x="${padding}" y="${yPos}" class="cv-text cv-section">Projects</text>`);
    yPos += 16;
    sections.push(`<line x1="${padding}" y1="${yPos - 2}" x2="${width - padding}" y2="${yPos - 2}" stroke="${accentColor}" stroke-width="1"/>`);
    yPos += lineSpacing + 2;
    projects.forEach((project: any) => {
      const projectName = project.name || '';
      const projectDesc = project.description || '';
      if (projectName) {
        sections.push(`<text x="${padding}" y="${yPos}" class="cv-text cv-body">${escapeXml(projectName)}</text>`);
        yPos += 12;
      }
      if (projectDesc) {
        const desc = projectDesc.length > 60 ? projectDesc.substring(0, 60) + '...' : projectDesc;
        sections.push(`<text x="${padding}" y="${yPos}" class="cv-text cv-small">${escapeXml(desc)}</text>`);
        yPos += 12;
      }
    });
    yPos += sectionSpacing;
  }
  
  // Skills
  if (skills) {
    sections.push(`<text x="${padding}" y="${yPos}" class="cv-text cv-section">Skills</text>`);
    yPos += 16;
    sections.push(`<line x1="${padding}" y1="${yPos - 2}" x2="${width - padding}" y2="${yPos - 2}" stroke="${accentColor}" stroke-width="1"/>`);
    yPos += lineSpacing + 2;
    // Wrap skills text
    const words = skills.split(', ');
    let line = '';
    let lineY = yPos;
    words.forEach((word: string) => {
      if ((line + word).length > 45) {
        if (line) {
          sections.push(`<text x="${padding}" y="${lineY}" class="cv-text cv-small">${escapeXml(line.trim())}</text>`);
          lineY += 10;
        }
        line = word + ', ';
      } else {
        line += word + ', ';
      }
    });
    if (line) {
      sections.push(`<text x="${padding}" y="${lineY}" class="cv-text cv-small">${escapeXml(line.trim().replace(/,\s*$/, ''))}</text>`);
    }
  }
  
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
      
      ${sections.join('\n      ')}
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
