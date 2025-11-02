'use client';

import React, { useState } from 'react';
import { Crown, Star, Check } from 'lucide-react';
import { COVER_LETTER_TEMPLATES, CoverLetterTemplate } from '@/lib/templates/cover-letter-templates';

interface CoverLetterTemplateContentProps {
  selectedTemplate?: CoverLetterTemplate | null;
  onTemplateSelect?: (template: CoverLetterTemplate) => void;
}

const CoverLetterTemplateContent: React.FC<CoverLetterTemplateContentProps> = ({
  selectedTemplate,
  onTemplateSelect,
}) => {
  const handleTemplateSelect = (template: CoverLetterTemplate) => {
    if (onTemplateSelect) {
      onTemplateSelect(template);
    }
  };

  const getTierIcon = (tier: string) => {
    return tier === 'premium' ? (
      <Crown size={14} className="text-amber-500" />
    ) : (
      <Star size={14} className="text-green-500" />
    );
  };

  const getTierLabel = (tier: string) => {
    return tier === 'premium' ? 'Premium' : 'Free';
  };

  return (
    <div className="template-selector">
      <div className="templates-grid">
        {COVER_LETTER_TEMPLATES.map((template) => {
          const isSelected = selectedTemplate?.id === template.id;
          
          return (
            <div
              key={template.id}
              className={`template-card ${isSelected ? 'selected' : ''}`}
              onClick={() => handleTemplateSelect(template)}
            >
              <div className="template-preview">
                {/* Cover Letter Preview */}
                <div className="cover-letter-preview">
                  {/* Header Preview */}
                  <div className={`preview-header align-${template.layout.headerAlignment}`}>
                    <div className="preview-line" style={{ width: '60%' }} />
                    <div className="preview-line small" style={{ width: '40%' }} />
                  </div>

                  {/* Date Preview */}
                  <div className={`preview-date align-${template.layout.datePosition}`}>
                    <div className="preview-line small" style={{ width: '80px' }} />
                  </div>

                  {/* Body Preview */}
                  <div className="preview-body">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="preview-paragraph">
                        <div className="preview-line" />
                        <div className="preview-line" style={{ width: '95%' }} />
                        <div className="preview-line" style={{ width: '90%' }} />
                      </div>
                    ))}
                  </div>

                  {/* Signature Preview */}
                  <div className="preview-signature">
                    <div className="preview-line small" style={{ width: '30%' }} />
                  </div>
                </div>

                {/* Template Name Overlay */}
                <div className="template-title-overlay">
                  <h4 className="template-name-overlay">{template.name}</h4>
                </div>

                {/* Hover Info Overlay */}
                <div className="template-hover-overlay">
                  <div className="hover-content">
                    <div className="hover-header">
                      <div className="template-tier-hover">
                        {getTierIcon(template.tier)}
                        <span className="tier-label-hover">{getTierLabel(template.tier)}</span>
                      </div>
                    </div>
                    {template.description && (
                      <p className="hover-description">{template.description}</p>
                    )}
                    <div className="hover-stats">
                      <span className="stat-item">
                        {template.layout.typography.fontFamily.split(',')[0]}
                      </span>
                      <span className="stat-item">
                        {template.layout.spacing.lineHeight} spacing
                      </span>
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <div className="selected-indicator">
                    <Check size={16} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .template-selector {
          width: 100%;
          height: 100%;
          overflow-y: auto;
          padding: 20px;
        }
        
        .templates-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 16px;
        }

        .template-card {
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
          background: white;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .template-card:hover {
          border-color: #3b82f6;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.1);
        }

        .template-card.selected {
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }

        .template-preview {
          position: relative;
          width: 100%;
          aspect-ratio: 0.707;
          overflow: hidden;
          background: white;
        }

        .cover-letter-preview {
          width: 100%;
          height: 100%;
          padding: 16px;
          background: white;
        }

        .preview-header {
          margin-bottom: 12px;
        }

        .preview-header.align-left {
          text-align: left;
        }

        .preview-header.align-center {
          text-align: center;
        }

        .preview-header.align-right {
          text-align: right;
        }

        .preview-date {
          margin-bottom: 12px;
        }

        .preview-date.align-left {
          text-align: left;
        }

        .preview-date.align-right {
          text-align: right;
        }

        .preview-line {
          height: 3px;
          background: #e5e7eb;
          border-radius: 2px;
          margin: 3px 0;
          width: 100%;
        }

        .preview-line.small {
          height: 2px;
        }

        .preview-paragraph {
          margin-bottom: 8px;
        }

        .preview-signature {
          margin-top: 12px;
        }

        .template-title-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 70%, transparent 100%);
          padding: 24px 12px 12px;
          z-index: 2;
        }

        .template-name-overlay {
          color: white;
          font-size: 14px;
          font-weight: 600;
          margin: 0;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
          line-height: 1.2;
        }

        .template-hover-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s ease;
          z-index: 3;
          padding: 16px;
        }

        .template-card:hover .template-hover-overlay {
          opacity: 1;
        }

        .hover-content {
          text-align: center;
          color: white;
          max-width: 100%;
        }

        .hover-header {
          margin-bottom: 12px;
        }

        .template-tier-hover {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 500;
        }

        .tier-label-hover {
          color: white;
        }

        .hover-description {
          font-size: 12px;
          line-height: 1.4;
          margin: 0 0 12px 0;
          opacity: 0.9;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .hover-stats {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
        }

        .stat-item {
          font-size: 11px;
          padding: 2px 8px;
          background: rgba(255,255,255,0.2);
          border-radius: 12px;
          backdrop-filter: blur(4px);
        }

        .selected-indicator {
          position: absolute;
          top: 8px;
          right: 8px;
          background: #10b981;
          color: white;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 4;
        }
        
        @media (max-width: 768px) {
          .templates-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default CoverLetterTemplateContent;