import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
import CV from '@/models/CV';
import Template from '@/models/Template';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: cvId } = await params;
    const userId = session.user.id;

    await connectDB();

    // Find the CV
    const cv = await CV.findOne({ _id: cvId, userId });
    if (!cv) {
      return NextResponse.json({ success: false, error: 'CV not found' }, { status: 404 });
    }

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

    // Get the template
    const template = await Template.findById(cv.templateId);
    if (!template) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }

    // Generate new thumbnail
    const thumbnailUrl = await generateCVThumbnail(cv, template);

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
    // For now, generate a simple SVG-based thumbnail
    // This is a practical approach that doesn't require additional dependencies
    // In production, you might want to use Puppeteer or a similar tool for more accurate rendering

    const svgContent = generateCVThumbnailSVG(cv, template);
    
    // Convert SVG to data URL
    const svgDataUrl = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;
    
    return svgDataUrl;

  } catch (error) {
    console.error('Error creating CV thumbnail:', error);
    throw error;
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
      <text x="${padding}" y="25" class="cv-text cv-title">${name}</text>
      <text x="${padding}" y="40" class="cv-text cv-subtitle">${title}</text>
      <text x="${padding}" y="55" class="cv-text cv-small">${email} | ${phone}</text>
      
      <!-- Work Experience -->
      ${workItems.length > 0 ? `
        <text x="${padding}" y="80" class="cv-text cv-section">Work Experience</text>
        <line x1="${padding}" y1="85" x2="${width - padding}" y2="85" stroke="${accentColor}" stroke-width="1"/>
        ${workItems.map((job: any, index: number) => `
          <text x="${padding}" y="${100 + index * 35}" class="cv-text cv-body">${job.position || 'Position'}</text>
          <text x="${padding}" y="${112 + index * 35}" class="cv-text cv-small">${job.company || 'Company'} | ${job.startDate || 'Start'} - ${job.endDate || 'End'}</text>
        `).join('')}
      ` : ''}
      
      <!-- Education -->
      ${educationItems.length > 0 ? `
        <text x="${padding}" y="${workItems.length > 0 ? 170 + workItems.length * 35 : 80}" class="cv-text cv-section">Education</text>
        <line x1="${padding}" y1="${workItems.length > 0 ? 175 + workItems.length * 35 : 85}" x2="${width - padding}" y2="${workItems.length > 0 ? 175 + workItems.length * 35 : 85}" stroke="${accentColor}" stroke-width="1"/>
        ${educationItems.map((edu: any, index: number) => `
          <text x="${padding}" y="${(workItems.length > 0 ? 190 : 100) + workItems.length * 35 + index * 25}" class="cv-text cv-body">${edu.institution || 'Institution'}</text>
          <text x="${padding}" y="${(workItems.length > 0 ? 202 : 112) + workItems.length * 35 + index * 25}" class="cv-text cv-small">${edu.area || 'Field of Study'} | ${edu.startDate || 'Start'} - ${edu.endDate || 'End'}</text>
        `).join('')}
      ` : ''}
      
      <!-- Skills -->
      ${skills ? `
        <text x="${padding}" y="${height - 30}" class="cv-text cv-section">Skills</text>
        <text x="${padding}" y="${height - 15}" class="cv-text cv-small">${skills}</text>
      ` : ''}
    </svg>
  `;
}
