import React from 'react';
import { Code2, Star, Zap } from 'lucide-react';
import { UnifiedUnifiedCVDataStructure } from '@/types/unified-cv-schema';
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
            <div className="skill-header">
              <h3 className="skill-category-title">
                {skillGroup.name || 'Skills'}
              </h3>
              {skillGroup.level && (
                <div className="skill-level">
                  {getSkillLevelIcon(skillGroup.level)}
                  <span className="skill-level-text">
                    {skillGroup.level}
                  </span>
                </div>
              )}
            </div>
            
            {skillGroup.keywords && skillGroup.keywords.length > 0 && (
              <div className="skill-tags">
                {skillGroup.keywords.map((skill, skillIndex) => (
                  <span 
                    key={skillIndex} 
                    className="skill-tag"
                    style={{
                      borderColor: getSkillLevelColor(skillGroup.level) + '40',
                      backgroundColor: getSkillLevelColor(skillGroup.level) + '15',
                      color: getSkillLevelColor(skillGroup.level)
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <style jsx>{`
        .skills-section {
          margin-bottom: ${template.globalStyles.spacing};
        }
        
        .skills-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
        }
        
        .skill-group {
          page-break-inside: avoid;
          margin-bottom: 12px;
        }
        
        .skill-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          gap: 12px;
        }
        
        .skill-category-title {
          font-size: 11pt;
          font-weight: 600;
          color: ${template.globalStyles.primaryColor};
          margin: 0;
          line-height: 1.3;
        }
        
        .skill-level {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 9pt;
          color: ${template.globalStyles.secondaryColor};
          white-space: nowrap;
        }
        
        .skill-level-icon {
          opacity: 0.8;
        }
        
        .skill-level-icon.expert {
          color: #059669;
        }
        
        .skill-level-icon.intermediate {
          color: #f59e0b;
        }
        
        .skill-level-icon.beginner {
          color: #6b7280;
        }
        
        .skill-level-text {
          font-weight: 500;
          text-transform: capitalize;
        }
        
        .skill-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        
        .skill-tag {
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 9pt;
          font-weight: 500;
          border: 1px solid;
          white-space: nowrap;
          transition: all 0.2s ease;
        }
        
        .skill-tag:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        @media (max-width: 768px) {
          .skills-container {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          
          .skill-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }
        }
        
        @media print {
          .skill-tag {
            border: 1px solid rgba(0,0,0,0.3) !important;
            background: rgba(0,0,0,0.05) !important;
            color: ${template.globalStyles.primaryColor} !important;
          }
          
          .skill-group {
            break-inside: avoid;
          }
          
          .skills-container {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </section>
  );
};

export default Skills;
