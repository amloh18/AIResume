import React from 'react';
import { Calendar, MapPin, ExternalLink } from 'lucide-react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { ISectionBlueprint, ITemplate } from '@/models/Template';
import { renderFormattedText, formatDate, formatDateRange } from '@/lib/utils/textFormatting';

interface WorkExperienceProps {
  data: UnifiedCVDataStructure['work'];
  sectionConfig: ISectionBlueprint;
  template: ITemplate;
  cvData: UnifiedCVDataStructure;
}

const WorkExperience: React.FC<WorkExperienceProps> = ({ 
  data, 
  sectionConfig, 
  template, 
  cvData 
}) => {
  // Don't render if no data
  if (!data || data.length === 0) return null;
  
  const work = data;


  const calculateDuration = (startDate: string, endDate: string) => {
    if (!startDate) return '';
    
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    
    if (years > 0 && months > 0) {
      return `(${years} yr${years > 1 ? 's' : ''} ${months} mo${months > 1 ? 's' : ''})`;
    } else if (years > 0) {
      return `(${years} yr${years > 1 ? 's' : ''})`;
    } else if (months > 0) {
      return `(${months} mo${months > 1 ? 's' : ''})`;
    }
    return '';
  };

  return (
    <section 
      className="work-experience-section section-content" 
      data-section-id="work_experience"
      data-section-type="work"
    >
      <h2 className="section-header cv-section-header">
        {sectionConfig.displayName || 'Work Experience'}
      </h2>
      
      <div className="experience-list">
        {work.map((job, index) => (
          <div 
            key={index} 
            className="experience-item work-experience-item cv-entry-item"
            data-entry-index={index}
          >
            <div className="item-header entry-header">
              <div className="item-title-group">
                <h3 className="item-title">
                  {job.position || 'Position Title'}, {job.name || 'Company Name'}
                </h3>
              </div>
              
              <div className="item-date-group">
                <div className="item-date">
                  {formatDateRange(job.startDate, job.endDate)}
                </div>
              </div>
            </div>

            {job.summary && (
              <div 
                className="item-summary entry-content item-content"
                dangerouslySetInnerHTML={{ __html: renderFormattedText(job.summary) }}
              />
            )}
          </div>
        ))}
      </div>

      <style>{`
        .work-experience-section {
          margin-bottom: ${template.globalStyles.spacing};
        }
        
        .experience-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .experience-item {
          page-break-inside: avoid;
          margin-bottom: 12px;
        }
        
        .item-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 6px;
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
        
        .company-info {
          display: inline;
        }
        
        .company-name {
          font-size: ${template.globalStyles.fontSize};
          color: ${template.globalStyles.primaryColor};
          font-style: normal;
          font-weight: 400;
        }
        
        .company-link {
          color: ${template.globalStyles.primaryColor};
          text-decoration: none;
          display: none;
        }
        
        .item-date-group {
          text-align: right;
          white-space: nowrap;
        }
        
        .item-date {
          font-size: ${template.globalStyles.fontSize};
          font-weight: 700;
          color: ${template.globalStyles.primaryColor};
          text-align: right;
        }
        
        .duration {
          display: none;
        }
        
        .item-summary {
          margin: 4px 0;
          color: ${template.globalStyles.primaryColor};
          font-size: ${template.globalStyles.fontSize};
          line-height: ${template.globalStyles.lineHeight};
        }
        
        .item-summary p {
          margin: 0;
          text-align: left;
        }
        
        @media print {
          .experience-item {
            break-inside: avoid;
          }
        }
      `}</style>
    </section>
  );
};

export default WorkExperience;
