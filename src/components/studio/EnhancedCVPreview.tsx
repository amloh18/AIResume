import React from 'react';
import { UnifiedUnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { ITemplate } from '@/models/Template';
import { TemplateRenderer } from '@/lib/templates/template-renderer';

interface EnhancedCVPreviewProps {
  cvData: UnifiedCVDataStructure | null;
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
      
      {/* Render content in fixed-height page containers */}
      <div className="cv-pages-container">
        <div 
          className="cv-page"
          style={{
            width: '210mm', // A4 width
            minHeight: '297mm', // A4 height
            paddingTop: `${pagePadding.top}px`,
            paddingBottom: `${pagePadding.bottom}px`,
            paddingLeft: '32px',
            paddingRight: '32px',
            background: 'white',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            marginBottom: '20px',
            overflow: 'visible',
            position: 'relative'
          }}
        >
          <TemplateRenderer
            cvData={cvData}
            template={template}
            sectionOrder={['personal_header', ...(sectionOrder?.filter(s => s !== 'personal_header') || ['work_experience', 'education', 'skills', 'projects', 'certificates', 'languages'])]}
            sectionVisibility={sectionVisibility}
            enabledSections={enabledSections}
            className="template-rendered-content"
          />
        </div>
      </div>

      <style jsx>{`
        .enhanced-cv-preview {
          width: 100%;
          height: auto;
          background: transparent;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px 0;
        }
        
        .cv-pages-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          width: 100%;
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
        
        :global(.template-rendered-content) {
          width: 100%;
          height: auto;
          display: flex;
          flex-direction: column;
        }
        
        /* A4 Page Container */
        :global(.cv-page) {
          display: block;
          position: relative;
        }
        
        /* Page Break Handling */
        :global(.enhanced-cv-preview .section) {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        :global(.enhanced-cv-preview .section-item) {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        /* Avoid orphaned headings */
        :global(.enhanced-cv-preview h1),
        :global(.enhanced-cv-preview h2),
        :global(.enhanced-cv-preview h3) {
          page-break-after: avoid;
          break-after: avoid;
        }
        
        @media print {
          .enhanced-cv-preview {
            width: 210mm;
            margin: 0;
            padding: 0;
            background: white;
          }
          
          :global(.cv-page) {
            box-shadow: none;
            margin-bottom: 0;
            page-break-after: always;
            page-break-inside: avoid;
          }
          
          .template-badge {
            display: none;
          }
        }
        
        @media (max-width: 768px) {
          :global(.cv-page) {
            width: 100% !important;
            min-height: auto !important;
            padding-left: 16px !important;
            padding-right: 16px !important;
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
