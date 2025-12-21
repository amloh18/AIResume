'use client';

import React from 'react';
import { useCoverLetterEditor } from '@/contexts/CoverLetterEditorContext';
// TODO: CoverLetterTemplateContent was deleted - need to reimplement or use alternative
// import CoverLetterTemplateContent from '@/components/studio/CoverLetterTemplateContent';
import { CoverLetterTemplate } from '@/lib/templates/cover-letter-templates';

export default function Step1Template() {
  const { state, setTemplate } = useCoverLetterEditor();

  const handleTemplateSelect = (template: CoverLetterTemplate) => {
    setTemplate(template);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Choose a Template
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-200">
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

