'use client';

import React, { useMemo } from 'react';
import { FileText } from 'lucide-react';
import { TemplateRenderer } from '@/lib/templates/template-renderer';

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
  const previewContent = useMemo(() => {
    if (!cvData || !template) {
      return null;
    }

    // A4 dimensions in pixels (210mm x 297mm at 96 DPI)
    const a4Width = 794; // 210mm * 96/25.4
    const a4Height = 1123; // 297mm * 96/25.4
    const scale = 0.15; // Scale down to fit in card
    const scaledWidth = a4Width * scale;
    const scaledHeight = a4Height * scale;

    return (
      <div 
        className="w-full h-full flex items-center justify-center"
        style={{ 
          backgroundColor: '#f8f9fa'
        }}
      >
        {/* A4 Document Preview */}
        <div 
          className="shadow-lg border border-gray-300"
          style={{ 
            width: `${scaledWidth}px`,
            height: `${scaledHeight}px`,
            overflow: 'hidden'
          }}
        >
          <TemplateRenderer
            cvData={cvData}
            template={template}
            className="template-preview-content"
            customStyles={{
              height: '100%',
              overflow: 'hidden',
              fontSize: '10px' // Smaller font for preview
            }}
          />
        </div>
      </div>
    );
  }, [cvData, template]);

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
