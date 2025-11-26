import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCVWithTemplate } from '@/lib/cv-template-utils';
import { PDFService } from '@/lib/services/pdfService';
import { docxService } from '@/lib/services/docxService';
import { downloadAnalyticsService } from '@/lib/services/downloadAnalyticsService';
import { HARDCODED_TEMPLATES } from '@/lib/templates/hardcoded-templates';
import { Template } from '@/models';
import mongoose from 'mongoose';
import { redisRateLimiter } from '@/lib/redis-rate-limiter';
import { configService } from '@/lib/services/configService';
import { validateDownloadParams, sanitizeFilename, validateFileSize } from '@/lib/utils/downloadValidation';
import { logger } from '@/lib/structured-logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  let userId: string | undefined;
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    userId = session.user.id;
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    // Validate parameters
    const validation = validateDownloadParams(
      searchParams.get('format'),
      searchParams.get('paperSize'),
      searchParams.get('orientation')
    );

    if (!validation.valid) {
      logger.warn('Invalid download parameters', {
        userId,
        cvId: id,
        errors: validation.errors
      });
      return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    const format = validation.format!;
    const paperSize = validation.paperSize!;
    const orientation = validation.orientation!;

    // Rate limiting
    const downloadConfig = configService.getDownloadConfig();
    const rateLimitConfig = downloadConfig.rateLimit;
    
    // Per-user rate limiting
    const userLimitResult = await redisRateLimiter.checkLimit(
      `download:user:${userId}`,
      {
        windowMs: 3600000, // 1 hour
        maxRequests: rateLimitConfig.perUser
      }
    );

    if (!userLimitResult.allowed) {
      logger.warn('Download rate limit exceeded (user)', {
        userId,
        cvId: id,
        remaining: userLimitResult.remaining,
        resetTime: userLimitResult.resetTime
      });
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Please try again later.',
          resetTime: userLimitResult.resetTime
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitConfig.perUser.toString(),
            'X-RateLimit-Remaining': userLimitResult.remaining.toString(),
            'X-RateLimit-Reset': userLimitResult.resetTime.toString()
          }
        }
      );
    }

    // Per-IP rate limiting
    const ipLimitResult = await redisRateLimiter.checkLimit(
      `download:ip:${ipAddress}`,
      {
        windowMs: 3600000, // 1 hour
        maxRequests: rateLimitConfig.perIP
      }
    );

    if (!ipLimitResult.allowed) {
      logger.warn('Download rate limit exceeded (IP)', {
        userId,
        ipAddress,
        cvId: id,
        remaining: ipLimitResult.remaining
      });
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Please try again later.',
          resetTime: ipLimitResult.resetTime
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitConfig.perIP.toString(),
            'X-RateLimit-Remaining': ipLimitResult.remaining.toString(),
            'X-RateLimit-Reset': ipLimitResult.resetTime.toString()
          }
        }
      );
    }

    // Get CV with template
    const cvWithTemplate = await getCVWithTemplate(id);
    
    if (!cvWithTemplate) {
      return NextResponse.json({ error: 'CV not found' }, { status: 404 });
    }

    // Verify ownership
    if (cvWithTemplate.userId.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get full template data
    let template: any = null;
    const templateIdStr = cvWithTemplate.templateId?.toString() || '';

    // Check hardcoded templates first
    const hardcodedTemplate = HARDCODED_TEMPLATES.find(
      t => t.id === templateIdStr || t._id === templateIdStr
    );

    if (hardcodedTemplate) {
      template = hardcodedTemplate;
    } else if (templateIdStr && mongoose.Types.ObjectId.isValid(templateIdStr)) {
      // Try database template
      template = await Template.findById(templateIdStr);
    }

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Get CV data
    const cvData = cvWithTemplate.cvData || cvWithTemplate.data;

    if (!cvData) {
      return NextResponse.json({ error: 'CV data not found' }, { status: 404 });
    }

    // Generate file based on format
    let fileBlob: Blob;
    let mimeType: string;
    let filename: string;

    // Generate filename based on job title or CV title
    const jobTitle = searchParams.get('jobTitle');
    const baseName = sanitizeFilename(
      jobTitle 
        ? jobTitle.toLowerCase().replace(/\s+/g, '-')
        : cvData.basics?.name?.toLowerCase().replace(/\s+/g, '-') || 'cv'
    );

    if (format === 'pdf') {
      fileBlob = await PDFService.generatePDF(cvData, template, {
        paperSize,
        orientation,
        format: 'pdf'
      });
      mimeType = 'application/pdf';
      filename = `${baseName}-cv.pdf`;
    } else if (format === 'docx' || format === 'doc') {
      fileBlob = await docxService.generateDOCX(cvData, template, {
        paperSize,
        orientation,
        format
      });
      mimeType = format === 'doc' 
        ? 'application/msword' 
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      filename = `${baseName}-cv.${format}`;
    } else {
      return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
    }

    // Validate file size
    const fileSizeValidation = validateFileSize(fileBlob.size);
    if (!fileSizeValidation.valid) {
      logger.warn('File size validation failed', {
        userId,
        cvId: id,
        fileSize: fileBlob.size,
        error: fileSizeValidation.error
      });
      return NextResponse.json({ error: fileSizeValidation.error }, { status: 413 });
    }

    const duration = Date.now() - startTime;

    // Log download analytics
    try {
      await downloadAnalyticsService.logDownload({
        userId: session.user.id,
        cvId: id,
        format,
        paperSize,
        templateId: templateIdStr,
        fileSize: fileBlob.size,
        success: true
      });
    } catch (analyticsError) {
      logger.error('Failed to log download analytics', analyticsError instanceof Error ? analyticsError : new Error(String(analyticsError)), {
        userId,
        cvId: id
      });
      // Don't fail the request if analytics fails
    }

    logger.info('CV download successful', {
      userId,
      cvId: id,
      format,
      fileSize: fileBlob.size,
      duration
    });

    // Return file
    return new NextResponse(fileBlob, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBlob.size.toString()
      }
    });

  } catch (error: any) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate download file' },
      { status: 500 }
    );
  }
}

