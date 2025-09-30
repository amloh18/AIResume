import React from 'react';
import { Calendar, GraduationCap, ExternalLink, Award } from 'lucide-react';
import { UnifiedUnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { ISectionBlueprint, ITemplate } from '@/models/Template';

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

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      });
    } catch {
      return dateString;
    }
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = formatDate(startDate);
    const end = endDate ? formatDate(endDate) : 'Present';
    return `${start} - ${end}`;
  };

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
                  }
                </h3>
                <div className="institution-info">
                  <GraduationCap size={14} className="institution-icon" />
                  <span className="institution-name">
                    {education.institution || 'Institution Name'}
                  </span>
                  {education.url && (
                    <a 
                      href={education.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="institution-link"
                      aria-label={`Visit ${education.institution} website`}
                    >
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
              
              <div className="item-date-group">
                <div className="item-date">
                  <Calendar size={12} />
                  <span>
                    {formatDateRange(education.startDate, education.endDate)}
                  </span>
                </div>
                {education.score && (
                  <div className="score">
                    <Award size={12} />
                    <span>{education.score}</span>
                  </div>
                )}
              </div>
            </div>

            {education.courses && education.courses.length > 0 && (
              <div className="courses-section">
                <h4 className="courses-title">Relevant Coursework:</h4>
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
          gap: 16px;
        }
        
        .education-item {
          page-break-inside: avoid;
          margin-bottom: 14px;
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
          font-size: 12pt;
          font-weight: 600;
          color: ${template.globalStyles.primaryColor};
          margin: 0 0 6px 0;
          line-height: 1.3;
        }
        
        .institution-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .institution-icon {
          color: ${template.globalStyles.secondaryColor};
          opacity: 0.8;
        }
        
        .institution-name {
          font-size: 11pt;
          color: ${template.globalStyles.secondaryColor};
          font-style: italic;
          font-weight: 500;
        }
        
        .institution-link {
          color: ${template.globalStyles.secondaryColor};
          text-decoration: none;
          display: flex;
          align-items: center;
        }
        
        .institution-link:hover {
          color: ${template.globalStyles.primaryColor};
        }
        
        .item-date-group {
          text-align: right;
          white-space: nowrap;
          min-width: 140px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .item-date, .score {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 4px;
          font-size: 10pt;
          color: ${template.globalStyles.secondaryColor};
        }
        
        .score {
          font-weight: 500;
          color: ${template.globalStyles.primaryColor};
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
