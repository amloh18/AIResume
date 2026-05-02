'use client';

import React, { useEffect, useRef, useState } from 'react';
import { FileText } from 'lucide-react';
import CVSnapshotDocument, {
  CV_SNAPSHOT_A4_HEIGHT,
  CV_SNAPSHOT_A4_WIDTH,
} from '@/components/cv-builder-pro/CVSnapshotDocument';

interface CVPreviewThumbnailProps {
  cvData: any;
  template?: any;
  className?: string;
}

const CVPreviewThumbnail: React.FC<CVPreviewThumbnailProps> = ({
  cvData,
  template,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      const container = containerRef.current;
      if (!container) return;

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      if (containerWidth === 0 || containerHeight === 0) return;

      const aspectRatio = CV_SNAPSHOT_A4_WIDTH / CV_SNAPSHOT_A4_HEIGHT;
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

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  if (!cvData || !template) {
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
    <div ref={containerRef} className={`w-full h-full flex items-center justify-center relative overflow-hidden ${className}`}>
      {dimensions.width > 0 && dimensions.height > 0 ? (
        <div
          style={{
            width: `${CV_SNAPSHOT_A4_WIDTH}px`,
            height: `${CV_SNAPSHOT_A4_HEIGHT}px`,
            transform: `scale(${dimensions.width / CV_SNAPSHOT_A4_WIDTH})`,
            transformOrigin: 'top left',
          }}
        >
          <CVSnapshotDocument cvData={cvData} template={template} documentClassName="shadow-lg" />
        </div>
      ) : null}
    </div>
  );
};

export default CVPreviewThumbnail;
