import { useState, useEffect, useRef, useCallback } from 'react';

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
  const [scale, setScale] = useState(1);
  const [isAutoFit, setIsAutoFit] = useState(true);

  // Keep the latest doc size in refs so the ResizeObserver callback always
  // computes against the current values (Observers capture closure values).
  const docWidthRef = useRef(documentPixelWidth);
  docWidthRef.current = documentPixelWidth;
  const docHeightRef = useRef(documentPixelHeight);
  docHeightRef.current = documentPixelHeight;

  const computeZoom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const containerWidth = el.getBoundingClientRect().width;
    const containerHeight = el.getBoundingClientRect().height;
    const availableWidth = Math.max(0, containerWidth - paddingPx);
    const availableHeight = Math.max(0, containerHeight - paddingYPx);
    const widthZoom = (availableWidth / docWidthRef.current) * 100;
    const heightZoom = (availableHeight / docHeightRef.current) * 100;
    // Fit to the most restrictive dimension so the page is as large as
    // possible while remaining fully visible in both axes.
    const newZoom = Math.min(widthZoom, heightZoom);
    const clampedZoom = Math.min(maxScale * 100, Math.max(minScale * 100, newZoom));
    setScale(Math.round(clampedZoom));
  }, [paddingPx, paddingYPx, maxScale, minScale]);

  // Manual zoom control
  const setZoom = (newScale: number | ((prev: number) => number)) => {
    setIsAutoFit(false);
    setScale(prev => {
      const next = typeof newScale === 'function' ? newScale(prev) : newScale;
      return Math.round(next);
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

  return { containerRef, zoom: scale, setZoom, isAutoFit, triggerAutoFit };
}