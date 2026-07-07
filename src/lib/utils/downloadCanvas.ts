/**
 * downloadCanvas.ts
 *
 * Text-selectable PDF download utility for the CV Canvas Engine.
 *
 * The PDF is generated server-side through `/api/cv/export`, which renders
 * from live `cvData` using Puppeteer. This preserves selectable text and
 * ATS compatibility.
 */

export interface CanvasDownloadOptions {
  paperSize?: 'A4' | 'Letter';
  filename?: string;
  cvData?: any;
  template?: any;
}

/**
 * Download the current CV state as a PDF via the server-side export API.
 */
export async function downloadCanvasAsPDF(
  options: CanvasDownloadOptions = {}
): Promise<void> {
  const { paperSize = 'A4', filename = 'cv.pdf', cvData, template } = options;

  const body: Record<string, any> = {
    format: 'pdf',
    paperSize,
    filename,
  };

  if (cvData) {
    body.cvData = cvData;
  }
  if (template) {
    body.template = template;
  }

  try {
    const response = await fetch('/api/cv/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Download failed');
      throw new Error(errorText);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

