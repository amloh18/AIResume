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
  /** Target element to capture instead of the default root */
  elementId?: string;
  /** Direct element reference to capture */
  element?: HTMLElement;
}

/**
 * Download the live CV canvas preview as a PDF.
 *
 * Finds the `.cv-document` element currently in the DOM, captures it with
 * jsPDF html method (removing CSS masks and editor-only UI), to generate
 * text-selectable PDFs.
 *
 * @throws if `.cv-document` is not found in the DOM.
 */
export async function downloadCanvasAsPDF(
  filename = 'cv.pdf',
  options: CanvasDownloadOptions = {}
): Promise<void> {
  if (typeof window === 'undefined') return;

  const { 
    paperSize = 'A4', 
    elementId = 'cv-document-root',
    element 
  } = options;

  const cvDoc = element || document.getElementById(elementId);
  if (!cvDoc) {
    console.error(`CV document root (#${elementId}) not found`);
    return;
  }

  const dims = PAGE_DIMS[paperSize];
  const { jsPDF } = await import('jspdf');

  // Create the jsPDF instance
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: [dims.widthPx, dims.heightPx],
    hotfixes: ['px_scaling'],
  });

  // Create a hidden container
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.style.width = `${dims.widthPx}px`;
  // Important: allow height to be auto so content dictates it, but force width
  document.body.appendChild(container);

  // Clone the CV document
  const clone = cvDoc.cloneNode(true) as HTMLElement;
  
  // Clean up editor UI and editable attributes
  const editorSelectors = [
    '.no-print', '[data-no-print]', '.cv-drag-handle', '.cv-editor-only', 
    '.cv-page-visualizer', '.cv-drop-zone-indicator', '.section-hover-controls'
  ];
  clone.querySelectorAll(editorSelectors.join(',')).forEach(el => {
    (el as HTMLElement).style.display = 'none';
  });
  clone.querySelectorAll('[contenteditable]').forEach(el => {
    el.removeAttribute('contenteditable');
  });

  // Force dimensions and layout on the clone
  clone.style.width = `${dims.widthPx}px`;
  clone.style.height = 'auto';
  clone.style.transform = 'none';
  clone.style.boxShadow = 'none';
  clone.style.margin = '0';
  clone.style.gap = '0'; // Remove page gaps for continuous rendering
  clone.style.overflow = 'visible';

  // FIX: Pre-process SVGs (like Lucide icons) to avoid html2canvas SVG parsing errors
  // We inline all computed styles into the SVG attributes to ensure styling remains intact 
  // without external stylesheet dependencies.
  const svgs = clone.querySelectorAll('svg');
  svgs.forEach((svg) => {
    const originalSvg = cvDoc.querySelector(`svg[class*="${svg.classList[0]}"]`) || svg;
    const computedStyle = window.getComputedStyle(originalSvg);
    const color = computedStyle.color || '#000000';
    const width = svg.getAttribute('width') || computedStyle.width || '16px';
    const height = svg.getAttribute('height') || computedStyle.height || '16px';

    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('stroke', computedStyle.stroke);
    svg.setAttribute('fill', computedStyle.fill);
    svg.setAttribute('stroke-width', computedStyle.strokeWidth);
    
    // Replace currentColor with actual computed color
    const svgString = new XMLSerializer().serializeToString(svg)
      .replace(/currentColor/g, color);
      
    // Create an image to replace the SVG
    const img = document.createElement('img');
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
    img.style.width = width;
    img.style.height = height;
    img.style.display = 'inline-block';
    img.style.verticalAlign = 'middle';
    img.className = svg.className.baseVal || '';
    
    if (svg.parentNode) {
      svg.parentNode.replaceChild(img, svg);
    }
  });

  container.appendChild(clone);

  try {
    // Generate the PDF directly, parsing the DOM to keep text selectable
    await doc.html(clone, {
      x: 0,
      y: 0,
      width: dims.widthPx,
      windowWidth: dims.widthPx,
      autoPaging: 'text',
    });
    doc.save(filename);
  } catch (error) {
    console.error('Error generating PDF:', error);
  } finally {
    document.body.removeChild(container);
  }
}
