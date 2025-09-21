import React from 'react';
import { Calendar, BookOpen, ExternalLink, User } from 'lucide-react';
import { CVDataStructure } from '@/types/cv';
import { ISectionBlueprint, ITemplate } from '@/models/Template';

interface PublicationsProps {
  data: CVDataStructure['publications'];
  sectionConfig: ISectionBlueprint;
  template: ITemplate;
  cvData: CVDataStructure;
}

const Publications: React.FC<PublicationsProps> = ({ 
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
        month: 'long'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <section className="publications-section">
      <h2 className="section-header">
        {sectionConfig.displayName || 'Publications'}
      </h2>
      
      <div className="publications-list">
        {data.map((publication, index) => (
          <div key={index} className="publication-item">
            <div className="item-header">
              <div className="item-title-group">
                <h3 className="item-title">
                  <BookOpen size={16} className="publication-icon" />
                  {publication.name || 'Publication Title'}
                </h3>
                <div className="publication-meta">
                  <div className="publisher-info">
                    <User size={12} className="publisher-icon" />
                    <span className="publisher-name">
                      {publication.publisher || 'Publisher'}
                    </span>
                  </div>
                  {publication.url && (
                    <a 
                      href={publication.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="publication-link"
                      aria-label={`View ${publication.name} publication`}
                    >
                      <ExternalLink size={12} />
                      <span className="link-text">View</span>
                    </a>
                  )}
                </div>
              </div>
              
              <div className="item-date">
                <Calendar size={12} />
                <span>
                  {formatDate(publication.releaseDate)}
                </span>
              </div>
            </div>

            {publication.summary && (
              <div className="publication-summary">
                <p>{publication.summary}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <style jsx>{`
        .publications-section {
          margin-bottom: ${template.globalStyles.spacing};
        }
        
        .publications-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .publication-item {
          page-break-inside: avoid;
          padding: 14px 16px;
          border: 1px solid #6366f120;
          border-left: 4px solid #6366f1;
          border-radius: 0 8px 8px 0;
          background: linear-gradient(90deg, rgba(99, 102, 241, 0.02) 0%, transparent 100%);
          transition: all 0.2s ease;
        }
        
        .publication-item:hover {
          border-left-color: #4f46e5;
          background: linear-gradient(90deg, rgba(99, 102, 241, 0.04) 0%, transparent 100%);
          transform: translateX(2px);
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.1);
        }
        
        .item-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 10px;
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
          margin: 0 0 8px 0;
          line-height: 1.3;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .publication-icon {
          color: #6366f1;
          opacity: 0.9;
        }
        
        .publication-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        
        .publisher-info {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .publisher-icon {
          color: ${template.globalStyles.secondaryColor};
          opacity: 0.7;
        }
        
        .publisher-name {
          font-size: 11pt;
          color: ${template.globalStyles.secondaryColor};
          font-style: italic;
          font-weight: 500;
        }
        
        .publication-link {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #6366f1;
          text-decoration: none;
          font-size: 10pt;
          font-weight: 500;
          transition: color 0.2s ease;
        }
        
        .publication-link:hover {
          color: #4f46e5;
        }
        
        .link-text {
          font-size: 9pt;
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
        
        .publication-summary {
          margin-top: 10px;
          color: ${template.globalStyles.primaryColor};
          font-size: ${template.globalStyles.fontSize};
          line-height: ${template.globalStyles.lineHeight};
          font-style: italic;
        }
        
        .publication-summary p {
          margin: 0;
          text-align: justify;
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
          
          .publication-meta {
            flex-direction: column;
            align-items: flex-start;
            gap: 6px;
          }
        }
        
        @media print {
          .publication-link {
            color: inherit !important;
          }
          
          .publication-item {
            break-inside: avoid;
            border: 1px solid rgba(99, 102, 241, 0.3) !important;
            border-left: 2px solid #6366f1 !important;
            background: none !important;
            transform: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </section>
  );
};

export default Publications;
