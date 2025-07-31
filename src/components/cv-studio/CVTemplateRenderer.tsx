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
  currentPage: number;
  totalPages: number;
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
  const getStyleValue = (property: string): string => {
    const value = snippetStyle.style[property as keyof typeof snippetStyle.style];
    return typeof value === 'string' ? value : '';
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: getStyleValue('marginBottom') || '16px',
    lineHeight: getStyleValue('lineHeight') || '1.0',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: getStyleValue('titleFontSize') || '15px', // 14-16pt for section headings (15px = 14pt at 96 DPI)
    fontWeight: getStyleValue('titleFontWeight') || 'bold',
    color: getStyleValue('color') || '#1a1a1a',
    marginBottom: '12px',
    textTransform: 'uppercase' as const,
    borderBottom: '2px solid #333',
    paddingBottom: '4px',
    lineHeight: getStyleValue('lineHeight') || '1.0' // 1.0 line spacing
  };

  const renderHeaderSection = () => {
    const headerData = cvData.personal_info || {};
    const nameStyle: React.CSSProperties = {
      fontWeight: getStyleValue('fontWeight') || 'bold',
      fontSize: getStyleValue('fontSize') || '20px', // 18-22pt for name (20px = 18pt at 96 DPI)
      color: getStyleValue('color') || '#1a1a1a',
      marginBottom: getStyleValue('marginBottom') || '12px',
      textAlign: 'center' as const,
      lineHeight: getStyleValue('lineHeight') || '1.0' // 1.0 line spacing
    };

    const bodyTextStyle: React.CSSProperties = {
      fontSize: getStyleValue('bodyFontSize') || '11px', // Use body font size for contact details and summary
      lineHeight: getStyleValue('lineHeight') || '1.0',
      color: '#666666' as string
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
          style={nameStyle}
        />
        
        <div className="flex justify-center items-center flex-wrap gap-x-4 gap-y-1 text-gray-600 mb-4">
          {section.content?.contact?.map((contactItem, index) => (
            <EditableField
              key={index}
              value={headerData[`contact${index}`] || contactItem}
              onChange={(value) => onDataChange?.('personal_info', { ...headerData, [`contact${index}`]: value })}
              placeholder="Contact Info"
              isPreview={isPreview}
              style={bodyTextStyle}
            />
          ))}
        </div>
        
        <EditableField
          value={headerData.summary || section.content?.summary || ''}
          onChange={(value) => onDataChange?.('personal_info', { ...headerData, summary: value })}
          placeholder="Professional summary..."
          multiline={true}
          className="text-gray-700 leading-relaxed"
          isPreview={isPreview}
          style={{
            ...bodyTextStyle,
            textAlign: 'justify' as const
          }}
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
    fontSize: getStyleValue('fontSize') || '11px', // 10-12pt body text (11px = 10pt at 96 DPI)
    fontStyle: getStyleValue('fontStyle') as any || 'normal',
    lineHeight: getStyleValue('lineHeight') || '1.0', // 1.0 line spacing
    gap: getStyleValue('entrySpacing') || '2px' // Use item spacing for gaps between elements
  };

    if (section.entries) {
      // Special handling for skills section
      if (section.id === 'skills') {
        return (
          <div style={sectionStyle}>
            {section.entries.map((entry, index) => (
              <div key={index} style={entryStyle} className="mb-3">
                <div className="flex items-center mb-1">
                  <EditableField
                    value={sectionData[`${section.id}_${index}_title`] || entry.title || ''}
                    onChange={(value) => onDataChange?.(section.id, { ...sectionData, [`${section.id}_${index}_title`]: value })}
                    placeholder="Skill Category"
                    className="font-bold text-gray-800"
                    isPreview={isPreview}
                    style={{
                      fontSize: getStyleValue('fontSize') || '11px',
                      lineHeight: getStyleValue('lineHeight') || '1.0',
                      fontWeight: '700'
                    }}
                  />
                  {entry.company && (
                    <>
                      <span className="text-gray-600 font-semibold">,</span>
                      <EditableField
                        value={sectionData[`${section.id}_${index}_company`] || entry.company || ''}
                        onChange={(value) => onDataChange?.(section.id, { ...sectionData, [`${section.id}_${index}_company`]: value })}
                        placeholder="Institution"
                        className="font-bold text-gray-800"
                        isPreview={isPreview}
                        style={{
                          fontSize: getStyleValue('fontSize') || '11px',
                          lineHeight: getStyleValue('lineHeight') || '1.0',
                          fontWeight: '700'
                        }}
                      />
                    </>
                  )}
                </div>
                
                {entry.details && (
                  <ul 
                    className="list-disc list-outside pl-5"
                    style={{
                      gap: getStyleValue('bulletSpacing') || '4px'
                    }}
                  >
                    {entry.details.map((detail, detailIndex) => (
                      <EditableListItem
                        key={detailIndex}
                        value={sectionData[`${section.id}_${index}_detail_${detailIndex}`] || detail}
                        onChange={(value) => onDataChange?.(section.id, { 
                          ...sectionData, 
                          [`${section.id}_${index}_detail_${detailIndex}`]: value 
                        })}
                        placeholder="Skill description..."
                        isPreview={isPreview}
                        style={{
                          marginBottom: getStyleValue('bulletSpacing') || '4px',
                          fontSize: getStyleValue('fontSize') || '11px',
                          lineHeight: getStyleValue('lineHeight') || '1.0'
                        }}
                      />
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        );
      }
      
      // Regular entries handling for other sections
      return (
        <div style={sectionStyle}>
          {section.entries.map((entry, index) => (
            <div key={index} style={entryStyle} className="mb-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="flex items-center mb-1">
                    <EditableField
                      value={sectionData[`${section.id}_${index}_title`] || entry.title || entry.degree || ''}
                      onChange={(value) => onDataChange?.(section.id, { ...sectionData, [`${section.id}_${index}_title`]: value })}
                      placeholder="Title/Degree"
                      className="font-bold text-gray-800"
                      isPreview={isPreview}
                      style={{
                        fontSize: getStyleValue('fontSize') || '11px',
                        lineHeight: getStyleValue('lineHeight') || '1.0',
                        fontWeight: '700'
                      }}
                    />
                    <span className="text-gray-600 font-semibold">,</span>
                    <EditableField
                      value={sectionData[`${section.id}_${index}_company`] || entry.company || entry.institution || entry.organization || ''}
                      onChange={(value) => onDataChange?.(section.id, { ...sectionData, [`${section.id}_${index}_company`]: value })}
                      placeholder="Company/Institution"
                      className="font-bold text-gray-800"
                      isPreview={isPreview}
                      style={{
                        fontSize: getStyleValue('fontSize') || '11px',
                        lineHeight: getStyleValue('lineHeight') || '1.0',
                        fontWeight: '700'
                      }}
                    />
                  </div>
                </div>
                <div className="text-right ml-4">
                  <EditableField
                    value={sectionData[`${section.id}_${index}_duration`] || entry.duration || ''}
                    onChange={(value) => onDataChange?.(section.id, { ...sectionData, [`${section.id}_${index}_duration`]: value })}
                    placeholder="Duration"
                    className="text-gray-600 font-semibold"
                    isPreview={isPreview}
                    style={{
                      fontSize: getStyleValue('fontSize') || '11px', // Use same font size as item headers
                      lineHeight: getStyleValue('lineHeight') || '1.0',
                      fontWeight: '600'
                    }}
                  />
                </div>
              </div>
              
              {entry.details && (
                <ul 
                  className="list-disc list-outside pl-5"
                  style={{
                    gap: getStyleValue('bulletSpacing') || '4px'
                  }}
                >
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
                      style={{
                        marginBottom: getStyleValue('bulletSpacing') || '4px'
                      }}
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
      const columnsStr = getStyleValue('columns');
      const columns = parseInt(columnsStr) || 1;
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
    <div 
      className="mb-8"
      style={{
        pageBreakInside: 'auto',
        breakInside: 'auto',
        pageBreakAfter: 'auto',
        breakAfter: 'auto'
      }}
    >
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
  currentPage,
  totalPages,
  onDataChange
}) => {
  console.log('CVTemplateRenderer zoom:', zoom);
  const containerStyle: React.CSSProperties = {
    fontFamily: template.display.fontFamily,
    padding: template.display.padding, // This should be "96px" for 1-inch margins
    lineHeight: '1.0', // 1.0 line spacing for better readability
  };

  const getSnippetStyle = (snippetId: string) => {
    return template.snippetStyles.find(snippet => snippet.id === snippetId) || {
      id: snippetId,
      category: 'default',
      style: {}
    };
  };

  // Calculate page breaks based on content height
  const A4_HEIGHT = 1123; // A4 height in pixels
  const MARGIN = 96; // 1-inch margins (96px)
  const CONTENT_HEIGHT = A4_HEIGHT - (MARGIN * 2); // Available content height
  const PAGE_GAP = 10; // Gap between pages
  
  // Create pages based on content height
  const pageGroups: number[][] = [];
  let currentPageGroup: number[] = [];
  let currentHeight = 0;
  
  // Estimate section heights (you can adjust these values based on actual content)
  const sectionHeights = {
    personal_info: 200, // Header section
    education: 300,     // Education section
    experience: 400,    // Experience section
    leadership: 250,    // Leadership section
    project: 150,       // Project section
    skills: 200        // Skills section
  };
  
  template.sections.forEach((section, index) => {
    const sectionHeight = sectionHeights[section.id as keyof typeof sectionHeights] || 200;
    
    if (currentHeight + sectionHeight > CONTENT_HEIGHT && currentPageGroup.length > 0) {
      // Start new page
      pageGroups.push([...currentPageGroup]);
      currentPageGroup = [index];
      currentHeight = sectionHeight;
    } else {
      // Add to current page
      currentPageGroup.push(index);
      currentHeight += sectionHeight;
    }
  });
  
  // Add the last page
  if (currentPageGroup.length > 0) {
    pageGroups.push(currentPageGroup);
  }
  
  // Get current page sections
  const currentPageSections = pageGroups[currentPage - 1] || [];
  
  // Update total pages based on actual page groups
  const actualTotalPages = pageGroups.length;

  return (
    <div className="h-full overflow-auto bg-gray-100">
      <div className="flex flex-col items-center p-8 space-y-4">
        {pageGroups.map((pageSections, pageIndex) => (
          <div
            key={pageIndex}
            className="bg-white shadow-2xl rounded-lg overflow-hidden"
            style={{
              width: '794px', // A4 width in pixels (210mm)
              height: '1123px', // A4 height in pixels (297mm)
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
              transition: 'transform 0.2s ease-in-out'
            }}
          >
            <div 
              style={{
                ...containerStyle,
                pageBreakInside: 'auto',
                breakInside: 'auto',
                orphans: 1,
                widows: 1
              }} 
              className="text-gray-800 cv-content"
            >
              {/* Page indicator */}
              <div className="text-center text-gray-500 text-sm mb-4 font-semibold">
                Page {pageIndex + 1} of {actualTotalPages}
              </div>
              
              {pageSections.map((sectionIndex) => {
                const section = template.sections[sectionIndex];
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
          </div>
        ))}
      </div>
    </div>
  );
};

export default CVTemplateRenderer; 