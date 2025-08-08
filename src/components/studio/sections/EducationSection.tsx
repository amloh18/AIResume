'use client';

import React from 'react';
import { Education } from '@/lib/stores/cvStore';

interface EducationSectionProps {
  data: Education[];
  template: any;
}

const EducationSection: React.FC<EducationSectionProps> = ({ data, template }) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-4" style={{ color: template.globalStyles.primaryColor }}>
        Education
      </h2>
      
      <div className="space-y-4">
        {data.map((edu) => (
          <div key={edu.id} className="border-l-4 pl-4" style={{ borderColor: template.globalStyles.primaryColor }}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold text-lg">{edu.degree}</h3>
                <p className="text-gray-600">{edu.institution}</p>
                {edu.field && <p className="text-gray-600">{edu.field}</p>}
                {edu.location && <p className="text-sm text-gray-500">{edu.location}</p>}
              </div>
              <div className="text-right text-sm text-gray-600">
                {edu.startDate && (
                  <span>
                    {new Date(edu.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                )}
                {edu.startDate && edu.endDate && !edu.current && (
                  <span> - {new Date(edu.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                )}
                {edu.current && <span> - Present</span>}
              </div>
            </div>
            
            {edu.gpa && <p className="text-sm text-gray-600 mb-2">GPA: {edu.gpa}</p>}
            {edu.description && <p className="text-gray-700">{edu.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default EducationSection; 