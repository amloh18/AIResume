'use client';

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { StaticLayoutRenderer, EditableField } from '@/components/cv-builder-pro/components/CoreUI';
import { CANVAS_TEMPLATES } from '@/components/cv-builder-pro/registry';
import { initialData } from '@/lib/templates/canvas-initial-data';

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

    // Resolve template from CANVAS_TEMPLATES
    const displayTemplate = CANVAS_TEMPLATES.find(t => t.id === template._id || t.id === template.id) || template;
    const design = cvData?.design || initialData.design;

    const ReadOnlyWrapper = function Editable(props: any) {
        return <EditableField {...props} data={cvData || initialData} readOnly={true} />;
    };

    return (
      <div 
        ref={containerRef}
        className="w-full h-full flex items-center justify-center relative overflow-hidden"
      >
        <style dangerouslySetInnerHTML={{
            __html: `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300;1,400&family=Roboto+Mono:wght@300;400;500;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Lora:ital,wght@0,400;0,600;0,700;1,400&display=swap');
            .cv-thumbnail-wrapper {
              /* Variables are provided via inline styles */
            }
            .cv-thumbnail-wrapper .cv-document { 
              font-family: var(--cv-font), sans-serif; color: #111827; font-size: var(--cv-base-size); position: relative; z-index: 10; 
              min-height: var(--cv-page-height);
            }
            .cv-thumbnail-wrapper .cv-document .text-gray-900 { color: #111827 !important; }
            .cv-thumbnail-wrapper .cv-document .text-gray-800 { color: #1f2937 !important; }
            .cv-thumbnail-wrapper .cv-document .text-gray-700 { color: #374151 !important; }
            .cv-thumbnail-wrapper .cv-document .text-gray-600 { color: #4b5563 !important; }
            .cv-thumbnail-wrapper .cv-document .text-gray-500 { color: #6b7280 !important; }
            .cv-thumbnail-wrapper .cv-document .text-gray-400 { color: #9ca3af !important; }
            .cv-thumbnail-wrapper .cv-document .text-gray-300 { color: #d1d5db !important; }
            .cv-thumbnail-wrapper .cv-document .text-gray-200 { color: #e5e7eb !important; }
            .cv-thumbnail-wrapper .cv-document .text-gray-100 { color: #f3f4f6 !important; }
            .cv-thumbnail-wrapper .cv-document .text-white { color: #ffffff !important; }
            .cv-thumbnail-wrapper .cv-name { font-size: calc(var(--cv-base-size) * 2.5); line-height: 1.1; }
            .cv-thumbnail-wrapper .cv-name-narrow { font-size: calc(var(--cv-base-size) * 2.0); line-height: 1.1; }
            .cv-thumbnail-wrapper .cv-role { font-size: calc(var(--cv-base-size) * 1.15); }
            .cv-thumbnail-wrapper .cv-heading { font-size: calc(var(--cv-base-size) * 1.1); }
            .cv-thumbnail-wrapper .cv-title { font-size: calc(var(--cv-base-size) * 1.05); }
            .cv-thumbnail-wrapper .cv-subtitle { font-size: calc(var(--cv-base-size) * 0.95); }
            .cv-thumbnail-wrapper .cv-date { font-size: calc(var(--cv-base-size) * 0.85); }
            .cv-thumbnail-wrapper .cv-contact { font-size: calc(var(--cv-base-size) * 0.85); }
            .cv-thumbnail-wrapper .cv-body { font-size: inherit; line-height: calc(1.6 * var(--cv-spacing)); }
            .cv-thumbnail-wrapper .cv-document p, .cv-thumbnail-wrapper .cv-document ul, .cv-thumbnail-wrapper .cv-document li { font-size: inherit !important; line-height: inherit !important; margin: 0; padding: 0; }
            .cv-thumbnail-wrapper .cv-prose p { margin-bottom: calc(0.3em * var(--cv-spacing)) !important; }
            .cv-thumbnail-wrapper .cv-prose ul { list-style-type: disc; padding-left: 1.2em; margin-top: calc(0.25em * var(--cv-spacing)) !important; margin-bottom: calc(0.25em * var(--cv-spacing)) !important; }
            .cv-thumbnail-wrapper .cv-prose li { margin-bottom: calc(0.15em * var(--cv-spacing)) !important; }
            .cv-thumbnail-wrapper .cv-accent-text { color: var(--cv-accent) !important; }
            .cv-thumbnail-wrapper .cv-accent-bg { background-color: var(--cv-accent) !important; }
            .cv-thumbnail-wrapper .cv-accent-border { border-color: var(--cv-accent) !important; }
            .cv-thumbnail-wrapper .cv-document .cv-gap-sm { gap: calc(0.5rem * var(--cv-spacing)) !important; }
            .cv-thumbnail-wrapper .cv-document .cv-gap-md { gap: calc(0.75rem * var(--cv-spacing)) !important; }
            .cv-thumbnail-wrapper .cv-document .cv-gap-lg { gap: calc(1rem * var(--cv-spacing)) !important; }
          `}} />
        {dimensions.width > 0 && dimensions.height > 0 ? (
          <div 
            className="bg-white shadow-lg relative cv-thumbnail-wrapper"
            style={{ 
              width: `${A4_WIDTH}px`,
              height: `${A4_HEIGHT}px`,
              transform: `scale(${dimensions.width / A4_WIDTH})`,
              transformOrigin: 'top left',
              overflow: 'hidden',
              pointerEvents: 'none',
              '--cv-font': design?.font || 'Inter',
              '--cv-base-size': `${design?.fontSize || 12}px`,
              '--cv-spacing': design?.spacing || 1.0,
              '--cv-accent': design?.accentColor || '#22c55e',
              '--cv-page-margin': `${design?.pageMargin || 40}px`,
              '--cv-sidebar-bg': design?.sidebarBgColor || '#f8fafc',
              '--cv-section-gap': `${design?.sectionGap || 16}px`,
              '--cv-page-width': '210mm',
              '--cv-page-height': '297mm',
            } as React.CSSProperties}
          >
            <StaticLayoutRenderer 
              template={displayTemplate} 
              cvData={cvData || initialData} 
              ReadOnlyWrapper={ReadOnlyWrapper} 
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
