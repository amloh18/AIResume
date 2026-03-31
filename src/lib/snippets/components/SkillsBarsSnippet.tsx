'use client';

import React from 'react';

interface SkillGroup {
  category?: string;
  skills: string[];
}

interface SkillsBarsSnippetProps {
  skills: SkillGroup[];
  className?: string;
}

export const SkillsBarsSnippet: React.FC<SkillsBarsSnippetProps> = ({
  skills,
  className = '',
}) => {
  return (
    <div className={`skills-bars ${className}`} style={{ fontSize: '10.5px' }}>
      {skills.map((sg, i) => {
        const skillList = Array.isArray(sg.skills) ? sg.skills : [];
        if (!sg.category && skillList.length === 0) return null;
        const barWidth = Math.min(100, 50 + skillList.length * 10);
        return (
          <div key={i} style={{ marginBottom: '8px' }}>
            {sg.category && (
              <div style={{ fontWeight: 700, color: '#111827', marginBottom: '3px', fontSize: '10.5px' }}>
                {sg.category}
              </div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
              {skillList.map((skill, si) => (
                <div key={si} style={{ flex: '1 1 auto', minWidth: '80px' }}>
                  <div style={{ fontSize: '9.5px', color: '#4b5563', marginBottom: '2px' }}>{skill}</div>
                  <div style={{ height: '3px', backgroundColor: '#e5e7eb', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${barWidth - si * 5}%`,
                      backgroundColor: '#111827',
                      borderRadius: '2px',
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
