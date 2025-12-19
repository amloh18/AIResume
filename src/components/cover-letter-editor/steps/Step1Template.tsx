'use client';

import React from 'react';
import { useCoverLetterEditor } from '@/contexts/CoverLetterEditorContext';
import CoverLetterTemplateContent from '@/components/studio/CoverLetterTemplateContent';
import { CoverLetterTemplate } from '@/lib/templates/cover-letter-templates';

export default function Step1Template() {
  const { state, setTemplate } = useCoverLetterEditor();

  const handleTemplateSelect = (template: CoverLetterTemplate) => {
    setTemplate(template);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-[color:var(--text-primary)] mb-2">
          Choose a Template
        </h2>
        <p className="text-sm text-[color:var(--text-secondary)]">
          Select a cover letter template that matches your style
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <CoverLetterTemplateContent
          selectedTemplate={state.selectedTemplate}
          onTemplateSelect={handleTemplateSelect}
        />
      </div>
    </div>
  );
}

