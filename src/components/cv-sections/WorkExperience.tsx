import React from 'react';
import { Calendar, MapPin, ExternalLink } from 'lucide-react';
import { CVDataStructure } from '@/types/cv';
import { ISectionBlueprint, ITemplate } from '@/models/Template';

interface WorkExperienceProps {
  data: CVDataStructure['work'];
  sectionConfig: ISectionBlueprint;
  template: ITemplate;
  cvData: CVDataStructure;
}

const WorkExperience: React.FC<WorkExperienceProps> = ({ 
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
    <section className="work-experience-section">
      <h2 className="section-header">
        {sectionConfig.displayName || 'Work Experience'}
      </h2>
      
      <div className="experience-list">
        {data.map((job, index) => (
          <div key={index} className="experience-item">
            <div className="item-header">
              <div className="item-title-group">
                <h3 className="item-title">
                  {job.position || 'Position Title'}
                </h3>
                <div className="company-info">
                  <span className="company-name">
                    {job.name || 'Company Name'}
                  </span>
                  {job.url && (
                    <a 
                      href={job.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="company-link"
                      aria-label={`Visit ${job.name} website`}
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
                    {formatDateRange(job.startDate, job.endDate)}
                  </span>
                </div>
                {job.startDate && (
                  <div className="duration">
                    {calculateDuration(job.startDate, job.endDate)}
                  </div>
                )}
              </div>
            </div>

            {job.summary && (
              <div className="item-summary">
                <p>{job.summary}</p>
              </div>
            )}

            {job.highlights && job.highlights.length > 0 && (
              <ul className="highlight-list">
                {job.highlights.map((highlight, highlightIndex) => (
                  <li key={highlightIndex}>
                    {highlight}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <style jsx>{`
        .work-experience-section {
          margin-bottom: ${template.globalStyles.spacing};
        }
        
        .experience-list {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        
        .experience-item {
          page-break-inside: avoid;
          margin-bottom: 16px;
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
          margin: 0 0 4px 0;
          line-height: 1.3;
        }
        
        .company-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .company-name {
          font-size: 11pt;
          color: ${template.globalStyles.secondaryColor};
          font-style: italic;
          font-weight: 500;
        }
        
        .company-link {
          color: ${template.globalStyles.secondaryColor};
          text-decoration: none;
          display: flex;
          align-items: center;
        }
        
        .company-link:hover {
          color: ${template.globalStyles.primaryColor};
        }
        
        .item-date-group {
          text-align: right;
          white-space: nowrap;
          min-width: 140px;
        }
        
        .item-date {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 4px;
          font-size: 10pt;
          color: ${template.globalStyles.secondaryColor};
          margin-bottom: 2px;
        }
        
        .duration {
          font-size: 9pt;
          color: ${template.globalStyles.secondaryColor};
          opacity: 0.8;
        }
        
        .item-summary {
          margin: 8px 0;
          color: ${template.globalStyles.primaryColor};
          font-size: ${template.globalStyles.fontSize};
          line-height: ${template.globalStyles.lineHeight};
        }
        
        .item-summary p {
          margin: 0;
          text-align: justify;
        }
        
        .highlight-list {
          margin: 8px 0 0 16px;
          padding: 0;
        }
        
        .highlight-list li {
          margin-bottom: 4px;
          line-height: ${template.globalStyles.lineHeight};
          color: ${template.globalStyles.primaryColor};
          font-size: ${template.globalStyles.fontSize};
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
          }
          
          .item-date {
            justify-content: flex-start;
          }
        }
        
        @media print {
          .company-link {
            color: inherit !important;
          }
          
          .experience-item {
            break-inside: avoid;
          }
        }
      `}</style>
    </section>
  );
};

export default WorkExperience;
