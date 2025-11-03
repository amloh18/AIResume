'use client';

import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { FileText } from 'lucide-react';
import { TemplateRenderer } from '@/lib/templates/template-renderer';

// A4 dimensions in pixels (210mm x 297mm at 96 DPI) - constants outside component
const A4_WIDTH = 794; // 210mm * 96/25.4
const A4_HEIGHT = 1123; // 297mm * 96/25.4

interface CVPreviewThumbnailProps {
  cvData: any;
  template?: {
    _id: string;
    name: string;
    globalStyles: any;
    availableSections: any[];
  };
  className?: string;
}

const CVPreviewThumbnail: React.FC<CVPreviewThumbnailProps> = ({
  cvData,
  template,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.15);
  const isCalculatingRef = useRef(false);
  const lastScaleRef = useRef(0.15);

  // Calculate scale based on container size - memoized callback to prevent recreations
  const updateScale = useCallback(() => {
    if (!containerRef.current || isCalculatingRef.current) return;

    isCalculatingRef.current = true;
    
    try {
      const container = containerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      // Skip if container has no dimensions yet
      if (containerWidth === 0 || containerHeight === 0) {
        isCalculatingRef.current = false;
        return;
      }

      // Calculate scale to fit container while maintaining A4 aspect ratio
      // Leave some padding (5% on each side)
      const padding = 0.1;
      const availableWidth = containerWidth * (1 - padding * 2);
      const availableHeight = containerHeight * (1 - padding * 2);

      // Calculate scale based on both width and height, use the smaller one to fit
      const widthScale = availableWidth / A4_WIDTH;
      const heightScale = availableHeight / A4_HEIGHT;
      const calculatedScale = Math.min(widthScale, heightScale);
      const clampedScale = Math.max(0.05, Math.min(0.25, calculatedScale)); // Clamp between 5% and 25%

      // Only update if scale has changed significantly (prevent micro-updates)
      if (Math.abs(lastScaleRef.current - clampedScale) >= 0.001) {
        lastScaleRef.current = clampedScale;
        setScale(clampedScale);
      }
    } finally {
      // Use requestAnimationFrame to ensure state updates don't cause immediate re-renders
      requestAnimationFrame(() => {
        isCalculatingRef.current = false;
      });
    }
  }, []);

  // Effect to set up ResizeObserver - only runs when cvData/template change
  useEffect(() => {
    if (!cvData || !template) return;

    // Initial scale calculation with a small delay to ensure DOM is ready
    const initialTimeout = setTimeout(() => {
      updateScale();
    }, 50);

    // Update on resize with debouncing
    let resizeTimeout: NodeJS.Timeout;
    const resizeObserver = new ResizeObserver(() => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        updateScale();
      }, 150); // Increased debounce time to prevent loops
    });

    const container = containerRef.current;
    if (container) {
      resizeObserver.observe(container);
    }

    return () => {
      clearTimeout(initialTimeout);
      clearTimeout(resizeTimeout);
      resizeObserver.disconnect();
      isCalculatingRef.current = false;
    };
  }, [cvData, template, updateScale]);

  const previewContent = useMemo(() => {
    if (!cvData || !template) {
      return null;
    }

    return (
      <div 
        ref={containerRef}
        className="w-full h-full flex items-center justify-center relative overflow-hidden"
        style={{ 
          backgroundColor: '#f8f9fa'
        }}
      >
        {/* A4 Document Preview - Render at full size, then scale and center */}
        <div 
          className="bg-white shadow-lg border border-gray-300"
          style={{ 
            width: `${A4_WIDTH}px`,
            height: `${A4_HEIGHT}px`,
            overflow: 'hidden',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: `translate(-50%, -50%) scale(${scale})`,
            transformOrigin: 'center center'
          }}
        >
          <TemplateRenderer
            cvData={cvData}
            template={template as any}
            className="template-preview-content"
            customStyles={{
              width: `${A4_WIDTH}px`,
              height: `${A4_HEIGHT}px`,
              overflow: 'hidden',
              fontSize: `${Math.max(8, Math.round(10 * scale))}px`, // Scale font size proportionally
              lineHeight: '1.4'
            }}
          />
        </div>
      </div>
    );
  }, [cvData, template, scale]);

  if (!previewContent) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-gray-100 rounded-lg ${className}`}>
        <div className="text-center text-gray-500">
          <FileText size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium">No preview available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full ${className}`}>
      {previewContent}
    </div>
  );
};

export default CVPreviewThumbnail;
