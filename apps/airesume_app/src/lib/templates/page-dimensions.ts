/**
 * page-dimensions.ts
 *
 * SINGLE SOURCE OF TRUTH for physical paper sizes and the margins that define
 * a CV/cover-letter page in BOTH the editor canvas and every export path.
 *
 * Rationale:
 *  - The editor canvas renders pages in CSS pixels (96dpi: 1px = 1/96in).
 *  - The PDF export captures the live DOM and places each page into a jsPDF
 *    canvas of exactly these pixel dimensions (downloadCanvas.ts), so pixel
 *    and physical dimensions must agree to the sub-pixel.
 *  - The server-side HTML export (templateRendererService) uses absolute units
 *    (mm/in) for the same pages; the values here are their exact equivalents.
 *
 * Everything else (useCanvasFit, canvas partitioning, CoverLetterLayoutEngine,
 * CoverLetterPreview, Step5Review paper sizes) must import FROM here instead of
 * re-declaring 794/816/1122.5 etc.
 */

export type PaperSize = 'A4' | 'Letter';

export const IN_MM = 25.4;
export const PX_PER_IN = 96;

export interface PaperDimensions {
  /** Physical width in millimetres (A4 = 210mm exactly). */
  widthMm: number;
  /** Physical height in millimetres (A4 = 297mm exactly). */
  heightMm: number;
  /** CSS width in absolute units (matches the editor canvas page). */
  widthCss: string;
  /** CSS height in absolute units. */
  heightCss: string;
  /** Layout width in CSS pixels at 96dpi. */
  widthPx: number;
  /** Layout height in CSS pixels at 96dpi. */
  heightPx: number;
}

const mmToPx = (mm: number) => (mm / IN_MM) * PX_PER_IN;

export const PAGE_DIMENSIONS: Record<PaperSize, PaperDimensions> = {
  A4: {
    widthMm: 210,
    heightMm: 297,
    widthCss: '210mm',
    heightCss: '297mm',
    widthPx: mmToPx(210),
    heightPx: mmToPx(297),
  },
  Letter: {
    widthMm: 215.9,
    heightMm: 279.4,
    widthCss: '8.5in',
    heightCss: '11in',
    widthPx: mmToPx(215.9),
    heightPx: mmToPx(279.4),
  },
};

export const getPageDimensions = (paperSize: PaperSize): PaperDimensions =>
  PAGE_DIMENSIONS[paperSize] || PAGE_DIMENSIONS.A4;

/**
 * Print margins used by the server-side HTML export (`@page` rule). These are
 * expressed in millimetres so the printed page has uniform breathing room.
 * The canvas page-margin (design.pageMargin) is a layout toggle; this constant
 * is the canonical physical margin applied on output.
 */
export const PAGE_MARGIN_MM = {
  top: 12,
  right: 15,
  bottom: 12,
  left: 15,
} as const;

/** Default canvas page margin in pixels (matches the default CV design). */
export const DEFAULT_CANVAS_PAGE_MARGIN_PX = 40;

/** Default gap (px) between stacked pages inside the editor document. */
export const DEFAULT_PAGE_GAP_PX = 40;

/**
 * Round a value so it lands on a device-pixel grid at a given DPR, preventing
 * sub-pixel seams between pages when scaled/captured.
 */
export const roundToDevicePixel = (value: number, devicePixelRatio = 1): number => {
  if (!Number.isFinite(value)) return 0;
  const dpr = Math.max(1, devicePixelRatio || 1);
  return Math.round(value * dpr) / dpr;
};