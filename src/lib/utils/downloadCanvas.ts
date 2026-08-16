'use client';

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

import { getPageDimensions, PaperSize } from '@/lib/templates/page-dimensions';

/**
 * Default page gap (in px) between pages in the canvas document.
 * Kept for layout parity; the actual exported pages are captured individually.
 */
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

  // Single source of truth for paper geometry — same constants the canvas uses.
  const dims = getPageDimensions(paperSize as PaperSize);
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

  // Force the document width so pages render at their true physical width.
  // Height is left natural: pages are boxed to `dims` individually below and
  // captured one at a time, so a collapsed container height only affects the
  // multi-page fallback and not the per-page geometry.
  clone.style.width = `${dims.widthPx}px`;
  clone.style.transform = 'none';
  clone.style.boxShadow = 'none';
  clone.style.margin = '0';
  clone.style.gap = `${DEFAULT_PAGE_GAP_PX}px`; // Keep page separation while cloning
  clone.style.overflow = 'visible';

  // Critical: preserve the TRUE page box. Every page must render at the exact
  // physical size so html2canvas captures an A4/Letter-shaped canvas. Setting
  // height to `auto` here used to collapse pages to their content height and
  // then stretch the image back to `dims.heightPx` on `addImage`, distorting
  // the vertical scale of the final PDF.
  const pageSelector = '.cv-page, .cover-letter-document';
  clone.querySelectorAll(pageSelector).forEach((pageEl) => {
    const el = pageEl as HTMLElement;
    el.style.width = `${dims.widthPx}px`;
    el.style.height = `${dims.heightPx}px`;
    el.style.minHeight = `${dims.heightPx}px`;
    el.style.marginTop = '0';
    el.style.marginBottom = '0';
    el.style.boxShadow = 'none';
  });

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
    const base64Svg = btoa(unescape(encodeURIComponent(svgString)));
    const img = document.createElement('img');
    img.src = `data:image/svg+xml;base64,${base64Svg}`;
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
    const html2canvasModule = await import('html2canvas');
    const html2canvas = html2canvasModule.default || html2canvasModule;

    const pages = clone.querySelectorAll(pageSelector);
    if (pages.length > 0) {
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        const canvas = await html2canvas(page, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff'
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        if (i > 0) {
          doc.addPage([dims.widthPx, dims.heightPx], 'portrait');
        }
        doc.addImage(imgData, 'JPEG', 0, 0, dims.widthPx, dims.heightPx);
      }
    } else {
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      doc.addImage(imgData, 'JPEG', 0, 0, dims.widthPx, dims.heightPx);
    }
    doc.save(filename);
  } catch (error) {
    console.error('Error generating PDF:', error);
  } finally {
    document.body.removeChild(container);
  }
}
