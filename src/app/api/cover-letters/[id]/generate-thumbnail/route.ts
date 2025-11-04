import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import CoverLetter from '@/models/CoverLetter';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: coverLetterId } = await params;
    const userId = session.user.id;

    console.log('🔍 Cover Letter Thumbnail API - Generating thumbnail for cover letter:', { coverLetterId, userId });

    await getConnection();

    // Find the cover letter
    const coverLetter = await CoverLetter.findOne({ _id: coverLetterId, userId });
    if (!coverLetter) {
      console.log('🔍 Cover Letter Thumbnail API - Cover letter not found:', { coverLetterId, userId });
      return NextResponse.json({ success: false, error: 'Cover letter not found' }, { status: 404 });
    }

    // Check if thumbnail is recent (less than 7 days old)
    const now = new Date();
    const thumbnailAge = coverLetter.metadata?.thumbnailGeneratedAt 
      ? now.getTime() - new Date(coverLetter.metadata.thumbnailGeneratedAt).getTime()
      : Infinity;
    
    const isThumbnailRecent = thumbnailAge < 7 * 24 * 60 * 60 * 1000; // 7 days

    if (coverLetter.metadata?.thumbnailUrl && isThumbnailRecent) {
      // Return existing thumbnail if it's recent
      return NextResponse.json({
        success: true,
        thumbnailUrl: coverLetter.metadata.thumbnailUrl,
        cached: true
      });
    }

    // Generate new thumbnail
    console.log('🔍 Cover Letter Thumbnail API - Generating thumbnail...');
    const thumbnailUrl = await generateCoverLetterThumbnail(coverLetter, userId);
    console.log('🔍 Cover Letter Thumbnail API - Thumbnail generated:', thumbnailUrl ? 'Success' : 'Failed');

    // Update cover letter with new thumbnail
    await CoverLetter.findByIdAndUpdate(coverLetterId, {
      'metadata.thumbnailUrl': thumbnailUrl,
      'metadata.thumbnailGeneratedAt': now
    });

    return NextResponse.json({
      success: true,
      thumbnailUrl,
      cached: false
    });

  } catch (error) {
    console.error('Error generating cover letter thumbnail:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate thumbnail' },
      { status: 500 }
    );
  }
}

async function generateCoverLetterThumbnail(coverLetter: any, userId: string): Promise<string> {
  try {
    // Generate SVG-based thumbnail
    const svgContent = generateCoverLetterThumbnailSVG(coverLetter);
    
    // Initialize S3 client
    const s3Client = new S3Client({
      region: process.env.AWS_S3_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    // Create S3 key for thumbnail
    const coverLetterId = coverLetter._id?.toString() || 'unknown';
    const timestamp = Date.now();
    const s3Key = `thumbnails/${userId}/cover-letter-${coverLetterId}-${timestamp}.svg`;

    // Upload SVG to S3
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: s3Key,
      ContentType: 'image/svg+xml',
      Body: Buffer.from(svgContent),
      Metadata: {
        coverLetterId: coverLetterId,
        userId: userId,
        generatedAt: new Date().toISOString(),
        type: 'cover-letter-thumbnail',
      },
    });

    await s3Client.send(command);

    // Return public URL
    const publicUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${s3Key}`;
    
    return publicUrl;

  } catch (error) {
    console.error('Error creating cover letter thumbnail:', error);
    // Fallback to data URL if S3 upload fails
    const svgContent = generateCoverLetterThumbnailSVG(coverLetter);
    const svgDataUrl = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;
    return svgDataUrl;
  }
}

function generateCoverLetterThumbnailSVG(coverLetter: any): string {
  const width = 300;
  const height = 400;
  
  // Determine status color
  const statusColor = coverLetter.status === 'final' ? '#10b981' : 
                     coverLetter.status === 'draft' ? '#f59e0b' : '#6b7280';
  
  // Get basic info
  const title = coverLetter.title || 'Cover Letter';
  const content = coverLetter.content || '';
  const targetCompany = coverLetter.metadata?.targetCompany || '';
  const targetPosition = coverLetter.metadata?.targetPosition || '';
  
  // Extract first few lines of content
  const lines = content.split('\n').filter(line => line.trim()).slice(0, 8);
  
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
      
      <!-- Cover Letter Title -->
      <text x="150" y="40" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#1e293b">
        ${title.substring(0, 30)}${title.length > 30 ? '...' : ''}
      </text>
      
      <!-- Status Badge -->
      <rect x="100" y="55" width="100" height="20" rx="10" fill="${statusColor}" opacity="0.2"/>
      <text x="150" y="68" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="${statusColor}">
        ${coverLetter.status?.toUpperCase() || 'DRAFT'}
      </text>
      
      <!-- Target Company/Position -->
      ${targetCompany || targetPosition ? `
        <text x="150" y="110" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#374151">
          ${targetCompany || targetPosition}
        </text>
        ${targetPosition && targetCompany ? `
          <text x="150" y="128" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#6b7280">
            ${targetPosition}
          </text>
        ` : ''}
      ` : ''}
      
      <!-- Content Preview -->
      <g transform="translate(20, 150)">
        ${lines.map((line, index) => `
          <text x="0" y="${index * 20}" font-family="Arial, sans-serif" font-size="10" fill="#4b5563">
            ${line.substring(0, 40)}${line.length > 40 ? '...' : ''}
          </text>
        `).join('')}
      </g>
      
      <!-- Footer -->
      <text x="150" y="390" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" fill="#9ca3af">
        Modified: ${coverLetter.metadata?.lastModified ? new Date(coverLetter.metadata.lastModified).toLocaleDateString() : 'N/A'}
      </text>
    </svg>
  `;
}

