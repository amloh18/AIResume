import React from 'react';
import { Code2, Star, Zap } from 'lucide-react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { ISectionBlueprint, ITemplate } from '@/models/Template';

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

  const getSkillLevelIcon = (level?: string) => {
    if (!level) return null;
    
    const normalizedLevel = level.toLowerCase();
    if (normalizedLevel.includes('expert') || normalizedLevel.includes('advanced')) {
      return <Star size={12} className="skill-level-icon expert" />;
    }
    if (normalizedLevel.includes('intermediate') || normalizedLevel.includes('proficient')) {
      return <Zap size={12} className="skill-level-icon intermediate" />;
    }
    return <Code2 size={12} className="skill-level-icon beginner" />;
  };

  const getSkillLevelColor = (level?: string) => {
    if (!level) return template.globalStyles.secondaryColor;
    
    const normalizedLevel = level.toLowerCase();
    if (normalizedLevel.includes('expert') || normalizedLevel.includes('advanced')) {
      return '#059669'; // green
    }
    if (normalizedLevel.includes('intermediate') || normalizedLevel.includes('proficient')) {
      return '#f59e0b'; // amber
    }
    return '#6b7280'; // gray
  };

  return (
    <section className="skills-section">
      <h2 className="section-header">
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
                  {skillGroup.skills.join(', ')}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <style>{`
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
        
        @media print {
          .skill-group {
            break-inside: avoid;
          }
        }
      `}</style>
    </section>
  );
};

export default Skills;
