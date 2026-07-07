// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CoverLetter } from '@/models';
import { downloadAnalyticsService } from '@/lib/services/downloadAnalyticsService';
import mongoose from 'mongoose';
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import redisRateLimiter from '@/lib/redis-rate-limiter';
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

    const downloadConfig = configService.getDownloadConfig();
    const rateLimitConfig = downloadConfig.rateLimit;

    const userLimitResult = await redisRateLimiter.checkLimit(
      `download:user:${userId}`,
      {
        windowMs: 3600000,
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

    const ipLimitResult = await redisRateLimiter.checkLimit(
      `download:ip:${ipAddress}`,
      {
        windowMs: 3600000,
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

    const coverLetter = await CoverLetter.findOne({
      _id: id,
      userId: new mongoose.Types.ObjectId(session.user.id)
    });

    if (!coverLetter) {
      return NextResponse.json({ error: 'Cover letter not found' }, { status: 404 });
    }

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
      filename = baseName + '_CoverLetter.pdf';
    } else if (format === 'docx' || format === 'doc') {
      fileBlob = await generateCoverLetterDOCX(coverLetter, format);
      mimeType = format === 'doc'
        ? 'application/msword'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      filename = baseName + '_CoverLetter.' + format;
    } else {
      return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
    }

    try {
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

    return new NextResponse(fileBlob, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': 'attachment; filename="' + filename + '"',
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

function getLetterContent(coverLetter: any): { header: string; body: string; footer: string } {
  const header = typeof coverLetter.header === 'string' ? coverLetter.header : '';
  const body = typeof coverLetter.body === 'string' ? coverLetter.body : '';
  const footer = typeof coverLetter.footer === 'string' ? coverLetter.footer : '';

  if (header || body || footer) {
    return { header, body, footer };
  }

  const content = typeof coverLetter.content === 'string' ? coverLetter.content : '';
  if (!content) {
    return { header: '', body: '', footer: '' };
  }

  const lines = content.split('\n').filter((line: string) => line.trim() !== '');
  const headerLines = lines.slice(0, 5);
  const footerLines = lines.slice(-2);
  const bodyLines = lines.slice(5, lines.length - 2);

  return {
    header: headerLines.join('\n'),
    body: bodyLines.join('\n'),
    footer: footerLines.join('\n')
  };
}

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

  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - (margin * 2);
  let yPos = margin + 20;

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(today, pageWidth - margin - doc.getTextWidth(today), yPos);
  yPos += 15;

  if (coverLetter.metadata?.targetCompany) {
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(coverLetter.metadata.targetCompany, margin, yPos);
    yPos += 7;
  }

  yPos += 10;
  doc.setFontSize(11);
  doc.text('Dear Hiring Manager,', margin, yPos);
  yPos += 10;

  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);

  const { body, header } = getLetterContent(coverLetter);
  const bodyText = body || header || (typeof coverLetter.content === 'string' ? coverLetter.content : '');
  const paragraphs = bodyText
    .split('\n\n')
    .map((p: string) => p.trim())
    .filter((p: string) => p.length > 0);

  paragraphs.forEach((paragraph: string) => {
    if (yPos > pageHeight - margin - 20) {
      doc.addPage();
      yPos = margin + 20;
    }

    const lines = doc.splitTextToSize(paragraph, contentWidth);
    doc.text(lines, margin, yPos);
    yPos += lines.length * 6 + 5;
  });

  if (yPos > pageHeight - margin - 30) {
    doc.addPage();
    yPos = margin + 20;
  }

  yPos += 10;
  doc.text('Sincerely,', margin, yPos);
  yPos += 10;
  doc.text('[Your Name]', margin, yPos);

  return doc.output('blob');
}

async function generateCoverLetterDOCX(
  coverLetter: any,
  format: 'docx' | 'doc'
): Promise<Blob> {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const { body } = getLetterContent(coverLetter);
  const bodyText = body || (typeof coverLetter.content === 'string' ? coverLetter.content : '');
  const paragraphs = bodyText
    .split('\n\n')
    .map((p: string) => p.trim())
    .filter((p: string) => p.length > 0);

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: today,
              size: 22
            })
          ],
          alignment: AlignmentType.RIGHT,
          spacing: { after: 200 }
        }),
        ...(coverLetter.metadata?.targetCompany ? [
          new Paragraph({
            text: coverLetter.metadata.targetCompany,
            spacing: { after: 200 }
          })
        ] : []),
        new Paragraph({
          text: 'Dear Hiring Manager,',
          spacing: { after: 400 }
        }),
        ...paragraphs.map((paragraph: string) =>
          new Paragraph({
            text: paragraph,
            spacing: { after: 300 }
          })
        ),
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
