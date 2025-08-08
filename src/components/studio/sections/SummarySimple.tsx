'use client';

import React from 'react';

interface SummarySimpleProps {
  data: { summary: string };
  template: any;
}

const SummarySimple: React.FC<SummarySimpleProps> = ({ data, template }) => {
  if (!data.summary) return null;

  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-3" style={{ color: template.globalStyles.primaryColor }}>
        Professional Summary
      </h2>
      <div 
        className="text-gray-700 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: data.summary }}
      />
    </div>
  );
};

export default SummarySimple; 