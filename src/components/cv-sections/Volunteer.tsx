import React from 'react';
import { Calendar, Heart, ExternalLink } from 'lucide-react';
import { UnifiedUnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { ISectionBlueprint, ITemplate } from '@/models/Template';

interface VolunteerProps {
  data: UnifiedCVDataStructure['volunteer'];
  sectionConfig: ISectionBlueprint;
  template: ITemplate;
  cvData: UnifiedCVDataStructure;
}

const Volunteer: React.FC<VolunteerProps> = ({ 
  data, 
  sectionConfig, 
  template, 
  cvData 
}) => {
  // Always render the section, even if empty, so users can see the structure
  const volunteer = data || [];

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
    <section className="volunteer-section">
      <h2 className="section-header">
        {sectionConfig.displayName || 'Volunteer Experience'}
      </h2>
      
      <div className="volunteer-list">
        {volunteer.map((volunteerItem, index) => (
          <div key={index} className="volunteer-item">
            <div className="item-header">
              <div className="item-title-group">
                <h3 className="item-title">
                  <Heart size={16} className="volunteer-icon" />
                  {volunteer.position || 'Volunteer Position'}
                </h3>
                <div className="organization-info">
                  <span className="organization-name">
                    {volunteer.organization || 'Organization Name'}
                  </span>
                  {volunteer.url && (
                    <a 
                      href={volunteer.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="organization-link"
                      aria-label={`Visit ${volunteer.organization} website`}
                    >
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
              
              <div className="item-date">
                <Calendar size={12} />
                <span>
                  {formatDateRange(volunteer.startDate, volunteer.endDate)}
                </span>
              </div>
            </div>

            {volunteer.summary && (
              <div className="volunteer-summary">
                <p>{volunteer.summary}</p>
              </div>
            )}

            {volunteer.highlights && volunteer.highlights.length > 0 && (
              <ul className="highlight-list">
                {volunteer.highlights.map((highlight, highlightIndex) => (
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
        .volunteer-section {
          margin-bottom: ${template.globalStyles.spacing};
        }
        
        .volunteer-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .volunteer-item {
          page-break-inside: avoid;
          margin-bottom: 14px;
          border-left: 2px solid #e11d48;
          padding-left: 16px;
          background: linear-gradient(90deg, rgba(225, 29, 72, 0.02) 0%, transparent 100%);
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
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .volunteer-icon {
          color: #e11d48;
          opacity: 0.9;
        }
        
        .organization-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .organization-name {
          font-size: 11pt;
          color: ${template.globalStyles.secondaryColor};
          font-style: italic;
          font-weight: 500;
        }
        
        .organization-link {
          color: ${template.globalStyles.secondaryColor};
          text-decoration: none;
          display: flex;
          align-items: center;
        }
        
        .organization-link:hover {
          color: ${template.globalStyles.primaryColor};
        }
        
        .item-date {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10pt;
          color: ${template.globalStyles.secondaryColor};
          white-space: nowrap;
          min-width: 140px;
          justify-content: flex-end;
        }
        
        .volunteer-summary {
          margin: 8px 0;
          color: ${template.globalStyles.primaryColor};
          font-size: ${template.globalStyles.fontSize};
          line-height: ${template.globalStyles.lineHeight};
        }
        
        .volunteer-summary p {
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
          
          .item-date {
            text-align: left;
            min-width: auto;
            justify-content: flex-start;
          }
        }
        
        @media print {
          .organization-link {
            color: inherit !important;
          }
          
          .volunteer-item {
            break-inside: avoid;
            border-left: 1px solid rgba(225, 29, 72, 0.5) !important;
            background: none !important;
          }
        }
      `}</style>
    </section>
  );
};

export default Volunteer;
