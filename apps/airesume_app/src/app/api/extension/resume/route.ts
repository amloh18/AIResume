import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { loadMasterCV } from '@/lib/jobs/autofillProfile';

export const dynamic = 'force-dynamic';

/**
 * GET /api/extension/resume
 *
 * The Master CV as a PDF, for the extension's autofill engine to attach to a job
 * board's "Upload resume" input.
 *
 * File inputs cannot be filled from clipboard-style data — the engine builds a
 * real `File` from these bytes and hands it to the input's DataTransfer, so the
 * response must be the actual document. It is generated with the same
 * PDFService path `/api/cv/export` uses, which is what keeps the attached file
 * identical to a normal download.
 *
 * Degrades honestly: 404 when the user has no Master CV, 501 when this
 * environment cannot render PDFs (no headless browser). The engine then leaves
 * the file input for the user instead of clearing it.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Please sign in to download your resume.' },
        { status: 401 }
      );
    }

    await getConnection();
    const cv = await loadMasterCV(auth.userId);
    if (!cv || !cv.cvData) {
      return NextResponse.json(
        { success: false, error: 'NO_RESUME', message: 'No Master CV found. Create one to autofill resume uploads.' },
        { status: 404 }
      );
    }

    const { PDFService } = await import('@/lib/services/pdfService');
    const compatibleTemplate = cv.templateData || {
      id: 'default',
      name: 'Default Template',
      globalStyles: { primaryColor: '#059669', fontFamily: 'Arial, sans-serif', fontSize: '11pt' },
    };

    const blob = await PDFService.generatePDF(cv.cvData, compatibleTemplate, {
      paperSize: 'A4',
      orientation: 'portrait',
    });
    const buffer = Buffer.from(await blob.arrayBuffer());

    const name = (cv.cvData?.basics?.name || 'Resume').toString().replace(/[^\w .-]/g, '');
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(`${name}.pdf`)}"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-store, private',
      },
    });
  } catch (err: any) {
    console.error('GET /api/extension/resume Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'RESUME_GENERATION_FAILED',
        message: 'Could not generate your resume PDF in this environment.',
      },
      { status: 501 }
    );
  }
}
