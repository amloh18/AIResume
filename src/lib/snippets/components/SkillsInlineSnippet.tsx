'use client';

import React from 'react';

interface SkillGroup {
  category?: string;
  skills: string[];
}

interface SkillsInlineSnippetProps {
  skills: SkillGroup[];
  className?: string;
}

export const SkillsInlineSnippet: React.FC<SkillsInlineSnippetProps> = ({
  skills,
  className = '',
}) => {
  return (
    <div className={`skills-inline-list ${className}`} style={{ fontSize: '10.5px', lineHeight: '1.6' }}>
      {skills.map((sg, i) => {
        const skillList = Array.isArray(sg.skills) ? sg.skills : [];
        if (!sg.category && skillList.length === 0) return null;
        return (
          <div key={i} style={{ marginBottom: '3px' }}>
            {sg.category && <span style={{ fontWeight: 700, color: '#111827' }}>{sg.category}: </span>}
            <span style={{ color: '#4b5563' }}>{skillList.join(', ')}</span>
          </div>
        );
      })}
    </div>
  );
};
