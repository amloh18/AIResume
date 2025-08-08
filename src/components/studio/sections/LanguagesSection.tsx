'use client';

import React from 'react';
import { Language } from '@/lib/stores/cvStore';

interface LanguagesSectionProps {
  data: Language[];
  template: any;
}

const LanguagesSection: React.FC<LanguagesSectionProps> = ({ data, template }) => {
  if (!data || data.length === 0) return null;

  const getProficiencyColor = (proficiency: string) => {
    switch (proficiency) {
      case 'native': return 'text-green-600';
      case 'advanced': return 'text-blue-600';
      case 'intermediate': return 'text-yellow-600';
      case 'basic': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-4" style={{ color: template.globalStyles.primaryColor }}>
        Languages
      </h2>
      
      <div className="flex flex-wrap gap-4">
        {data.map((lang) => (
          <div key={lang.id} className="flex items-center gap-2">
            <span className="font-medium">{lang.language}</span>
            <span className={`text-sm ${getProficiencyColor(lang.proficiency)}`}>
              ({lang.proficiency})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LanguagesSection; 