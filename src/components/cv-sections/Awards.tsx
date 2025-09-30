import React from 'react';
import { Calendar, Trophy, Award, ExternalLink } from 'lucide-react';
import { UnifiedUnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { ISectionBlueprint, ITemplate } from '@/models/Template';

interface AwardsProps {
  data: UnifiedCVDataStructure['awards'];
  sectionConfig: ISectionBlueprint;
  template: ITemplate;
  cvData: UnifiedCVDataStructure;
}

const Awards: React.FC<AwardsProps> = ({ 
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
    <section className="awards-section">
      <h2 className="section-header">
        {sectionConfig.displayName || 'Awards & Recognition'}
      </h2>
      
      <div className="awards-list">
        {data.map((award, index) => (
          <div key={index} className="award-item">
            <div className="item-header">
              <div className="item-title-group">
                <h3 className="item-title">
                  <Trophy size={16} className="award-icon" />
                  {award.title || 'Award Title'}
                </h3>
                <div className="awarder-info">
                  <Award size={14} className="awarder-icon" />
                  <span className="awarder-name">
                    {award.awarder || 'Award Organization'}
                  </span>
                </div>
              </div>
              
              <div className="item-date">
                <Calendar size={12} />
                <span>
                  {formatDate(award.date)}
                </span>
              </div>
            </div>

            {award.summary && (
              <div className="award-summary">
                <p>{award.summary}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <style jsx>{`
        .awards-section {
          margin-bottom: ${template.globalStyles.spacing};
        }
        
        .awards-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        
        .award-item {
          page-break-inside: avoid;
          padding: 12px 16px;
          border: 1px solid #f59e0b20;
          border-left: 4px solid #f59e0b;
          border-radius: 0 6px 6px 0;
          background: linear-gradient(90deg, rgba(245, 158, 11, 0.03) 0%, transparent 100%);
          transition: all 0.2s ease;
        }
        
        .award-item:hover {
          border-left-color: #d97706;
          background: linear-gradient(90deg, rgba(245, 158, 11, 0.05) 0%, transparent 100%);
          transform: translateX(2px);
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
          margin: 0 0 8px 0;
          line-height: 1.3;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .award-icon {
          color: #f59e0b;
          opacity: 0.9;
        }
        
        .awarder-info {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .awarder-icon {
          color: ${template.globalStyles.secondaryColor};
          opacity: 0.7;
        }
        
        .awarder-name {
          font-size: 11pt;
          color: ${template.globalStyles.secondaryColor};
          font-style: italic;
          font-weight: 500;
        }
        
        .item-date {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10pt;
          color: ${template.globalStyles.secondaryColor};
          white-space: nowrap;
          min-width: 120px;
          justify-content: flex-end;
        }
        
        .award-summary {
          margin-top: 8px;
          color: ${template.globalStyles.primaryColor};
          font-size: ${template.globalStyles.fontSize};
          line-height: ${template.globalStyles.lineHeight};
        }
        
        .award-summary p {
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
        }
        
        @media print {
          .award-item {
            break-inside: avoid;
            border: 1px solid rgba(245, 158, 11, 0.3) !important;
            border-left: 2px solid #f59e0b !important;
            background: none !important;
            transform: none !important;
          }
        }
      `}</style>
    </section>
  );
};

export default Awards;
