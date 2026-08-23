'use client';

import {
  getPageDimensions,
  PaperSize,
  roundToDevicePixel as roundToDevicePixelCore,
} from '@/lib/templates/page-dimensions';

export type CanvasPageSize = PaperSize;

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
  itemGapPx: number;
  workspacePaddingX: number;
  workspacePaddingY: number;
  slotHeightPx: number;
}

export const roundToDevicePixel = roundToDevicePixelCore;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function computeCanvasLayoutMetrics({
  pageSize,
  pageMargin,
  sectionGap,
  itemGap,
  viewportWidth,
  viewportHeight,
  devicePixelRatio,
}: {
  pageSize: CanvasPageSize;
  pageMargin: number;
  sectionGap: number;
  itemGap: number;
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio?: number;
}): CanvasLayoutMetrics {
  const dims = getPageDimensions(pageSize) || getPageDimensions('A4');
  const dpr = Math.max(1, devicePixelRatio || 1);

  const isMobile = viewportWidth < 768;
  const isTablet = viewportWidth >= 768 && viewportWidth < 1280;

  const workspacePaddingX = roundToDevicePixel(isMobile ? 16 : isTablet ? 24 : 32, dpr);
  const workspacePaddingY = roundToDevicePixel(
    viewportHeight < 820 ? 20 : isMobile ? 24 : 32,
    dpr
  );

  const pageGapPx = roundToDevicePixel(
    clamp(isMobile ? 24 : isTablet ? 32 : 40, 20, 48),
    dpr
  );

  const safeMargin = clamp(pageMargin, 0, 96);
  const pageMarginPx = roundToDevicePixel(safeMargin, dpr);
  const normalizedSectionGap = roundToDevicePixel(clamp(sectionGap, 8, 64), dpr);
  const normalizedItemGap = roundToDevicePixel(clamp(itemGap, 2, 24), dpr);
  const pageHeightPx = roundToDevicePixel(dims.heightPx, dpr);
  const pageWidthPx = roundToDevicePixel(dims.widthPx, dpr);

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
    itemGapPx: normalizedItemGap,
    workspacePaddingX,
    workspacePaddingY,
    slotHeightPx: roundToDevicePixel(pageHeightPx + pageGapPx, dpr),
  };
}
