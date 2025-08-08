'use client';

import React from 'react';
import { Experience } from '@/lib/stores/cvStore';

interface ExperienceTimelineProps {
  data: Experience[];
  template: any;
}

const ExperienceTimeline: React.FC<ExperienceTimelineProps> = ({ data, template }) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-4" style={{ color: template.globalStyles.primaryColor }}>
        Work Experience
      </h2>
      
      <div className="space-y-4">
        {data.map((exp, index) => (
          <div key={exp.id} className="border-l-4 pl-4" style={{ borderColor: template.globalStyles.primaryColor }}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold text-lg">{exp.jobTitle}</h3>
                <p className="text-gray-600">{exp.company}</p>
                {exp.location && <p className="text-sm text-gray-500">{exp.location}</p>}
              </div>
              <div className="text-right text-sm text-gray-600">
                {exp.startDate && (
                  <span>
                    {new Date(exp.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                )}
                {exp.startDate && exp.endDate && !exp.current && (
                  <span> - {new Date(exp.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                )}
                {exp.current && <span> - Present</span>}
              </div>
            </div>
            
            {exp.description && (
              <p className="text-gray-700 mb-2">{exp.description}</p>
            )}
            
            {exp.achievements && exp.achievements.length > 0 && (
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                {exp.achievements.map((achievement, idx) => (
                  <li key={idx}>{achievement}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExperienceTimeline; 