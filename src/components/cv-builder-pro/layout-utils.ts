'use client';

export type CanvasPageSize = 'A4' | 'Letter';

export interface CanvasLayoutMetrics {
  pageWidthCss: string;
  pageHeightCss: string;
  pageWidthPx: number;
  pageHeightPx: number;
  pageGapPx: number;
  pageMarginPx: number;
  pageTopPaddingPx: number;
  pageBottomPaddingPx: number;
  sectionGapPx: number;
  workspacePaddingX: number;
  workspacePaddingY: number;
  slotHeightPx: number;
}

const PAGE_DIMENSIONS: Record<CanvasPageSize, { widthCss: string; heightCss: string; widthPx: number; heightPx: number }> = {
  A4: {
    widthCss: '210mm',
    heightCss: '297mm',
    widthPx: 793.7008,
    heightPx: 1122.5197,
  },
  Letter: {
    widthCss: '8.5in',
    heightCss: '11in',
    widthPx: 816,
    heightPx: 1056,
  },
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const roundToDevicePixel = (value: number, devicePixelRatio = 1) => {
  if (!Number.isFinite(value)) return 0;
  const dpr = Math.max(1, devicePixelRatio || 1);
  return Math.round(value * dpr) / dpr;
};

export function computeCanvasLayoutMetrics({
  pageSize,
  pageMargin,
  sectionGap,
  viewportWidth,
  viewportHeight,
  devicePixelRatio,
}: {
  pageSize: CanvasPageSize;
  pageMargin: number;
  sectionGap: number;
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio?: number;
}): CanvasLayoutMetrics {
  const dims = PAGE_DIMENSIONS[pageSize] || PAGE_DIMENSIONS.A4;

  const isMobile = viewportWidth < 768;
  const isTablet = viewportWidth >= 768 && viewportWidth < 1280;

  const workspacePaddingX = isMobile ? 16 : isTablet ? 24 : 32;
  const workspacePaddingY = viewportHeight < 820 ? 20 : isMobile ? 24 : 32;

  const pageGapPx = clamp(isMobile ? 24 : isTablet ? 32 : 40, 20, 48);

  const safeMargin = clamp(pageMargin, 0, 96);
  const pageMarginPx = safeMargin;
  const normalizedSectionGap = clamp(sectionGap, 8, 64);
  const pageHeightPx = dims.heightPx;
  const pageWidthPx = dims.widthPx;

  return {
    pageWidthCss: dims.widthCss,
    pageHeightCss: dims.heightCss,
    pageWidthPx,
    pageHeightPx,
    pageGapPx,
    pageMarginPx,
    pageTopPaddingPx: pageMarginPx,
    pageBottomPaddingPx: pageMarginPx,
    sectionGapPx: normalizedSectionGap,
    workspacePaddingX,
    workspacePaddingY,
    slotHeightPx: pageHeightPx + pageGapPx,
  };
}
