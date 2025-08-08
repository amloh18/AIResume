'use client';

import React from 'react';
import { Skill } from '@/lib/stores/cvStore';

interface SkillsSectionProps {
  data: Skill[];
  template: any;
}

const SkillsSection: React.FC<SkillsSectionProps> = ({ data, template }) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-4" style={{ color: template.globalStyles.primaryColor }}>
        Skills
      </h2>
      
      <div className="space-y-4">
        {data.map((skill) => (
          <div key={skill.id} className="mb-3">
            <h3 className="font-medium text-lg mb-2">{skill.category}</h3>
            <div className="flex flex-wrap gap-2">
              {skill.skills.map((skillName, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm"
                  style={{ backgroundColor: template.globalStyles.primaryColor + '20', color: template.globalStyles.primaryColor }}
                >
                  {skillName}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SkillsSection; 