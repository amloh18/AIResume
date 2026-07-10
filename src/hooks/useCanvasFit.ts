import { useState, useEffect, useRef } from 'react';

interface UseCanvasFitOptions {
  documentPixelHeight?: number;
  paddingPx?: number;
  maxScale?: number;
  minScale?: number;
}

export function useCanvasFit(options: UseCanvasFitOptions = {}) {
  const {
    documentPixelHeight = 1123, // Standard A4 height in pixels
    paddingPx = 64, // 32px padding top and bottom combined
    maxScale = 1.25,
    minScale = 0.2
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isAutoFit, setIsAutoFit] = useState(true);
  const lastScaleRef = useRef(1);

  // Manual zoom control
  const setZoom = (newScale: number | ((prev: number) => number)) => {
    setIsAutoFit(false);
    setScale(prev => {
      const next = typeof newScale === 'function' ? newScale(prev) : newScale;
      const rounded = Math.round(next);
      lastScaleRef.current = rounded;
      return rounded;
    });
  };

  const triggerAutoFit = () => {
    setIsAutoFit(true);
  };

  useEffect(() => {
    if (!containerRef.current || !isAutoFit) return;

    let timeoutId: NodeJS.Timeout;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { height: containerHeight } = entry.contentRect;
        
        const availableHeight = containerHeight - paddingPx;
        
        // Calculate required scale percentage to fit the document in the available height
        const newZoom = (availableHeight / documentPixelHeight) * 100;
        
        // Clamp zoom
        const clampedZoom = Math.min(maxScale * 100, Math.max(minScale * 100, newZoom));
        const targetScale = Math.round(clampedZoom);

        // Debounce the state update to avoid synchronous React update depth crashes
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          const currentScale = lastScaleRef.current;
          // Only update if the scale change is significant (> 2%) to prevent scrollbar-toggle loops,
          // or if it's the very first calculation.
          if (Math.abs(currentScale - targetScale) > 2 || currentScale === 1) {
            lastScaleRef.current = targetScale;
            setScale(targetScale);
          }
        }, 100); // 100ms debounce allows layout to settle
      }
    });

    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, [documentPixelHeight, paddingPx, maxScale, minScale, isAutoFit]);

  return { containerRef, zoom: scale, setZoom, isAutoFit, triggerAutoFit };
}
