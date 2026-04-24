'use client';

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import CVCanvasEngine from '@/components/cv-builder-pro/CVCanvasEngine';

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
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Measure container and calculate render dimensions
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      const container = containerRef.current;
      if (!container) return;

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      if (containerWidth === 0 || containerHeight === 0) return;

      // Calculate dimensions maintaining A4 aspect ratio
      const aspectRatio = A4_WIDTH / A4_HEIGHT;
      let renderWidth = containerWidth;
      let renderHeight = containerWidth / aspectRatio;

      // If height doesn't fit, scale by height instead
      if (renderHeight > containerHeight) {
        renderHeight = containerHeight;
        renderWidth = containerHeight * aspectRatio;
      }

      setDimensions({ width: renderWidth, height: renderHeight });
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const previewContent = useMemo(() => {
    if (!cvData || !template) {
      return null;
    }

    // Calculate font size based on dimensions
    const baseFontSize = Math.max(6, Math.min(10, (dimensions.width / A4_WIDTH) * 10));

    return (
      <div 
        ref={containerRef}
        className="w-full h-full flex items-center justify-center relative overflow-hidden"
      >
        {dimensions.width > 0 && dimensions.height > 0 ? (
          <div 
            className="bg-white shadow-lg relative"
            style={{ 
              width: `${A4_WIDTH}px`,
              height: `${A4_HEIGHT}px`,
              transform: `scale(${dimensions.width / A4_WIDTH})`,
              transformOrigin: 'top left',
              overflow: 'hidden',
              pointerEvents: 'none'
            }}
          >
            <CVCanvasEngine
              cvData={cvData}
              template={template}
              onDataChange={() => {}}
              readOnly={true}
              theme="light"
            />
          </div>
        ) : null}
      </div>
    );
  }, [cvData, template, dimensions]);

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
