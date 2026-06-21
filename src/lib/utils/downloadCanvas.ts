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
  const quality = options.quality ?? 0.92;
  const dims = PAGE_DIMS[paperSize];

  // ── 1. Find the live canvas document element ──────────────────────────────
  const cvDoc = document.querySelector('.cv-document') as HTMLElement | null;
  if (!cvDoc) {
    throw new Error(
      'CV document not found. The canvas preview must be visible to generate a PDF.'
    );
  }

  // ── 2. Read real page metrics from CSS variables (set by CVCanvasEngine) ──
  const pageHeightPx = readCssPxVar(cvDoc, '--cv-page-height', dims.heightPx);
  const pageGapPx    = readCssPxVar(cvDoc, '--cv-page-gap',    DEFAULT_PAGE_GAP_PX);
  const slotHeightPx = pageHeightPx + pageGapPx; // one "page slot" in the document

  // Natural (un-zoomed) element height — all content stacked vertically
  const totalContentH = cvDoc.scrollHeight;
  const totalPages = Math.max(1, Math.ceil(totalContentH / slotHeightPx));

  // ── 3. Dynamic imports (avoid SSR / tree-shake bloat) ────────────────────
  const [html2canvasModule, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);
  const html2canvas = html2canvasModule.default;

  // ── 4. Render the element to a high-resolution canvas ────────────────────
  const CAPTURE_SCALE = 2; // 2× → crisp on retina without huge files

  const fullCanvas = await html2canvas(cvDoc, {
    scale: CAPTURE_SCALE,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    // Capture at natural element width (794px for A4) ignoring any parent zoom/scale
    width: cvDoc.offsetWidth,
    height: totalContentH,
    windowWidth: cvDoc.offsetWidth,
    onclone: (clonedDoc: Document) => {
      // Disable all CSS transitions, animations, and keyframe delays in the cloned document
      const style = clonedDoc.createElement('style');
      style.innerHTML = `
        * {
          animation: none !important;
          transition: none !important;
          transition-duration: 0s !important;
          animation-duration: 0s !important;
        }
      `;
      clonedDoc.head.appendChild(style);

      const clone = clonedDoc.querySelector('.cv-document') as HTMLElement | null;
      if (clone) {
        // Remove the CSS mask that hides content in the page-gap zones
        clone.style.maskImage       = 'none';
        clone.style.webkitMaskImage = 'none';
        clone.style.height          = `${totalContentH}px`;
        clone.style.overflow        = 'visible';
      }

      // Hide editor-only UI so it doesn't appear in the PDF
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
      clonedDoc.querySelectorAll(editorSelectors.join(',')).forEach(el => {
        (el as HTMLElement).style.display = 'none';
      });

      // Strip contenteditable so html2canvas renders clean text
      clonedDoc.querySelectorAll('[contenteditable]').forEach(el => {
        el.removeAttribute('contenteditable');
      });
    },
  });

  // ── 5. Build jsPDF document, one page at a time ───────────────────────────
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [dims.widthMm, dims.heightMm],
  });

  // px-to-mm conversion factor for the captured canvas
  const canvasWidthPx = cvDoc.offsetWidth * CAPTURE_SCALE;
  const pxToMm = dims.widthMm / canvasWidthPx;
  const pageHeightMm = pageHeightPx * CAPTURE_SCALE * pxToMm;

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) doc.addPage();

    // Source Y in the full canvas (each slot = page + gap, we only take the page part)
    const srcY = page * slotHeightPx * CAPTURE_SCALE;
    const srcH = pageHeightPx * CAPTURE_SCALE;

    if (srcY >= fullCanvas.height) break; // no more content
    const actualSrcH = Math.min(srcH, fullCanvas.height - srcY);
    if (actualSrcH <= 0) break;

    // Crop this page out of the full canvas
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width  = canvasWidthPx;
    pageCanvas.height = srcH;

    const ctx = pageCanvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    ctx.drawImage(
      fullCanvas,
      0, srcY, canvasWidthPx, actualSrcH,  // source rect
      0, 0,   canvasWidthPx, actualSrcH    // dest rect (top of page canvas)
    );

    const imgData = pageCanvas.toDataURL('image/jpeg', quality);
    doc.addImage(imgData, 'JPEG', 0, 0, dims.widthMm, Math.min(dims.heightMm, pageHeightMm));
  }

  doc.save(filename);
}
