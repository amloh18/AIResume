'use client';

import React from 'react';
import { CustomSection } from '@/lib/stores/cvStore';

interface CustomSectionProps {
  data: CustomSection[];
  template: any;
}

const CustomSectionComponent: React.FC<CustomSectionProps> = ({ data, template }) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="space-y-6">
      {data.map((section) => (
        <div key={section.id} className="mb-6">
          <h2 className="text-xl font-semibold mb-4" style={{ color: template.globalStyles.primaryColor }}>
            {section.title}
          </h2>
          <div className="text-gray-700 whitespace-pre-wrap">
            {section.content}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CustomSectionComponent; 