'use client';

import React from 'react';
import { ITemplate } from '@/types/template';
import { UnifiedCVDataStructure, DEFAULT_UNIFIED_CV_DATA } from '@/types/unified-cv-schema';
// import EnhancedCVPreview from './EnhancedCVPreview'; // TODO: Create component if needed
import CVPreviewContent from './CVPreviewContent';

interface TemplatePreviewProps {
  template: ITemplate;
  cvData?: UnifiedCVDataStructure | null;
  scale?: number;
  className?: string;
}

const TemplatePreview: React.FC<TemplatePreviewProps> = ({
  template,
  cvData,
  scale = 0.3,
  className = ''
}) => {
  // Use provided CV data or empty default structure - no hardcoded sample data
  const sampleCVData: UnifiedCVDataStructure = (cvData as UnifiedCVDataStructure) || DEFAULT_UNIFIED_CV_DATA;

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
        {/* Use enhanced preview if template has availableSections */}
        {/* TODO: Implement EnhancedCVPreview component with full props support */}
        <CVPreviewContent
          cvData={sampleCVData}
        />
      </div>

      {/* Template Name Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
        <p className="text-white text-xs font-medium truncate">{template.name}</p>
      </div>

      {/* Tier Badge */}
      {template.tier === 'premium' && (
        <div className="absolute top-2 right-2 bg-amber-500 text-white text-xs px-2 py-1 rounded-full font-medium">
          Premium
        </div>
      )}

      {/* Default Badge */}
      {template.isDefault && (
        <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
          Default
        </div>
      )}
    </div>
  );
};

export default TemplatePreview;
