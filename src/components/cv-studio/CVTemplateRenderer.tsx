'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ICVSection, IStyleSnippet } from '@/models/Template';

interface CVTemplateRendererProps {
  template: {
    display: {
      layout: 'single-column' | 'two-column' | 'absolute';
      padding: string;
      fontFamily: string;
      sectionSpacing: string;
    };
    sections: ICVSection[];
    snippetStyles: IStyleSnippet[];
  };
  cvData: any;
  zoom: number;
  isPreviewMode: boolean;
  onDataChange?: (sectionId: string, data: any) => void;
}

// Enhanced Editable Field Component
const EditableField: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  tag?: 'div' | 'h1' | 'h2' | 'h3' | 'span' | 'textarea';
  multiline?: boolean;
  isPreview?: boolean;
  style?: React.CSSProperties;
}> = ({ value, onChange, placeholder, className = '', tag: Tag = 'div', multiline = false, isPreview = false, style }) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [currentValue, setCurrentValue] = React.useState(value);
  const inputRef = React.useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const startEditing = () => {
    if (!isPreview) {
      setIsEditing(true);
      setCurrentValue(value);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    onChange(currentValue);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCurrentValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (!multiline || (multiline && !e.shiftKey))) {
      e.preventDefault();
      handleBlur();
    }
    if (e.key === 'Escape') {
      setCurrentValue(value);
      handleBlur();
    }
  };

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (multiline && inputRef.current instanceof HTMLTextAreaElement) {
        inputRef.current.style.height = 'auto';
        inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
      }
    }
  }, [isEditing, multiline]);

  if (isEditing) {
    if (multiline || Tag === 'textarea') {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={currentValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`bg-yellow-100 border border-yellow-400 rounded-md p-1 w-full resize-none overflow-hidden relative z-30 ${className}`}
          style={style}
          autoFocus
        />
      );
    }
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={currentValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`bg-yellow-100 border border-yellow-400 rounded-md p-1 w-full relative z-30 ${className}`}
        style={style}
        autoFocus
      />
    );
  }

  const DisplayTag = (Tag === 'textarea' || multiline) ? 'div' : Tag;
  return (
    <DisplayTag
      className={`${!isPreview ? 'cursor-pointer hover:bg-gray-100' : ''} p-1 rounded-md whitespace-pre-wrap ${className}`}
      onClick={startEditing}
      style={style}
    >
      {value || <span className="text-gray-400">{placeholder}</span>}
    </DisplayTag>
  );
};

// Editable List Item Component
const EditableListItem: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  isPreview?: boolean;
  style?: React.CSSProperties;
}> = ({ value, onChange, placeholder, isPreview = false, style }) => {
  return (
    <li className="relative group/bullet">
      <EditableField
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        multiline={true}
        className="text-gray-700"
        isPreview={isPreview}
        style={style}
      />
    </li>
  );
};

// Section Component
const Section: React.FC<{
  section: ICVSection;
  snippetStyle: IStyleSnippet;
  cvData: any;
  isPreview?: boolean;
  onDataChange?: (sectionId: string, data: any) => void;
}> = ({ section, snippetStyle, cvData, isPreview = false, onDataChange }) => {
  const getStyleValue = (property: string) => {
    return snippetStyle.style[property as keyof typeof snippetStyle.style] || '';
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: getStyleValue('marginBottom') || '24px',
    lineHeight: getStyleValue('lineSpacing') || '1.6',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: getStyleValue('titleFontSize') || '18px',
    fontWeight: getStyleValue('titleFontWeight') || 'bold',
    color: getStyleValue('color') || '#1a1a1a',
    marginBottom: '12px',
    textTransform: 'uppercase' as const,
    borderBottom: '2px solid #333',
    paddingBottom: '4px'
  };

  const renderHeaderSection = () => {
    const headerData = cvData.personal_info || {};
    const headerStyle: React.CSSProperties = {
      fontWeight: getStyleValue('fontWeight') || 'bold',
      fontSize: getStyleValue('fontSize') || '22px',
      color: getStyleValue('color') || '#1a1a1a',
      marginBottom: getStyleValue('marginBottom') || '12px',
      textAlign: 'center' as const
    };

    return (
      <div style={sectionStyle}>
        <EditableField
          value={headerData.name || section.content?.name || ''}
          onChange={(value) => onDataChange?.('personal_info', { ...headerData, name: value })}
          placeholder="Your Name"
          tag="h1"
          className="font-bold mb-2"
          isPreview={isPreview}
          style={headerStyle}
        />
        
        <div className="flex justify-center items-center flex-wrap gap-x-4 gap-y-1 text-gray-600 mb-4">
          {section.content?.contact?.map((contactItem, index) => (
            <EditableField
              key={index}
              value={headerData[`contact${index}`] || contactItem}
              onChange={(value) => onDataChange?.('personal_info', { ...headerData, [`contact${index}`]: value })}
              placeholder="Contact Info"
              isPreview={isPreview}
            />
          ))}
        </div>
        
        <EditableField
          value={headerData.summary || section.content?.summary || ''}
          onChange={(value) => onDataChange?.('personal_info', { ...headerData, summary: value })}
          placeholder="Professional summary..."
          multiline={true}
          className="text-gray-700 leading-relaxed text-center"
          isPreview={isPreview}
        />
      </div>
    );
  };

  const renderSectionContent = () => {
    const sectionData = cvData[section.id] || {};
    const entryStyle: React.CSSProperties = {
      borderLeft: getStyleValue('entryBorderLeft') || 'none',
      paddingLeft: getStyleValue('paddingLeft') || '0',
      marginBottom: getStyleValue('entrySpacing') || '10px',
      backgroundColor: getStyleValue('entryBackground') || 'transparent',
      padding: getStyleValue('padding') || '0',
      fontSize: getStyleValue('fontSize') || '14px',
      fontStyle: getStyleValue('fontStyle') as any || 'normal'
    };

    if (section.entries) {
      return (
        <div style={sectionStyle}>
          {section.entries.map((entry, index) => (
            <div key={index} style={entryStyle} className="mb-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <EditableField
                    value={sectionData[`${section.id}_${index}_title`] || entry.title || entry.degree || ''}
                    onChange={(value) => onDataChange?.(section.id, { ...sectionData, [`${section.id}_${index}_title`]: value })}
                    placeholder="Title/Degree"
                    className="font-semibold text-gray-800"
                    isPreview={isPreview}
                  />
                  <EditableField
                    value={sectionData[`${section.id}_${index}_company`] || entry.company || entry.institution || entry.organization || ''}
                    onChange={(value) => onDataChange?.(section.id, { ...sectionData, [`${section.id}_${index}_company`]: value })}
                    placeholder="Company/Institution"
                    className="text-gray-600 italic"
                    isPreview={isPreview}
                  />
                </div>
                <div className="text-right ml-4">
                  <EditableField
                    value={sectionData[`${section.id}_${index}_duration`] || entry.duration || ''}
                    onChange={(value) => onDataChange?.(section.id, { ...sectionData, [`${section.id}_${index}_duration`]: value })}
                    placeholder="Duration"
                    className="text-gray-600 text-sm"
                    isPreview={isPreview}
                  />
                </div>
              </div>
              
              {entry.details && (
                <ul className="list-disc list-outside pl-5 space-y-1">
                  {entry.details.map((detail, detailIndex) => (
                    <EditableListItem
                      key={detailIndex}
                      value={sectionData[`${section.id}_${index}_detail_${detailIndex}`] || detail}
                      onChange={(value) => onDataChange?.(section.id, { 
                        ...sectionData, 
                        [`${section.id}_${index}_detail_${detailIndex}`]: value 
                      })}
                      placeholder="Detail description..."
                      isPreview={isPreview}
                    />
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      );
    }

    if (section.details) {
      const columns = getStyleValue('columns') || 1;
      const columnStyle = columns > 1 ? { columnCount: columns, columnGap: '20px' } : {};
      
      return (
        <div style={{ ...sectionStyle, ...columnStyle }}>
          {section.details.map((detail, index) => (
            <EditableField
              key={index}
              value={sectionData[`${section.id}_detail_${index}`] || detail}
              onChange={(value) => onDataChange?.(section.id, { 
                ...sectionData, 
                [`${section.id}_detail_${index}`]: value 
              })}
              placeholder="Detail description..."
              multiline={true}
              className="text-gray-700 mb-2"
              isPreview={isPreview}
            />
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="mb-6">
      {section.type === 'header' ? (
        renderHeaderSection()
      ) : (
        <>
          <h2 style={titleStyle}>
            {section.title}
          </h2>
          {renderSectionContent()}
        </>
      )}
    </div>
  );
};

const CVTemplateRenderer: React.FC<CVTemplateRendererProps> = ({
  template,
  cvData,
  zoom,
  isPreviewMode,
  onDataChange
}) => {
  const containerStyle: React.CSSProperties = {
    fontFamily: template.display.fontFamily,
    padding: template.display.padding,
  };

  const getSnippetStyle = (snippetId: string) => {
    return template.snippetStyles.find(snippet => snippet.id === snippetId) || {
      id: snippetId,
      category: 'default',
      style: {}
    };
  };

  return (
    <div className="h-full overflow-auto bg-gray-100">
      <div className="min-h-full flex justify-center p-8">
        <motion.div
          className="bg-white shadow-2xl rounded-lg overflow-hidden"
          style={{
            width: '794px', // A4 width in pixels (210mm)
            height: '1123px', // A4 height in pixels (297mm)
            transform: `scale(${zoom})`,
            transformOrigin: 'top center'
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div style={containerStyle} className="text-gray-800">
            {template.sections.map((section) => {
              const snippetStyle = getSnippetStyle(section.styleSnippetId);
              return (
                <Section
                  key={section.id}
                  section={section}
                  snippetStyle={snippetStyle}
                  cvData={cvData}
                  isPreview={isPreviewMode}
                  onDataChange={onDataChange}
                />
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CVTemplateRenderer; 