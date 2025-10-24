import React from 'react';
import { Globe, Star } from 'lucide-react';
import { UnifiedUnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { ISectionBlueprint, ITemplate } from '@/models/Template';

interface LanguagesProps {
  data: UnifiedCVDataStructure['languages'];
  sectionConfig: ISectionBlueprint;
  template: ITemplate;
  cvData: UnifiedCVDataStructure;
}

const Languages: React.FC<LanguagesProps> = ({ 
  data, 
  sectionConfig, 
  template, 
  cvData 
}) => {
  // Hide section if no data to avoid showing empty headers in preview
  if (!data || data.length === 0) return null;
  
  const languages = data || [];

  const getProficiencyLevel = (fluency: string): number => {
    const normalizedFluency = fluency.toLowerCase();
    if (normalizedFluency.includes('native') || normalizedFluency.includes('bilingual')) return 5;
    if (normalizedFluency.includes('fluent') || normalizedFluency.includes('advanced')) return 4;
    if (normalizedFluency.includes('intermediate') || normalizedFluency.includes('conversational')) return 3;
    if (normalizedFluency.includes('basic') || normalizedFluency.includes('elementary')) return 2;
    if (normalizedFluency.includes('beginner')) return 1;
    return 3; // Default to intermediate
  };

  const getProficiencyColor = (fluency: string): string => {
    const level = getProficiencyLevel(fluency);
    if (level >= 5) return '#059669'; // green for native/bilingual
    if (level >= 4) return '#0d9488'; // teal for fluent/advanced
    if (level >= 3) return '#f59e0b'; // amber for intermediate
    if (level >= 2) return '#ec4899'; // pink for basic
    return '#6b7280'; // gray for beginner
  };

  const renderProficiencyStars = (fluency: string) => {
    const level = getProficiencyLevel(fluency);
    const stars = [];
    const color = getProficiencyColor(fluency);
    
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star 
          key={i} 
          size={10} 
          className={`proficiency-star ${i <= level ? 'filled' : 'empty'}`}
          style={{ color: i <= level ? color : '#e5e7eb' }}
          fill={i <= level ? color : 'none'}
        />
      );
    }
    
    return stars;
  };

  const formatFluency = (fluency: string): string => {
    return fluency.charAt(0).toUpperCase() + fluency.slice(1).toLowerCase();
  };

  return (
    <section className="languages-section">
      <h2 className="section-header">
        {sectionConfig.displayName || 'Languages'}
      </h2>
      
      <div className="languages-container">
        {languages.map((language, index) => (
          <div key={index} className="language-item">
            <div className="language-header">
              <div className="language-name-group">
                <h3 className="language-name">
                  {language.language || 'Language'}
                </h3>
              </div>
              
              <div className="proficiency-group">
                <span className="proficiency-text">
                  {formatFluency(language.fluency)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .languages-section {
          margin-bottom: ${template.globalStyles.spacing};
        }
        
        .languages-container {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        
        .language-item {
          page-break-inside: avoid;
          padding: 10px 12px;
          border: 1px solid ${template.globalStyles.primaryColor}15;
          border-radius: 6px;
          background: ${template.globalStyles.backgroundColor};
          transition: all 0.2s ease;
        }
        
        .language-item:hover {
          border-color: ${template.globalStyles.primaryColor}30;
          transform: translateY(-1px);
          box-shadow: 0 2px 6px rgba(0,0,0,0.08);
        }
        
        .language-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }
        
        .language-name-group {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          min-width: 0;
        }
        
        .language-icon {
          color: ${template.globalStyles.secondaryColor};
          opacity: 0.8;
          flex-shrink: 0;
        }
        
        .language-name {
          font-size: 11pt;
          font-weight: 600;
          color: ${template.globalStyles.primaryColor};
          margin: 0;
          line-height: 1.3;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .proficiency-group {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
          flex-shrink: 0;
        }
        
        .proficiency-stars {
          display: flex;
          gap: 2px;
        }
        
        .proficiency-star {
          transition: all 0.2s ease;
        }
        
        .proficiency-text {
          font-size: 8pt;
          color: ${template.globalStyles.secondaryColor};
          font-weight: 500;
          text-transform: capitalize;
          white-space: nowrap;
        }
        
        @media (max-width: 768px) {
          .languages-container {
            grid-template-columns: 1fr;
            gap: 10px;
          }
          
          .language-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          
          .proficiency-group {
            flex-direction: row;
            align-items: center;
            gap: 8px;
            align-self: stretch;
            justify-content: space-between;
          }
        }
        
        @media print {
          .language-item {
            break-inside: avoid;
            border: 1px solid rgba(0,0,0,0.2) !important;
            background: white !important;
            box-shadow: none !important;
            transform: none !important;
          }
          
          .proficiency-star {
            color: ${template.globalStyles.primaryColor} !important;
          }
          
          .proficiency-star.filled {
            fill: ${template.globalStyles.primaryColor} !important;
          }
          
          .proficiency-star.empty {
            fill: none !important;
            color: #e5e7eb !important;
          }
          
          .languages-container {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>
    </section>
  );
};

export default Languages;
