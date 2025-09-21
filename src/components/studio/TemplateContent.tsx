'use client';

import React from 'react';
import TemplateSelector from './TemplateSelector';
import { ITemplate } from '@/models/Template';
import { CVDataStructure } from '@/types/cv';

interface TemplateContentProps {
  selectedTemplate?: ITemplate | null;
  onTemplateSelect?: (template: ITemplate) => void;
  onTemplatePreview?: (template: ITemplate) => void;
  cvData?: CVDataStructure | null;
}

const TemplateContent: React.FC<TemplateContentProps> = ({
  selectedTemplate,
  onTemplateSelect,
  onTemplatePreview,
  cvData
}) => {
  const handleTemplateSelect = (template: ITemplate) => {
    if (onTemplateSelect) {
      onTemplateSelect(template);
    }
    if (onTemplatePreview) {
      onTemplatePreview(template);
    }
  };

  return (
    <div className="template-content">
      <TemplateSelector
        selectedTemplate={selectedTemplate || null}
        onTemplateSelect={handleTemplateSelect}
        cvData={cvData}
        className="w-full h-full"
      />
      
      <style jsx>{`
        .template-content {
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default TemplateContent;