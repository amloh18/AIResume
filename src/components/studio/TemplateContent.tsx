'use client';

import React from 'react';
import TemplateSelector from './TemplateSelector';
import { ITemplate } from '@/types/template';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { useTemplateStore } from '@/lib/stores/templateStore';

interface TemplateContentProps {
  selectedTemplate?: ITemplate | null;
  onTemplateSelect?: (template: ITemplate) => void;
  onTemplatePreview?: (template: ITemplate) => void;
  cvData?: UnifiedCVDataStructure | null;
}

const TemplateContent: React.FC<TemplateContentProps> = ({
  selectedTemplate,
  onTemplateSelect,
  onTemplatePreview,
  cvData
}) => {
  const { selectedTemplate: globalSelectedTemplate, setSelectedTemplate } = useTemplateStore();

  const handleTemplateSelect = (template: ITemplate) => {
    // Update the global template store
    setSelectedTemplate(template);
    
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
        selectedTemplate={globalSelectedTemplate || null}
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