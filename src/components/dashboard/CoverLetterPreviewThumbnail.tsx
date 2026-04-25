'use client';

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import CoverLetterPreview from '@/components/cv-preview/CoverLetterPreview';

interface CoverLetterPreviewThumbnailProps {
  content: string;
  className?: string;
}

const CoverLetterPreviewThumbnail: React.FC<CoverLetterPreviewThumbnailProps> = ({
  content,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // A4 dimensions in pixels
  const A4_WIDTH = 794;
  const A4_HEIGHT = 1123;

  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      const container = containerRef.current;
      if (!container) return;

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      if (containerWidth === 0 || containerHeight === 0) return;

      const aspectRatio = A4_WIDTH / A4_HEIGHT;
      let renderWidth = containerWidth;
      let renderHeight = containerWidth / aspectRatio;

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

    return () => resizeObserver.disconnect();
  }, []);

  const previewContent = useMemo(() => {
    if (!content) return null;

    return (
      <div 
        ref={containerRef}
        className="w-full h-full flex items-center justify-center relative overflow-hidden bg-gray-100"
      >
        <style dangerouslySetInnerHTML={{
          __html: `
            .cv-cl-thumbnail > div {
              padding: 0 !important;
              background: transparent !important;
            }
            .cv-cl-thumbnail .bg-white.shadow-lg.mx-auto {
              box-shadow: none !important;
            }
          `
        }} />
        {dimensions.width > 0 && dimensions.height > 0 ? (
          <div 
            className="bg-white shadow-lg relative cv-cl-thumbnail"
            style={{ 
              width: `${A4_WIDTH}px`,
              height: `${A4_HEIGHT}px`,
              transform: `scale(${dimensions.width / A4_WIDTH})`,
              transformOrigin: 'top left',
              overflow: 'hidden',
              pointerEvents: 'none'
            }}
          >
            <CoverLetterPreview 
              content={content}
              cvData={{}}
              jobData={{}}
              selectedCVData={{}}
              pageSize="A4"
            />
          </div>
        ) : null}
      </div>
    );
  }, [content, dimensions]);

  if (!previewContent) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-gray-100 rounded-lg ${className}`}>
        <div className="text-center text-gray-500">
          <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
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

export default CoverLetterPreviewThumbnail;
