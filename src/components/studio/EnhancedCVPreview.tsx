import React from 'react';
import { CVDataStructure } from '@/types/cv';
import { ITemplate } from '@/models/Template';
import { TemplateRenderer } from '@/lib/templates/template-renderer';

interface EnhancedCVPreviewProps {
  cvData: CVDataStructure | null;
  template: ITemplate | null;
  theme?: 'light' | 'dark';
  showBadge?: boolean;
  sectionOrder?: string[];
  sectionVisibility?: Record<string, boolean>;
  pagePadding?: { top: number; bottom: number };
  className?: string;
  enabledSections?: string[];
}

const EnhancedCVPreview: React.FC<EnhancedCVPreviewProps> = ({
  cvData,
  template,
  theme = 'light',
  showBadge = false,
  sectionOrder,
  sectionVisibility = {},
  pagePadding = { top: 32, bottom: 32 },
  className = '',
  enabledSections
}) => {
  // Show placeholder if no data or template
  if (!cvData || !template) {
    return (
      <div className={`cv-preview-placeholder ${className}`}>
        <div className="placeholder-content">
          <div className="placeholder-header">
            <div className="placeholder-title" />
            <div className="placeholder-subtitle" />
          </div>
          <div className="placeholder-sections">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="placeholder-section">
                <div className="placeholder-section-title" />
                <div className="placeholder-section-content">
                  <div className="placeholder-line" />
                  <div className="placeholder-line" />
                  <div className="placeholder-line short" />
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <style jsx>{`
          .cv-preview-placeholder {
            width: 100%;
            height: 100%;
            background: white;
            padding: ${pagePadding.top}px 32px ${pagePadding.bottom}px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .placeholder-content {
            width: 100%;
            max-width: 600px;
            opacity: 0.3;
          }
          
          .placeholder-header {
            margin-bottom: 40px;
            text-align: center;
          }
          
          .placeholder-title {
            height: 32px;
            background: #e5e7eb;
            border-radius: 4px;
            margin-bottom: 12px;
          }
          
          .placeholder-subtitle {
            height: 20px;
            background: #e5e7eb;
            border-radius: 4px;
            width: 60%;
            margin: 0 auto;
          }
          
          .placeholder-sections {
            display: flex;
            flex-direction: column;
            gap: 32px;
          }
          
          .placeholder-section {
            width: 100%;
          }
          
          .placeholder-section-title {
            height: 24px;
            background: #d1d5db;
            border-radius: 4px;
            margin-bottom: 16px;
            width: 40%;
          }
          
          .placeholder-section-content {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          
          .placeholder-line {
            height: 16px;
            background: #e5e7eb;
            border-radius: 4px;
          }
          
          .placeholder-line.short {
            width: 70%;
          }
          
          @media print {
            .cv-preview-placeholder {
              display: none;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`enhanced-cv-preview ${className}`}>
      {showBadge && (
        <div className="template-badge">
          <span className="template-name">{template.name}</span>
          <span className="template-tier">{template.tier}</span>
        </div>
      )}
      
      <div 
        className="cv-content"
        style={{
          paddingTop: `${pagePadding.top}px`,
          paddingBottom: `${pagePadding.bottom}px`,
        }}
      >
        <TemplateRenderer
          cvData={cvData}
          template={template}
          sectionOrder={sectionOrder}
          sectionVisibility={sectionVisibility}
          enabledSections={enabledSections}
          className="template-rendered-content"
        />
      </div>

      <style jsx>{`
        .enhanced-cv-preview {
          width: 100%;
          height: 100%;
          background: white;
          position: relative;
          overflow: hidden;
        }
        
        .template-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 20px;
          font-size: 10px;
          font-weight: 500;
          color: #374151;
          backdrop-filter: blur(4px);
          z-index: 10;
        }
        
        .template-name {
          color: #1f2937;
          font-weight: 600;
        }
        
        .template-tier {
          background: ${template.tier === 'premium' ? '#f59e0b' : '#10b981'};
          color: white;
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .cv-content {
          width: 100%;
          height: 100%;
          padding-left: 32px;
          padding-right: 32px;
        }
        
        :global(.template-rendered-content) {
          width: 100%;
          min-height: 100%;
        }
        
        @media print {
          .enhanced-cv-preview {
            width: 8.5in;
            min-height: 11in;
            margin: 0;
            padding: 0;
            background: white;
            box-shadow: none;
          }
          
          .template-badge {
            display: none;
          }
          
          .cv-content {
            padding: 0.5in;
          }
        }
        
        @media (max-width: 768px) {
          .cv-content {
            padding-left: 16px;
            padding-right: 16px;
          }
          
          .template-badge {
            top: 8px;
            right: 8px;
            padding: 4px 8px;
            font-size: 9px;
          }
        }
      `}</style>
    </div>
  );
};

export default EnhancedCVPreview;
