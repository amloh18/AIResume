import React from 'react';
import { Calendar, GraduationCap, ExternalLink, Award } from 'lucide-react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { ISectionBlueprint, ITemplate } from '@/models/Template';
import { parseFormattedText, formatDateRange, stripHtmlTags } from '@/lib/utils/textFormatting';
import { generateEnforcedCSS } from '@/lib/templates/shared-layout-css';

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
    <section 
      className="education-section section-content"
      data-section-id="education"
      data-section-type="education"
    >
      <h2 className="section-header cv-section-header">
        {sectionConfig.displayName || 'Education'}
      </h2>
      
      <div className="education-list entry-list">
        {data.map((education, index) => (
          <div 
            key={index} 
            className="education-item cv-entry-item entry-block"
            data-entry-index={index}
          >
            <div className="item-header entry-header">
              <div className="item-title-group">
                <h3 className="item-title">
                  {education.studyType && education.area 
                    ? `${education.studyType} in ${education.area}`
                    : education.studyType || education.area || 'Degree Program'
                  }
                </h3>
                <div className="item-subtitle">
                  {education.institution || 'Institution Name'}
                </div>
              </div>
              
              <div className="item-date-group">
                <div className="item-date">
                  {formatDateRange(education.startDate, education.endDate)}
                </div>
              </div>
            </div>

            {education.score && education.score.trim() && (
              <div className="item-gpa">
                GPA: {education.score}
              </div>
            )}

            {education.description && (
              <div className="education-description entry-content item-content">
                {(education as any).showBullets ? (
                  <ul>
                    {stripHtmlTags(education.description)
                      .split('\n')
                      .map(line => line.trim())
                      .filter(Boolean)
                      .map(line => line.replace(/^[•\-*◦▪]\s*/, ''))
                      .map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                  </ul>
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: parseFormattedText(education.description) }} />
                )}
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

      <style>{`
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
          break-inside: avoid;
        }

        .item-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 4px;
          gap: 16px;
        }

        .item-title-group {
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }

        .item-title {
          font-size: ${template.globalStyles.fontSize};
          font-weight: 700;
          color: ${template.globalStyles.primaryColor};
          margin: 0;
          line-height: ${template.globalStyles.lineHeight};
        }

        .item-subtitle {
          font-size: ${template.globalStyles.fontSize};
          color: ${template.globalStyles.secondaryColor};
          font-weight: 400;
          margin-top: 1px;
        }

        .item-gpa {
          font-size: ${template.globalStyles.fontSize};
          color: ${template.globalStyles.secondaryColor};
          margin-top: 2px;
        }

        .item-date-group {
          text-align: right;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .item-date {
          font-size: ${template.globalStyles.fontSize};
          font-weight: 700;
          color: ${template.globalStyles.primaryColor};
          text-align: right;
        }

        .education-description {
          max-width: 75%;
        }

        .education-description p {
          orphans: 2;
          widows: 2;
        }

        .education-description ul {
          margin: 4px 0;
          padding-left: 18px;
        }

        .education-description li {
          orphans: 2;
          widows: 2;
        }

        .courses-section {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid rgba(0,0,0,0.05);
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
        }

        @media print {
          .education-item,
          .cv-entry-item {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .section-header,
          .cv-section-header {
            break-after: avoid;
          }
        }

        ${generateEnforcedCSS()}
      `}</style>
    </section>
  );
};

export default Education;
