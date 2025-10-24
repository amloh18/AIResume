import React from 'react';
import { Calendar, ExternalLink, Award, AlertTriangle } from 'lucide-react';
import { UnifiedUnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { ISectionBlueprint, ITemplate } from '@/models/Template';

interface CertificatesProps {
  data: UnifiedCVDataStructure['certificates'];
  sectionConfig: ISectionBlueprint;
  template: ITemplate;
  cvData: UnifiedCVDataStructure;
}

const Certificates: React.FC<CertificatesProps> = ({ 
  data, 
  sectionConfig, 
  template, 
  cvData 
}) => {
  // Hide section if no data to avoid showing empty headers in preview
  if (!data || data.length === 0) return null;
  
  const certificates = data || [];

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

  const isExpiringSoon = (expiryDate: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(today.getMonth() + 6);
    
    return expiry > today && expiry <= sixMonthsFromNow;
  };

  const isExpired = (expiryDate: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    return expiry < today;
  };

  return (
    <section className="certificates-section">
      <h2 className="section-header">
        {sectionConfig.displayName || 'Certifications'}
      </h2>
      
      <div className="certificates-list">
        {certificates.map((certificate, index) => (
          <div 
            key={index} 
            className={`certificate-item ${
              isExpired(certificate.date) ? 'expired' : 
              isExpiringSoon(certificate.date) ? 'expiring-soon' : ''
            }`}
          >
            <div className="item-header">
              <div className="item-title-group">
                <h3 className="item-title">
                  {certificate.name || 'Certification Name'}, {certificate.issuer || 'Issuing Organization'}
                  {certificate.date && ` (${formatDate(certificate.date)})`}
                </h3>
                {certificate.url && (
                  <div className="certificate-link">
                    {certificate.url}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .certificates-section {
          margin-bottom: ${template.globalStyles.spacing};
        }
        
        .certificates-list {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 12px;
        }
        
        .certificate-item {
          page-break-inside: avoid;
          padding: 12px;
          border: 1px solid ${template.globalStyles.primaryColor}20;
          border-radius: 8px;
          background: ${template.globalStyles.backgroundColor};
          transition: all 0.2s ease;
        }
        
        .certificate-item:hover {
          border-color: ${template.globalStyles.primaryColor}40;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .certificate-item.expired {
          border-color: #dc2626;
          background: #fef2f2;
        }
        
        .certificate-item.expiring-soon {
          border-color: #f59e0b;
          background: #fffbeb;
        }
        
        .item-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }
        
        .item-title-group {
          flex: 1;
          min-width: 0;
        }
        
        .item-title {
          font-size: 11pt;
          font-weight: 600;
          color: ${template.globalStyles.primaryColor};
          margin: 0 0 6px 0;
          line-height: 1.3;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .certificate-icon {
          color: ${template.globalStyles.secondaryColor};
          opacity: 0.8;
        }
        
        .issuer-info {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        
        .issuer-name {
          font-size: 10pt;
          color: ${template.globalStyles.secondaryColor};
          font-style: italic;
          font-weight: 500;
        }
        
        .certificate-link {
          display: flex;
          align-items: center;
          gap: 4px;
          color: ${template.globalStyles.secondaryColor};
          text-decoration: none;
          font-size: 9pt;
          font-weight: 500;
          transition: color 0.2s ease;
        }
        
        .certificate-link:hover {
          color: ${template.globalStyles.primaryColor};
        }
        
        .link-text {
          font-size: 8pt;
        }
        
        .date-info {
          text-align: right;
          white-space: nowrap;
          min-width: 120px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .issue-date {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 9pt;
          color: ${template.globalStyles.secondaryColor};
          justify-content: flex-end;
        }
        
        .expiry-warning {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 8pt;
          font-weight: 600;
          justify-content: flex-end;
        }
        
        .certificate-item.expired .expiry-warning {
          color: #dc2626;
        }
        
        .certificate-item.expiring-soon .expiry-warning {
          color: #f59e0b;
        }
        
        @media (max-width: 768px) {
          .certificates-list {
            grid-template-columns: 1fr;
            gap: 10px;
          }
          
          .item-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          
          .date-info {
            text-align: left;
            min-width: auto;
            flex-direction: row;
            gap: 12px;
          }
          
          .issue-date, .expiry-warning {
            justify-content: flex-start;
          }
        }
        
        @media print {
          .certificate-link {
            color: inherit !important;
          }
          
          .certificate-item {
            break-inside: avoid;
            border: 1px solid rgba(0,0,0,0.2) !important;
            background: white !important;
            box-shadow: none !important;
            transform: none !important;
          }
          
          .certificates-list {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </section>
  );
};

export default Certificates;
