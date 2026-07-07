/**
 * Centralized page/document metrics for CV rendering.
 *
 * All canvas, preview, PDF, and print code should import from this file
 * instead of defining ad-hoc dimensions. This keeps A4/Letter layout
 * consistent between the editor, download utilities, and server-side PDF.
 */

export const PAGE_SIZE = {
  A4: {
    widthMm: 210,
    heightMm: 297,
    widthPx: 793.7008,
    heightPx: 1122.5197,
    widthCss: '210mm',
    heightCss: '297mm',
  } as const,
  Letter: {
    widthMm: 215.9,
    heightMm: 279.4,
    widthPx: 816,
    heightPx: 1056,
    widthCss: '8.5in',
    heightCss: '11in',
  } as const,
} as const;

export type PageSizeKey = keyof typeof PAGE_SIZE;

export const DEFAULT_PAGE_SIZE: PageSizeKey = 'A4';

export const getPageMetrics = (size: PageSizeKey = DEFAULT_PAGE_SIZE) => {
  return PAGE_SIZE[size] || PAGE_SIZE.A4;
};
