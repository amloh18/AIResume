import React from 'react';
import { Calendar, GraduationCap, ExternalLink, Award } from 'lucide-react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { ISectionBlueprint, ITemplate } from '@/models/Template';
import { parseFormattedText, formatDate, formatDateRange } from '@/lib/utils/textFormatting';

interface EducationProps {
  data: UnifiedCVDataStructure['education'];
  sectionConfig: ISectionBlueprint;
  template: ITemplate;
  cvData: UnifiedCVDataStructure;
}

const Education: React.FC<EducationProps> = ({ 
  data, 
  sectionConfig, 
  template, 
  cvData 
}) => {
  if (!data || data.length === 0) return null;


  return (
    <section className="education-section">
      <h2 className="section-header">
        {sectionConfig.displayName || 'Education'}
      </h2>
      
      <div className="education-list">
        {data.map((education, index) => (
          <div key={index} className="education-item">
            <div className="item-header">
              <div className="item-title-group">
                <h3 className="item-title">
                  {education.studyType && education.area 
                    ? `${education.studyType} in ${education.area}`
                    : education.studyType || education.area || 'Degree Program'
                  }, {education.institution || 'Institution Name'}
                </h3>
              </div>
              
              <div className="item-date-group">
                <div className="item-date">
                  {formatDateRange(education.startDate, education.endDate)}
                </div>
              </div>
            </div>

            {education.description && (
              <div className="education-description">
                <div 
                  dangerouslySetInnerHTML={{ __html: parseFormattedText(education.description) }}
                />
              </div>
            )}
            
            {education.courses && education.courses.length > 0 && (
              <div className="courses-section">
                <div className="courses-list">
                  {education.courses.map((course, courseIndex) => (
                    <span key={courseIndex} className="course-item">
                      {course}
                    </span>
                  )).reduce((prev, curr, index) => [
                    prev, 
                    index < education.courses!.length - 1 ? ', ' : '', 
                    curr
                  ] as any)}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <style jsx>{`
        .education-section {
          margin-bottom: ${template.globalStyles.spacing};
        }
        
        .education-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .education-item {
          page-break-inside: avoid;
          margin-bottom: 10px;
        }
        
        .item-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
          gap: 16px;
        }
        
        .item-title-group {
          flex: 1;
          min-width: 0;
        }
        
        .item-title {
          font-size: ${template.globalStyles.fontSize};
          font-weight: 700;
          color: ${template.globalStyles.primaryColor};
          margin: 0;
          line-height: ${template.globalStyles.lineHeight};
        }
        
        .institution-info {
          display: inline;
        }
        
        .institution-icon {
          display: none;
        }
        
        .institution-name {
          font-size: ${template.globalStyles.fontSize};
          color: ${template.globalStyles.primaryColor};
          font-style: normal;
          font-weight: 400;
        }
        
        .institution-link {
          display: none;
        }
        
        .item-date-group {
          text-align: right;
          white-space: nowrap;
        }
        
        .item-date, .score {
          font-size: ${template.globalStyles.fontSize};
          font-weight: 700;
          color: ${template.globalStyles.primaryColor};
          text-align: right;
        }
        
        .score {
          display: none;
        }
        
        .courses-section {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid rgba(0,0,0,0.05);
        }
        
        .courses-title {
          font-size: 10pt;
          font-weight: 600;
          color: ${template.globalStyles.secondaryColor};
          margin: 0 0 4px 0;
        }
        
        .courses-list {
          font-size: 10pt;
          color: ${template.globalStyles.primaryColor};
          line-height: ${template.globalStyles.lineHeight};
        }
        
        .course-item {
          font-weight: 400;
        }
        
        @media (max-width: 768px) {
          .item-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          
          .item-date-group {
            text-align: left;
            min-width: auto;
            flex-direction: row;
            gap: 12px;
          }
          
          .item-date, .score {
            justify-content: flex-start;
          }
        }
        
        @media print {
          .institution-link {
            color: inherit !important;
          }
          
          .education-item {
            break-inside: avoid;
          }
        }
      `}</style>
    </section>
  );
};

export default Education;
