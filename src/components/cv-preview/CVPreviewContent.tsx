'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Eye } from 'lucide-react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { DesignSettings, SectionConfig } from '@/types/design-settings';
import { getVisibleCVSections } from '@/lib/selectors/cv-section-selectors';
import AnnotatedText from '@/components/resume-enhancer/annotations/AnnotatedText';
import type { FixAnnotation } from '@/components/resume-enhancer/annotations/fix-annotation';
// TODO: InlineKeywordHeatmap was deleted with studio cleanup - need to reimplement or remove ATS heatmap feature
// import InlineKeywordHeatmap from '@/components/studio/ats-deep-dive/InlineKeywordHeatmap';

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

  // Resume Enhancer overlays (optional; used by Resume Enhancer report/review)
  overlaysEnabled?: boolean;
  annotations?: FixAnnotation[];
  activeFixId?: string;
  onSelectFix?: (fixId: string) => void;
  onApplyFix?: (fix: FixAnnotation) => void;
  onDismissFix?: (fixId: string) => void;
  /**
   * When false, hides the inline suggestion popover and lets the caller own the “Fix it” UI.
   * Used by the contextual report modal which has a dedicated right-side panel.
   */
  overlayInlineCard?: boolean;

  /**
   * When true, ignore cvData.structure visibility and render all sections.
   * Useful for report/review flows where we want full transparency.
   */
  ignoreStructureVisibility?: boolean;

  /**
   * Render pages as a continuous paper (no clipping to A4 height).
   * Used by report modal so users can scroll the whole CV.
   */
  renderMode?: 'pages' | 'continuous';

  /**
   * Ghost skill suggestions - missing skills to show as faint placeholders
   */
  ghostSkills?: Array<{ skill: string; category?: string; fixId?: string }>;
  onAddGhostSkill?: (skill: string, category?: string, fixId?: string) => void;

  /**
   * Timeline gutter - inject timeline visualization into work experience section
   */
  showTimelineGutter?: boolean;
  timelineParserType?: 'generic' | 'workday' | 'greenhouse' | 'lever' | 'bamboohr';
  timelineShowCriticalOnly?: boolean;

  /**
   * Keyword heatmap - inject keyword highlighting into CV text
   */
  showKeywordHeatmap?: boolean;
  keywordParserType?: 'generic' | 'workday' | 'greenhouse' | 'lever' | 'bamboohr';
  keywordShowCriticalOnly?: boolean;
  jobData?: any;
  
  /**
   * Callback when total pages changes (for displaying page count in parent components)
   */
  onTotalPagesChange?: (pages: number) => void;
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
  sectionConfig,
  overlaysEnabled = false,
  annotations = [],
  activeFixId,
  onSelectFix,
  onApplyFix,
  onDismissFix,
  overlayInlineCard = true,
  ignoreStructureVisibility = false,
  renderMode = 'pages',
  ghostSkills = [],
  onAddGhostSkill,
  enableATSOverlay = false,
  overlayContainerRef,
  showTimelineGutter = false,
  timelineParserType = 'generic',
  timelineShowCriticalOnly = false,
  showKeywordHeatmap = false,
  keywordParserType = 'generic',
  keywordShowCriticalOnly = false,
  jobData,
  onTotalPagesChange
}) => {
  // CRITICAL FIX: All hooks must be called BEFORE any conditional returns (Rules of Hooks)
  const isDark = theme === 'dark';
  
  // Get visible sections using centralized selector (respects structure visibility)
  // Always call useMemo, even if cvData is null (will return empty array)
  const visibleSectionsList = useMemo(
    () => cvData ? getVisibleCVSections(cvData, 'cv') : [],
    [cvData]
  );

  // Create fast lookup Set for section visibility
  const visibleSectionTypes = useMemo(
    () => new Set(visibleSectionsList.map(s => s.type)),
    [visibleSectionsList]
  );
  
  // State hooks must be called unconditionally
  const [totalPages, setTotalPages] = useState(1);
  const [contentHeight, setContentHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const internalOverlayRef = useRef<HTMLDivElement>(null);
  
  // Use provided ref or internal ref for overlay container
  const overlayRef = overlayContainerRef || internalOverlayRef;
  
  // Expose ref for X-Ray Canvas coordinate sync
  useEffect(() => {
    if (overlayContainerRef && contentRef.current) {
      // The parent can access contentRef.current for coordinate sync
    }
  }, [overlayContainerRef]);
  
  // Effect hooks must be called unconditionally
  useEffect(() => {
    // In continuous mode we intentionally avoid pagination; render one flowing paper.
    if (renderMode === 'continuous') {
      setContentHeight(0);
      setTotalPages(1);
      return;
    }
    if (!cvData || !contentRef.current) {
      setContentHeight(0);
      setTotalPages(1);
      return;
    }
    
    const height = contentRef.current.scrollHeight;
    setContentHeight(height);
    
    if (height > 0) {
      // Check if this is a single-page template
      const isSinglePageTemplate = templateName?.toLowerCase().includes('tech pro blue') ||
                                   templateName?.toLowerCase().includes('executive professional');
      
      if (isSinglePageTemplate) {
        setTotalPages(1);
      } else if (templateName?.toLowerCase().includes('letter')) {
        // Letter page height: 11" = 1056px (at 96 DPI)
        const pageHeight = 1056 - pagePadding.top - pagePadding.bottom;
        const pages = Math.ceil(height / pageHeight);
        setTotalPages(Math.max(1, pages));
      } else {
        // A4 page height: 297mm = 1123px (at 96 DPI)
        const pageHeight = 1123 - pagePadding.top - pagePadding.bottom;
        const pages = Math.ceil(height / pageHeight);
        setTotalPages(Math.max(1, pages));
      }
    }
  }, [cvData, sectionOrder, sectionVisibility, pagePadding, templateName]);
  
  // Notify parent when totalPages changes
  useEffect(() => {
    if (onTotalPagesChange) {
      onTotalPagesChange(totalPages);
    }
  }, [totalPages, onTotalPagesChange]);
  
  // Notify parent when totalPages changes
  useEffect(() => {
    if (onTotalPagesChange) {
      onTotalPagesChange(totalPages);
    }
  }, [totalPages, onTotalPagesChange]);
  
  // NOW we can conditionally return - all hooks have been called
  // IMPORTANT: Never use sample/hardcoded data - only use actual cvData
  // If cvData is null, return early to prevent rendering with empty data
  if (!cvData) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <div className="text-center">
          <p className="text-lg font-medium">No CV data available</p>
          <p className="text-sm mt-2">Please add your CV information to see the preview</p>
        </div>
      </div>
    );
  }
  
  // Helper function to check if a section should be visible
  // Use centralized selector when structure exists, fallback to prop for legacy CVs
  const isSectionVisible = (sectionName: string) => {
    // If ignoreStructureVisibility is true (e.g., in report modal), show all sections
    if (ignoreStructureVisibility) {
      return true;
    }
    
    // If CV has structure, use centralized selector (source of truth)
    if (cvData?.structure?.sections && Array.isArray(cvData.structure.sections) && cvData.structure.sections.length > 0) {
      return visibleSectionTypes.has(sectionName);
    }
    
    // Fallback: use sectionVisibility prop for legacy CVs without structure
    if (Object.keys(sectionVisibility).length === 0) {
      return true; // Default to visible if no visibility settings provided
    }
    const isVisible = sectionVisibility[sectionName] !== false;
    return isVisible;
  };

  const stripRichText = (value: string): string => {
    // Convert common rich-text HTML (from WYSIWYG) into readable plain text.
    // We intentionally keep this lightweight and deterministic for preview/report overlays.
    if (!value) return '';
    const hasTags = /<[^>]+>/.test(value);
    if (!hasTags) return value;
    return value
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  // Flexible accessors (cvData may vary depending on parser/importer/version)
  const getWorkTitle = (w: any) => stripRichText(String(w?.position || w?.title || w?.jobTitle || w?.role || ''));
  const getWorkCompany = (w: any) => stripRichText(String(w?.name || w?.company || w?.companyName || w?.organization || ''));
  const getWorkDateRange = (w: any) => {
    const start = w?.startDate || w?.start || w?.from;
    const end = w?.endDate || w?.end || w?.to;
    if (start && end) return `${start} - ${end}`;
    return start || end || '';
  };

  const getEducationDegree = (e: any) => stripRichText(String(e?.studyType || e?.degree || e?.qualification || ''));
  const getEducationField = (e: any) => stripRichText(String(e?.area || e?.field || e?.major || ''));
  const getEducationInstitution = (e: any) => stripRichText(String(e?.institution || e?.school || e?.name || ''));
  const getEducationDateRange = (e: any) => {
    const start = e?.startDate || e?.start || e?.from;
    const end = e?.endDate || e?.end || e?.to;
    if (start && end) return `${start} - ${end}`;
    return start || end || '';
  };

  const getSkillCategory = (s: any) => stripRichText(String(s?.category || s?.name || ''));
  const getSkillItems = (s: any): string[] => {
    const items =
      (Array.isArray(s?.skills) && s.skills) ||
      (Array.isArray(s?.keywords) && s.keywords) ||
      (Array.isArray(s?.items) && s.items) ||
      [];
    return items.map((x: any) => stripRichText(String(x))).filter(Boolean);
  };

  const getProjectTitle = (p: any) => stripRichText(String(p?.name || p?.title || p?.projectTitle || ''));
  const getProjectDateRange = (p: any) => {
    const start = p?.startDate || p?.start || p?.from;
    const end = p?.endDate || p?.end || p?.to;
    if (start && end) return `${start} - ${end}`;
    return start || end || '';
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
    <div className="space-y-8 relative" ref={overlayRef}>
      {/* Inject custom CSS if available */}
      {customCSS && (
        <style dangerouslySetInnerHTML={{ __html: customCSS }} />
      )}
      
      {/* Keyword Heatmap - inject keyword highlighting */}
      {/* TODO: InlineKeywordHeatmap was deleted - need to reimplement or remove ATS heatmap feature */}
      {false && showKeywordHeatmap && jobData && cvData && (
        // <InlineKeywordHeatmap
        //   cvData={cvData}
        //   jobData={jobData}
        //   parserType={keywordParserType}
        //   showCriticalOnly={keywordShowCriticalOnly}
        //   containerRef={overlayRef}
        // />
        null
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
      
      {/* Render multiple pages (or a single continuous paper in report mode) */}
      {Array.from({ length: renderMode === 'pages' ? totalPages : 1 }, (_, pageIndex) => (
        <div 
          key={pageIndex}
          className={`${themeClasses.page} cv-page mb-8`} 
          style={{ 
            width: '210mm', 
            height: renderMode === 'pages' ? '297mm' : 'auto',
            minHeight: '297mm',
            overflow: renderMode === 'pages' ? 'hidden' : 'visible',
            pageBreakAfter: renderMode === 'pages' && pageIndex < totalPages - 1 ? 'always' : 'auto',
            breakAfter: renderMode === 'pages' && pageIndex < totalPages - 1 ? 'page' : 'auto',
            backgroundColor: '#ffffff',
            color: '#111827',
            ...templateStyle
          }}
        >
          <div className="h-full" style={{
            paddingTop: `${pagePadding.top}px`,
            paddingBottom: `${pagePadding.bottom}px`,
            paddingLeft: '32px',
            paddingRight: '32px',
            color: '#111827'
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
                    className="text-3xl font-bold mb-2 !text-gray-900"
                  >
                    {cvData.basics?.name || cvData.basics?.fullName || 'Your Name'}
                  </h4>
                    <p 
                      className="text-xl mb-3 !text-gray-900"
                    >
                      {cvData.basics.label || 'Professional Title'}
                    </p>
                    <div className="flex items-center justify-center gap-6 mt-3 text-sm !text-gray-900" style={{
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
                    {cvData.basics.email && <p className="text-sm !text-gray-900">{cvData.basics.email}</p>}
                    {cvData.basics.phone && <p className="text-sm !text-gray-900">{cvData.basics.phone}</p>}
                    {cvData.basics.location.city && <p className="text-sm !text-gray-900">{cvData.basics.location.city}</p>}
                    {cvData.basics.url && <p className="text-sm !text-gray-900">{cvData.basics.url}</p>}
                  </div>
                  
                  {/* Skills */}
                  {cvData.skills && cvData.skills.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="font-semibold text-lg !text-gray-900">Skills</h5>
                      <div className="space-y-1">
                        {cvData.skills.map((skill, index) => (
                          <div key={index}>
                            {getSkillCategory(skill) && (
                              <p className="font-bold text-base mb-1 !text-gray-900" style={{ 
                                fontWeight: '700',
                                fontSize: '15px',
                                color: '#1f2937'
                              }}>
                                {getSkillCategory(skill)}
                              </p>
                            )}
                            <p className="!text-gray-900">{getSkillItems(skill).join(', ')}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Languages */}
                  {cvData.languages && cvData.languages.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="font-semibold text-lg !text-gray-900">Languages</h5>
                      <div className="space-y-1">
                        {cvData.languages.map((lang, index) => (
                          <p key={index} className="!text-gray-900">{lang.language} - {lang.fluency}</p>
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
                      <h5 className="font-semibold text-lg !text-gray-900">Professional Summary</h5>
                      <AnnotatedText
                        as="p"
                        className="text-sm !text-gray-900"
                        enabled={overlaysEnabled}
                        fieldPath="basics.summary"
                        text={stripRichText(cvData.basics.summary)}
                        annotations={annotations}
                        activeFixId={activeFixId}
                        onSelectFix={onSelectFix}
                        onApplyFix={onApplyFix}
                        onDismissFix={onDismissFix}
                        inlineCard={overlayInlineCard}
                      />
                    </div>
                  )}
                  
                  {/* Work Experience */}
                  {cvData.work && cvData.work.length > 0 && (
                    <div className="space-y-4">
                      <h5 className="font-semibold text-lg !text-gray-900">Work Experience</h5>
                      <div className="space-y-3">
                        {cvData.work.map((job, index) => (
                          <div key={index} className="space-y-1">
                            <h6 className="font-medium !text-gray-900">{getWorkTitle(job) || getWorkCompany(job) || 'Position'}</h6>
                            {getWorkCompany(job) && <p className="text-sm !text-gray-900">{getWorkCompany(job)}</p>}
                            {getWorkDateRange(job) && <p className="text-xs !text-gray-900">{getWorkDateRange(job)}</p>}
                            {job.summary && job.summary.trim() && (
                              <AnnotatedText
                                as="p"
                                className="text-sm mt-2 !text-gray-900"
                                enabled={overlaysEnabled}
                                fieldPath={`work[${index}].summary`}
                                text={stripRichText(job.summary)}
                                annotations={annotations}
                                activeFixId={activeFixId}
                                onSelectFix={onSelectFix}
                                onApplyFix={onApplyFix}
                                onDismissFix={onDismissFix}
                                inlineCard={overlayInlineCard}
                              />
                            )}
                            {job.highlights && job.highlights.length > 0 && (
                              <ul className="list-disc list-inside text-sm mt-2 space-y-1 !text-gray-900">
                                {job.highlights.map((highlight, i) => (
                                  <li key={i}>
                                    <AnnotatedText
                                      as="span"
                                      enabled={overlaysEnabled}
                                      fieldPath={`work[${index}].highlights[${i}]`}
                                      text={stripRichText(highlight)}
                                      annotations={annotations}
                                      activeFixId={activeFixId}
                                      onSelectFix={onSelectFix}
                                      onApplyFix={onApplyFix}
                                      onDismissFix={onDismissFix}
                                      inlineCard={overlayInlineCard}
                                    />
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
                  {cvData.education && cvData.education.length > 0 && (
                    <div className="space-y-4">
                      <h5 className="font-semibold text-lg !text-gray-900">Education</h5>
                      <div className="space-y-3">
                        {cvData.education.map((edu, index) => (
                          <div key={index} className="space-y-1">
                            <h6 className="font-medium !text-gray-900">
                              {getEducationDegree(edu) ? (
                                getEducationField(edu) 
                                  ? `${getEducationDegree(edu)} in ${getEducationField(edu)}`
                                  : getEducationDegree(edu)
                              ) : getEducationField(edu) || 'Education'}
                            </h6>
                              {getEducationInstitution(edu) && (
                                <p className="text-sm !text-gray-900">{getEducationInstitution(edu)}</p>
                              )}
                              {getEducationDateRange(edu) && (
                                <p className="text-xs !text-gray-900">{getEducationDateRange(edu)}</p>
                              )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Projects */}
                  {cvData.projects && cvData.projects.length > 0 && (
                    <div className="space-y-4">
                      <h5 className="font-semibold text-lg !text-gray-900">Projects</h5>
                      <div className="space-y-3">
                        {cvData.projects.map((project, index) => (
                          <div key={index} className="space-y-1">
                            <h6 className="font-medium !text-gray-900">{getProjectTitle(project) || 'Project'}</h6>
                            <AnnotatedText
                              as="p"
                              className="text-sm"
                              enabled={overlaysEnabled}
                              fieldPath={`projects[${index}].description`}
                              text={stripRichText(project.description || '')}
                              annotations={annotations}
                              activeFixId={activeFixId}
                              onSelectFix={onSelectFix}
                              onApplyFix={onApplyFix}
                              onDismissFix={onDismissFix}
                              inlineCard={overlayInlineCard}
                            />
                            {project.highlights && project.highlights.length > 0 && (
                              <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                                {project.highlights.map((highlight: string, i: number) => (
                                  <li key={i}>
                                    <AnnotatedText
                                      as="span"
                                      enabled={overlaysEnabled}
                                      fieldPath={`projects[${index}].highlights[${i}]`}
                                      text={stripRichText(highlight)}
                                      annotations={annotations}
                                      activeFixId={activeFixId}
                                      onSelectFix={onSelectFix}
                                      onApplyFix={onApplyFix}
                                      onDismissFix={onDismissFix}
                                      inlineCard={overlayInlineCard}
                                    />
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Certificates */}
                  {cvData.certificates && cvData.certificates.length > 0 && (
                    <div className="space-y-4">
                      <h5 className="font-semibold text-lg !text-gray-900">Certificates</h5>
                      <div className="space-y-2">
                        {cvData.certificates.map((cert, index) => (
                          <div key={index} className="space-y-0.5">
                            <div className="font-medium text-sm !text-gray-900">{cert.name || cert.certificationName || 'Certification'}</div>
                            <div className="text-xs text-gray-600">
                              {cert.issuer ? cert.issuer : ''}{cert.date ? (cert.issuer ? ` • ${cert.date}` : cert.date) : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Volunteer */}
                  {cvData.volunteer && cvData.volunteer.length > 0 && (
                    <div className="space-y-4">
                      <h5 className="font-semibold text-lg !text-gray-900">Volunteer</h5>
                      <div className="space-y-2">
                        {cvData.volunteer.map((v, index) => (
                          <div key={index} className="space-y-0.5">
                            <div className="font-medium text-sm !text-gray-900">{v.position}</div>
                            <div className="text-xs text-gray-600">{v.organization}</div>
                            {v.summary && (
                              <div className="text-sm mt-1">
                                <AnnotatedText
                                  as="span"
                                  enabled={overlaysEnabled}
                                  fieldPath={`volunteer[${index}].summary`}
                                  text={stripRichText(v.summary)}
                                  annotations={annotations}
                                  activeFixId={activeFixId}
                                  onSelectFix={onSelectFix}
                                  onApplyFix={onApplyFix}
                                  onDismissFix={onDismissFix}
                                  inlineCard={overlayInlineCard}
                                />
                              </div>
                            )}
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
                    className="text-3xl font-bold mb-2 !text-gray-900"
                  >
                    {cvData.basics?.name || cvData.basics?.fullName || 'Your Name'}
                  </h4>
                  <p 
                    className="text-xl mb-3 !text-gray-900"
                  >
                    {cvData.basics.label || 'Professional Title'}
                  </p>
                  <div className="flex items-center justify-center gap-6 mt-3 text-sm !text-gray-900" style={{
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
                    <h5 className={`text-xl font-semibold mb-4 border-b pb-1 !text-gray-900`} style={{
                      color: '#1f2937',
                      borderBottomColor: templateStyles?.secondaryColor || themeClasses.border
                    }}>
                      Professional Summary
                    </h5>
                    <div className="text-sm leading-relaxed !text-gray-900">
                      <AnnotatedText
                        as="p"
                        enabled={overlaysEnabled}
                        fieldPath="basics.summary"
                        text={stripRichText(cvData.basics.summary)}
                        annotations={annotations}
                        activeFixId={activeFixId}
                        onSelectFix={onSelectFix}
                        onApplyFix={onApplyFix}
                        onDismissFix={onDismissFix}
                        inlineCard={overlayInlineCard}
                      />
                    </div>
                  </div>
                )}
                
                {/* Work Experience */}
                {cvData.work && cvData.work.length > 0 && isSectionVisible('work_experience') && (
                  <div className="mb-6">
                    <h5 className={`text-xl font-semibold mb-4 border-b pb-1 !text-gray-900`} style={{
                      color: '#1f2937',
                      borderBottomColor: templateStyles?.secondaryColor || themeClasses.border
                    }}>
                      Work Experience
                    </h5>
                    <div className="space-y-4 relative overflow-hidden" style={{ paddingLeft: showTimelineGutter ? '60px' : '0' }}>
                      {cvData.work.map((work, index) => {
                        // TODO: InlineTimelineGutter was deleted with studio cleanup - need to reimplement or remove timeline gutter feature
                        // const InlineTimelineGutter = showTimelineGutter ? require('@/components/studio/ats-deep-dive/InlineTimelineGutter').default : null;
                        const InlineTimelineGutter = null; // Disabled until reimplemented
                        return (
                          <div key={index} className={`relative ${showTimelineGutter ? '' : 'border-l-4'} pl-4`} style={{
                            borderLeftColor: showTimelineGutter ? 'transparent' : (templateStyles?.primaryColor || themeClasses.accent),
                            zIndex: 2
                          }}>
                            {/* TODO: Timeline gutter feature disabled - InlineTimelineGutter was deleted */}
                            {false && showTimelineGutter && InlineTimelineGutter && (
                              // <InlineTimelineGutter
                              //   cvData={cvData}
                              //   parserType={timelineParserType}
                              //   showCriticalOnly={timelineShowCriticalOnly}
                              //   workIndex={index}
                              //   totalWorkEntries={cvData.work.length}
                              // />
                              null
                            )}
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h6 className="font-semibold text-lg !text-gray-900">
                                {getWorkTitle(work) || getWorkCompany(work) || 'Position'}
                              </h6>
                              {getWorkCompany(work) && (
                                <p className="text-sm !text-gray-900">
                                  {getWorkCompany(work)}
                                </p>
                              )}
                            </div>
                            {getWorkDateRange(work) && (
                              <span className="text-sm !text-gray-900">
                                {getWorkDateRange(work)}
                              </span>
                            )}
                          </div>
                          {work.summary && work.summary.trim() && (
                            <div className="text-sm leading-relaxed !text-gray-900">
                              <AnnotatedText
                                as="p"
                                enabled={overlaysEnabled}
                                fieldPath={`work[${index}].summary`}
                                text={stripRichText(work.summary)}
                                annotations={annotations}
                                activeFixId={activeFixId}
                                onSelectFix={onSelectFix}
                                onApplyFix={onApplyFix}
                                onDismissFix={onDismissFix}
                                inlineCard={overlayInlineCard}
                              />
                            </div>
                          )}
                          {work.highlights && work.highlights.length > 0 && (
                            <ul className="text-sm mt-2 space-y-1 !text-gray-900">
                              {work.highlights.map((highlight, i) => (
                                <li key={i} className="flex items-start">
                                  <span className="mr-2">•</span>
                                  <AnnotatedText
                                    as="span"
                                    enabled={overlaysEnabled}
                                    fieldPath={`work[${index}].highlights[${i}]`}
                                    text={stripRichText(highlight)}
                                    annotations={annotations}
                                    activeFixId={activeFixId}
                                    onSelectFix={onSelectFix}
                                    onApplyFix={onApplyFix}
                                    onDismissFix={onDismissFix}
                                    inlineCard={overlayInlineCard}
                                  />
                                </li>
                              ))}
                            </ul>
                          )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Education */}
                {cvData.education && cvData.education.length > 0 && isSectionVisible('education') && (
                  <div className="mb-6">
                    <h5 className={`text-xl font-semibold mb-4 border-b pb-1 !text-gray-900`} style={{
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
                              <h6 className="font-semibold text-lg !text-gray-900">
                                {getEducationDegree(education) ? (
                                  getEducationField(education) 
                                    ? `${getEducationDegree(education)} in ${getEducationField(education)}`
                                    : getEducationDegree(education)
                                ) : getEducationField(education) || 'Education'}
                              </h6>
                              {getEducationInstitution(education) && (
                                <p className="text-sm !text-gray-900">
                                  {getEducationInstitution(education)}
                                </p>
                              )}
                            </div>
                            {getEducationDateRange(education) && (
                              <span className="text-sm !text-gray-900">
                                {getEducationDateRange(education)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Skills */}
                {(cvData.skills && cvData.skills.length > 0 || ghostSkills.length > 0) && isSectionVisible('skills') && (
                  <div className="mb-6">
                    <h5 className={`text-xl font-semibold mb-4 border-b pb-1 !text-gray-900`} style={{
                      color: '#1f2937',
                      borderBottomColor: templateStyles?.secondaryColor || themeClasses.border
                    }}>
                      Skills
                    </h5>
                    <div className="space-y-2">
                      {cvData.skills && cvData.skills.map((skill, index) => (
                        <div key={index} className="flex items-start gap-2">
                          {getSkillCategory(skill) && (
                            <span className="font-bold text-base !text-gray-900 whitespace-nowrap" style={{ 
                              fontWeight: '700',
                              fontSize: '15px',
                              color: '#1f2937'
                            }}>
                              {getSkillCategory(skill)}:
                            </span>
                          )}
                          <span className="text-sm !text-gray-900">
                            {getSkillItems(skill).join(', ')}
                          </span>
                        </div>
                      ))}
                      {/* Ghost skill suggestions */}
                      {ghostSkills.length > 0 && overlaysEnabled && (
                        <>
                          {ghostSkills.map((ghost, index) => (
                            <div 
                              key={`ghost-${index}`} 
                              className="flex items-start gap-2"
                            >
                              {ghost.category && (
                                <span className="font-bold text-base text-gray-400 whitespace-nowrap" style={{ 
                                  fontWeight: '700',
                                  fontSize: '15px',
                                  opacity: 0.5
                                }}>
                                  {ghost.category}:
                                </span>
                              )}
                              <button
                                onClick={() => onAddGhostSkill?.(ghost.skill, ghost.category, ghost.fixId)}
                                className="text-sm text-gray-400 italic hover:text-gray-600 hover:not-italic transition-all cursor-pointer border-b border-dashed border-gray-300 hover:border-gray-500"
                                style={{ opacity: 0.6 }}
                                title="Click to add this skill"
                              >
                                + Add {ghost.skill} (suggested)
                              </button>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Projects */}
                {cvData.projects && cvData.projects.length > 0 && isSectionVisible('projects') && (
                  <div className="mb-6">
                    <h5 className={`text-xl font-semibold mb-4 border-b pb-1 !text-gray-900`} style={{
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
                              <h6 className="font-semibold text-lg !text-gray-900">
                                {getProjectTitle(project) || 'Project'}
                              </h6>
                              {project.description && (
                                <p className="text-sm !text-gray-900">
                                  <AnnotatedText
                                    as="span"
                                    enabled={overlaysEnabled}
                                    fieldPath={`projects[${index}].description`}
                                    text={stripRichText(project.description)}
                                    annotations={annotations}
                                    activeFixId={activeFixId}
                                    onSelectFix={onSelectFix}
                                    onApplyFix={onApplyFix}
                                    onDismissFix={onDismissFix}
                                    inlineCard={overlayInlineCard}
                                  />
                                </p>
                              )}
                            </div>
                            <span className="text-sm !text-gray-900">
                              {project.startDate && project.endDate ? `${project.startDate} - ${project.endDate}` : ''}
                            </span>
                          </div>
                          {project.url && (
                            <p className="text-sm mt-2 !text-gray-900">
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
                    <h5 className={`text-xl font-semibold mb-4 border-b pb-1 !text-gray-900`} style={{
                      color: '#1f2937',
                      borderBottomColor: templateStyles?.secondaryColor || themeClasses.border
                    }}>
                      Certificates
                    </h5>
                    <div className="space-y-3">
                      {cvData.certificates.map((certificate, index) => (
                        <div key={index} className="flex justify-between items-start">
                          <div>
                            <h6 className="font-medium !text-gray-900">
                              {certificate.name || certificate.certificationName || 'Certification'}
                            </h6>
                            {certificate.issuer && (
                              <p className="text-sm !text-gray-900">
                                {certificate.issuer}
                              </p>
                            )}
                          </div>
                          <span className="text-sm !text-gray-900">
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
                    <h5 className={`text-xl font-semibold mb-4 border-b pb-1 !text-gray-900`} style={{
                      color: '#1f2937',
                      borderBottomColor: templateStyles?.secondaryColor || themeClasses.border
                    }}>
                      Languages
                    </h5>
                    <div className="grid grid-cols-2 gap-4">
                      {cvData.languages.map((language, index) => (
                        <div key={index} className="text-sm !text-gray-900">
                          {language.language} - {language.fluency}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Volunteer */}
                {cvData.volunteer && cvData.volunteer.length > 0 && isSectionVisible('volunteer') && (
                  <div className="mb-6">
                    <h5 className={`text-xl font-semibold mb-4 border-b pb-1 !text-gray-900`} style={{
                      color: '#1f2937',
                      borderBottomColor: templateStyles?.secondaryColor || themeClasses.border
                    }}>
                      Volunteer Experience
                    </h5>
                    <div className="space-y-4">
                      {cvData.volunteer.map((v, index) => (
                        <div key={index} className="border-l-4 pl-4" style={{
                          borderLeftColor: templateStyles?.primaryColor || themeClasses.accent
                        }}>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h6 className="font-semibold text-lg !text-gray-900">
                                {v.position || v.role || 'Volunteer Role'}
                              </h6>
                              {v.organization && (
                                <p className="text-sm !text-gray-900">
                                  {v.organization}
                                </p>
                              )}
                            </div>
                            {(v.startDate || v.endDate) && (
                              <span className="text-sm !text-gray-900">
                                {v.startDate && v.endDate ? `${v.startDate} - ${v.endDate}` : v.startDate || v.endDate}
                              </span>
                            )}
                          </div>
                          {v.summary && (
                            <div className="text-sm leading-relaxed !text-gray-900">
                              <AnnotatedText
                                as="p"
                                enabled={overlaysEnabled}
                                fieldPath={`volunteer[${index}].summary`}
                                text={stripRichText(v.summary)}
                                annotations={annotations}
                                activeFixId={activeFixId}
                                onSelectFix={onSelectFix}
                                onApplyFix={onApplyFix}
                                onDismissFix={onDismissFix}
                                inlineCard={overlayInlineCard}
                              />
                            </div>
                          )}
                          {v.highlights && v.highlights.length > 0 && (
                            <ul className="text-sm mt-2 space-y-1 !text-gray-900">
                              {v.highlights.map((highlight, i) => (
                                <li key={i} className="flex items-start">
                                  <span className="mr-2">•</span>
                                  <AnnotatedText
                                    as="span"
                                    enabled={overlaysEnabled}
                                    fieldPath={`volunteer[${index}].highlights[${i}]`}
                                    text={stripRichText(highlight)}
                                    annotations={annotations}
                                    activeFixId={activeFixId}
                                    onSelectFix={onSelectFix}
                                    onApplyFix={onApplyFix}
                                    onDismissFix={onDismissFix}
                                    inlineCard={overlayInlineCard}
                                  />
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Awards */}
                {cvData.awards && cvData.awards.length > 0 && isSectionVisible('awards') && (
                  <div className="mb-6">
                    <h5 className={`text-xl font-semibold mb-4 border-b pb-1 !text-gray-900`} style={{
                      color: '#1f2937',
                      borderBottomColor: templateStyles?.secondaryColor || themeClasses.border
                    }}>
                      Awards & Recognition
                    </h5>
                    <div className="space-y-3">
                      {cvData.awards.map((award, index) => (
                        <div key={index} className="flex justify-between items-start">
                          <div>
                            <h6 className="font-medium !text-gray-900">
                              {award.title || award.name || 'Award'}
                            </h6>
                            {award.awarder && (
                              <p className="text-sm !text-gray-900">
                                {award.awarder}
                              </p>
                            )}
                            {award.summary && (
                              <p className="text-sm !text-gray-900 mt-1">
                                {award.summary}
                              </p>
                            )}
                          </div>
                          {award.date && (
                            <span className="text-sm !text-gray-900">
                              {award.date}
                            </span>
                          )}
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
