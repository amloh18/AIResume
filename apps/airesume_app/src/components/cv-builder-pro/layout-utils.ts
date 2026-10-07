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

/**
 * Vertical gutter the canvas workspace reserves above AND below the sheet.
 *
 * Exported as its own function because it has two consumers that must agree:
 * `computeCanvasLayoutMetrics` (which sets the real CSS padding) and the
 * auto-fit budget in CVCanvasEngine (which has to subtract it, plus the tool
 * strip, from the container height before sizing the page). When the two drifted
 * apart the page was sized for a smaller gutter than the workspace actually
 * reserved, so its bottom edge landed flush on the canvas frame's border.
 */
export function workspacePaddingYFor(
  viewportWidth: number,
  viewportHeight: number,
  dpr = 1,
): number {
  return roundToDevicePixelCore(viewportHeight < 820 ? 20 : viewportWidth < 768 ? 24 : 32, dpr);
}

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
  const workspacePaddingY = workspacePaddingYFor(viewportWidth, viewportHeight, dpr);

  const pageGapPx = roundToDevicePixel(
    clamp(isMobile ? 24 : isTablet ? 32 : 40, 20, 48),
    dpr
  );

  const safeMargin = clamp(pageMargin, 0, 96);
  const pageMarginPx = roundToDevicePixel(safeMargin, dpr);
  // The floors are 0, not 8 / 2. The Design panel's sliders have always offered
  // 0 for both (`min="0"`), so choosing 0 was silently rewritten to 8px / 2px
  // and the control looked broken. Minimalist Single's spec — a 0 section gap
  // and a 1px item gap — was unreachable for the same reason. Nothing at or
  // above the old floors changes, so no existing document moves.
  const normalizedSectionGap = roundToDevicePixel(clamp(sectionGap, 0, 64), dpr);
  const normalizedItemGap = roundToDevicePixel(clamp(itemGap, 0, 24), dpr);
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
