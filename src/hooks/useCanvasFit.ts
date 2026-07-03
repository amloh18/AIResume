import { useState, useEffect, useRef } from 'react';

interface UseCanvasFitOptions {
  documentPixelWidth?: number;
  paddingPx?: number;
  maxScale?: number;
  minScale?: number;
}

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
  };

  useEffect(() => {
    if (!containerRef.current || !isAutoFit) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: containerWidth } = entry.contentRect;
        
        const availableWidth = containerWidth - paddingPx;
        
        // Calculate required scale percentage to fit the document in the available width
        const newZoom = (availableWidth / documentPixelWidth) * 100;
        
        // Clamp zoom
        const clampedZoom = Math.min(maxScale * 100, Math.max(minScale * 100, newZoom));
        
        setScale(Math.round(clampedZoom));
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [documentPixelWidth, paddingPx, maxScale, minScale, isAutoFit]);

  return { containerRef, zoom: scale, setZoom, isAutoFit, triggerAutoFit };
}
