'use client';

import React from 'react';
import { PersonalInfo } from '@/lib/stores/cvStore';

interface HeaderModernProps {
  data: PersonalInfo;
  template: any;
}

const HeaderModern: React.FC<HeaderModernProps> = ({ data, template }) => {
  return (
    <div className="text-center mb-8 pb-6 border-b-2" style={{ borderColor: template.globalStyles.primaryColor }}>
      <h1 className="text-3xl font-bold mb-2" style={{ color: template.globalStyles.primaryColor }}>
        {data.firstName} {data.lastName}
      </h1>
      
      <div className="text-lg mb-4" style={{ color: template.globalStyles.secondaryColor }}>
        {data.email && <span className="block">{data.email}</span>}
        {data.phone && <span className="block">{data.phone}</span>}
        {data.location && <span className="block">{data.location}</span>}
      </div>
      
      <div className="flex justify-center gap-4 text-sm">
        {data.website && (
          <a href={data.website} target="_blank" rel="noopener noreferrer" 
             style={{ color: template.globalStyles.primaryColor }}>
            Website
          </a>
        )}
        {data.linkedin && (
          <a href={data.linkedin} target="_blank" rel="noopener noreferrer"
             style={{ color: template.globalStyles.primaryColor }}>
            LinkedIn
          </a>
        )}
        {data.github && (
          <a href={data.github} target="_blank" rel="noopener noreferrer"
             style={{ color: template.globalStyles.primaryColor }}>
            GitHub
          </a>
        )}
      </div>
    </div>
  );
};

export default HeaderModern; 