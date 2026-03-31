'use client';

import React from 'react';

interface SkillGroup {
  category?: string;
  skills: string[];
}

interface SkillsTagsSnippetProps {
  skills: SkillGroup[];
  className?: string;
}

export const SkillsTagsSnippet: React.FC<SkillsTagsSnippetProps> = ({
  skills,
  className = '',
}) => {
  return (
    <div className={`skills-tags ${className}`} style={{ fontSize: '10.5px' }}>
      {skills.map((sg, i) => {
        const skillList = Array.isArray(sg.skills) ? sg.skills : [];
        if (!sg.category && skillList.length === 0) return null;
        return (
          <div key={i} style={{ marginBottom: '8px' }}>
            {sg.category && (
              <div style={{ fontWeight: 700, color: '#111827', marginBottom: '4px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {sg.category}
              </div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {skillList.map((skill, si) => (
                <span
                  key={si}
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    fontSize: '10px',
                    border: '1px solid #e5e7eb',
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
