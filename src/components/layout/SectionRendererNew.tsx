'use client';

import React from 'react';
import { TemplateConfig } from '../templates/TemplateRegistry';
import { SnippetConfig } from '../snippets/SnippetRegistry';
import { EnhancedEditableField } from './EnhancedEditableField';

interface SectionRendererProps {
  sectionKey: string;
  data: any;
  config: any;
  snippet: SnippetConfig | null;
  fonts: TemplateConfig['fonts'];
  isPreview: boolean;
  onDataChange?: (sectionId: string, data: any) => void;
  onContentSelect?: (content: string, section: string, elementType: string) => void;
  selectedContent?: string;
  selectedSection?: string;
  templateId?: string;
}

export function SectionRenderer({
  sectionKey,
  data,
  config,
  snippet,
  fonts,
  isPreview,
  onDataChange,
  onContentSelect,
  selectedContent,
  selectedSection,
  templateId
}: SectionRendererProps) {
  const renderProfileSection = () => {
    const profileData = data || {};
    
    const nameStyle: React.CSSProperties = {
      fontFamily: fonts.heading,
      fontSize: fonts.sizes.name,
      fontWeight: 'bold',
      color: '#1a1a1a',
      marginBottom: '12px',
      textAlign: config?.position === 'left' ? 'left' : 'center',
      lineHeight: '1.0'
    };

    const contactStyle: React.CSSProperties = {
      fontFamily: fonts.body,
      fontSize: fonts.sizes.bullet,
      color: '#666666',
      lineHeight: '1.0'
    };

    const summaryStyle: React.CSSProperties = {
      fontFamily: fonts.body,
      fontSize: fonts.sizes.bullet,
      color: '#333333',
      lineHeight: '1.0',
      textAlign: 'justify',
      marginTop: '12px'
    };

    return (
      <div className="cv-profile-section" style={snippet?.renderConfig}>
        <EnhancedEditableField
          value={profileData.name || ''}
          onChange={(value) => onDataChange?.('profile', { ...profileData, name: value })}
          placeholder="Your Name"
          isPreview={isPreview}
          style={nameStyle}
          onContentSelect={onContentSelect}
          sectionKey={sectionKey}
          elementType="name"
          isSelected={selectedContent === (profileData.name || '') && selectedSection === sectionKey}
          templateId={templateId}
        />
        
        <div className="flex justify-center items-center flex-wrap gap-x-4 gap-y-1 mb-4">
          {['contact0', 'contact1', 'contact2'].map((contactKey, index) => (
            <EnhancedEditableField
              key={index}
              value={profileData[contactKey] || ''}
              onChange={(value) => onDataChange?.('profile', { ...profileData, [contactKey]: value })}
              placeholder="Contact Info"
              isPreview={isPreview}
              style={contactStyle}
              onContentSelect={onContentSelect}
              sectionKey={sectionKey}
              elementType={contactKey}
              isSelected={selectedContent === (profileData[contactKey] || '') && selectedSection === sectionKey}
              templateId={templateId}
            />
          ))}
        </div>
        
        <EnhancedEditableField
          value={profileData.summary || ''}
          onChange={(value) => onDataChange?.('profile', { ...profileData, summary: value })}
          placeholder="Professional summary..."
          multiline={true}
          isPreview={isPreview}
          style={summaryStyle}
          onContentSelect={onContentSelect}
          sectionKey={sectionKey}
          elementType="summary"
          isSelected={selectedContent === (profileData.summary || '') && selectedSection === sectionKey}
          templateId={templateId}
        />
      </div>
    );
  };

  const renderExperienceSection = () => {
    const experienceData = data || {};
    const entries = experienceData.entries || [];
    
    const titleStyle: React.CSSProperties = {
      fontFamily: fonts.heading,
      fontSize: fonts.sizes.sectionTitle,
      fontWeight: 'bold',
      color: '#1a1a1a',
      marginBottom: '16px',
      textTransform: 'uppercase',
      borderBottom: '2px solid #333',
      paddingBottom: '4px',
      lineHeight: '1.0'
    };

    const jobTitleStyle: React.CSSProperties = {
      fontFamily: fonts.body,
      fontSize: fonts.sizes.jobTitle,
      fontWeight: 'bold',
      color: '#1a1a1a',
      lineHeight: '1.0'
    };

    const companyStyle: React.CSSProperties = {
      fontFamily: fonts.body,
      fontSize: fonts.sizes.jobTitle,
      fontWeight: '600',
      color: '#1a1a1a',
      lineHeight: '1.0'
    };

    const durationStyle: React.CSSProperties = {
      fontFamily: fonts.body,
      fontSize: fonts.sizes.bullet,
      color: '#666666',
      fontWeight: '600',
      lineHeight: '1.0'
    };

    const bulletStyle: React.CSSProperties = {
      fontFamily: fonts.body,
      fontSize: fonts.sizes.bullet,
      color: '#333333',
      lineHeight: '1.0',
      marginBottom: snippet?.renderConfig.spacing || '4px'
    };

    const getBulletMarker = () => {
      switch (snippet?.renderConfig.bulletStyle) {
        case 'dash': return '— ';
        case 'dot': return '• ';
        case 'arrow': return '→ ';
        default: return '• ';
      }
    };

    return (
      <div className="cv-experience-section" style={snippet?.renderConfig}>
        <h2 style={titleStyle}>Experience</h2>
        
        {entries.map((entry: any, index: number) => (
          <div key={index} className="mb-4" style={{ paddingLeft: snippet?.renderConfig.indent || '0px' }}>
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <div className="flex items-center mb-1">
                  <EnhancedEditableField
                    value={entry.title || ''}
                    onChange={(value) => {
                      const newEntries = [...entries];
                      newEntries[index] = { ...entry, title: value };
                      onDataChange?.('experience', { ...experienceData, entries: newEntries });
                    }}
                    placeholder="Job Title"
                    isPreview={isPreview}
                    style={jobTitleStyle}
                    templateId={templateId}
                    elementType="title"
                  />
                  <span className="text-gray-600 font-semibold mx-2">,</span>
                  <EnhancedEditableField
                    value={entry.company || ''}
                    onChange={(value) => {
                      const newEntries = [...entries];
                      newEntries[index] = { ...entry, company: value };
                      onDataChange?.('experience', { ...experienceData, entries: newEntries });
                    }}
                    placeholder="Company"
                    isPreview={isPreview}
                    style={companyStyle}
                    templateId={templateId}
                    elementType="company"
                  />
                </div>
              </div>
              <div className="text-right ml-4">
                <EnhancedEditableField
                  value={entry.duration || ''}
                  onChange={(value) => {
                    const newEntries = [...entries];
                    newEntries[index] = { ...entry, duration: value };
                    onDataChange?.('experience', { ...experienceData, entries: newEntries });
                  }}
                  placeholder="Duration"
                  isPreview={isPreview}
                  style={durationStyle}
                  templateId={templateId}
                  elementType="duration"
                />
              </div>
            </div>
            
            {entry.details && (
              <ul className="list-none pl-0">
                {entry.details.map((detail: string, detailIndex: number) => (
                  <li key={detailIndex} className="mb-2">
                    <span className="mr-2">{getBulletMarker()}</span>
                    <EnhancedEditableField
                      value={detail}
                      onChange={(value) => {
                        const newEntries = [...entries];
                        const newDetails = [...(newEntries[index].details || [])];
                        newDetails[detailIndex] = value;
                        newEntries[index] = { ...newEntries[index], details: newDetails };
                        onDataChange?.('experience', { ...experienceData, entries: newEntries });
                      }}
                      placeholder="Detail description..."
                      multiline={true}
                      isPreview={isPreview}
                      style={bulletStyle}
                      templateId={templateId}
                      elementType="details"
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderSkillsSection = () => {
    const skillsData = data || {};
    const entries = skillsData.entries || [];
    
    const titleStyle: React.CSSProperties = {
      fontFamily: fonts.heading,
      fontSize: fonts.sizes.sectionTitle,
      fontWeight: 'bold',
      color: '#1a1a1a',
      marginBottom: '16px',
      textTransform: 'uppercase',
      borderBottom: '2px solid #333',
      paddingBottom: '4px',
      lineHeight: '1.0'
    };

    const renderChipSkills = () => (
      <div className="flex flex-wrap gap-2">
        {entries.map((entry: any, index: number) => (
          <span
            key={index}
            className="px-3 py-1 rounded-full text-sm"
            style={{
              backgroundColor: snippet?.renderConfig.chipColor || '#e5e7eb',
              border: snippet?.renderConfig.border || '1px solid #d1d5db',
              color: '#374151',
              fontFamily: fonts.body,
              fontSize: fonts.sizes.bullet
            }}
          >
            <EnhancedEditableField
              value={entry.title || ''}
              onChange={(value) => {
                const newEntries = [...entries];
                newEntries[index] = { ...entry, title: value };
                onDataChange?.('skills', { ...skillsData, entries: newEntries });
              }}
              placeholder="Skill"
              isPreview={isPreview}
              templateId={templateId}
              elementType="skill"
            />
          </span>
        ))}
      </div>
    );

    const renderBarSkills = () => (
      <div className="space-y-3">
        {entries.map((entry: any, index: number) => (
          <div key={index} className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <EnhancedEditableField
                value={entry.title || ''}
                onChange={(value) => {
                  const newEntries = [...entries];
                  newEntries[index] = { ...entry, title: value };
                  onDataChange?.('skills', { ...skillsData, entries: newEntries });
                }}
                placeholder="Skill"
                isPreview={isPreview}
                style={{
                  fontFamily: fonts.body,
                  fontSize: fonts.sizes.bullet,
                  fontWeight: '600'
                }}
                templateId={templateId}
                elementType="skill"
              />
              <span className="text-sm text-gray-600">{entry.level || '90%'}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full" style={{ height: snippet?.renderConfig.barHeight || '10px' }}>
              <div
                className="bg-blue-600 rounded-full"
                style={{
                  height: '100%',
                  width: entry.level || '90%'
                }}
              />
            </div>
          </div>
        ))}
      </div>
    );

    const renderCategorizedSkills = () => (
      <div className="space-y-4">
        {entries.map((entry: any, index: number) => (
          <div key={index} className="mb-4">
            <h4 className="font-semibold mb-2" style={{
              fontFamily: fonts.body,
              fontSize: fonts.sizes.jobTitle,
              color: '#1a1a1a'
            }}>
              <EnhancedEditableField
                value={entry.title || ''}
                onChange={(value) => {
                  const newEntries = [...entries];
                  newEntries[index] = { ...entry, title: value };
                  onDataChange?.('skills', { ...skillsData, entries: newEntries });
                }}
                placeholder="Category"
                isPreview={isPreview}
                templateId={templateId}
                elementType="skill-category"
              />
            </h4>
            {entry.details && (
              <ul className="list-disc list-inside space-y-1">
                {entry.details.map((detail: string, detailIndex: number) => (
                  <li key={detailIndex} style={{
                    fontFamily: fonts.body,
                    fontSize: fonts.sizes.bullet,
                    color: '#333333'
                  }}>
                    <EnhancedEditableField
                      value={detail}
                      onChange={(value) => {
                        const newEntries = [...entries];
                        const newDetails = [...(newEntries[index].details || [])];
                        newDetails[detailIndex] = value;
                        newEntries[index] = { ...newEntries[index], details: newDetails };
                        onDataChange?.('skills', { ...skillsData, entries: newEntries });
                      }}
                      placeholder="Skill detail"
                      isPreview={isPreview}
                      templateId={templateId}
                      elementType="skill-detail"
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    );

    const renderInlineSkills = () => (
      <div className="flex flex-wrap gap-1">
        {entries.map((entry: any, index: number) => (
          <React.Fragment key={index}>
            <EnhancedEditableField
              value={entry.title || ''}
              onChange={(value) => {
                const newEntries = [...entries];
                newEntries[index] = { ...entry, title: value };
                onDataChange?.('skills', { ...skillsData, entries: newEntries });
              }}
              placeholder="Skill"
              isPreview={isPreview}
              style={{
                fontFamily: fonts.body,
                fontSize: fonts.sizes.bullet,
                color: '#333333'
              }}
              templateId={templateId}
              elementType="skill"
            />
            {index < entries.length - 1 && <span className="text-gray-600">,</span>}
          </React.Fragment>
        ))}
      </div>
    );

    return (
      <div className="cv-skills-section" style={snippet?.renderConfig}>
        <h2 style={titleStyle}>Skills</h2>
        
        {snippet?.renderConfig.format === 'chip' && renderChipSkills()}
        {snippet?.renderConfig.format === 'bar' && renderBarSkills()}
        {snippet?.renderConfig.format === 'categorized' && renderCategorizedSkills()}
        {snippet?.renderConfig.format === 'inline' && renderInlineSkills()}
        {!snippet?.renderConfig.format && renderChipSkills()} {/* Default */}
      </div>
    );
  };

  const renderEducationSection = () => {
    const educationData = data || {};
    const entries = educationData.entries || [];
    
    const titleStyle: React.CSSProperties = {
      fontFamily: fonts.heading,
      fontSize: fonts.sizes.sectionTitle,
      fontWeight: 'bold',
      color: '#1a1a1a',
      marginBottom: '16px',
      textTransform: 'uppercase',
      borderBottom: '2px solid #333',
      paddingBottom: '4px',
      lineHeight: '1.0'
    };

    const degreeStyle: React.CSSProperties = {
      fontFamily: fonts.body,
      fontSize: fonts.sizes.jobTitle,
      fontWeight: 'bold',
      color: '#1a1a1a',
      lineHeight: '1.0'
    };

    const institutionStyle: React.CSSProperties = {
      fontFamily: fonts.body,
      fontSize: fonts.sizes.jobTitle,
      fontWeight: '600',
      color: '#1a1a1a',
      lineHeight: '1.0'
    };

    const durationStyle: React.CSSProperties = {
      fontFamily: fonts.body,
      fontSize: fonts.sizes.bullet,
      color: '#666666',
      fontWeight: '600',
      lineHeight: '1.0'
    };

    return (
      <div className="cv-education-section" style={snippet?.renderConfig}>
        <h2 style={titleStyle}>Education</h2>
        
        {entries.map((entry: any, index: number) => (
          <div key={index} className="mb-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <div className="flex items-center mb-1">
                  <EnhancedEditableField
                    value={entry.degree || ''}
                    onChange={(value) => {
                      const newEntries = [...entries];
                      newEntries[index] = { ...entry, degree: value };
                      onDataChange?.('education', { ...educationData, entries: newEntries });
                    }}
                    placeholder="Degree"
                    isPreview={isPreview}
                    style={degreeStyle}
                    templateId={templateId}
                    elementType="degree"
                  />
                  <span className="text-gray-600 font-semibold mx-2">,</span>
                  <EnhancedEditableField
                    value={entry.institution || ''}
                    onChange={(value) => {
                      const newEntries = [...entries];
                      newEntries[index] = { ...entry, institution: value };
                      onDataChange?.('education', { ...educationData, entries: newEntries });
                    }}
                    placeholder="Institution"
                    isPreview={isPreview}
                    style={institutionStyle}
                    templateId={templateId}
                    elementType="institution"
                  />
                </div>
              </div>
              <div className="text-right ml-4">
                <EnhancedEditableField
                  value={entry.duration || ''}
                  onChange={(value) => {
                    const newEntries = [...entries];
                    newEntries[index] = { ...entry, duration: value };
                    onDataChange?.('education', { ...educationData, entries: newEntries });
                  }}
                  placeholder="Duration"
                  isPreview={isPreview}
                  style={durationStyle}
                  templateId={templateId}
                  elementType="duration"
                />
              </div>
            </div>
            
            {entry.details && (
              <ul className="list-disc list-inside space-y-1">
                {entry.details.map((detail: string, detailIndex: number) => (
                  <li key={detailIndex} style={{
                    fontFamily: fonts.body,
                    fontSize: fonts.sizes.bullet,
                    color: '#333333'
                  }}>
                    <EnhancedEditableField
                      value={detail}
                      onChange={(value) => {
                        const newEntries = [...entries];
                        const newDetails = [...(newEntries[index].details || [])];
                        newDetails[detailIndex] = value;
                        newEntries[index] = { ...newEntries[index], details: newDetails };
                        onDataChange?.('education', { ...educationData, entries: newEntries });
                      }}
                      placeholder="Detail"
                      isPreview={isPreview}
                      templateId={templateId}
                      elementType="education-detail"
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderGenericSection = () => {
    const sectionData = data || {};
    const entries = sectionData.entries || [];
    
    const titleStyle: React.CSSProperties = {
      fontFamily: fonts.heading,
      fontSize: fonts.sizes.sectionTitle,
      fontWeight: 'bold',
      color: '#1a1a1a',
      marginBottom: '16px',
      textTransform: 'uppercase',
      borderBottom: '2px solid #333',
      paddingBottom: '4px',
      lineHeight: '1.0'
    };

    return (
      <div className="cv-generic-section" style={snippet?.renderConfig}>
        <h2 style={titleStyle}>{sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1)}</h2>
        
        {entries.map((entry: any, index: number) => (
          <div key={index} className="mb-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <div className="flex items-center mb-1">
                  <EnhancedEditableField
                    value={entry.title || ''}
                    onChange={(value) => {
                      const newEntries = [...entries];
                      newEntries[index] = { ...entry, title: value };
                      onDataChange?.(sectionKey, { ...sectionData, entries: newEntries });
                    }}
                    placeholder="Title"
                    isPreview={isPreview}
                    style={{
                      fontFamily: fonts.body,
                      fontSize: fonts.sizes.jobTitle,
                      fontWeight: 'bold',
                      color: '#1a1a1a'
                    }}
                    templateId={templateId}
                    elementType="title"
                  />
                  {entry.company && (
                    <>
                      <span className="text-gray-600 font-semibold mx-2">,</span>
                      <EnhancedEditableField
                        value={entry.company}
                        onChange={(value) => {
                          const newEntries = [...entries];
                          newEntries[index] = { ...entry, company: value };
                          onDataChange?.(sectionKey, { ...sectionData, entries: newEntries });
                        }}
                        placeholder="Company"
                        isPreview={isPreview}
                        style={{
                          fontFamily: fonts.body,
                          fontSize: fonts.sizes.jobTitle,
                          fontWeight: '600',
                          color: '#1a1a1a'
                        }}
                        templateId={templateId}
                        elementType="company"
                      />
                    </>
                  )}
                </div>
              </div>
              {entry.duration && (
                <div className="text-right ml-4">
                  <EnhancedEditableField
                    value={entry.duration}
                    onChange={(value) => {
                      const newEntries = [...entries];
                      newEntries[index] = { ...entry, duration: value };
                      onDataChange?.(sectionKey, { ...sectionData, entries: newEntries });
                    }}
                    placeholder="Duration"
                    isPreview={isPreview}
                    style={{
                      fontFamily: fonts.body,
                      fontSize: fonts.sizes.bullet,
                      color: '#666666',
                      fontWeight: '600'
                    }}
                    templateId={templateId}
                    elementType="duration"
                  />
                </div>
              )}
            </div>
            
            {entry.details && (
              <ul className="list-disc list-inside space-y-1">
                {entry.details.map((detail: string, detailIndex: number) => (
                  <li key={detailIndex} style={{
                    fontFamily: fonts.body,
                    fontSize: fonts.sizes.bullet,
                    color: '#333333'
                  }}>
                    <EnhancedEditableField
                      value={detail}
                      onChange={(value) => {
                        const newEntries = [...entries];
                        const newDetails = [...(newEntries[index].details || [])];
                        newDetails[detailIndex] = value;
                        newEntries[index] = { ...newEntries[index], details: newDetails };
                        onDataChange?.(sectionKey, { ...sectionData, entries: newEntries });
                      }}
                      placeholder="Detail"
                      isPreview={isPreview}
                      templateId={templateId}
                      elementType="detail"
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Render based on section type
  switch (sectionKey) {
    case 'profile':
      return renderProfileSection();
    case 'experience':
      return renderExperienceSection();
    case 'skills':
      return renderSkillsSection();
    case 'education':
      return renderEducationSection();
    default:
      return renderGenericSection();
  }
} 