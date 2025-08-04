'use client';

import React from 'react';
import { TEMPLATE_REGISTRY, TemplateConfig } from '../templates/TemplateRegistry';
import { SNIPPET_REGISTRY, SnippetConfig } from '../snippets/SnippetRegistry';
import { SectionRenderer } from './SectionRenderer';

interface LayoutEngineProps {
  cvData: any;
  templateId: string;
  zoom: number;
  isPreviewMode: boolean;
  onDataChange?: (sectionId: string, data: any) => void;
  onContentSelect?: (content: string, section: string, elementType: string) => void;
  selectedContent?: string;
  selectedSection?: string;
}

export function LayoutEngine({ 
  cvData, 
  templateId, 
  zoom, 
  isPreviewMode, 
  onDataChange,
  onContentSelect,
  selectedContent,
  selectedSection
}: LayoutEngineProps) {
  const template = TEMPLATE_REGISTRY[templateId];

  if (!template) {
    console.error(`Template ${templateId} not found`);
    return <div>Template not found</div>;
  }

  const getColumnContent = (position: 'left' | 'right' | 'top' | 'middle' | 'bottom') => {
    return Object.entries(cvData.sections || {})
      .filter(([key, val]) => {
        const sectionConfig = template.sections[key];
        return sectionConfig?.position === position;
      })
      .map(([key, val]) => {
        const sectionConfig = template.sections[key];
        const snippetId = cvData.sectionSnippets?.[key] || getDefaultSnippetId(key);
        const snippet = SNIPPET_REGISTRY[snippetId];
        
        return (
          <SectionRenderer
            key={key}
            sectionKey={key}
            data={val}
            config={sectionConfig}
            snippet={snippet}
            fonts={template.fonts}
            isPreview={isPreviewMode}
            onDataChange={onDataChange}
            onContentSelect={onContentSelect}
            selectedContent={selectedContent}
            selectedSection={selectedSection}
            templateId={templateId}
          />
        );
      });
  };

  const getDefaultSnippetId = (sectionKey: string): string => {
    // Default snippet mappings
    const defaults: Record<string, string> = {
      profile: 'profileCentered',
      experience: 'experienceBulletDash',
      education: 'educationSimple',
      skills: 'skillsChip',
      languages: 'languagesDot',
      projects: 'projectsList'
    };
    return defaults[sectionKey] || 'experienceBulletDash';
  };

  const containerStyle: React.CSSProperties = {
    fontFamily: template.fonts.body,
    padding: '96px', // 1-inch margins
    lineHeight: '1.0',
    transform: `scale(${zoom})`,
    transformOrigin: 'top center',
    transition: 'transform 0.2s ease-in-out'
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: template.layout.widthRatio.map(r => `${r * 100}%`).join(' '),
    gap: '32px',
    minHeight: '100%'
  };

  const renderSingleColumn = () => (
    <div className="cv-single-column">
      {getColumnContent('top')}
      {getColumnContent('middle')}
      {getColumnContent('bottom')}
    </div>
  );

  const renderTwoColumn = () => (
    <div className="cv-two-column" style={gridStyle}>
      <div className="cv-left-column">
        {getColumnContent('left')}
      </div>
      <div className="cv-right-column">
        {getColumnContent('right')}
      </div>
    </div>
  );

  return (
    <div className="cv-layout-engine">
      <div 
        className="cv-page bg-white shadow-2xl rounded-lg overflow-hidden"
        style={{
          width: '794px', // A4 width
          height: '1123px', // A4 height
          ...containerStyle
        }}
      >
        <div className="cv-content text-gray-800">
          {template.layout.columns === 1 ? renderSingleColumn() : renderTwoColumn()}
        </div>
      </div>
    </div>
  );
}

// Helper function to get section data
export function getSectionData(cvData: any, sectionKey: string): any {
  if (sectionKey === 'profile') {
    return cvData.personal_info || {};
  }
  return cvData[sectionKey] || {};
}

// Helper function to update section data
export function updateSectionData(cvData: any, sectionKey: string, newData: any): any {
  if (sectionKey === 'profile') {
    return {
      ...cvData,
      personal_info: { ...cvData.personal_info, ...newData }
    };
  }
  return {
    ...cvData,
    [sectionKey]: { ...cvData[sectionKey], ...newData }
  };
} 