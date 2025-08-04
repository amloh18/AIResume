'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface TemplatePreviewProps {
  template: any;
  isSelected?: boolean;
  onClick?: () => void;
}

const TemplatePreview: React.FC<TemplatePreviewProps> = ({ 
  template, 
  isSelected = false, 
  onClick 
}) => {
  const renderSection = (section: any, index: number) => {
    const style = template.snippetStyles?.find((s: any) => s.id === section.styleSnippetId)?.style || {};
    
    return (
      <div
        key={section.id}
        className="mb-3"
        style={{
          fontFamily: style.fontFamily || template.styles?.fontFamily || 'Arial, sans-serif',
          fontSize: style.fontSize || '12px',
          color: style.color || '#374151',
          lineHeight: style.lineSpacing || '1.4',
          fontWeight: style.fontWeight || 'normal'
        }}
      >
        {/* Section Title */}
        <div
          className="font-semibold mb-2"
          style={{
            fontSize: style.titleFontSize || '14px',
            fontWeight: style.titleFontWeight || 'bold',
            color: template.styles?.highlightColor || '#3b82f6',
            marginBottom: style.marginBottom || '8px'
          }}
        >
          {section.title}
        </div>

        {/* Section Content */}
        <div style={{ padding: style.padding || '0' }}>
          {section.type === 'header' && section.content && (
            <div className="text-center">
              <div
                className="font-bold mb-1"
                style={{
                  fontSize: template.styles?.nameFontSize || '16px',
                  color: '#1f2937'
                }}
              >
                {section.content.name || 'John Doe'}
              </div>
              <div className="text-sm text-gray-600">
                {section.content.contact?.slice(0, 2).join(' • ') || 'john.doe@email.com • +1 (555) 123-4567'}
              </div>
            </div>
          )}

          {section.type === 'section' && section.content?.summary && (
            <div className="text-sm">
              {section.content.summary.substring(0, 80)}...
            </div>
          )}

          {section.entries && section.entries.length > 0 && (
            <div>
              {section.entries.slice(0, 1).map((entry: any, entryIndex: number) => (
                <div key={entryIndex} className="mb-2">
                  <div className="flex justify-between items-start">
                    <div className="font-medium text-sm">
                      {entry.title || entry.degree || 'Job Title'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {entry.duration || '2020 - Present'}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 mb-1">
                    {entry.company || entry.institution || 'Company Name'}
                  </div>
                  {entry.details && entry.details.length > 0 && (
                    <ul className="text-xs text-gray-700 list-disc list-inside">
                      {entry.details.slice(0, 2).map((detail: string, detailIndex: number) => (
                        <li key={detailIndex} className="mb-1">
                          {detail.substring(0, 40)}...
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          {section.details && section.details.length > 0 && (
            <div
              className="grid gap-1"
              style={{
                gridTemplateColumns: `repeat(${style.columns || 1}, 1fr)`
              }}
            >
              {section.details.slice(0, 4).map((detail: string, detailIndex: number) => (
                <div key={detailIndex} className="text-xs">
                  {detail.substring(0, 20)}...
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <motion.div
      className={`relative bg-white rounded-lg shadow-sm border-2 cursor-pointer overflow-hidden ${
        isSelected 
          ? 'border-purple-500 shadow-lg' 
          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
      } transition-all duration-200`}
      style={{
        width: '100%',
        height: '280px',
        background: '#ffffff',
        padding: `${template.styles?.paddingY || 16}px ${template.styles?.paddingX || 16}px`
      }}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Template Preview Content */}
      <div
        className="h-full overflow-hidden"
        style={{
          fontFamily: template.styles?.fontFamily || 'Arial, sans-serif',
          fontSize: `${template.styles?.baseFontSize || 11}px`,
          lineHeight: template.styles?.lineHeight || 1.2,
          color: '#374151'
        }}
      >
        {template.sections?.slice(0, 3).map((section: any, index: number) => 
          renderSection(section, index)
        )}
      </div>

      {/* Template Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-medium text-sm truncate">
              {template.name}
            </h3>
            <p className="text-white/70 text-xs truncate">
              {template.category?.join(', ')}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {template.isPremium && (
              <span className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs px-2 py-1 rounded-full">
                PRO
              </span>
            )}
            {template.isDefault && (
              <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                DEFAULT
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </motion.div>
  );
};

export default TemplatePreview; 