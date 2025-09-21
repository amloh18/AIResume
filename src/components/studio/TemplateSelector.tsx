import React, { useState, useEffect } from 'react';
import { ChevronRight, Eye, Star, Crown, Check, Loader2, Palette } from 'lucide-react';
import { ITemplate } from '@/models/Template';
import { CVDataStructure } from '@/types/cv';
import { generateTemplatePreview } from '@/lib/templates/template-renderer';
import EnhancedCVPreview from './EnhancedCVPreview';

interface TemplateSelectorProps {
  selectedTemplate: ITemplate | null;
  onTemplateSelect: (template: ITemplate) => void;
  cvData?: CVDataStructure | null;
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
        const response = await fetch('/api/templates?category=cv&isActive=true');
        
        if (!response.ok) {
          throw new Error('Failed to fetch templates');
        }
        
        const data = await response.json();
        setTemplates(data.templates || []);
      } catch (err) {
        console.error('Error fetching templates:', err);
        setError(err instanceof Error ? err.message : 'Failed to load templates');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const handleTemplatePreview = (template: ITemplate) => {
    setPreviewTemplate(template);
    setShowPreview(true);
  };

  const handleTemplateSelect = (template: ITemplate) => {
    onTemplateSelect(template);
    setShowPreview(false);
  };

  const getPreviewData = (template: ITemplate): CVDataStructure => {
    // Use actual CV data if available, otherwise use template preview data
    return cvData || generateTemplatePreview(template);
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
      <div className="selector-header">
        <h3 className="selector-title">
          <Palette size={18} />
          Choose Template
        </h3>
        <p className="selector-description">
          Select a template to customize your CV's appearance and layout
        </p>
      </div>

      <div className="templates-grid">
        {templates.map((template) => (
          <div
            key={template.id || template._id}
            className={`template-card ${
              selectedTemplate?.id === template.id || selectedTemplate?._id === template._id
                ? 'selected'
                : ''
            }`}
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
              
              {(selectedTemplate?.id === template.id || selectedTemplate?._id === template._id) && (
                <div className="selected-indicator">
                  <Check size={16} />
                </div>
              )}
            </div>

            <div className="template-info">
              <div className="template-header">
                <h4 className="template-name">{template.name}</h4>
                <div className="template-tier">
                  {getTierIcon(template.tier)}
                  <span className="tier-label">{getTierLabel(template.tier)}</span>
                </div>
              </div>

              {template.description && (
                <p className="template-description">{template.description}</p>
              )}

              <div className="template-categories">
                {template.categories?.map((category, index) => (
                  <span key={index} className="category-tag">
                    {category}
                  </span>
                ))}
                {template.isDefault && (
                  <span className="category-tag default">Default</span>
                )}
              </div>

              <div className="template-actions">
                <button
                  className="action-button preview"
                  onClick={() => handleTemplatePreview(template)}
                >
                  <Eye size={14} />
                  Preview
                </button>
                <button
                  className="action-button select"
                  onClick={() => handleTemplateSelect(template)}
                >
                  Select
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
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
                <EnhancedCVPreview
                  cvData={getPreviewData(previewTemplate)}
                  template={previewTemplate}
                  showBadge={true}
                />
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
        
        .selector-header {
          margin-bottom: 24px;
        }
        
        .selector-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 8px;
        }
        
        .selector-description {
          color: #6b7280;
          font-size: 14px;
          margin: 0;
        }
        
        .templates-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
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
          height: 180px;
          overflow: hidden;
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
        
        .template-info {
          padding: 16px;
        }
        
        .template-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        }
        
        .template-name {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
          line-height: 1.3;
        }
        
        .template-tier {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 500;
        }
        
        .tier-label {
          color: #6b7280;
        }
        
        .template-description {
          font-size: 13px;
          color: #6b7280;
          line-height: 1.4;
          margin: 0 0 12px 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .template-categories {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 16px;
        }
        
        .category-tag {
          background: #f3f4f6;
          color: #374151;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
        }
        
        .category-tag.default {
          background: #fef3c7;
          color: #92400e;
        }
        
        .template-actions {
          display: flex;
          gap: 8px;
        }
        
        .action-button {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          color: #374151;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .action-button:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }
        
        .action-button.select {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }
        
        .action-button.select:hover {
          background: #2563eb;
          border-color: #2563eb;
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
        
        .select-from-preview {
          background: #10b981 !important;
          color: white !important;
          border-color: #10b981 !important;
          padding: 12px 24px !important;
          font-size: 14px !important;
        }
        
        .select-from-preview:hover {
          background: #059669 !important;
          border-color: #059669 !important;
        }
        
        @media (max-width: 768px) {
          .templates-grid {
            grid-template-columns: 1fr;
          }
          
          .preview-cv {
            transform: scale(0.6);
          }
          
          .template-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default TemplateSelector;
