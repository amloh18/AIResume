import React, { useState, useEffect } from 'react';
import { ChevronRight, Eye, Star, Crown, Check, Loader2, Palette } from 'lucide-react';
import { ITemplate } from '@/models/Template';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { generateTemplatePreview } from '@/lib/templates/template-renderer';
import { HARDCODED_TEMPLATES, generateHardcodedTemplatePreview } from '@/lib/templates/hardcoded-templates';
import CVPreviewContent from './CVPreviewContent';
import TemplateRenderer from '@/lib/templates/template-renderer';
import { useTemplateStore } from '@/lib/stores/templateStore';

interface TemplateSelectorProps {
  selectedTemplate: ITemplate | null;
  onTemplateSelect: (template: ITemplate) => void;
  cvData?: UnifiedCVDataStructure | null;
  className?: string;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  selectedTemplate,
  onTemplateSelect,
  cvData,
  className = ''
}) => {
  const [templates, setTemplates] = useState<ITemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<ITemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Fetch available templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        
        // Only use hardcoded templates - skip database fetch
        setTemplates(HARDCODED_TEMPLATES);
        setLoading(false);
      } catch (err) {
        console.error('Error loading templates:', err);
        setTemplates(HARDCODED_TEMPLATES);
        setError(err instanceof Error ? err.message : 'Failed to load templates');
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const handleTemplatePreview = (template: ITemplate) => {
    setPreviewTemplate(template);
    setShowPreview(true);
  };

  const { setSelectedTemplate } = useTemplateStore();

  const handleTemplateSelect = (template: ITemplate) => {
    // Update the global template store
    setSelectedTemplate(template);
    
    onTemplateSelect(template);
    setShowPreview(false);
  };

  const getPreviewData = (template: ITemplate): UnifiedCVDataStructure => {
    // Use actual CV data if available, otherwise use template preview data
    if (cvData) {
      return cvData;
    }
    
    // Check if this is a hardcoded template
    if (template.customRenderer) {
      return generateHardcodedTemplatePreview(template.id);
    }
    
    // Use database template preview data
    return generateTemplatePreview(template);
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

  const getCategoryColor = (categories: string[] = []) => {
    if (categories.includes('Creative')) return 'from-purple-500 to-pink-500';
    if (categories.includes('Professional')) return 'from-blue-500 to-indigo-500';
    if (categories.includes('Modern')) return 'from-green-500 to-teal-500';
    return 'from-gray-500 to-gray-600';
  };

  if (loading) {
    return (
      <div className={`template-selector loading ${className}`}>
        <div className="loading-content">
          <Loader2 className="animate-spin" size={24} />
          <p>Loading templates...</p>
        </div>
        
        <style jsx>{`
          .template-selector.loading {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 200px;
            color: #6b7280;
          }
          
          .loading-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`template-selector error ${className}`}>
        <div className="error-content">
          <p>Failed to load templates</p>
          <p className="error-message">{error}</p>
        </div>
        
        <style jsx>{`
          .template-selector.error {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 200px;
            color: #dc2626;
            text-align: center;
          }
          
          .error-message {
            font-size: 12px;
            color: #6b7280;
            margin-top: 4px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`template-selector ${className}`}>
      <div className="templates-grid">
        {templates.map((template) => {
          const templateId = template.id || template._id;
          const selectedId = selectedTemplate?.id || selectedTemplate?._id;
          const isSelected = selectedId === templateId;
          
          return (
          <div
            key={templateId}
            className={`template-card ${
              isSelected ? 'selected' : ''
            }`}
            onClick={() => handleTemplateSelect(template)}
          >
            <div className="template-preview">
              {template.thumbnail ? (
                <img
                  src={template.thumbnail}
                  alt={`${template.name} preview`}
                  className="template-thumbnail"
                />
              ) : (
                <div className={`template-placeholder bg-gradient-to-br ${getCategoryColor(template.categories)}`}>
                  <span className="placeholder-text">{template.name.substring(0, 2)}</span>
                </div>
              )}

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
                      {template.categories?.length || 0} categories
                    </span>
                    {template.isDefault && (
                      <span className="stat-item default">Default</span>
                    )}
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

      {/* Preview Modal */}
      {showPreview && previewTemplate && (
        <div className="preview-modal" onClick={() => setShowPreview(false)}>
          <div className="preview-content" onClick={(e) => e.stopPropagation()}>
            <div className="preview-header">
              <h3>{previewTemplate.name} Preview</h3>
              <button
                className="close-button"
                onClick={() => setShowPreview(false)}
              >
                ×
              </button>
            </div>
            <div className="preview-body">
              <div className="preview-cv">
                {previewTemplate.customRenderer ? (
                  <TemplateRenderer
                    cvData={getPreviewData(previewTemplate)}
                    template={previewTemplate}
                    className="template-preview-content"
                    customStyles={{
                      transform: 'scale(0.8)',
                      transformOrigin: 'top center',
                      fontSize: '12px'
                    }}
                  />
                ) : (
                  <CVPreviewContent
                    cvData={getPreviewData(previewTemplate)}
                    template={previewTemplate}
                  />
                )}
              </div>
            </div>
            <div className="preview-footer">
              <button
                className="action-button select-from-preview"
                onClick={() => handleTemplateSelect(previewTemplate)}
              >
                Select This Template
              </button>
            </div>
          </div>
        </div>
      )}

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

        .stat-item.default {
          background: rgba(16, 185, 129, 0.8);
          color: white;
        }

        .template-thumbnail {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .template-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 24px;
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
        }
        
        .preview-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        
        .preview-content {
          background: white;
          border-radius: 12px;
          max-width: 90vw;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        
        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .preview-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
        }
        
        .close-button {
          background: none;
          border: none;
          font-size: 24px;
          color: #6b7280;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
        }
        
        .close-button:hover {
          background: #f3f4f6;
          color: #374151;
        }
        
        .preview-body {
          flex: 1;
          overflow: auto;
          padding: 20px;
          min-height: 400px;
        }
        
        .preview-cv {
          max-width: 600px;
          margin: 0 auto;
          transform: scale(0.8);
          transform-origin: top center;
        }
        
        .preview-footer {
          padding: 16px 20px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
        }

        .action-button.select-from-preview {
          background: #10b981;
          color: white;
          border-color: #10b981;
          padding: 12px 24px;
          font-size: 14px;
        }

        .action-button.select-from-preview:hover {
          background: #059669;
          border-color: #059669;
        }
        
        @media (max-width: 768px) {
          .templates-grid {
            grid-template-columns: 1fr;
          }

          .preview-cv {
            transform: scale(0.6);
          }
        }
      `}</style>
    </div>
  );
};

export default TemplateSelector;
