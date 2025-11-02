'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Eye } from 'lucide-react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { DesignSettings, SectionConfig } from '@/types/design-settings';

interface CVPreviewContentProps {
  cvData: UnifiedCVDataStructure | null;
  theme?: 'light' | 'dark';
  showBadge?: boolean;
  sectionOrder?: string[];
  sectionVisibility?: Record<string, boolean>;
  templateStyles?: any;
  customCSS?: string;
  templateName?: string;
  pagePadding?: { top: number; bottom: number };
  designSettings?: DesignSettings;
  sectionConfig?: Partial<SectionConfig>;
}

const CVPreviewContent: React.FC<CVPreviewContentProps> = ({ 
  cvData, 
  theme = 'light', 
  showBadge = true,
  sectionOrder = ['personal_header', 'work_experience', 'education', 'skills', 'projects', 'certificates', 'languages'],
  sectionVisibility = {},
  templateStyles,
  customCSS,
  templateName,
  pagePadding = { top: 32, bottom: 32 },
  designSettings,
  sectionConfig
}) => {
  const isDark = theme === 'dark';
  
  // Helper function to check if a section should be visible
  const isSectionVisible = (sectionName: string) => {
    // If sectionVisibility is provided, use it; otherwise default to true
    if (Object.keys(sectionVisibility).length === 0) {
      return true; // Default to visible if no visibility settings provided
    }
    const isVisible = sectionVisibility[sectionName] !== false;
    return isVisible;
  };
  
  
  // Detect template layout type
  const getTemplateLayout = () => {
    if (!templateName) return 'single-column';
    
    // Check template name for layout hints
    if (templateName.toLowerCase().includes('sidebar') || 
        templateName.toLowerCase().includes('two-column') ||
        templateName.toLowerCase().includes('split')) {
      return 'two-column';
    }
    
    // Check for layout-specific CSS properties
    if (customCSS && (customCSS.includes('sidebar') || customCSS.includes('grid-template-columns'))) {
      return 'two-column';
    }
    
    return 'single-column';
  };

  // Apply comprehensive design settings
  const applyDesignSettings = () => {
    if (!designSettings) return {};
    
    return {
      fontFamily: designSettings.fontFamily || 'Inter, system-ui, sans-serif',
      fontSize: `${designSettings.bodySize || 14}px`,
      lineHeight: designSettings.lineSpacing || 1.2,
      color: designSettings.textAlignment === 'center' ? '#374151' : '#1f2937',
      textAlign: designSettings.textAlignment || 'left'
    };
  };

  const layoutType = getTemplateLayout();
  const templateStyle = applyDesignSettings();

  // Calculate content height and determine if we need multiple pages
  const [contentHeight, setContentHeight] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      const height = contentRef.current.scrollHeight;
      setContentHeight(height);
      
      // Check if this is a single-page template
      const isSinglePageTemplate = templateName?.toLowerCase().includes('tech pro blue') ||
                                   templateName?.toLowerCase().includes('executive professional');
      
      if (isSinglePageTemplate) {
        setTotalPages(1);
      } else {
        // A4 page height: 297mm = 1123px (at 96 DPI)
        const pageHeight = 1123 - pagePadding.top - pagePadding.bottom; // Account for padding
        const pages = Math.ceil(height / pageHeight);
        setTotalPages(Math.max(1, pages));
      }
    }
  }, [cvData, sectionOrder, sectionVisibility, pagePadding, templateName]);

  // Early return if no CV data
  if (!cvData) {
    return (
      <div className="space-y-8 relative">
        <div className={`${isDark ? 'bg-[#1a230f]' : 'bg-white'} p-8`} style={{ 
          width: '210mm', 
          height: '297mm',
          overflow: 'hidden',
          ...templateStyle
        }}>
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-500 dark:text-gray-400 mb-2">
                No CV Data Available
              </h3>
              <p className="text-gray-400 dark:text-gray-500">
                Start adding your information to see a preview
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const themeClasses = {
    page: isDark ? 'bg-[#1a230f]' : 'bg-white',
    text: {
      primary: isDark ? 'text-white' : 'text-gray-900',
      secondary: isDark ? 'text-gray-300' : 'text-gray-600',
      muted: isDark ? 'text-gray-400' : 'text-gray-500',
      accent: isDark ? 'text-blue-400' : 'text-blue-600'
    },
    border: isDark ? 'border-white/10' : 'border-gray-200',
    accent: isDark ? 'border-lime-400' : 'border-blue-600'
  };

  return (
    <div className="space-y-8 relative">
      {/* Inject custom CSS if available */}
      {customCSS && (
        <style dangerouslySetInnerHTML={{ __html: customCSS }} />
      )}
      
      {/* A4 Page Break CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .cv-page {
            page-break-after: always;
            page-break-inside: avoid;
          }
          .cv-page:last-child {
            page-break-after: auto;
          }
          .section-break {
            page-break-inside: avoid;
          }
        }
        .cv-page {
          break-after: page;
          break-inside: avoid;
        }
        .cv-page:last-child {
          break-after: auto;
        }
        .section-break {
          break-inside: avoid;
        }
      ` }} />
      
      {/* CV Preview Badge */}
      {showBadge && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
          <div className={`${isDark ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gradient-to-r from-blue-600 to-blue-700'} text-white px-4 py-2 rounded-full flex items-center gap-2`}>
            <Eye size={16} />
            <span className="text-sm font-medium">CV Preview • A4 Format • {totalPages} Page{totalPages > 1 ? 's' : ''}</span>
          </div>
        </div>
      )}
      
      {/* Render multiple pages */}
      {Array.from({ length: totalPages }, (_, pageIndex) => (
        <div 
          key={pageIndex}
          className={`${themeClasses.page} cv-page mb-8`} 
          style={{ 
            width: '210mm', 
            height: '297mm',
            overflow: 'hidden',
            pageBreakAfter: pageIndex < totalPages - 1 ? 'always' : 'auto',
            breakAfter: pageIndex < totalPages - 1 ? 'page' : 'auto',
            ...templateStyle
          }}
        >
          <div className="h-full" style={{
            paddingTop: `${pagePadding.top}px`,
            paddingBottom: `${pagePadding.bottom}px`,
            paddingLeft: '32px',
            paddingRight: '32px'
          }}>
            {/* Render appropriate layout based on template type */}
            {layoutType === 'two-column' ? (
              <div className="grid grid-cols-2 gap-8 h-full">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Header */}
                  <div className={`text-center border-b ${themeClasses.border} pb-6 mb-6`} style={{
                    borderBottomColor: templateStyles?.secondaryColor || themeClasses.border
                  }}>
                    <h4 
                      className={`text-3xl font-bold mb-2 text-gray-900`}
                    >
                      {cvData.basics.name || 'Your Name'}
                    </h4>
                    <p 
                      className="text-xl mb-3 text-gray-700"
                    >
                      {cvData.basics.label || 'Professional Title'}
                    </p>
                    <div className="flex items-center justify-center gap-6 mt-3 text-sm text-gray-600" style={{
                      fontSize: '14px',
                      fontWeight: '400'
                    }}>
                      {cvData.basics.email && (
                        <span className="flex items-center gap-1 hover:opacity-80 transition-opacity">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                          </svg>
                          {cvData.basics.email}
                        </span>
                      )}
                      {cvData.basics.phone && (
                        <span className="flex items-center gap-1 hover:opacity-80 transition-opacity">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                          </svg>
                          {cvData.basics.phone}
                        </span>
                      )}
                      {cvData.basics.location.city && (
                        <span className="flex items-center gap-1 hover:opacity-80 transition-opacity">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                          </svg>
                          {cvData.basics.location.city}
                        </span>
                      )}
                      {cvData.basics.url && (
                        <span className="flex items-center gap-1 hover:opacity-80 transition-opacity">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                          </svg>
                          {cvData.basics.url}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Contact Info */}
                  <div className="space-y-4">
                    {cvData.basics.email && <p className="text-sm">{cvData.basics.email}</p>}
                    {cvData.basics.phone && <p className="text-sm">{cvData.basics.phone}</p>}
                    {cvData.basics.location.city && <p className="text-sm">{cvData.basics.location.city}</p>}
                    {cvData.basics.url && <p className="text-sm">{cvData.basics.url}</p>}
                  </div>
                  
                  {/* Skills */}
                  {cvData.skills && cvData.skills.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="font-semibold text-lg">Skills</h5>
                      <div className="space-y-1">
                        {cvData.skills.map((skill, index) => (
                          <p key={index}>{skill.name}</p>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Languages */}
                  {cvData.languages && cvData.languages.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="font-semibold text-lg">Languages</h5>
                      <div className="space-y-1">
                        {cvData.languages.map((lang, index) => (
                          <p key={index}>{lang.language} - {lang.fluency}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Right Column */}
                <div className="space-y-6">
                  {/* Summary */}
                  {cvData.basics.summary && (
                    <div className="space-y-2">
                      <h5 className="font-semibold text-lg">Professional Summary</h5>
                      <p className="text-sm">{cvData.basics.summary}</p>
                    </div>
                  )}
                  
                  {/* Work Experience */}
                  {cvData.work && cvData.work.length > 0 && (
                    <div className="space-y-4">
                      <h5 className="font-semibold text-lg">Work Experience</h5>
                      <div className="space-y-3">
                        {cvData.work.map((job, index) => (
                          <div key={index} className="space-y-1">
                            <h6 className="font-medium">{job.position}</h6>
                            <p className="text-sm text-gray-600">{job.name}</p>
                            <p className="text-xs text-gray-500">{job.startDate} - {job.endDate}</p>
                            <p className="text-sm mt-2">{job.summary}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Education */}
                  {cvData.education && cvData.education.length > 0 && (
                    <div className="space-y-4">
                      <h5 className="font-semibold text-lg">Education</h5>
                      <div className="space-y-3">
                        {cvData.education.map((edu, index) => (
                          <div key={index} className="space-y-1">
                            <h6 className="font-medium">{edu.studyType}</h6>
                            <p className="text-sm text-gray-600">{edu.institution}</p>
                            <p className="text-xs text-gray-500">{edu.startDate} - {edu.endDate}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Projects */}
                  {cvData.projects && cvData.projects.length > 0 && (
                    <div className="space-y-4">
                      <h5 className="font-semibold text-lg">Projects</h5>
                      <div className="space-y-3">
                        {cvData.projects.map((project, index) => (
                          <div key={index} className="space-y-1">
                            <h6 className="font-medium">{project.name}</h6>
                            <p className="text-sm">{project.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Single Column Layout */}
                {/* Header */}
                <div className={`text-center border-b ${themeClasses.border} pb-6 mb-6`} style={{
                  borderBottomColor: templateStyles?.secondaryColor || themeClasses.border
                }}>
                  <h4 
                    className={`text-3xl font-bold mb-2 text-gray-900`}
                  >
                    {cvData.basics.name || 'Your Name'}
                  </h4>
                  <p 
                    className="text-xl mb-3 text-gray-700"
                  >
                    {cvData.basics.label || 'Professional Title'}
                  </p>
                  <div className="flex items-center justify-center gap-6 mt-3 text-sm text-gray-600" style={{
                    fontSize: '14px',
                    fontWeight: '400'
                  }}>
                    {cvData.basics.email && (
                      <span className="flex items-center gap-1 hover:opacity-80 transition-opacity">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                          <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                        </svg>
                        {cvData.basics.email}
                      </span>
                    )}
                    {cvData.basics.phone && (
                      <span className="flex items-center gap-1 hover:opacity-80 transition-opacity">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                        </svg>
                        {cvData.basics.phone}
                      </span>
                    )}
                    {cvData.basics.location.city && (
                      <span className="flex items-center gap-1 hover:opacity-80 transition-opacity">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        {cvData.basics.location.city}
                      </span>
                    )}
                    {cvData.basics.url && (
                      <span className="flex items-center gap-1 hover:opacity-80 transition-opacity">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                        </svg>
                        {cvData.basics.url}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Summary */}
                {cvData.basics.summary && (
                  <div className="mb-6">
                    <h5 className={`text-xl font-semibold mb-4 border-b pb-1`} style={{
                      color: '#1f2937',
                      borderBottomColor: templateStyles?.secondaryColor || themeClasses.border
                    }}>
                      Professional Summary
                    </h5>
                    <div className="text-sm leading-relaxed" style={{
                      color: templateStyles?.secondaryColor || themeClasses.text.secondary
                    }}>
                      <p>{cvData.basics.summary}</p>
                    </div>
                  </div>
                )}
                
                {/* Work Experience */}
                {cvData.work && cvData.work.length > 0 && isSectionVisible('work_experience') && (
                  <div className="mb-6">
                    <h5 className={`text-xl font-semibold mb-4 border-b pb-1`} style={{
                      color: '#1f2937',
                      borderBottomColor: templateStyles?.secondaryColor || themeClasses.border
                    }}>
                      Work Experience
                    </h5>
                    <div className="space-y-4">
                      {cvData.work.map((work, index) => (
                        <div key={index} className="border-l-4 pl-4" style={{
                          borderLeftColor: templateStyles?.primaryColor || themeClasses.accent
                        }}>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h6 className="font-semibold text-lg" style={{
                                color: templateStyles?.primaryColor || themeClasses.text.primary
                              }}>
                                {work.position}
                              </h6>
                              <p className="text-sm" style={{
                                color: templateStyles?.secondaryColor || themeClasses.text.muted
                              }}>
                                {work.name}
                              </p>
                            </div>
                            <span className="text-sm" style={{
                              color: templateStyles?.secondaryColor || themeClasses.text.muted
                            }}>
                              {work.startDate && work.endDate ? `${work.startDate} - ${work.endDate}` : ''}
                            </span>
                          </div>
                          {work.summary && (
                            <div className="text-sm leading-relaxed" style={{
                              color: templateStyles?.secondaryColor || themeClasses.text.secondary
                            }}>
                              <p>{work.summary}</p>
                            </div>
                          )}
                          {work.highlights && work.highlights.length > 0 && (
                            <ul className="text-sm mt-2 space-y-1" style={{
                              color: templateStyles?.secondaryColor || themeClasses.text.secondary
                            }}>
                              {work.highlights.map((highlight, i) => (
                                <li key={i} className="flex items-start">
                                  <span className="mr-2">•</span>
                                  <span>{highlight}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Education */}
                {cvData.education && cvData.education.length > 0 && isSectionVisible('education') && (
                  <div className="mb-6">
                    <h5 className={`text-xl font-semibold mb-4 border-b pb-1`} style={{
                      color: '#1f2937',
                      borderBottomColor: templateStyles?.secondaryColor || themeClasses.border
                    }}>
                      Education
                    </h5>
                    <div className="space-y-4">
                      {cvData.education.map((education, index) => (
                        <div key={index} className="border-l-4 pl-4" style={{
                          borderLeftColor: templateStyles?.primaryColor || themeClasses.accent
                        }}>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h6 className="font-semibold text-lg" style={{
                                color: templateStyles?.primaryColor || themeClasses.text.primary
                              }}>
                                {education.studyType} {education.area && `in ${education.area}`}
                              </h6>
                              <p className="text-sm" style={{
                                color: templateStyles?.secondaryColor || themeClasses.text.muted
                              }}>
                                {education.institution}
                              </p>
                            </div>
                            <span className="text-sm" style={{
                              color: templateStyles?.secondaryColor || themeClasses.text.muted
                            }}>
                              {education.startDate && education.endDate ? `${education.startDate} - ${education.endDate}` : ''}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Skills */}
                {cvData.skills && cvData.skills.length > 0 && isSectionVisible('skills') && (
                  <div className="mb-6">
                    <h5 className={`text-xl font-semibold mb-4 border-b pb-1`} style={{
                      color: '#1f2937',
                      borderBottomColor: templateStyles?.secondaryColor || themeClasses.border
                    }}>
                      Skills
                    </h5>
                    <div className="space-y-2">
                      {cvData.skills.map((skill, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <span className="text-sm" style={{
                            color: templateStyles?.secondaryColor || themeClasses.text.secondary
                          }}>
                            {skill.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Projects */}
                {cvData.projects && cvData.projects.length > 0 && isSectionVisible('projects') && (
                  <div className="mb-6">
                    <h5 className={`text-xl font-semibold mb-4 border-b pb-1`} style={{
                      color: '#1f2937',
                      borderBottomColor: templateStyles?.secondaryColor || themeClasses.border
                    }}>
                      Projects
                    </h5>
                    <div className="space-y-4">
                      {cvData.projects.map((project, index) => (
                        <div key={index} className="border-l-4 pl-4" style={{
                          borderLeftColor: templateStyles?.primaryColor || themeClasses.accent
                        }}>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h6 className="font-semibold text-lg" style={{
                                color: templateStyles?.primaryColor || themeClasses.text.primary
                              }}>
                                {project.name}
                              </h6>
                              {project.description && (
                                <p className="text-sm" style={{
                                  color: templateStyles?.secondaryColor || themeClasses.text.secondary
                                }}>
                                  {project.description}
                                </p>
                              )}
                            </div>
                            <span className="text-sm" style={{
                              color: templateStyles?.secondaryColor || themeClasses.text.muted
                            }}>
                              {project.startDate && project.endDate ? `${project.startDate} - ${project.endDate}` : ''}
                            </span>
                          </div>
                          {project.url && (
                            <p className="text-sm mt-2" style={{
                              color: templateStyles?.secondaryColor || themeClasses.text.accent
                            }}>
                              <a href={project.url} target="_blank" rel="noopener noreferrer">
                                {project.url}
                              </a>
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Certificates */}
                {cvData.certificates && cvData.certificates.length > 0 && isSectionVisible('certificates') && (
                  <div className="mb-6">
                    <h5 className={`text-xl font-semibold mb-4 border-b pb-1`} style={{
                      color: '#1f2937',
                      borderBottomColor: templateStyles?.secondaryColor || themeClasses.border
                    }}>
                      Certificates
                    </h5>
                    <div className="space-y-3">
                      {cvData.certificates.map((certificate, index) => (
                        <div key={index} className="flex justify-between items-start">
                          <div>
                            <h6 className="font-medium" style={{
                              color: templateStyles?.primaryColor || themeClasses.text.primary
                            }}>
                              {certificate.name}
                            </h6>
                            {certificate.issuer && (
                              <p className="text-sm" style={{
                                color: templateStyles?.secondaryColor || themeClasses.text.muted
                              }}>
                                {certificate.issuer}
                              </p>
                            )}
                          </div>
                          <span className="text-sm" style={{
                            color: templateStyles?.secondaryColor || themeClasses.text.muted
                          }}>
                            {certificate.date}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Languages */}
                {cvData.languages && cvData.languages.length > 0 && isSectionVisible('languages') && (
                  <div className="mb-6">
                    <h5 className={`text-xl font-semibold mb-4 border-b pb-1`} style={{
                      color: '#1f2937',
                      borderBottomColor: templateStyles?.secondaryColor || themeClasses.border
                    }}>
                      Languages
                    </h5>
                    <div className="grid grid-cols-2 gap-4">
                      {cvData.languages.map((language, index) => (
                        <div key={index} className="text-sm" style={{
                          color: templateStyles?.secondaryColor || themeClasses.text.secondary
                        }}>
                          {language.language} - {language.fluency}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CVPreviewContent;
