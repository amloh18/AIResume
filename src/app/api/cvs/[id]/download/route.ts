import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCVWithTemplate } from '@/lib/cv-template-utils';
import { PDFService } from '@/lib/services/pdfService';
import { docxService } from '@/lib/services/docxService';
import { downloadAnalyticsService } from '@/lib/services/downloadAnalyticsService';
import { getTemplateById, getAllTemplates } from '@/lib/templates/template-utils';
import { Template } from '@/models';
import mongoose from 'mongoose';
import redisRateLimiter from '@/lib/redis-rate-limiter';
import { configService } from '@/lib/services/configService';
import { validateDownloadParams, sanitizeFilename, validateFileSize } from '@/lib/utils/downloadValidation';
import User from '@/models/User';
import { getPlanAccess } from '@/lib/utils/plan-access';
// Safely import logger to handle potential circular dependencies
import { logger as originalLogger } from '@/lib/structured-logger';

// Create a safe logger wrapper
const safeLogger = {
  info: (msg: string, ...args: any[]) => originalLogger ? originalLogger.info(msg, ...args) : console.log(msg, ...args),
  warn: (msg: string, ...args: any[]) => originalLogger ? originalLogger.warn(msg, ...args) : console.warn(msg, ...args),
  error: (msg: string, error?: any, ...args: any[]) => originalLogger ? originalLogger.error(msg, error, ...args) : console.error(msg, error, ...args),
};

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
      safeLogger.warn('Invalid download parameters', {
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
      safeLogger.warn('Download rate limit exceeded (user)', {
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
      safeLogger.warn('Download rate limit exceeded (IP)', {
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

    // Plan gate: DOCX export requires starter_yearly+ plan
    if (format === 'docx') {
      const dbUser = await User.findById(session.user.id)
        .select('currentPlanKey subscription')
        .lean();
      if (dbUser) {
        const planAccess = getPlanAccess(dbUser);
        const denied = planAccess.gate('docxExport');
        if (denied) return denied;
      }
    }

    // Resolve template using the unified TemplateResolutionService
    const { resolveTemplate } = await import('@/lib/services/templateResolutionService');
    const resolutionResult = await resolveTemplate(cvWithTemplate);
    
    if (!resolutionResult.template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const template = resolutionResult.template;

    // Log template resolution details
    safeLogger.info('Download route - Template resolved:', {
      templateName: template.name,
      templateId: template.id || template._id,
      customRenderer: (template as any).customRenderer,
      source: resolutionResult.source,
      confidence: resolutionResult.confidence,
      hasCustomRenderer: !!(template as any).customRenderer,
      globalStylesKeys: Object.keys(template.globalStyles || {})
    });

    // Get CV data
    const cvData = cvWithTemplate.cvData;

    if (!cvData) {
      return NextResponse.json({ error: 'CV data not found' }, { status: 404 });
    }

    // Generate file based on format
    let fileBlob: Blob;
    let mimeType: string;
    let filename: string;

    // Generate filename based on CV title, then job title, then fallback
    const jobTitle = searchParams.get('jobTitle');
    const cvTitle = cvWithTemplate.title;
    const baseName = sanitizeFilename(
      cvTitle
        ? cvTitle
        : jobTitle
          ? jobTitle
          : 'CV'
    );

    if (format === 'pdf') {
      fileBlob = await PDFService.generatePDF(cvData, template, {
        paperSize,
        orientation,
        format: 'pdf'
      });
      mimeType = 'application/pdf';
      filename = `${baseName}|CV.pdf`;
    } else if (format === 'docx' || format === 'doc') {
      fileBlob = await docxService.generateDOCX(cvData, template, {
        paperSize,
        orientation,
        format
      });
      mimeType = format === 'doc'
        ? 'application/msword'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      filename = `${baseName}|CV.${format}`;
    } else {
      return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
    }

    // Validate file size
    const fileSizeValidation = validateFileSize(fileBlob.size);
    if (!fileSizeValidation.valid) {
      safeLogger.warn('File size validation failed', {
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
        templateId: resolutionResult.templateId,
        fileSize: fileBlob.size,
        success: true
      });
    } catch (analyticsError) {
      safeLogger.error('Failed to log download analytics', analyticsError instanceof Error ? analyticsError : new Error(String(analyticsError)), {
        userId,
        cvId: id
      });
      // Don't fail the request if analytics fails
    }

    safeLogger.info('CV download successful', {
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

