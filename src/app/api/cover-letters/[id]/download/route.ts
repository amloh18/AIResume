// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CoverLetter } from '@/models';
import { downloadAnalyticsService } from '@/lib/services/downloadAnalyticsService';
import mongoose from 'mongoose';
// jsPDF will be imported dynamically
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
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
        coverLetterId: id,
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
        coverLetterId: id,
        remaining: userLimitResult.remaining
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
        coverLetterId: id,
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

    // Get cover letter
    const coverLetter = await CoverLetter.findOne({
      _id: id,
      userId: new mongoose.Types.ObjectId(session.user.id)
    });

    if (!coverLetter) {
      return NextResponse.json({ error: 'Cover letter not found' }, { status: 404 });
    }

    // Generate filename based on cover letter title, then job title, then fallback
    const jobTitle = searchParams.get('jobTitle');
    const coverLetterTitle = coverLetter.title;
    const baseName = sanitizeFilename(
      coverLetterTitle
        ? coverLetterTitle
        : jobTitle
          ? jobTitle
          : 'CoverLetter'
    );

    let fileBlob: Blob;
    let mimeType: string;
    let filename: string;

    if (format === 'pdf') {
      fileBlob = await generateCoverLetterPDF(coverLetter, paperSize, orientation);
      mimeType = 'application/pdf';
      filename = `${baseName}|CoverLetter.pdf`;
    } else if (format === 'docx' || format === 'doc') {
      fileBlob = await generateCoverLetterDOCX(coverLetter, format);
      mimeType = format === 'doc'
        ? 'application/msword'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      filename = `${baseName}|CoverLetter.${format}`;
    } else {
      return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
    }

    // Log download analytics
    try {
      // Validate file size
      const fileSizeValidation = validateFileSize(fileBlob.size);
      if (!fileSizeValidation.valid) {
        logger.warn('File size validation failed', {
          userId,
          coverLetterId: id,
          fileSize: fileBlob.size,
          error: fileSizeValidation.error
        });
        return NextResponse.json({ error: fileSizeValidation.error }, { status: 413 });
      }

      const duration = Date.now() - startTime;

      await downloadAnalyticsService.logDownload({
        userId: session.user.id,
        coverLetterId: id,
        format,
        paperSize,
        fileSize: fileBlob.size,
        success: true
      });

      logger.info('Cover letter download successful', {
        userId,
        coverLetterId: id,
        format,
        fileSize: fileBlob.size,
        duration
      });
    } catch (analyticsError) {
      console.error('Failed to log download analytics:', analyticsError);
    }

    // Return file
    return new NextResponse(fileBlob, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBlob.size.toString()
      }
    });

  } catch (error: any) {
    console.error('Cover letter download error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate cover letter file' },
      { status: 500 }
    );
  }
}

/**
 * Generate cover letter PDF
 */
async function generateCoverLetterPDF(
  coverLetter: any,
  paperSize: 'A4' | 'Letter',
  orientation: 'portrait' | 'landscape'
): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: orientation === 'landscape' ? 'landscape' : 'portrait',
    unit: 'mm',
    format: paperSize === 'Letter' ? 'letter' : 'a4'
  });

  // Set margins
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - (margin * 2);
  let yPos = margin + 20;

  // Date (top right)
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(today, pageWidth - margin - doc.getTextWidth(today), yPos);
  yPos += 15;

  // Recipient info (if available)
  if (coverLetter.metadata?.targetCompany) {
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(coverLetter.metadata.targetCompany, margin, yPos);
    yPos += 7;
  }

  // Greeting
  yPos += 10;
  doc.setFontSize(11);
  doc.text('Dear Hiring Manager,', margin, yPos);
  yPos += 10;

  // Content
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);

  // Split content into paragraphs
  const paragraphs = coverLetter.content.split('\n\n').filter(p => p.trim());

  paragraphs.forEach((paragraph: string) => {
    // Check if we need a new page
    if (yPos > pageHeight - margin - 20) {
      doc.addPage();
      yPos = margin + 20;
    }

    const lines = doc.splitTextToSize(paragraph.trim(), contentWidth);
    doc.text(lines, margin, yPos);
    yPos += lines.length * 6 + 5; // Line height + spacing
  });

  // Closing
  if (yPos > pageHeight - margin - 30) {
    doc.addPage();
    yPos = margin + 20;
  }

  yPos += 10;
  doc.text('Sincerely,', margin, yPos);
  yPos += 10;

  // Signature space
  doc.text('[Your Name]', margin, yPos);

  return doc.output('blob');
}

/**
 * Generate cover letter DOCX
 */
async function generateCoverLetterDOCX(
  coverLetter: any,
  format: 'docx' | 'doc'
): Promise<Blob> {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Split content into paragraphs
  const paragraphs = coverLetter.content.split('\n\n').filter((p: string) => p.trim());

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // Date
        new Paragraph({
          children: [
            new TextRun({
              text: today,
              size: 22 // 11pt
            })
          ],
          alignment: AlignmentType.RIGHT,
          spacing: { after: 200 }
        }),

        // Recipient (if available)
        ...(coverLetter.metadata?.targetCompany ? [
          new Paragraph({
            text: coverLetter.metadata.targetCompany,
            spacing: { after: 200 }
          })
        ] : []),

        // Greeting
        new Paragraph({
          text: 'Dear Hiring Manager,',
          spacing: { after: 400 }
        }),

        // Content paragraphs
        ...paragraphs.map((paragraph: string) =>
          new Paragraph({
            text: paragraph.trim(),
            spacing: { after: 300 }
          })
        ),

        // Closing
        new Paragraph({
          text: 'Sincerely,',
          spacing: { before: 400, after: 400 }
        }),

        new Paragraph({
          text: '[Your Name]'
        })
      ]
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  return new Blob([buffer], {
    type: format === 'doc'
      ? 'application/msword'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
}

