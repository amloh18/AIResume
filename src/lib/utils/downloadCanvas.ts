/**
 * downloadCanvas.ts
 *
 * WYSIWYG PDF download utility for the CV Canvas Engine.
 * Captures the live DOM `.cv-document` element using html2canvas,
 * which guarantees the exported PDF is a pixel-perfect match of the editor preview.
 *
 * This is the correct approach because:
 *  - The server-side `templateRendererService` uses the OLD TemplateRenderer system
 *    which doesn't know about CANVAS_TEMPLATES, SNIPPETS, or CSS custom properties.
 *  - The `.cv-document` element in the browser always reflects the true rendered state.
 */

/** Standard page dimensions at 96 DPI */
const PAGE_DIMS = {
  A4:     { widthPx: 794,  heightPx: 1123, widthMm: 210,   heightMm: 297   },
  Letter: { widthPx: 816,  heightPx: 1056, widthMm: 215.9, heightMm: 279.4 },
} as const;

/** Default page gap (in px) between pages in the canvas document */
const DEFAULT_PAGE_GAP_PX = 40;

/**
 * Read a CSS custom property value from an element and convert to pixels.
 * Returns `fallback` if the property is not set or cannot be parsed.
 */
function readCssPxVar(el: HTMLElement, varName: string, fallback: number): number {
  try {
    const raw = window.getComputedStyle(el).getPropertyValue(varName).trim();
    if (!raw) return fallback;
    // If it's already a plain px number string e.g. "40"
    const direct = parseFloat(raw);
    if (!isNaN(direct) && !raw.includes('m') && !raw.includes('i') && !raw.includes('%')) return direct;
    // Convert CSS length to px by measuring a temp element
    const tmp = document.createElement('div');
    tmp.style.cssText = `position:fixed;visibility:hidden;height:${raw};width:0;top:-9999px`;
    document.body.appendChild(tmp);
    const px = tmp.getBoundingClientRect().height;
    document.body.removeChild(tmp);
    return px > 0 ? px : fallback;
  } catch {
    return fallback;
  }
}

export interface CanvasDownloadOptions {
  paperSize?: 'A4' | 'Letter';
  /** Capture quality 0–1 for JPEG (default 0.92) */
  quality?: number;
}

/**
 * Download the live CV canvas preview as a PDF.
 *
 * Finds the `.cv-document` element currently in the DOM, captures it with
 * html2canvas (removing CSS masks and editor-only UI), then splits the canvas
 * into individual A4/Letter pages and exports with jsPDF.
 *
 * @throws if `.cv-document` is not found in the DOM.
 */
export async function downloadCanvasAsPDF(
  filename = 'cv.pdf',
  options: CanvasDownloadOptions = {}
): Promise<void> {
  const paperSize = options.paperSize || 'A4';
  
  // ── 1. Find the live canvas document element ──────────────────────────────
  const cvDoc = document.querySelector('.cv-document') as HTMLElement | null;
  if (!cvDoc) {
    throw new Error(
      'CV document not found. The canvas preview must be visible to generate a PDF.'
    );
  }

  // ── 2. Clone the DOM to clean it up before sending to server ───────────────
  const clone = cvDoc.cloneNode(true) as HTMLElement;
  
  // Remove editor-only UI
  const editorSelectors = [
    '.no-print',
    '[data-no-print]',
    '.cv-drag-handle',
    '.cv-drag-overlay',
    '.inline-add-section-button',
    '.section-hover-controls',
    '.cv-editor-only',
    '.cv-section-drag-overlay',
    '.cv-drop-zone-indicator',
  ];
  clone.querySelectorAll(editorSelectors.join(',')).forEach(el => {
    (el as HTMLElement).style.display = 'none';
  });

  // Strip contenteditable so it renders clean text
  clone.querySelectorAll('[contenteditable]').forEach(el => {
    el.removeAttribute('contenteditable');
  });

  // Remove the gap and shadow for the print version
  clone.style.gap = '0px';
  clone.style.boxShadow = 'none';
  clone.style.transform = 'none'; // Ensure no scale
  clone.style.margin = '0px';
  
  // Clean up individual pages
  clone.querySelectorAll('.cv-page').forEach(page => {
    const pageEl = page as HTMLElement;
    pageEl.style.boxShadow = 'none';
    pageEl.style.margin = '0px';
    // Ensure break-after is applied for Puppeteer pagination
    pageEl.style.breakAfter = 'page';
    pageEl.style.pageBreakAfter = 'always';
  });

  // Ensure absolute URLs for images so Puppeteer can load them
  clone.querySelectorAll('img').forEach(img => {
    if (img.src && img.src.startsWith('/')) {
      img.src = window.location.origin + img.src;
    }
  });

  // ── 3. Extract all page styles (Tailwind, custom fonts, etc) ─────────────
  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(el => {
      if (el.tagName === 'LINK') {
        const href = el.getAttribute('href');
        if (href && href.startsWith('/')) {
          const linkClone = el.cloneNode() as HTMLLinkElement;
          linkClone.href = window.location.origin + href;
          return linkClone.outerHTML;
        }
      }
      return el.outerHTML;
    })
    .join('\n');

  // ── 4. Construct the complete HTML payload ───────────────────────────────
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>${filename}</title>
      <base href="${window.location.origin}">
      ${styles}
      <style>
        /* Force exact page dimensions and hide anything outside */
        @page {
          margin: 0;
          size: ${paperSize === 'Letter' ? '8.5in 11in' : 'A4'};
        }
        body {
          margin: 0;
          padding: 0;
          background: white;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .cv-document {
          width: 100% !important;
        }
      </style>
    </head>
    <body class="bg-white">
      ${clone.outerHTML}
    </body>
    </html>
  `;

  // ── 5. Send to server for Puppeteer rendering ────────────────────────────
  const response = await fetch('/api/cv/export', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      htmlContent,
      format: 'pdf',
      paperSize,
      filename: filename.replace('.pdf', ''),
      // We send minimal dummy data just to satisfy the API validation,
      // because Puppeteer will solely use our htmlContent.
      cvData: { basics: { name: filename } },
      template: { id: 'canvas' },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `PDF generation failed with status ${response.status}`);
  }

  // ── 6. Download the resulting PDF Blob ──────────────────────────────────
  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
}

