import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Percentage points added or removed by one press of a zoom in/out button.
 *
 * Deliberately small: the canvas transform is eased (see `zoomEased` in
 * CVCanvasEngine and the transition on the cover-letter content), so a fine step
 * still covers ground quickly while giving the user real control. A 10-point
 * step felt like the canvas jumped rather than zoomed.
 */
export const ZOOM_STEP = 5;

/**
 * Wheel / pinch zoom gain, as a proportional change per wheel-delta pixel.
 *
 * The canvas zooms CONTINUOUSLY: one wheel event scales the current zoom by
 * `exp(-deltaPx * ZOOM_WHEEL_SENSITIVITY)`. The exponential — rather than a
 * fixed number of percentage points — is what makes a gesture feel the same at
 * 50% and at 200%, and what lets a trackpad, which reports a stream of 1-4px
 * deltas, glide instead of stepping. It replaced a 50px accumulator that fired
 * one flat 5% jump, which is why a pinch arrived in visible lurches.
 *
 * At this value trackpad pinch/swipe gestures glide smoothly and zoom swiftly.
 */
export const ZOOM_WHEEL_SENSITIVITY = 0.0022;

interface UseCanvasFitOptions {
  /** Layout width (px) of the document to fit. Must follow the page size selected by the user. */
  documentPixelWidth?: number;
  /** Layout height (px) of the document to fit. Must follow the page size selected by the user. */
  documentPixelHeight?: number;
  paddingPx?: number;
  /** Vertical padding to preserve when fitting by height. Falls back to `paddingPx`. */
  paddingYPx?: number;
  maxScale?: number;
  minScale?: number;
}

/**
 * Auto-fit zoom hook for document canvases.
 *
 * Recomputes the zoom whenever the *document size* changes (A4 ↔ Letter,
 * page-margin changes, etc.) so the whole page always fits the available
 * *width and height* of the container — not just on container resize. When the
 * container is taller than the page's aspect ratio (common in the editor
 * canvas), the page fills the full container height instead of leaving unused
 * vertical space under a width-only fit.
 */
export function useCanvasFit(options: UseCanvasFitOptions = {}) {
  const {
    documentPixelWidth = 794,
    documentPixelHeight = 1123,
    paddingPx = 64, // 32px padding on each side
    paddingYPx = paddingPx,
    maxScale = 1.25,
    minScale = 0.2
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  // A PERCENTAGE, not a ratio — the canvas renders `scale(zoom / 100)`. This used
  // to start at `1`, i.e. the canvas painted at 1% before the first fit landed.
  const [scale, setScale] = useState(100);
  const [isAutoFit, setIsAutoFit] = useState(true);
  // True once a fit has actually been applied. Callers use it to tell "the fit
  // has settled" from "we are still showing the placeholder value" — the canvas
  // arms its zoom easing off this, so the initial settle does not animate.
  const [hasFitted, setHasFitted] = useState(false);

  // Keep the latest doc size in refs so the ResizeObserver callback always
  // computes against the current values (Observers capture closure values).
  const docWidthRef = useRef(documentPixelWidth);
  docWidthRef.current = documentPixelWidth;
  const docHeightRef = useRef(documentPixelHeight);
  docHeightRef.current = documentPixelHeight;

  const computeZoom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const containerWidth = rect.width;
    const containerHeight = rect.height;
    // A container that has not been laid out yet measures 0. Fitting against it
    // yields a zoom of 0, which clamps up to `minScale` — and because the editor
    // shell sizes the canvas frame from the canvas' own reported height, that
    // poisoned value became self-consistent and stuck: the canvas opened at the
    // 50% floor instead of its real fit. Skip until the container has a size.
    if (containerWidth <= 0 || containerHeight <= 0) return;
    const availableWidth = Math.max(0, containerWidth - paddingPx);
    const availableHeight = Math.max(0, containerHeight - paddingYPx);
    const widthZoom = (availableWidth / docWidthRef.current) * 100;
    const heightZoom = (availableHeight / docHeightRef.current) * 100;
    // Fit to the most restrictive dimension so the page is as large as
    // possible while remaining fully visible in both axes.
    const newZoom = Math.min(widthZoom, heightZoom);
    const clampedZoom = Math.min(maxScale * 100, Math.max(minScale * 100, newZoom));
    // Land on the same grid the zoom slider and the zoom buttons use. The slider
    // has `step = ZOOM_STEP` and `min` on that grid, so an off-grid fit value
    // (e.g. 72) gets snapped BY THE INPUT for display while the label keeps
    // showing the real number — the slider and the "72%" readout then disagree,
    // and every button press drifts them further apart.
    setScale(Math.round(clampedZoom / ZOOM_STEP) * ZOOM_STEP);
    setHasFitted(true);
  }, [paddingPx, paddingYPx, maxScale, minScale]);

  // Manual zoom control.
  //
  // Zoom is FRACTIONAL. Both gestures that drive it — the ctrl/cmd wheel and the
  // touch pinch — produce continuous values, and rounding those to whole percent
  // here is what turned a smooth pinch back into a 1%-granular staircase. One
  // decimal is all the precision the `scale()` transform needs and it keeps the
  // readout stable; the display rounds for the label.
  const setZoom = (newScale: number | ((prev: number) => number)) => {
    setIsAutoFit(false);
    setScale(prev => {
      const next = typeof newScale === 'function' ? newScale(prev) : newScale;
      return Math.round(next * 10) / 10;
    });
  };

  const triggerAutoFit = () => {
    setIsAutoFit(true);
    computeZoom();
  };

  useEffect(() => {
    if (!isAutoFit) return undefined;

    const observer = new ResizeObserver(() => computeZoom());
    observer.observe(containerRef.current as Element);
    computeZoom();
    return () => observer.disconnect();
  }, [isAutoFit, computeZoom]);

  // Re-fit whenever the document width itself changes (page size, margins).
  // `computeZoom` is stable, so this fires only when the width value changes.
  useEffect(() => {
    if (!isAutoFit) return;
    computeZoom();
  }, [documentPixelWidth, isAutoFit, computeZoom]);

  return { containerRef, zoom: scale, setZoom, isAutoFit, hasFitted, triggerAutoFit };
}