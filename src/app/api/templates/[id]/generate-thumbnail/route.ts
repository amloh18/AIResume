import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { Template } from '@/models';
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

    const { id: templateId } = await params;

    console.log('🔍 Template Thumbnail API - Generating thumbnail for template:', { templateId });

    await getConnection();

    // Find the template
    const template = await Template.findById(templateId);
    if (!template) {
      console.log('🔍 Template Thumbnail API - Template not found:', { templateId });
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }

    // Check if thumbnail is recent (less than 30 days old)
    const now = new Date();
    const thumbnailAge = template.metadata?.thumbnailGeneratedAt 
      ? now.getTime() - new Date(template.metadata.thumbnailGeneratedAt).getTime()
      : Infinity;
    
    const isThumbnailRecent = thumbnailAge < 30 * 24 * 60 * 60 * 1000; // 30 days

    if (template.thumbnail && isThumbnailRecent && template.thumbnail.includes('s3.amazonaws.com')) {
      // Return existing thumbnail if it's recent and already in S3
      return NextResponse.json({
        success: true,
        thumbnailUrl: template.thumbnail,
        cached: true
      });
    }

    // Generate new thumbnail
    console.log('🔍 Template Thumbnail API - Generating thumbnail...');
    const thumbnailUrl = await generateTemplateThumbnail(template);
    console.log('🔍 Template Thumbnail API - Thumbnail generated:', thumbnailUrl ? 'Success' : 'Failed');

    // Update template with new thumbnail
    await Template.findByIdAndUpdate(templateId, {
      thumbnail: thumbnailUrl,
      'metadata.thumbnailGeneratedAt': now
    });

    return NextResponse.json({
      success: true,
      thumbnailUrl,
      cached: false
    });

  } catch (error) {
    console.error('Error generating template thumbnail:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate thumbnail' },
      { status: 500 }
    );
  }
}

async function generateTemplateThumbnail(template: any): Promise<string> {
  try {
    // Generate SVG-based thumbnail
    const svgContent = generateTemplateThumbnailSVG(template);
    
    // Initialize S3 client
    const s3Client = new S3Client({
      region: process.env.AWS_S3_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    // Create S3 key for thumbnail
    const templateId = template._id?.toString() || 'unknown';
    const timestamp = Date.now();
    const sanitizedName = template.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const s3Key = `thumbnails/templates/${sanitizedName}-${templateId}-${timestamp}.svg`;

    // Upload SVG to S3
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: s3Key,
      ContentType: 'image/svg+xml',
      Body: Buffer.from(svgContent),
      Metadata: {
        templateId: templateId,
        templateName: template.name,
        generatedAt: new Date().toISOString(),
        type: 'template-thumbnail',
        category: template.category || 'cv',
        tier: template.tier || 'free',
      },
    });

    await s3Client.send(command);

    // Return public URL
    const publicUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${s3Key}`;
    
    return publicUrl;

  } catch (error) {
    console.error('Error creating template thumbnail:', error);
    // Fallback to data URL if S3 upload fails
    const svgContent = generateTemplateThumbnailSVG(template);
    const svgDataUrl = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;
    return svgDataUrl;
  }
}

function generateTemplateThumbnailSVG(template: any): string {
  const width = 300;
  const height = 400;
  
  const name = template.name || 'Template';
  const description = template.description || '';
  const category = template.category || 'cv';
  const tier = template.tier || 'free';
  
  // Get colors from global styles
  const primaryColor = template.globalStyles?.primaryColor || '#2563eb';
  const backgroundColor = template.globalStyles?.backgroundColor || '#ffffff';
  const fontFamily = template.globalStyles?.fontFamily || 'Inter, system-ui, sans-serif';
  
  // Tier badge color
  const tierColor = tier === 'premium' ? '#f59e0b' : '#10b981';
  
  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${backgroundColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:#f8fafc;stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- Background -->
      <rect width="100%" height="100%" fill="url(#bg)" stroke="${primaryColor}" stroke-width="2"/>
      
      <!-- Template Name -->
      <text x="150" y="40" text-anchor="middle" font-family="${fontFamily}" font-size="18" font-weight="bold" fill="#1e293b">
        ${name.substring(0, 25)}${name.length > 25 ? '...' : ''}
      </text>
      
      <!-- Tier Badge -->
      <rect x="100" y="55" width="100" height="20" rx="10" fill="${tierColor}" opacity="0.2"/>
      <text x="150" y="68" text-anchor="middle" font-family="${fontFamily}" font-size="10" font-weight="bold" fill="${tierColor}">
        ${tier.toUpperCase()}
      </text>
      
      <!-- Category Badge -->
      <rect x="200" y="55" width="60" height="20" rx="10" fill="${primaryColor}" opacity="0.2"/>
      <text x="230" y="68" text-anchor="middle" font-family="${fontFamily}" font-size="10" font-weight="bold" fill="${primaryColor}">
        ${category.toUpperCase()}
      </text>
      
      <!-- Description -->
      ${description ? `
        <text x="150" y="110" text-anchor="middle" font-family="${fontFamily}" font-size="11" fill="#6b7280">
          ${description.substring(0, 50)}${description.length > 50 ? '...' : ''}
        </text>
      ` : ''}
      
      <!-- Layout Preview -->
      <g transform="translate(20, 140)">
        <rect x="0" y="0" width="260" height="200" fill="white" stroke="${primaryColor}" stroke-width="1" opacity="0.5"/>
        ${template.layoutType === 'two-column' ? `
          <line x1="130" y1="0" x2="130" y2="200" stroke="${primaryColor}" stroke-width="1" opacity="0.3"/>
          <text x="65" y="100" text-anchor="middle" font-family="${fontFamily}" font-size="10" fill="#9ca3af">Left Column</text>
          <text x="195" y="100" text-anchor="middle" font-family="${fontFamily}" font-size="10" fill="#9ca3af">Right Column</text>
        ` : `
          <text x="130" y="100" text-anchor="middle" font-family="${fontFamily}" font-size="10" fill="#9ca3af">Single Column</text>
        `}
      </g>
      
      <!-- Footer -->
      <text x="150" y="390" text-anchor="middle" font-family="${fontFamily}" font-size="8" fill="#9ca3af">
        Template Preview
      </text>
    </svg>
  `;
}

