import React from 'react';
import { Code2, Star, Zap } from 'lucide-react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { ISectionBlueprint, ITemplate } from '@/models/Template';
import { appendEnforcedCSS } from '@/lib/templates/shared-layout-css';

interface SkillsProps {
  data: UnifiedCVDataStructure['skills'];
  sectionConfig: ISectionBlueprint;
  template: ITemplate;
  cvData: UnifiedCVDataStructure;
}

const Skills: React.FC<SkillsProps> = ({ 
  data, 
  sectionConfig, 
  template, 
  cvData 
}) => {
  if (!data || data.length === 0) return null;

  return (
    <section className="skills-section section-content">
      <h2 className="section-header cv-section-header">
        {sectionConfig.displayName || 'Skills'}
      </h2>
      
      <div className="skills-container">
        {data.map((skillGroup, index) => (
          <div key={index} className="skill-group">
            <div className="skill-category">
              <span className="skill-category-title">
                {skillGroup.category || 'Skills'}:
              </span>
              {skillGroup.skills && skillGroup.skills.length > 0 && (
                <span className="skill-list">
                  {skillGroup.skills.map((skill, skillIndex) => (
                    <span key={skillIndex} className="skill-name">
                      {skill}{skillIndex < skillGroup.skills.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <style>{appendEnforcedCSS(`
        .skills-section {
          margin-bottom: ${template.globalStyles.spacing};
        }
        
        .skills-container {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        
        .skill-group {
          page-break-inside: avoid;
          break-inside: avoid;
          margin-bottom: 0;
        }
        
        .skill-category {
          display: block;
          line-height: ${template.globalStyles.lineHeight};
        }
        
        .skill-category-title {
          font-size: ${template.globalStyles.fontSize};
          font-weight: 700;
          color: ${template.globalStyles.primaryColor};
          margin: 0;
          display: inline;
          margin-right: 6px;
        }
        
        .skill-list {
          font-size: ${template.globalStyles.fontSize};
          font-weight: 400;
          color: ${template.globalStyles.primaryColor};
          display: inline;
          line-height: ${template.globalStyles.lineHeight};
        }

        .skill-name {
          white-space: nowrap;
        }
        
        @media print {
          .section-header,
          .cv-section-header {
            break-after: avoid;
          }
          .skill-group {
            break-inside: avoid;
          }
        }
      `)}</style>
    </section>
  );
};

export default Skills;
