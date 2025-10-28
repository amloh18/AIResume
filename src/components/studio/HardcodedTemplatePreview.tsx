import React from 'react';
import { ITemplate } from '@/models/Template';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { CustomTemplates } from '@/lib/templates/hardcoded-templates';
import TemplateRenderer from '@/lib/templates/template-renderer';

interface HardcodedTemplatePreviewProps {
  template: ITemplate;
  cvData: UnifiedCVDataStructure;
  scale?: number;
  className?: string;
}

const HardcodedTemplatePreview: React.FC<HardcodedTemplatePreviewProps> = ({
  template,
  cvData,
  scale = 0.3,
  className = ''
}) => {
  const previewDimensions = {
    width: 300 * scale,
    height: 400 * scale
  };

  return (
    <div 
      className={`relative bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm ${className}`}
      style={{
        width: previewDimensions.width,
        height: previewDimensions.height
      }}
    >
      {/* Template Preview Content */}
      <div 
        className="absolute inset-0 transform origin-top-left"
        style={{
          transform: `scale(${scale})`,
          width: '300px',
          height: '400px'
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

      {/* Template Name Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-2">
        <h4 className="text-xs font-medium truncate">{template.name}</h4>
        <p className="text-xs opacity-75 truncate">{template.description}</p>
      </div>
    </div>
  );
};

export default HardcodedTemplatePreview;
