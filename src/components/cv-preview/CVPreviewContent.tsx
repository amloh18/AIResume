'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Eye, Component, Target, ZoomIn, ZoomOut, PanelRightOpen, PanelRightClose } from 'lucide-react';
import { CUSTOM_TEMPLATES } from '@/lib/templates/custom-renderers/index';
import { CustomTemplates } from '@/lib/templates/hardcoded-templates';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { DesignSettings, SectionConfig } from '@/types/design-settings';
import { getVisibleCVSections } from '@/lib/selectors/cv-section-selectors';
import AnnotatedText from '@/components/resume-enhancer/annotations/AnnotatedText';
import type { FixAnnotation } from '@/components/resume-enhancer/annotations/fix-annotation';
import { renderRichText } from '@/lib/utils/format-utils';
import type { DateFormatStyle } from '@/lib/utils/textFormatting';
import { getPlainTextCV } from '@/lib/utils/cv-analysis-utils';
import { DraggableSection } from '@/components/resume-enhancer/dnd/DraggableSection';
import { InlineAddSectionButton } from '@/components/resume-enhancer/dnd/InlineAddSectionButton';

// Header section types that should not be draggable or deletable
// These sections form the header/contact area of CVs and should remain locked
const HEADER_SECTION_TYPES = [
  'personal',
  'personal_header',
  'contact',
  'summary', // Some templates include summary as part of header
];

// Helper function to check if a section is a header section
const isHeaderSection = (sectionType: string): boolean => {
  return HEADER_SECTION_TYPES.includes(sectionType);
};

export type ViewMode = 'edit' | 'recruiter' | 'ats';

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

  /**
   * Callback when a section is clicked (for opening floating editor)
   */
  onSectionClick?: (sectionId: string, event: React.MouseEvent) => void;
  enableATSOverlay?: boolean;
  overlayContainerRef?: React.RefObject<HTMLDivElement>;

  // Step 3 Surgeon Controls
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  currentZoom?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  pageFormat?: 'a4' | 'letter';
  dateFormat?: DateFormatStyle;
  onAddSection?: (sectionType: string) => void;
  onOpenAddSectionModal?: () => void;
}

const SectionWrapper = ({
  sectionId,
  children,
  onSectionClick,
  className = ""
}: {
  sectionId: string;
  children: React.ReactNode;
  onSectionClick?: (sectionId: string, e: React.MouseEvent) => void;
  className?: string;
}) => {
  if (!onSectionClick) return <>{children}</>;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSectionClick(sectionId, e);
      }}
      className={`group relative rounded-lg transition-all duration-200 hover:ring-2 hover:ring-blue-400/50 hover:bg-blue-50/50 cursor-pointer -mx-2 px-2 ${className}`}
    >
      {/* Edit indicator on hover */}
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-500 text-white p-1.5 rounded-md shadow-sm pointer-events-none z-10">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
      </div>
      {children}
    </div>
  );
};

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
  onTotalPagesChange,
  onSectionClick,
  viewMode,
  onViewModeChange,
  currentZoom,
  onZoomIn,
  onZoomOut,
  isSidebarOpen,
  onToggleSidebar,
  pageFormat = 'a4',
  dateFormat = 'MMM_YYYY',
  onAddSection,
  onOpenAddSectionModal,
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

  // Calculate page dimensions based on format (A4 vs US Letter)
  const pageDimensions = useMemo(() => {
    if (pageFormat === 'letter') {
      // US Letter: 8.5in x 11in
      return {
        width: '8.5in',
        height: '11in',
        heightPx: 1056, // 11 * 96 DPI
      };
    }
    // A4: 210mm x 297mm
    return {
      width: '210mm',
      height: '297mm',
      heightPx: 1123, // 297mm at 96 DPI
    };
  }, [pageFormat]);

  // State hooks must be called unconditionally
  const [totalPages, setTotalPages] = useState(1);
  const [contentHeight, setContentHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const customTemplateRef = useRef<HTMLDivElement>(null);
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
    if (!cvData) {
      setContentHeight(0);
      setTotalPages(1);
      return;
    }

    // Check for custom template content first, then generic content
    const measureRef = customTemplateRef.current || contentRef.current;
    if (!measureRef) {
      setContentHeight(0);
      setTotalPages(1);
      return;
    }

    const height = measureRef.scrollHeight;
    setContentHeight(height);

    if (height > 0) {
      // Check if this is a single-page template
      // Check if this is a single-page template
      const isSinglePageTemplate = templateName?.toLowerCase().includes('executive professional');

      if (isSinglePageTemplate) {
        setTotalPages(1);
      } else {
        // Use calculated page height from dimensions
        const pageHeight = pageDimensions.heightPx - pagePadding.top - pagePadding.bottom;
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

  // Check for custom renderer
  // This must be done AFTER all hooks are called
  const getCustomRenderer = () => {
    if (!templateName) return null;

    // Normalize template name to find match in registry
    // Dictionary check first (ID mapping)
    const normalizedId = templateName.toLowerCase().replace(/\s+/g, '-');
    if (CUSTOM_TEMPLATES[normalizedId as keyof typeof CUSTOM_TEMPLATES]) {
      const rendererName = CUSTOM_TEMPLATES[normalizedId as keyof typeof CUSTOM_TEMPLATES];
      return CustomTemplates[rendererName as keyof typeof CustomTemplates];
    }

    // Name check (direct name match)
    const directMatch = Object.entries(CUSTOM_TEMPLATES).find(([key, val]) =>
      key === normalizedId || val === templateName.replace(/\s+/g, '') + 'Template'
    );

    if (directMatch) {
      const rendererName = directMatch[1];
      return CustomTemplates[rendererName as keyof typeof CustomTemplates];
    }

    return null;
  };

  const CustomRenderer = getCustomRenderer();

  // If we have a custom renderer, use it with pagination like generic preview
  if (CustomRenderer) {
    // Use the same pagination logic as generic preview
    const isFullBleed = templateName?.toLowerCase().includes('tech pro blue');
    const pageHeight = pageDimensions.heightPx;
    const verticalPadding = isFullBleed ? 0 : (pagePadding.top + pagePadding.bottom);
    const usablePageHeight = pageHeight - verticalPadding;

    return (
      <div className="space-y-8 relative">
        {/* Hidden measurement container for calculating total content height */}
        <div
          ref={customTemplateRef}
          style={{
            position: 'absolute',
            visibility: 'hidden',
            pointerEvents: 'none',
            width: pageDimensions.width,
            left: '-9999px',
            top: 0,
            padding: isFullBleed ? '0px' : `${pagePadding.top}px 32px ${pagePadding.bottom}px 32px`
          }}
        >
          <CustomRenderer cvData={cvData} dateFormat={dateFormat} />
        </div>
        {/* Page Break CSS for custom templates */}
        <style dangerouslySetInnerHTML={{
          __html: `
          /* Force black text on white background - prevent dark mode inheritance */
          /* EXCLUDE ATS MODE (which needs green text on black bg) */
          .cv-page-custom:not(.mode-ats),
          .cv-page-custom:not(.mode-ats) * {
            color: #000000 !important;
          }
          .cv-page-custom:not(.mode-ats) h1,
          .cv-page-custom:not(.mode-ats) h2,
          .cv-page-custom:not(.mode-ats) h3,
          .cv-page-custom:not(.mode-ats) h4,
          .cv-page-custom:not(.mode-ats) h5,
          .cv-page-custom:not(.mode-ats) h6,
          .cv-page-custom:not(.mode-ats) p,
          .cv-page-custom:not(.mode-ats) span,
          .cv-page-custom:not(.mode-ats) div,
          .cv-page-custom:not(.mode-ats) li,
          .cv-page-custom:not(.mode-ats) strong,
          .cv-page-custom:not(.mode-ats) b,
          .cv-page-custom:not(.mode-ats) em,
          .cv-page-custom:not(.mode-ats) i {
            color: #000000 !important;
          }
          
          /* ATS MODE - Force green text */
          .mode-ats,
          .mode-ats * {
            color: #00ff00 !important;
          }

          /* Allow gray for secondary text */
          .cv-page-custom .text-gray-500,
          .cv-page-custom .text-gray-600,
          .cv-page-custom .text-gray-700 {
            color: #4b5563 !important;
          }
          
          /* ===== MODE-SPECIFIC STYLES ===== */
          
          /* EDIT MODE - Show clickable section indicators */
          .mode-edit [data-section-id] {
            cursor: pointer;
            transition: outline 0.2s ease, background-color 0.2s ease;
          }
          .mode-edit [data-section-id]:hover {
            outline: 2px dashed #3b82f6;
            background-color: rgba(59, 130, 246, 0.05);
            outline-offset: 4px;
          }
          
          /* RECRUITER MODE - Spotlight effect (dim secondary sections) */
          .mode-recruiter.dim-secondary [data-section-id="volunteer"],
          .mode-recruiter.dim-secondary [data-section-id="certificates"],
          .mode-recruiter.dim-secondary [data-section-id="awards"] {
            opacity: 0.4;
            filter: blur(0.5px);
            transition: opacity 0.3s ease, filter 0.3s ease;
          }
          /* For seniors (2+ work experiences), also dim education */
          .mode-recruiter.dim-education [data-section-id="education"] {
            opacity: 0.4;
            filter: blur(0.5px);
          }
          
          /* ATS MODE - X-ray view styling */
          .mode-ats {
            filter: grayscale(100%) contrast(1.1);
          }
          .mode-ats [data-section-id] {
            position: relative;
          }
          
          /* PREVENT TEXT SPLITTING - Avoid orphaned text across pages */
          .cv-page-custom p,
          .cv-page-custom li,
          .cv-page-custom h1,
          .cv-page-custom h2,
          .cv-page-custom h3,
          .cv-page-custom h4,
          .cv-page-custom h5,
          .cv-page-custom h6,
          .cv-page-custom [data-section-id],
          .cv-page-custom [data-item-id] {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          
          /* Keep section headers with their content */
          .cv-page-custom .section-title,
          .cv-page-custom [class*="section-title"] {
            break-after: avoid;
            page-break-after: avoid;
          }
          
          @media print {
            .cv-page-custom {
              page-break-after: always;
              page-break-inside: avoid;
            }
            .cv-page-custom:last-child {
              page-break-after: auto;
            }
          }
          .cv-page-custom {
            break-after: page;
            break-inside: avoid;
          }
          .cv-page-custom:last-child {
            break-after: auto;
          }
        ` }} />


        {/* Helper: parse plain text outside loop if needed, or inside */}

        {/* Render multiple pages (or single page for shorter content) */}
        {Array.from({ length: renderMode === 'pages' ? (viewMode === 'ats' ? 1 : totalPages) : 1 }, (_, pageIndex) => {
          // Determine mode classes for styling
          const isJunior = (cvData.work?.length || 0) < 2;
          const modeClass = viewMode === 'edit' ? 'mode-edit' :
            viewMode === 'recruiter' ? `mode-recruiter dim-secondary ${!isJunior ? 'dim-education' : ''}` :
              viewMode === 'ats' ? 'mode-ats' : '';

          // Event delegation handler for section clicks
          const handleTemplateClick = (e: React.MouseEvent) => {
            if (viewMode !== 'edit' || !onSectionClick) return;
            const target = (e.target as HTMLElement).closest('[data-section-id]');
            if (target) {
              const sectionId = target.getAttribute('data-section-id');
              if (sectionId) {
                onSectionClick(sectionId, e);
              }
            }
          };

          // ATS Mode: Render Terminal Block instead of Resume
          if (viewMode === 'ats') {
            const plainText = getPlainTextCV(cvData);
            return (
              <div
                key={pageIndex}
                className={`cv-page-custom mb-8 mode-ats`}
                style={{
                  width: pageDimensions.width,
                  minHeight: pageDimensions.height, // Allow it to grow if text is long? Or clip? "Page" usually clips.
                  height: 'auto', // ATS output might be long, let it flow? Users prefer scrolling.
                  // If we want it to look like A4 pages, we should stick to dimensions.
                  // But terminal scroll is better. Let's start with auto height for better UX in "preview page container".
                  backgroundColor: '#000000', // Pure Black
                  color: '#00ff00',          // Terminal Green
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 255, 0, 0.2)',
                  borderRadius: '2px',
                  boxSizing: 'border-box',
                  fontFamily: '"Courier New", Courier, monospace',
                  fontSize: '13px',
                  overflow: 'hidden'
                }}
              >
                <div style={{
                  padding: '32px',
                  height: '100%',
                  boxSizing: 'border-box',
                  color: '#00ff00' // Ensure green text color is inherited
                }}>
                  <div className="flex items-center gap-2 mb-4 opacity-70 border-b border-green-500/30 pb-2" style={{ color: '#00ff00' }}>
                    <div className="w-2 h-2 rounded-full bg-[#00ff00] animate-pulse" />
                    <span className="font-bold tracking-wider" style={{ color: '#00ff00' }}>ATS_PARSE_PREVIEW</span>
                    <span className="ml-auto text-[10px] opacity-50" style={{ color: '#00ff00' }}>CHARS: {plainText.length}</span>
                  </div>
                  <pre className="whitespace-pre-wrap leading-relaxed font-mono" style={{ color: '#00ff00' }}>
                    {plainText || 'No parseable content found.'}
                  </pre>
                </div>
              </div>
            );
          }

          return (
            <div
              key={pageIndex}
              className={`cv-page-custom bg-white shadow-2xl mb-8 ${modeClass}`}
              onClick={handleTemplateClick}
              style={{
                width: pageDimensions.width,
                height: renderMode === 'pages' ? pageDimensions.height : 'auto',
                minHeight: pageDimensions.height,
                overflow: 'hidden',
                pageBreakAfter: renderMode === 'pages' && pageIndex < totalPages - 1 ? 'always' : 'auto',
                breakAfter: renderMode === 'pages' && pageIndex < totalPages - 1 ? 'page' : 'auto',
                backgroundColor: '#ffffff',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                borderRadius: '2px',
                boxSizing: 'border-box'
              }}
            >
              {/* Padding Wrapper - creates visual margins like generic preview */}
              <div style={{
                paddingTop: isFullBleed ? '0px' : `${pagePadding.top}px`,
                paddingBottom: isFullBleed ? '0px' : `${pagePadding.bottom}px`,
                paddingLeft: isFullBleed ? '0px' : '32px',
                paddingRight: isFullBleed ? '0px' : '32px',
                height: '100%',
                boxSizing: 'border-box'
              }}>
                {/* Content Viewport - clips content to printable area */}
                <div style={{ height: '100%', overflow: 'hidden', position: 'relative' }}>
                  {/* Content Container - uses translateY to show correct portion */}
                  <div style={{
                    transform: renderMode === 'pages' && pageIndex > 0
                      ? `translateY(calc(-${pageIndex} * (${pageDimensions.height} - ${isFullBleed ? '0px' : (pagePadding.top + pagePadding.bottom) + 'px'})))`
                      : 'none'
                  }}>
                    <CustomRenderer
                      cvData={cvData}
                      dateFormat={dateFormat}
                      sectionWrapper={viewMode === 'edit' ? DraggableSection : undefined}
                      AddSectionButton={viewMode === 'edit' ? InlineAddSectionButton : undefined}
                      onAddSection={viewMode === 'edit' ? onAddSection : undefined}
                    />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
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

    // Check if it has tags before processing to save perf on plain text
    const hasTags = /<[^>]+>/.test(value);
    if (!hasTags) return value;

    return value
      // Handle list items - convert to ASCII bullets
      .replace(/<li[^>]*>/gi, '• ')   // Start of list item -> bullet + space
      .replace(/<\/li>/gi, '\n')      // End of list item -> new line
      .replace(/<ul[^>]*>/gi, '')     // Remove list start/end tags
      .replace(/<\/ul>/gi, '\n')      // Add extra spacing after list
      .replace(/<ol[^>]*>/gi, '')
      .replace(/<\/ol>/gi, '\n')

      // Handle breaks and paragraphs
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<\/div>/gi, '\n')
      .replace(/<div[^>]*>/gi, '')

      // Strip remaining tags
      .replace(/<[^>]+>/g, '')

      // Decode entities
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')

      // Cleanup whitespace
      .replace(/\n{3,}/g, '\n\n')     // Max 2 consecutive newlines
      .trim();
  };

  // RichTextContent component for rendering HTML with safe rich formatting
  const RichTextContent = ({ html, className = '' }: { html: string; className?: string }) => {
    if (!html || !html.trim()) return null;
    const sanitizedHtml = renderRichText(html);
    return (
      <div
        className={className}
        style={{ color: '#111827' }}
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    );
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
    // CV page content always uses light theme (like printed paper)
    // Only the outer container can use dark mode
    page: 'bg-white', // Always white paper
    text: {
      primary: 'text-gray-900', // Always black text on paper
      secondary: 'text-gray-600',
      muted: 'text-gray-500',
      accent: 'text-blue-600'
    },
    border: 'border-gray-200',
    accent: 'border-blue-600'
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
      <style dangerouslySetInnerHTML={{
        __html: `
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

      {/* CV Preview Badge - Merged Controls */}



      {/* Hidden measurement container - renders content once to measure true height for pagination */}
      <div
        ref={contentRef}
        className="absolute -left-[9999px] top-0"
        style={{ visibility: 'hidden', position: 'absolute', width: pageDimensions.width }}
        aria-hidden="true"
      >
        <div style={{ paddingTop: `${pagePadding.top}px`, paddingBottom: `${pagePadding.bottom}px`, paddingLeft: '32px', paddingRight: '32px' }}>
          {cvData.basics?.name && <div className="text-3xl font-bold mb-2">{cvData.basics.name}</div>}
          {cvData.basics?.label && <div className="text-xl mb-3">{cvData.basics.label}</div>}
          {cvData.basics?.summary && <div className="mb-6 text-sm leading-relaxed">{cvData.basics.summary}</div>}
          {cvData.work?.map((job, i) => (
            <div key={i} className="mb-4">
              <div className="font-medium">{job.position || job.name}</div>
              <div className="text-sm mt-1">{job.summary}</div>
            </div>
          ))}
          {cvData.education?.map((edu, i) => <div key={i} className="mb-3">{edu.institution} - {edu.studyType} {edu.area}</div>)}
          {cvData.skills?.map((s, i) => <div key={i} className="mb-2">{(s as any).category || (s as any).name}: {(s as any).keywords?.join(', ')}</div>)}
          {cvData.projects?.map((p, i) => <div key={i} className="mb-3"><div className="font-medium">{p.name}</div><div className="text-sm">{p.description}</div></div>)}
          {cvData.certificates?.map((c, i) => <div key={i} className="mb-2">{c.name}</div>)}
          {cvData.languages?.map((l, i) => <div key={i}>{l.language}</div>)}
        </div>
      </div>

      {/* Render multiple pages (or a single continuous paper in report mode) */}
      {Array.from({ length: renderMode === 'pages' ? totalPages : 1 }, (_, pageIndex) => (
        <div
          key={pageIndex}
          className={`${themeClasses.page} cv-page mb-8`}
          style={{
            width: pageDimensions.width,
            height: renderMode === 'pages' ? pageDimensions.height : 'auto',
            minHeight: pageDimensions.height,
            overflow: 'hidden',
            pageBreakAfter: renderMode === 'pages' && pageIndex < totalPages - 1 ? 'always' : 'auto',
            breakAfter: renderMode === 'pages' && pageIndex < totalPages - 1 ? 'page' : 'auto',
            backgroundColor: '#ffffff',
            color: '#111827',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
            borderRadius: '2px',
            ...templateStyle
          }}
        >
          {/* Padding Wrapper - creates visual margins, stays fixed */}
          <div style={{
            paddingTop: `${pagePadding.top}px`,
            paddingBottom: `${pagePadding.bottom}px`,
            paddingLeft: '32px',
            paddingRight: '32px',
            height: '100%',
            boxSizing: 'border-box'
          }}>
            {/* Content Viewport - clips content to printable area */}
            <div style={{ height: '100%', overflow: 'hidden', position: 'relative' }}>
              {/* Content Container - uses translateY to show correct portion */}
              <div style={{
                color: '#111827',
                transform: renderMode === 'pages' && pageIndex > 0
                  ? `translateY(calc(-${pageIndex} * (${pageDimensions.height} - ${pagePadding.top + pagePadding.bottom}px)))`
                  : 'none'
              }}>
                {/* Render appropriate layout based on template type */}
                {layoutType === 'two-column' ? (
                  <div className="grid grid-cols-2 gap-8 h-full">
                    {/* Left Column */}
                    <div className="space-y-6">
                      {/* Header */}
                      <SectionWrapper sectionId="personal" onSectionClick={onSectionClick}>
                        <div className={`text-center border-b ${themeClasses.border} pb-6 mb-6`} style={{
                          borderBottomColor: templateStyles?.secondaryColor || themeClasses.border
                        }}>
                          <h4
                            className="text-3xl font-bold mb-2 !text-gray-900"
                          >
                            {(cvData.basics as any).name || (cvData.basics as any).fullName || 'Your Name'}
                          </h4>
                          <p
                            className="text-xl mb-3 !text-gray-900"
                          >
                            {(cvData.basics as any).label || 'Professional Title'}
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
                            {(() => {
                              const loc = cvData.basics.location;
                              if (!loc) return null;
                              const locParts = [loc.city, loc.region, loc.countryCode].filter(Boolean);
                              if (locParts.length === 0) return null;

                              return (
                                <span className="flex items-center gap-1 hover:opacity-80 transition-opacity">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                  </svg>
                                  {locParts.join(', ')}
                                </span>
                              );
                            })()}
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
                      </SectionWrapper>

                      {/* Contact Info */}
                      <SectionWrapper sectionId="personal" onSectionClick={onSectionClick}>
                        <div className="space-y-4">
                          {cvData.basics.email && <p className="text-sm !text-gray-900">{cvData.basics.email}</p>}
                          {cvData.basics.phone && <p className="text-sm !text-gray-900">{cvData.basics.phone}</p>}
                          {(() => {
                            const loc = cvData.basics.location;
                            if (!loc) return null;
                            const locString = [loc.city, loc.region, loc.countryCode].filter(Boolean).join(', ');
                            return locString ? <p className="text-sm !text-gray-900">{locString}</p> : null;
                          })()}
                          {cvData.basics.url && <p className="text-sm !text-gray-900">{cvData.basics.url}</p>}
                        </div>
                      </SectionWrapper>

                      {/* Skills */}
                      {cvData.skills && cvData.skills.length > 0 && (
                        <SectionWrapper sectionId="skills" onSectionClick={onSectionClick}>
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
                        </SectionWrapper>
                      )}

                      {/* Languages */}
                      {cvData.languages && cvData.languages.length > 0 && (
                        <SectionWrapper sectionId="languages" onSectionClick={onSectionClick}>
                          <div className="space-y-2">
                            <h5 className="font-semibold text-lg !text-gray-900">Languages</h5>
                            <div className="space-y-1">
                              {cvData.languages.map((lang, index) => (
                                <p key={index} className="!text-gray-900">{lang.language} - {lang.fluency}</p>
                              ))}
                            </div>
                          </div>
                        </SectionWrapper>
                      )}
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                      {/* Summary */}
                      {cvData.basics.summary && (
                        <SectionWrapper sectionId="personal" onSectionClick={onSectionClick}>
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
                        </SectionWrapper>
                      )}

                      {/* Work Experience */}
                      {cvData.work && cvData.work.length > 0 && (
                        <SectionWrapper sectionId="work" onSectionClick={onSectionClick}>
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
                        </SectionWrapper>
                      )}

                      {/* Education */}
                      {cvData.education && cvData.education.length > 0 && (
                        <SectionWrapper sectionId="education" onSectionClick={onSectionClick}>
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
                        </SectionWrapper>
                      )}

                      {/* Projects */}
                      {cvData.projects && cvData.projects.length > 0 && (
                        <SectionWrapper sectionId="projects" onSectionClick={onSectionClick}>
                          <div className="space-y-4">
                            <h5 className="font-semibold text-lg !text-gray-900">Projects</h5>
                            <div className="space-y-3">
                              {cvData.projects.map((project, index) => (
                                <div key={index} className="space-y-1">
                                  <h6 className="font-medium !text-gray-900">{getProjectTitle(project) || 'Project'}</h6>
                                  {overlaysEnabled ? (
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
                                  ) : (
                                    <RichTextContent html={project.description || ''} className="text-sm" />
                                  )}
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
                        </SectionWrapper>
                      )}

                      {/* Certificates */}
                      {cvData.certificates && cvData.certificates.length > 0 && (
                        <SectionWrapper sectionId="certificates" onSectionClick={onSectionClick}>
                          <div className="space-y-4">
                            <h5 className="font-semibold text-lg !text-gray-900">Certificates</h5>
                            <div className="space-y-2">
                              {cvData.certificates.map((cert, index) => (
                                <div key={index} className="space-y-0.5">
                                  <div className="font-medium text-sm !text-gray-900">{cert.name || (cert as any).certificationName || 'Certification'}</div>
                                  <div className="text-xs text-gray-600">
                                    {cert.issuer ? cert.issuer : ''}{cert.date ? (cert.issuer ? ` • ${cert.date}` : cert.date) : ''}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </SectionWrapper>
                      )}

                      {/* Volunteer */}
                      {cvData.volunteer && cvData.volunteer.length > 0 && (
                        <SectionWrapper sectionId="volunteer" onSectionClick={onSectionClick}>
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
                        </SectionWrapper>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Single Column Layout */}
                    {/* Header */}
                    <SectionWrapper sectionId="personal" onSectionClick={onSectionClick}>
                      <div className={`text-center border-b ${themeClasses.border} pb-6 mb-6`} style={{
                        borderBottomColor: templateStyles?.secondaryColor || themeClasses.border
                      }}>
                        <h4
                          className="text-3xl font-bold mb-2 !text-gray-900"
                        >
                          {(cvData.basics as any).name || (cvData.basics as any).fullName || 'Your Name'}
                        </h4>
                        <p
                          className="text-xl mb-3 !text-gray-900"
                        >
                          {(cvData.basics as any).label || 'Professional Title'}
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
                          {(() => {
                            const loc = cvData.basics.location;
                            if (!loc) return null;
                            const locParts = [loc.city, loc.region, loc.countryCode].filter(Boolean);
                            if (locParts.length === 0) return null;

                            return (
                              <span className="flex items-center gap-1 hover:opacity-80 transition-opacity">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                </svg>
                                {locParts.join(', ')}
                              </span>
                            );
                          })()}
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
                    </SectionWrapper>

                    {/* Summary */}
                    {cvData.basics.summary && (
                      <SectionWrapper sectionId="personal" onSectionClick={onSectionClick}>
                        <div className="mb-6">
                          <h5 className={`text-xl font-semibold mb-4 border-b pb-1 !text-gray-900`} style={{
                            color: '#1f2937',
                            borderBottomColor: templateStyles?.secondaryColor || themeClasses.border
                          }}>
                            Professional Summary
                          </h5>
                          <div className="text-sm leading-relaxed !text-gray-900">
                            {overlaysEnabled ? (
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
                            ) : (
                              <RichTextContent html={cvData.basics.summary} className="text-sm leading-relaxed" />
                            )}
                          </div>
                        </div>
                      </SectionWrapper>
                    )}

                    {/* Work Experience */}
                    {cvData.work && cvData.work.length > 0 && isSectionVisible('work_experience') && (
                      <SectionWrapper sectionId="work" onSectionClick={onSectionClick}>
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
                                      {overlaysEnabled ? (
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
                                      ) : (
                                        <RichTextContent html={work.summary} className="text-sm leading-relaxed" />
                                      )}
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
                      </SectionWrapper>
                    )}

                    {/* Education */}
                    {cvData.education && cvData.education.length > 0 && isSectionVisible('education') && (
                      <SectionWrapper sectionId="education" onSectionClick={onSectionClick}>
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
                      </SectionWrapper>
                    )}

                    {/* Skills */}
                    {(cvData.skills && cvData.skills.length > 0 || ghostSkills.length > 0) && isSectionVisible('skills') && (
                      <SectionWrapper sectionId="skills" onSectionClick={onSectionClick}>
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
                      </SectionWrapper>
                    )}

                    {/* Projects */}
                    {cvData.projects && cvData.projects.length > 0 && isSectionVisible('projects') && (
                      <SectionWrapper sectionId="projects" onSectionClick={onSectionClick}>
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
                                      overlaysEnabled ? (
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
                                      ) : (
                                        <RichTextContent html={project.description} className="text-sm !text-gray-900" />
                                      )
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
                      </SectionWrapper>
                    )}

                    {/* Certificates */}
                    {cvData.certificates && cvData.certificates.length > 0 && isSectionVisible('certificates') && (
                      <SectionWrapper sectionId="certificates" onSectionClick={onSectionClick}>
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
                                    {certificate.name || (certificate as any).certificationName || 'Certification'}
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
                      </SectionWrapper>
                    )}

                    {/* Languages */}
                    {cvData.languages && cvData.languages.length > 0 && isSectionVisible('languages') && (
                      <SectionWrapper sectionId="languages" onSectionClick={onSectionClick}>
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
                      </SectionWrapper>
                    )}

                    {/* Volunteer */}
                    {cvData.volunteer && cvData.volunteer.length > 0 && isSectionVisible('volunteer') && (
                      <SectionWrapper sectionId="volunteer" onSectionClick={onSectionClick}>
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
                                      {v.position || (v as any).role || 'Volunteer Role'}
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
                      </SectionWrapper>
                    )}

                    {/* Awards */}
                    {cvData.awards && cvData.awards.length > 0 && isSectionVisible('awards') && (
                      <SectionWrapper sectionId="awards" onSectionClick={onSectionClick}>
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
                                    {award.title || (award as any).name || 'Award'}
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
                      </SectionWrapper>
                    )}

                    {/* Add Section Button - Inside CV Page */}
                    {viewMode === 'edit' && onOpenAddSectionModal && (
                      <div className="mt-8 mb-4 flex justify-center cv-editor-only">
                        <button
                          onClick={onOpenAddSectionModal}
                          className="flex items-center gap-2 px-4 py-2 bg-[#00ff88] hover:bg-[#00dd77] text-black font-medium rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                          <span>Add Section</span>
                        </button>
                      </div>
                    )}
                  </>
                )}
                {/* Close Content Container */}
              </div>
              {/* Close Content Viewport */}
            </div>
            {/* Close Padding Wrapper */}
          </div>
          {/* Close Page Container */}
        </div>
      ))}
    </div>
  );
};

export default CVPreviewContent;
