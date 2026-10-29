/**
 * Cover letter rendering — one implementation, two consumers.
 *
 * The download route (`/api/cover-letters/[id]/download`) and the application automation worker both
 * need a PDF of the same letter. They must agree: a candidate who reviews their letter and downloads
 * it, then lets the worker submit, has to be looking at the same document the employer receives.
 *
 * This lived as a private function inside the download route, which is why the automation path had no
 * way to render a letter at all — `atsPlaywrightService` accepts `coverLetterPdf` and uploads it in all
 * four ATS flows, but nothing in the repo ever populated it, so every automated application went out
 * with a resume and no cover letter.
 */

export interface CoverLetterRenderInput {
  content?: string;
  title?: string;
  metadata?: { targetCompany?: string } | null;
}

export interface RenderCoverLetterPdfOptions {
  paperSize?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
  /**
   * Printed on the signature line.
   *
   * Defaults to the `[Your Name]` placeholder the download route has always emitted, so existing
   * downloads are unchanged. The automation path passes the candidate's real name: a letter submitted
   * to an employer must never be signed with a placeholder.
   */
  signatureName?: string;
}

export async function renderCoverLetterPdf(
  coverLetter: CoverLetterRenderInput,
  options: RenderCoverLetterPdfOptions = {}
): Promise<Blob> {
  const { paperSize = 'A4', orientation = 'portrait', signatureName } = options;
  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF({
    orientation: orientation === 'landscape' ? 'landscape' : 'portrait',
    unit: 'mm',
    format: paperSize === 'Letter' ? 'letter' : 'a4',
  });

  // Set margins
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin + 20;

  // Date (top right)
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
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

  const paragraphs = String(coverLetter.content || '')
    .split('\n\n')
    .filter((p) => p.trim());

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

  doc.text(signatureName || '[Your Name]', margin, yPos);

  return doc.output('blob');
}

/**
 * Filesystem-safe file name for an attachment, e.g. `Jane-Doe-Cover-Letter.pdf`.
 *
 * Mirrors the sanitising used for the resume attachment so the two files sort together in an ATS
 * upload list and neither carries characters a form upload may reject.
 */
export function coverLetterFileName(candidateName?: string | null): string {
  const raw = String(candidateName || 'Candidate').trim();
  const safe = raw.replace(/[^A-Za-z0-9 _-]/g, '').trim().replace(/\s+/g, '-') || 'Candidate';
  return `${safe}-Cover-Letter.pdf`;
}
