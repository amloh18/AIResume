'use client';

import React from 'react';
import { Eye } from 'lucide-react';
import { CVDataStructure } from '@/types/cv';

interface CVPreviewContentProps {
  cvData: CVDataStructure | null;
  theme?: 'light' | 'dark';
  showBadge?: boolean;
  sectionOrder?: string[];
  sectionVisibility?: Record<string, boolean>;
  templateStyles?: {
    fontFamily: string;
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    fontSize: string;
    lineHeight: string;
    spacing: string;
    borderRadius: string;
    boxShadow: string;
    customCSS?: string;
  };
  customCSS?: string;
  templateName?: string;
  pagePadding?: { top: number; bottom: number };
}

const CVPreviewContent: React.FC<CVPreviewContentProps> = ({ 
  cvData, 
  theme = 'light', 
  showBadge = true,
  sectionOrder = ['basics', 'work', 'education', 'skills', 'projects', 'certificates', 'languages'],
  sectionVisibility = {},
  templateStyles,
  customCSS,
  templateName,
  pagePadding = { top: 32, bottom: 32 }
}) => {
  const isDark = theme === 'dark';
  
  // Helper function to check if a section should be visible
  const isSectionVisible = (sectionName: string) => {
    // If sectionVisibility is provided, use it; otherwise default to true
    if (Object.keys(sectionVisibility).length === 0) {
      return true; // Default to visible if no visibility settings provided
    }
    const isVisible = sectionVisibility[sectionName] !== false;
    console.log(`Section ${sectionName} visibility:`, isVisible, 'Settings:', sectionVisibility);
    return isVisible;
  };
  
  // Debug contact information
  console.log('CVPreviewContent - Contact Info:', {
    email: cvData?.basics?.email,
    phone: cvData?.basics?.phone,
    location: cvData?.basics?.location,
    name: cvData?.basics?.name
  });
  
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

  // Apply template styles
  const getTemplateStyle = () => {
    if (!templateStyles) return {};
    
    return {
      fontFamily: templateStyles.fontFamily || 'Inter, system-ui, sans-serif',
      fontSize: templateStyles.fontSize || '14px',
      lineHeight: templateStyles.lineHeight || '1.6',
      backgroundColor: templateStyles.backgroundColor || '#ffffff',
      color: templateStyles.secondaryColor || '#374151',
      '--primary-color': templateStyles.primaryColor || '#3b82f6',
      '--secondary-color': templateStyles.secondaryColor || '#6b7280',
      '--spacing': templateStyles.spacing || '24px',
      '--border-radius': templateStyles.borderRadius || '8px',
      '--box-shadow': templateStyles.boxShadow || '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    } as React.CSSProperties;
  };

  const templateStyle = getTemplateStyle();
  const layoutType = getTemplateLayout();
  
  // Two-column layout component
  const renderTwoColumnLayout = () => {
    return (
      <div className="flex h-full" style={{ ...templateStyle }}>
        {/* Sidebar */}
        <div className="w-1/3 p-6" style={{ 
          backgroundColor: templateStyles?.backgroundColor || '#f3f4f6',
          borderRight: `1px solid ${templateStyles?.secondaryColor || '#e5e7eb'}`
        }}>
          {/* Header in sidebar */}
          <div className="text-center mb-6">
            <h1 
              className="text-2xl font-bold mb-2"
              style={{ color: templateStyles?.primaryColor || '#1f2937' }}
            >
              {cvData?.basics.name || 'Your Name'}
            </h1>
            <p 
              className="text-lg"
              style={{ color: templateStyles?.secondaryColor || '#6b7280' }}
            >
              {cvData?.basics.label || 'Professional Title'}
            </p>
          </div>
          
          {/* Contact Info */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3" style={{ color: templateStyles?.primaryColor || '#1f2937' }}>
              Contact
            </h3>
            <div className="space-y-2 text-sm">
              {cvData?.basics.email && <p>{cvData.basics.email}</p>}
              {cvData?.basics.phone && <p>{cvData.basics.phone}</p>}
              {cvData?.basics.location.city && <p>{cvData.basics.location.city}</p>}
              {cvData?.basics.url && <p>{cvData.basics.url}</p>}
            </div>
          </div>
          
          {/* Skills */}
          {cvData?.skills && cvData.skills.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3" style={{ color: templateStyles?.primaryColor || '#1f2937' }}>
                Skills
              </h3>
              <div className="space-y-2 text-sm">
                {cvData.skills.map((skill, index) => (
                  <p key={index}>{skill.name}</p>
                ))}
              </div>
            </div>
          )}
          
          {/* Languages */}
          {cvData?.languages && cvData.languages.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3" style={{ color: templateStyles?.primaryColor || '#1f2937' }}>
                Languages
              </h3>
              <div className="space-y-2 text-sm">
                {cvData.languages.map((lang, index) => (
                  <p key={index}>{lang.language} - {lang.fluency}</p>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Main Content */}
        <div className="w-2/3 p-6">
          {/* Summary */}
          {cvData?.basics.summary && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3" style={{ color: templateStyles?.primaryColor || '#1f2937' }}>
                About
              </h3>
              <p className="text-sm">{cvData.basics.summary}</p>
            </div>
          )}
          
          {/* Experience */}
          {cvData?.work && cvData.work.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3" style={{ color: templateStyles?.primaryColor || '#1f2937' }}>
                Experience
              </h3>
              <div className="space-y-4">
                {cvData.work.map((job, index) => (
                  <div key={index} className="border-l-2 pl-4" style={{ borderColor: templateStyles?.primaryColor || '#e5e7eb' }}>
                    <h4 className="font-medium">{job.position}</h4>
                    <p className="text-sm text-gray-600">{job.name}</p>
                    <p className="text-xs text-gray-500">{job.startDate} - {job.endDate}</p>
                    <p className="text-sm mt-2">{job.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Education */}
          {cvData?.education && cvData.education.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3" style={{ color: templateStyles?.primaryColor || '#1f2937' }}>
                Education
              </h3>
              <div className="space-y-4">
                {cvData.education.map((edu, index) => (
                  <div key={index} className="border-l-2 pl-4" style={{ borderColor: templateStyles?.primaryColor || '#e5e7eb' }}>
                    <h4 className="font-medium">{edu.studyType} in {edu.area}</h4>
                    <p className="text-sm text-gray-600">{edu.institution}</p>
                    <p className="text-xs text-gray-500">{edu.startDate} - {edu.endDate}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Projects */}
          {cvData?.projects && cvData.projects.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3" style={{ color: templateStyles?.primaryColor || '#1f2937' }}>
                Projects
              </h3>
              <div className="space-y-4">
                {cvData.projects.map((project, index) => (
                  <div key={index}>
                    <h4 className="font-medium">{project.name}</h4>
                    <p className="text-sm">{project.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // If no CV data, show placeholder
  if (!cvData) {
    return (
      <div className="space-y-8 relative">
        {/* Inject custom CSS if available */}
        {customCSS && (
          <style dangerouslySetInnerHTML={{ __html: customCSS }} />
        )}
        {showBadge && (
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
            <div className={`${isDark ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gradient-to-r from-blue-600 to-blue-700'} text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2`}>
              <Eye size={16} />
              <span className="text-sm font-medium">CV Preview • A4 Format</span>
            </div>
          </div>
        )}
        
        <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'} border rounded-xl shadow-2xl mb-8`} style={{ width: '210mm', minHeight: '297mm' }}>
          <div className="p-8">
            <div className="text-center py-20">
              <p className={`${isDark ? 'text-white/60' : 'text-gray-500'} text-lg`}>
                No CV data available
              </p>
              <p className={`${isDark ? 'text-white/40' : 'text-gray-400'} text-sm mt-2`}>
                Start adding your information to see a preview
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Theme classes
  const themeClasses = {
    page: isDark 
      ? 'bg-white/5 border-white/10' 
      : 'bg-white border-gray-200',
    text: {
      primary: isDark ? 'text-white' : 'text-gray-900',
      secondary: isDark ? 'text-white/80' : 'text-gray-700',
      muted: isDark ? 'text-white/60' : 'text-gray-600',
      accent: isDark ? 'text-lime-400' : 'text-blue-600'
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
      
      {/* CV Preview Badge */}
      {showBadge && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
          <div className={`${isDark ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gradient-to-r from-blue-600 to-blue-700'} text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2`}>
            <Eye size={16} />
            <span className="text-sm font-medium">CV Preview • A4 Format</span>
          </div>
        </div>
      )}
      
      {/* Page 1 */}
      <div 
        className={`${themeClasses.page} border rounded-xl shadow-2xl mb-8`} 
        style={{ 
          width: '210mm', 
          height: '297mm',
          overflow: 'hidden',
          pageBreakAfter: 'always',
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
            renderTwoColumnLayout()
          ) : (
            <>
              {/* Single Column Layout */}
              {/* Header */}
              <div className={`text-center border-b ${themeClasses.border} pb-6 mb-6`} style={{
                borderBottomColor: templateStyles?.secondaryColor || themeClasses.border
              }}>
                <h4 
                  className={`text-3xl font-bold mb-2`}
                  style={{ 
                    color: templateStyles?.primaryColor || themeClasses.text.primary 
                  }}
                >
                  {cvData.basics.name || 'Your Name'}
                </h4>
                <p 
                  className="text-xl mb-3"
                  style={{ 
                    color: templateStyles?.secondaryColor || themeClasses.text.accent 
                  }}
                >
                  {cvData.basics.label || 'Professional Title'}
                </p>
                <div className="flex items-center justify-center gap-6 mt-3 text-sm" style={{
                  color: templateStyles?.secondaryColor || themeClasses.text.muted || '#6b7280',
                  fontSize: '14px',
                  fontWeight: '400'
                }}>
                  {cvData.basics.email && (
                    <span className="flex items-center gap-1 hover:opacity-80 transition-opacity">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                      </svg>
                      <span style={{ color: 'inherit' }}>{cvData.basics.email}</span>
                    </span>
                  )}
                  {cvData.basics.phone && (
                    <span className="flex items-center gap-1 hover:opacity-80 transition-opacity">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                      </svg>
                      <span style={{ color: 'inherit' }}>{cvData.basics.phone}</span>
                    </span>
                  )}
                  {(cvData.basics.location?.city || (typeof cvData.basics.location === 'string' ? cvData.basics.location : null)) && (
                    <span className="flex items-center gap-1 hover:opacity-80 transition-opacity">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      <span style={{ color: 'inherit' }}>{cvData.basics.location?.city || (typeof cvData.basics.location === 'string' ? cvData.basics.location : '')}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Summary */}
              {cvData.basics.summary && (
                <div className="mb-6">
                  <h5 className={`text-xl font-semibold mb-3 border-b pb-1`} style={{
                    color: templateStyles?.primaryColor || themeClasses.text.primary,
                    borderBottomColor: templateStyles?.secondaryColor || themeClasses.border
                  }}>
                    Professional Summary
                  </h5>
                  <p className={`text-base leading-relaxed`} style={{
                    color: templateStyles?.secondaryColor || themeClasses.text.secondary
                  }}>
                    {cvData.basics.summary}
                  </p>
                </div>
              )}

              {/* Work Experience - Optimized for space */}
              {cvData.work.length > 0 && isSectionVisible('work') && (
                <div className="mb-4">
                  <h5 className={`text-lg font-semibold mb-3 border-b pb-1`} style={{
                    color: templateStyles?.primaryColor || themeClasses.text.primary,
                    borderBottomColor: templateStyles?.secondaryColor || themeClasses.border
                  }}>
                    Work Experience
                  </h5>
                  <div className="space-y-3">
                    {/* Show first 3 work experiences on page 1 to prevent splitting */}
                    {cvData.work.slice(0, 3).map((work, index) => (
                      <div key={index} className="border-l-3 pl-3 break-inside-avoid" style={{
                        borderLeftColor: templateStyles?.primaryColor || themeClasses.accent
                      }}>
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex-1 min-w-0">
                            <h6 className="font-semibold text-base leading-tight" style={{
                              color: templateStyles?.primaryColor || themeClasses.text.primary
                            }}>
                              {work.position}
                            </h6>
                            <p className="text-sm font-medium" style={{
                              color: templateStyles?.secondaryColor || themeClasses.text.accent
                            }}>
                              {work.name}
                            </p>
                          </div>
                          <span className="text-xs text-right ml-2 flex-shrink-0" style={{
                            color: templateStyles?.secondaryColor || themeClasses.text.muted
                          }}>
                            {work.startDate && work.endDate ? `${work.startDate} - ${work.endDate}` : ''}
                          </span>
                        </div>
                        {work.summary && (
                          <div className="text-xs leading-relaxed mb-1" style={{
                            color: templateStyles?.secondaryColor || themeClasses.text.secondary
                          }}>
                            <p className="line-clamp-2">{work.summary}</p>
                          </div>
                        )}
                        {work.highlights && work.highlights.length > 0 && (
                          <ul className="text-xs list-disc list-inside space-y-0.5" style={{
                            color: templateStyles?.secondaryColor || themeClasses.text.secondary
                          }}>
                            {work.highlights.slice(0, 2).map((highlight, i) => (
                              <li key={i} className="line-clamp-1">{highlight}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education - Compact layout */}
              {cvData.education.length > 0 && isSectionVisible('education') && (
                <div className="mb-4">
                  <h5 className={`text-lg font-semibold mb-3 border-b pb-1`} style={{
                    color: templateStyles?.primaryColor || themeClasses.text.primary,
                    borderBottomColor: templateStyles?.secondaryColor || themeClasses.border
                  }}>
                    Education
                  </h5>
                  <div className="space-y-2">
                    {cvData.education.map((education, index) => (
                      <div key={index} className="border-l-3 pl-3" style={{
                        borderLeftColor: templateStyles?.primaryColor || themeClasses.accent
                      }}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <h6 className="font-semibold text-base leading-tight" style={{
                              color: templateStyles?.primaryColor || themeClasses.text.primary
                            }}>
                              {education.institution}
                            </h6>
                            <p className="text-sm" style={{
                              color: templateStyles?.secondaryColor || themeClasses.text.accent
                            }}>
                              {education.studyType} in {education.area}
                            </p>
                            {education.score && (
                              <p className="text-xs" style={{
                                color: templateStyles?.secondaryColor || themeClasses.text.muted
                              }}>
                                Score: {education.score}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-right ml-2 flex-shrink-0" style={{
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

              {/* Skills - Compact layout */}
              {cvData.skills.length > 0 && isSectionVisible('skills') && (
                <div className="mb-4">
                  <h5 className={`text-lg font-semibold mb-3 border-b pb-1`} style={{
                    color: templateStyles?.primaryColor || themeClasses.text.primary,
                    borderBottomColor: templateStyles?.secondaryColor || themeClasses.border
                  }}>
                    Skills
                  </h5>
                  <div className="flex flex-wrap gap-1.5">
                    {cvData.skills.map((skill, index) => (
                      <div key={index} className="px-2.5 py-1 rounded-full text-xs font-medium" style={{
                        backgroundColor: templateStyles?.primaryColor ? `${templateStyles.primaryColor}15` : 'rgba(59, 130, 246, 0.1)',
                        color: templateStyles?.primaryColor || '#1d4ed8'
                      }}>
                        {skill.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Certificates - only if work has 2 or fewer entries */}
              {cvData.work.length <= 2 && cvData.certificates.length > 0 && (
                <div className="mb-6">
                  <h5 className={`text-xl font-semibold mb-4 border-b pb-1`} style={{
                    color: templateStyles?.primaryColor || themeClasses.text.primary,
                    borderBottomColor: templateStyles?.secondaryColor || themeClasses.border
                  }}>
                    Certificates
                  </h5>
                  <div className="space-y-3">
                    {cvData.certificates.map((certificate, index) => (
                      <div key={index} className="border-l-4 pl-4" style={{
                        borderLeftColor: templateStyles?.primaryColor || themeClasses.accent
                      }}>
                        <div className="flex justify-between items-start">
                          <div>
                            <h6 className="font-semibold text-lg" style={{
                              color: templateStyles?.primaryColor || themeClasses.text.primary
                            }}>
                              {certificate.name}
                            </h6>
                            <p className="text-base" style={{
                              color: templateStyles?.secondaryColor || themeClasses.text.accent
                            }}>
                              {certificate.issuer}
                            </p>
                            {certificate.date && (
                              <p className="text-sm" style={{
                                color: templateStyles?.secondaryColor || themeClasses.text.muted
                              }}>
                                Issued: {certificate.date}
                              </p>
                            )}
                          </div>
                          {certificate.url && (
                            <p className="text-sm" style={{
                              color: templateStyles?.primaryColor || themeClasses.text.accent
                            }}>
                              <a href={certificate.url} target="_blank" rel="noopener noreferrer">
                                View Certificate
                              </a>
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Languages */}
              {cvData.languages && cvData.languages.length > 0 && (
                <div className="mb-6">
                  <h5 className={`text-xl font-semibold mb-4 border-b pb-1`} style={{
                    color: templateStyles?.primaryColor || themeClasses.text.primary,
                    borderBottomColor: templateStyles?.secondaryColor || themeClasses.border
                  }}>
                    Languages
                  </h5>
                  <div className="flex flex-wrap gap-3">
                    {cvData.languages.map((language, index) => (
                      <div key={index} className="px-3 py-2 rounded-lg text-sm" style={{
                        backgroundColor: templateStyles?.secondaryColor ? `${templateStyles.secondaryColor}20` : (isDark ? '#374151' : '#f3f4f6'),
                        color: templateStyles?.secondaryColor || (isDark ? '#ffffff' : '#374151')
                      }}>
                        <span className="font-medium">{language.language}</span>
                        <span className="ml-2" style={{
                          color: templateStyles?.secondaryColor ? `${templateStyles.secondaryColor}80` : themeClasses.text.muted
                        }}>
                          ({language.fluency})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Page 2 - Additional content (only for single-column layout) */}
      {layoutType === 'single-column' && (cvData.projects.length > 0 && isSectionVisible('projects')) && (
        <div className={`${themeClasses.page} border rounded-xl shadow-2xl`} style={{ 
          width: '210mm', 
          height: '297mm',
          overflow: 'hidden',
          pageBreakAfter: 'always',
          ...templateStyle
        }}>
          <div className="h-full" style={{
            paddingTop: `${pagePadding.top}px`,
            paddingBottom: `${pagePadding.bottom}px`,
            paddingLeft: '32px',
            paddingRight: '32px'
          }}>


            {/* Projects */}
            {cvData.projects.length > 0 && isSectionVisible('projects') && (
              <div className="mb-6">
                <h5 className={`text-xl font-semibold mb-4 border-b pb-1`} style={{
                  color: templateStyles?.primaryColor || themeClasses.text.primary,
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
                        <h6 className="font-semibold text-lg" style={{
                          color: templateStyles?.primaryColor || themeClasses.text.primary
                        }}>
                          {project.name}
                        </h6>
                        <span className="text-sm" style={{
                          color: templateStyles?.secondaryColor || themeClasses.text.muted
                        }}>
                          {project.startDate && project.endDate ? `${project.startDate} - ${project.endDate}` : ''}
                        </span>
                      </div>
                      {project.description && (
                        <div className="text-sm leading-relaxed" style={{
                          color: templateStyles?.secondaryColor || themeClasses.text.secondary
                        }}>
                          {project.description.split('\n').map((line, i) => (
                            <p key={i} className="mb-1">{line}</p>
                          ))}
                        </div>
                      )}
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
          </div>
        </div>
      )}

      {/* Page 3 - Additional content for very long CVs */}
      {layoutType === 'single-column' && (
        (cvData.work.length > 4 || 
         cvData.projects.length > 3 || 
         cvData.certificates.length > 2 || 
         cvData.languages.length > 0) && (
        <div className={`${themeClasses.page} border rounded-xl shadow-2xl`} style={{ 
          width: '210mm', 
          height: '297mm',
          overflow: 'hidden',
          pageBreakAfter: 'always',
          ...templateStyle
        }}>
          <div className="h-full" style={{
            paddingTop: `${pagePadding.top}px`,
            paddingBottom: `${pagePadding.bottom}px`,
            paddingLeft: '32px',
            paddingRight: '32px'
          }}>
            {/* Additional Work Experience if more than 4 entries */}
            {cvData.work.length > 4 && (
              <div className="mb-6">
                <h5 className={`text-xl font-semibold mb-4 border-b pb-1`} style={{
                  color: templateStyles?.primaryColor || themeClasses.text.primary,
                  borderBottomColor: templateStyles?.secondaryColor || themeClasses.border
                }}>
                  Work Experience (Continued)
                </h5>
                <div className="space-y-4">
                  {cvData.work.slice(4).map((work, index) => (
                    <div key={index + 4} className="border-l-4 pl-4" style={{
                      borderLeftColor: templateStyles?.primaryColor || themeClasses.accent
                    }}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h6 className="font-semibold text-lg" style={{
                            color: templateStyles?.primaryColor || themeClasses.text.primary
                          }}>
                            {work.position}
                          </h6>
                          <p className="text-base" style={{
                            color: templateStyles?.secondaryColor || themeClasses.text.accent
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
                          {work.summary.split('\n').map((line, i) => (
                            <p key={i} className="mb-1">{line}</p>
                          ))}
                        </div>
                      )}
                      {work.highlights && work.highlights.length > 0 && (
                        <ul className="text-sm list-disc list-inside space-y-1 mt-2" style={{
                          color: templateStyles?.secondaryColor || themeClasses.text.secondary
                        }}>
                          {work.highlights.map((highlight, i) => (
                            <li key={i}>{highlight}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Certificates */}
            {cvData.certificates.length > 0 && (
              <div className="mb-6">
                <h5 className={`text-xl font-semibold mb-4 border-b pb-1`} style={{
                  color: templateStyles?.primaryColor || themeClasses.text.primary,
                  borderBottomColor: templateStyles?.secondaryColor || themeClasses.border
                }}>
                  Certificates
                </h5>
                <div className="space-y-3">
                  {cvData.certificates.map((certificate, index) => (
                    <div key={index} className="border-l-4 pl-4" style={{
                      borderLeftColor: templateStyles?.primaryColor || themeClasses.accent
                    }}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h6 className="font-semibold text-lg" style={{
                            color: templateStyles?.primaryColor || themeClasses.text.primary
                          }}>
                            {certificate.name}
                          </h6>
                          <p className="text-base" style={{
                            color: templateStyles?.secondaryColor || themeClasses.text.accent
                          }}>
                            {certificate.issuer}
                          </p>
                          {certificate.url && (
                            <p className="text-sm" style={{
                              color: templateStyles?.secondaryColor || themeClasses.text.accent
                            }}>
                              <a href={certificate.url} target="_blank" rel="noopener noreferrer">
                                {certificate.url}
                              </a>
                            </p>
                          )}
                        </div>
                        <span className="text-sm" style={{
                          color: templateStyles?.secondaryColor || themeClasses.text.muted
                        }}>
                          {certificate.date}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Languages */}
            {cvData.languages.length > 0 && (
              <div className="mb-6">
                <h5 className={`text-xl font-semibold mb-4 border-b pb-1`} style={{
                  color: templateStyles?.primaryColor || themeClasses.text.primary,
                  borderBottomColor: templateStyles?.secondaryColor || themeClasses.border
                }}>
                  Languages
                </h5>
                <div className="flex flex-wrap gap-2">
                  {cvData.languages.map((language, index) => (
                    <div key={index} className="px-3 py-2 rounded-full text-sm font-medium" style={{
                      backgroundColor: templateStyles?.primaryColor ? `${templateStyles.primaryColor}20` : (isDark ? 'rgba(132, 204, 22, 0.2)' : 'rgba(59, 130, 246, 0.1)'),
                      color: templateStyles?.primaryColor || (isDark ? '#84cc16' : '#1d4ed8')
                    }}>
                      {language.language} - {language.fluency}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Projects if more than 3 */}
            {cvData.projects.length > 3 && (
              <div className="mb-6">
                <h5 className={`text-xl font-semibold mb-4 border-b pb-1`} style={{
                  color: templateStyles?.primaryColor || themeClasses.text.primary,
                  borderBottomColor: templateStyles?.secondaryColor || themeClasses.border
                }}>
                  Projects (Continued)
                </h5>
                <div className="space-y-4">
                  {cvData.projects.slice(3).map((project, index) => (
                    <div key={index + 3} className="border-l-4 pl-4" style={{
                      borderLeftColor: templateStyles?.primaryColor || themeClasses.accent
                    }}>
                      <div className="flex justify-between items-start mb-2">
                        <h6 className="font-semibold text-lg" style={{
                          color: templateStyles?.primaryColor || themeClasses.text.primary
                        }}>
                          {project.name}
                        </h6>
                        <span className="text-sm" style={{
                          color: templateStyles?.secondaryColor || themeClasses.text.muted
                        }}>
                          {project.startDate && project.endDate ? `${project.startDate} - ${project.endDate}` : ''}
                        </span>
                      </div>
                      {project.description && (
                        <div className="text-sm leading-relaxed" style={{
                          color: templateStyles?.secondaryColor || themeClasses.text.secondary
                        }}>
                          {project.description.split('\n').map((line, i) => (
                            <p key={i} className="mb-1">{line}</p>
                          ))}
                        </div>
                      )}
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
          </div>
        </div>
      ))}
    </div>
  );
};

export default CVPreviewContent;