import { useState, useEffect, useRef, useCallback } from 'react';

interface UseCanvasFitOptions {
  /** Layout width (px) of the document to fit. Must follow the page size selected by the user. */
  documentPixelWidth?: number;
  paddingPx?: number;
  maxScale?: number;
  minScale?: number;
}

/**
 * Auto-fit zoom hook for document canvases.
 *
 * Recomputes the zoom whenever the *document width* changes (A4 ↔ Letter,
 * page-margin changes, etc.) so the whole page always fits the available
 * width — not just on container resize.
 */
export function useCanvasFit(options: UseCanvasFitOptions = {}) {
  const {
    documentPixelWidth = 794,
    paddingPx = 64, // 32px padding on each side
    maxScale = 1.25,
    minScale = 0.2
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isAutoFit, setIsAutoFit] = useState(true);

  // Keep the latest doc width in a ref so the ResizeObserver callback always
  // computes against the current value (Observers capture closure values).
  const docWidthRef = useRef(documentPixelWidth);
  docWidthRef.current = documentPixelWidth;

  const computeZoom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const containerWidth = el.getBoundingClientRect().width;
    const availableWidth = containerWidth - paddingPx;
    const newZoom = (Math.max(0, availableWidth) / docWidthRef.current) * 100;
    const clampedZoom = Math.min(maxScale * 100, Math.max(minScale * 100, newZoom));
    setScale(Math.round(clampedZoom));
  }, [paddingPx, maxScale, minScale]);

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