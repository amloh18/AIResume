'use client';

/**
 * downloadCanvas.ts
 *
 * High-fidelity PDF / SVG export for the CV Canvas Engine.
 *
 * PDF is now a REAL, TEXT-BASED document.
 *
 * It used to be a picture: each page was rasterised with html-to-image and the
 * resulting JPEG was dropped into a jsPDF page. Every CV download was therefore
 * an image, with all of the consequences that has — text that cannot be
 * selected, copied or searched, no embedded fonts, an ATS that reads nothing but
 * a blank image, and a file whose pages never quite matched the canvas because
 * they were a flattened screenshot of it.
 *
 * The export now sends the LIVE canvas markup (the same DOM you see, with the
 * editor's chrome stripped) to the server, where Puppeteer lays it out at the
 * exact paper size and prints a tagged, text-based PDF — the same renderer the
 * rest of the product already uses. Because the markup and its stylesheet are
 * the canvas's own, every snippet renders in the PDF exactly as it does on the
 * canvas, and the text stays selectable.
 *
 * The raster path survives only as a FALLBACK for when that request fails (no
 * network, renderer unavailable). It is never the first choice.
 *
 * SVG export is untouched and remains a pure vector download.
 */

import { getPageDimensions, PaperSize } from '@/lib/templates/page-dimensions';

export interface CanvasDownloadOptions {
  paperSize?: 'A4' | 'Letter';
  /** Target element to capture instead of the default root */
  elementId?: string;
  /** Direct element reference to capture */
  element?: HTMLElement;
  /** Capture quality 0–1 for JPEG fallback (default 0.85) */
  quality?: number;
  /** Resolution scale multiplier for the raster FALLBACK (default 3 = ~300 DPI) */
  scale?: number;
  /**
   * The document's data/template. Optional; supplied by the editor so the server
   * export has the CV's name for the filename and metadata. The PDF itself is
   * produced from `htmlContent`, so exports still work without them.
   */
  cvData?: any;
  template?: any;
}

const EDITOR_SELECTORS = [
  '.no-print',
  '[data-no-print]',
  '.cv-drag-handle',
  '.cv-editor-only',
  '.cv-page-visualizer',
  '.cv-drop-zone-indicator',
  '.section-hover-controls',
  '.inline-add-section-button',
  '.cv-section-drag-overlay',
  '.entry-controls',
  '[data-canvas-toolrail]',
  '[data-entry-rail]',
];

/** Nodes that exist only for editing and must never reach an exported file. */
const EXPORT_EXCLUDE_SELECTOR = [
  '.no-print',
  '[data-no-print]',
  '.entry-controls',
  '[data-entry-rail]',
  '[data-canvas-toolrail]',
  '[data-section-frame]',
  '[data-insert-snippet-btn]',
  '[role="dialog"]',
].join(',');

/** CSS custom properties the canvas sets inline on an ancestor of the pages. */
const CANVAS_VARIABLES = [
  '--cv-font',
  '--cv-base-size',
  '--cv-spacing',
  '--cv-accent',
  '--cv-page-margin',
  '--cv-sidebar-bg',
  '--cv-section-gap',
  '--cv-item-gap',
  '--cv-column-gap',
  '--cv-page-width',
  '--cv-page-height',
  '--cv-page-gap',
];

function shouldExcludeNode(node: HTMLElement): boolean {
  if (!node || !node.classList) return false;
  for (const cls of ['no-print', 'cv-drag-handle', 'cv-editor-only', 'cv-page-visualizer', 'cv-drop-zone-indicator', 'section-hover-controls', 'inline-add-section-button']) {
    if (node.classList.contains(cls)) return true;
  }
  return node.hasAttribute('data-no-print');
}

/**
 * Get the target CV element and page elements
 */
function resolveCvDocument(options: CanvasDownloadOptions): {
  cvDoc: HTMLElement | null;
  pages: HTMLElement[];
} {
  const { elementId = 'cv-document-root', element } = options;
  const cvDoc = element || document.getElementById(elementId) || document.querySelector('.cv-document') as HTMLElement;
  if (!cvDoc) return { cvDoc: null, pages: [] };

  const pageEls = Array.from(cvDoc.querySelectorAll('.cv-page, .cover-letter-document')) as HTMLElement[];
  return {
    cvDoc,
    pages: pageEls.length > 0 ? pageEls : [cvDoc],
  };
}

/** Absolute href for a stylesheet the export document has to re-fetch. */
function absoluteHref(href: string): string {
  try {
    return new URL(href, window.location.href).href;
  } catch {
    return href;
  }
}

/**
 * Serialise the live canvas into a self-contained HTML document for the server
 * PDF renderer.
 *
 * Three things have to travel with the markup or the print loses the design:
 *  1. the canvas CSS variables (they live on an ANCESTOR of the pages, and the
 *     pages are cloned out of that ancestor);
 *  2. the stylesheets (Tailwind's link + the canvas engine's inline <style>);
 *  3. printable overrides — zero page margin (the markup already carries the
 *     document's own margins), no sheet shadow, one PDF page per `.cv-page`,
 *     and no empty-field placeholders.
 */
function buildVectorExportHtml(pages: HTMLElement[], paperSize: 'A4' | 'Letter'): string | null {
  if (typeof document === 'undefined' || pages.length === 0) return null;

  const dims = getPageDimensions(paperSize as PaperSize);

  // The variables are inherited, so a computed read on any page resolves them.
  const computed = window.getComputedStyle(pages[0]);
  const variables = CANVAS_VARIABLES
    .map((name) => {
      const value = computed.getPropertyValue(name).trim();
      return value ? `${name}: ${value};` : '';
    })
    .filter(Boolean)
    .join(' ');

  const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .map((link) => {
      const href = (link as HTMLLinkElement).getAttribute('href');
      return href ? `<link rel="stylesheet" href="${absoluteHref(href)}">` : '';
    })
    .join('\n');

  const inlineStyles = Array.from(document.querySelectorAll('style'))
    .map((style) => style.outerHTML)
    .join('\n');

  const body = pages
    .map((page) => {
      const clone = page.cloneNode(true) as HTMLElement;
      clone.querySelectorAll(EXPORT_EXCLUDE_SELECTOR).forEach((node) => node.remove());
      // Editor-only state that would otherwise be baked into the export.
      clone.classList.remove('cv-has-selection');
      clone.querySelectorAll('[contenteditable]').forEach((node) => node.removeAttribute('contenteditable'));
      clone.querySelectorAll('[data-selected]').forEach((node) => node.removeAttribute('data-selected'));
      clone.querySelectorAll('.cv-has-selection').forEach((node) => node.classList.remove('cv-has-selection'));
      clone.style.boxShadow = 'none';
      clone.style.margin = '0';
      return clone.outerHTML;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>CV</title>
  ${links}
  ${inlineStyles}
  <style>
    :root, body { ${variables} }
    @page { size: ${dims.widthMm}mm ${dims.heightMm}mm; margin: 0; }
    html, body { margin: 0 !important; padding: 0 !important; background: #ffffff !important; }
    body { width: ${dims.widthPx}px; }
    .cv-page, .cover-letter-document {
      width: ${dims.widthPx}px !important;
      height: ${dims.heightPx}px !important;
      min-height: ${dims.heightPx}px !important;
      margin: 0 !important;
      box-shadow: none !important;
      page-break-after: always;
      break-after: page;
      overflow: hidden;
    }
    .cv-page:last-child, .cover-letter-document:last-child { page-break-after: auto; break-after: auto; }
    /* Selection/hover states must never be printed. */
    .cv-section-wrapper { filter: none !important; opacity: 1 !important; }
    /* Empty-field hints are an editing affordance, not document content. */
    [data-empty-text]:empty::after, [data-empty-text]:empty::before { content: '' !important; display: none !important; }
    [contenteditable]:empty::before { content: '' !important; display: none !important; }
  </style>
</head>
<body>
  ${body}
</body>
</html>`;
}

/**
 * Download the live CV canvas as a TEXT-BASED (vector, selectable) PDF.
 *
 * Primary path: the live markup is posted to `/api/cv/export`, which prints it
 * with Puppeteer at the exact paper size — the same renderer the product uses
 * everywhere else, so what you see in the canvas is what lands in the file.
 *
 * Fallback path (only if that request fails): the previous high-DPI raster
 * capture, so an export is never simply unavailable.
 */
export async function downloadCanvasAsPDF(
  filename = 'cv.pdf',
  options: CanvasDownloadOptions = {}
): Promise<void> {
  if (typeof window === 'undefined') return;

  const paperSize = (options.paperSize || 'A4') as 'A4' | 'Letter';
  const { pages } = resolveCvDocument(options);

  if (pages.length > 0) {
    const htmlContent = buildVectorExportHtml(pages, paperSize);
    if (htmlContent) {
      try {
        const response = await fetch('/api/cv/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            // `basics` is read by the route for the filename/metadata; the PDF
            // itself is built from htmlContent.
            cvData: options.cvData ?? { basics: {} },
            template: options.template ?? null,
            format: 'pdf',
            paperSize,
            orientation: 'portrait',
            filename: filename.replace(/\.pdf$/i, ''),
            htmlContent,
          }),
        });

        const contentType = response.headers.get('content-type') || '';
        if (response.ok && contentType.includes('application/pdf')) {
          const blob = await response.blob();
          downloadBlob(blob, filename);
          return;
        }
        console.warn(
          'Vector PDF export unavailable, falling back to raster capture:',
          response.status,
          contentType
        );
      } catch (error) {
        console.warn('Vector PDF export failed, falling back to raster capture:', error);
      }
    }
  }

  await downloadCanvasAsRasterPDF(filename, { ...options, paperSize });
}

/**
 * Raster fallback: high-DPI page screenshots embedded in a PDF.
 *
 * Kept only for when the text-based renderer cannot be reached. Output is an
 * image — text is not selectable and ATS parsers see nothing — so nothing
 * should call this directly.
 */
async function downloadCanvasAsRasterPDF(
  filename = 'cv.pdf',
  options: CanvasDownloadOptions = {}
): Promise<void> {
  const {
    paperSize = 'A4',
    quality = 0.85,
    scale = 3,
  } = options;

  const { cvDoc, pages } = resolveCvDocument(options);
  if (!cvDoc || pages.length === 0) {
    console.error('CV document root not found for PDF generation');
    return;
  }

  const dims = getPageDimensions(paperSize as PaperSize);
  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: [dims.widthPx, dims.heightPx],
    hotfixes: ['px_scaling'],
  });

  try {
    const htmlToImage = await import('html-to-image');

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      let imgData: string;

      try {
        imgData = await htmlToImage.toJpeg(page, {
          quality,
          pixelRatio: scale,
          backgroundColor: '#ffffff',
          filter: (node) => !shouldExcludeNode(node as HTMLElement),
        });
      } catch (htmlToImageErr) {
        console.warn('html-to-image capture fallback triggered:', htmlToImageErr);
        const html2canvasModule = await import('html2canvas');
        const html2canvas = html2canvasModule.default || html2canvasModule;
        const canvas = await html2canvas(page, {
          scale,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff',
          ignoreElements: (node) => shouldExcludeNode(node as HTMLElement),
        });
        imgData = canvas.toDataURL('image/jpeg', quality);
      }

      if (i > 0) {
        doc.addPage([dims.widthPx, dims.heightPx], 'portrait');
      }
      doc.addImage(imgData, 'JPEG', 0, 0, dims.widthPx, dims.heightPx);
    }

    doc.save(filename);
  } catch (error) {
    console.error('Error generating PDF:', error);
  }
}

/**
 * Export the live CV as a pure vector SVG file.
 * Vector SVG files have ZERO pixelation at ANY zoom level and extremely small file size (~30-80 KB).
 */
export async function downloadCanvasAsSVG(
  filename = 'cv.svg',
  options: CanvasDownloadOptions = {}
): Promise<void> {
  if (typeof window === 'undefined') return;

  const { paperSize = 'A4' } = options;
  const { cvDoc, pages } = resolveCvDocument(options);
  if (!cvDoc || pages.length === 0) {
    console.error('CV document root not found for SVG generation');
    return;
  }

  const dims = getPageDimensions(paperSize as PaperSize);

  try {
    const htmlToImage = await import('html-to-image');

    if (pages.length === 1) {
      // Single page vector SVG
      const svgDataUrl = await htmlToImage.toSvg(pages[0], {
        backgroundColor: '#ffffff',
        filter: (node) => !shouldExcludeNode(node as HTMLElement),
      });

      downloadDataUri(svgDataUrl, filename.endsWith('.svg') ? filename : `${filename}.svg`);
    } else {
      // Multi-page: Combine into a single stacked vector SVG document
      const svgPromises = pages.map((page) =>
        htmlToImage.toSvg(page, {
          backgroundColor: '#ffffff',
          filter: (node) => !shouldExcludeNode(node as HTMLElement),
        })
      );
      const svgDataUrls = await Promise.all(svgPromises);

      const totalHeight = dims.heightPx * pages.length + 30 * (pages.length - 1);
      const pageSvgContents: string[] = [];

      for (let i = 0; i < svgDataUrls.length; i++) {
        const rawSvg = decodeURIComponent(svgDataUrls[i].split(',')[1]);
        const yOffset = i * (dims.heightPx + 30);
        // Extract content inside the page SVG
        const innerContent = rawSvg
          .replace(/<svg[^>]*>/, '')
          .replace(/<\/svg>$/, '');
        pageSvgContents.push(`<g transform="translate(0, ${yOffset})">${innerContent}</g>`);
      }

      const combinedSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${dims.widthPx}" height="${totalHeight}" viewBox="0 0 ${dims.widthPx} ${totalHeight}">
  <style>
    @media print { body { margin: 0; } }
  </style>
  <rect width="100%" height="100%" fill="#f3f4f6" />
  ${pageSvgContents.join('\n')}
</svg>`;

      const blob = new Blob([combinedSvg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      downloadDataUri(url, filename.endsWith('.svg') ? filename : `${filename}.svg`);
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error('Error generating SVG:', error);
  }
}

/**
 * Print CV using browser-native vector print engine.
 * Generates a 100% native vector PDF (selectable text, true vector curves, ~80-120 KB size)
 * when the user chooses "Save as PDF" in the print dialog.
 */
export function printCanvasAsVectorPDF(options: CanvasDownloadOptions = {}): void {
  if (typeof window === 'undefined') return;

  const { cvDoc } = resolveCvDocument(options);
  if (!cvDoc) {
    window.print();
    return;
  }

  // Create isolated hidden iframe for clean printing
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  // Copy all stylesheets and print styles into the iframe
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((el) => el.outerHTML)
    .join('\n');

  const clone = cvDoc.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(EDITOR_SELECTORS.join(',')).forEach((el) => {
    (el as HTMLElement).style.display = 'none';
  });

  doc.open();
  doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>CV Print</title>
  ${styles}
  <style>
    @page { margin: 0; size: auto; }
    body { margin: 0 !important; background: white !important; }
    .cv-page, .cover-letter-document { margin: 0 auto !important; box-shadow: none !important; page-break-after: always; }
  </style>
</head>
<body>
  ${clone.outerHTML}
</body>
</html>`);
  doc.close();

  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }, 250);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  downloadDataUri(url, filename);
  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function downloadDataUri(uri: string, filename: string): void {
  const link = document.createElement('a');
  link.href = uri;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
