'use client';

import React from 'react';

interface SkillGroup {
  category?: string;
  skills: string[];
}

interface SkillsColumnsSnippetProps {
  skills: SkillGroup[];
  className?: string;
  columns?: number;
}

export const SkillsColumnsSnippet: React.FC<SkillsColumnsSnippetProps> = ({
  skills,
  className = '',
  columns = 2,
}) => {
  return (
    <div
      className={`skills-columns ${className}`}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: '8px',
        fontSize: '10.5px',
      }}
    >
      {skills.map((sg, i) => {
        const skillList = Array.isArray(sg.skills) ? sg.skills : [];
        if (!sg.category && skillList.length === 0) return null;
        return (
          <div key={i}>
            {sg.category && (
              <div style={{ fontWeight: 700, color: '#111827', marginBottom: '2px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {sg.category}
              </div>
            )}
            <div style={{ color: '#4b5563', lineHeight: '1.5' }}>
              {skillList.join(', ')}
            </div>
          </div>
        );
      })}
    </div>
  );
};
