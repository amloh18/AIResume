import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import CV from '@/models/CV';
import { authenticatedFetch } from '@/lib/utils/apiUtils';

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

    // Find the CV
    const cv = await CV.findOne({ _id: cvId, userId });
    if (!cv) {
      return NextResponse.json({ success: false, error: 'CV not found' }, { status: 404 });
    }

    // Check if thumbnail is recent (less than 24 hours old)
    const now = new Date();
    const thumbnailAge = cv.metadata.thumbnailGeneratedAt 
      ? now.getTime() - cv.metadata.thumbnailGeneratedAt.getTime()
      : Infinity;
    
    const isThumbnailRecent = thumbnailAge < 24 * 60 * 60 * 1000; // 24 hours

    if (cv.metadata.thumbnailUrl && isThumbnailRecent) {
      // Return existing thumbnail if it's recent
      return NextResponse.json({
        success: true,
        thumbnailUrl: cv.metadata.thumbnailUrl,
        cached: true
      });
    }

    // Generate new thumbnail
    const thumbnailUrl = await generateCVSnapshot(cv);

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
    console.error('Error generating CV snapshot:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate snapshot' },
      { status: 500 }
    );
  }
}

async function generateCVSnapshot(cv: any): Promise<string> {
  try {
    // For now, we'll generate a simple SVG-based thumbnail
    // This is a practical approach that doesn't require additional dependencies
    // In production, you might want to use Puppeteer or a similar tool for more accurate rendering

    const svgContent = generateCVThumbnailSVG(cv);
    
    // Convert SVG to data URL
    const svgDataUrl = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;
    
    // In a real implementation, you would:
    // 1. Convert SVG to PNG using a library like sharp
    // 2. Upload to cloud storage (AWS S3, Cloudinary, etc.)
    // 3. Return the public URL
    
    // For now, return the SVG data URL
    return svgDataUrl;

  } catch (error) {
    console.error('Error creating CV snapshot:', error);
    throw error;
  }
}

function generateCVThumbnailSVG(cv: any): string {
  const width = 300;
  const height = 400;
  
  // Determine status color
  const statusColor = cv.status === 'published' ? '#10b981' : 
                     cv.status === 'draft' ? '#f59e0b' : '#6b7280';
  
  // Get basic info
  const name = cv.cvData?.basics?.name || 'Your Name';
  const email = cv.cvData?.basics?.email || '';
  const phone = cv.cvData?.basics?.phone || '';
  
  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#f8fafc;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#e2e8f0;stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- Background -->
      <rect width="100%" height="100%" fill="url(#bg)" stroke="#e5e7eb" stroke-width="2"/>
      
      <!-- CV Title -->
      <text x="150" y="40" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#1e293b">
        ${cv.title}
      </text>
      
      <!-- Status Badge -->
      <rect x="100" y="55" width="100" height="20" rx="10" fill="${statusColor}" opacity="0.2"/>
      <text x="150" y="68" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="${statusColor}">
        ${cv.status.toUpperCase()}
      </text>
      
      <!-- Master Badge (if applicable) -->
      ${cv.metadata?.isMaster ? `
        <rect x="200" y="55" width="60" height="20" rx="10" fill="#84cc16" opacity="0.2"/>
        <text x="230" y="68" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#84cc16">
          MASTER
        </text>
      ` : ''}
      
      <!-- Name -->
      <text x="150" y="120" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#374151">
        ${name}
      </text>
      
      <!-- Contact Info -->
      ${email ? `
        <text x="150" y="145" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#6b7280">
          ${email}
        </text>
      ` : ''}
      
      ${phone ? `
        <text x="150" y="165" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#6b7280">
          ${phone}
        </text>
      ` : ''}
      
      <!-- Summary Preview -->
      ${cv.cvData?.basics?.summary ? `
        <text x="150" y="200" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#4b5563">
          ${cv.cvData.basics.summary.substring(0, 100)}${cv.cvData.basics.summary.length > 100 ? '...' : ''}
        </text>
      ` : ''}
      
      <!-- Work Experience Preview -->
      ${cv.cvData?.work && cv.cvData.work.length > 0 ? `
        <text x="20" y="250" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#374151">
          Experience
        </text>
        <text x="20" y="270" font-family="Arial, sans-serif" font-size="11" fill="#1f2937">
          ${cv.cvData.work[0].position || cv.cvData.work[0].title || 'Position'}
        </text>
        <text x="20" y="285" font-family="Arial, sans-serif" font-size="10" fill="#6b7280">
          ${cv.cvData.work[0].name || cv.cvData.work[0].company || 'Company'}
        </text>
      ` : ''}
      
      <!-- Education Preview -->
      ${cv.cvData?.education && cv.cvData.education.length > 0 ? `
        <text x="20" y="320" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#374151">
          Education
        </text>
        <text x="20" y="340" font-family="Arial, sans-serif" font-size="11" fill="#1f2937">
          ${cv.cvData.education[0].studyType || 'Degree'}
        </text>
        <text x="20" y="355" font-family="Arial, sans-serif" font-size="10" fill="#6b7280">
          ${cv.cvData.education[0].institution || 'Institution'}
        </text>
      ` : ''}
      
      <!-- Footer -->
      <text x="150" y="390" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" fill="#9ca3af">
        Modified: ${new Date(cv.metadata.lastModified).toLocaleDateString()}
      </text>
    </svg>
  `;
}

// Alternative implementation using Puppeteer (recommended for production)
async function generateCVSnapshotWithPuppeteer(cv: any): Promise<string> {
  // This would be the proper implementation:
  /*
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Set viewport to A4 size
  await page.setViewport({ width: 794, height: 1123 });
  
  // Render the CV preview component
  const html = await renderCVPreview(cv);
  await page.setContent(html);
  
  // Take screenshot
  const screenshot = await page.screenshot({
    type: 'png',
    fullPage: false,
    clip: { x: 0, y: 0, width: 794, height: 1123 }
  });
  
  await browser.close();
  
  // Upload to cloud storage and return URL
  const thumbnailUrl = await uploadToCloudStorage(screenshot);
  return thumbnailUrl;
  */
  
  throw new Error('Puppeteer implementation not available');
}
