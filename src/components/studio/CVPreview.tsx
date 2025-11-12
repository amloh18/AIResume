'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { 
  ZoomIn, 
  ZoomOut,
  RotateCcw,
  Download,
  FileText,
  Loader2
} from 'lucide-react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { ITemplate } from '@/types/template';
import { Job } from '@/lib/stores/jobStore';
import { downloadAsPDF, downloadAsDOCX, downloadAsImage } from '@/lib/utils/download';
import { TemplateRenderer } from '@/lib/templates/template-renderer';
import { getVisibleCVSections } from '@/lib/selectors/cv-section-selectors';
import { HARDCODED_TEMPLATES } from '@/lib/templates/hardcoded-templates';
import { generatePageBreakCSS } from '@/lib/utils/pageBreakHelper';

interface CVPreviewProps {
  cvData: UnifiedCVDataStructure | null;
  template: ITemplate | null;
  jobData: Job | null;
  zoom?: number;
  setZoom?: (zoom: number) => void;
  paperSize?: 'A4' | 'Letter';
  setPaperSize?: (size: 'A4' | 'Letter') => void;
  documentType?: 'cv' | 'cover-letter';
  sectionOrder?: string[];
  sectionVisibility?: Record<string, boolean>;
  pagePadding?: { top: number; bottom: number };
  setPagePadding?: (padding: { top: number; bottom: number }) => void;
  onDocumentTypeChange?: (type: 'cv' | 'cover-letter') => void;
  isMasterCV?: boolean;
  coverLetterData?: any;
  theme?: 'light' | 'dark';
  showBadge?: boolean;
  templateStyles?: any;
  customCSS?: string;
  templateName?: string;
}

// Page dimensions in pixels (at 96 DPI)
const PAGE_DIMENSIONS = {
  A4: { width: 794, height: 1123 }, // A4: 210mm x 297mm
  Letter: { width: 816, height: 1056 } // Letter: 8.5" x 11"
};

const CVPreviewComponent: React.FC<CVPreviewProps> = ({
  cvData,
  template,
  jobData,
  zoom = 1,
  setZoom,
  paperSize = 'A4',
  setPaperSize,
  documentType = 'cv',
  sectionOrder = ['personal_header', 'work_experience', 'education', 'skills', 'projects', 'certificates', 'languages'],
  sectionVisibility = {},
  pagePadding = { top: 32, bottom: 32 },
  setPagePadding,
  onDocumentTypeChange,
  isMasterCV = false,
  coverLetterData,
  theme = 'light',
  showBadge = true,
  templateStyles,
  customCSS,
  templateName
}) => {
  const [totalPages, setTotalPages] = useState(1);
  const [isDownloading, setIsDownloading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoFitZoom, setAutoFitZoom] = useState(1);

  // For natural flow templates: measurement and page offsets
  const measurementRef = useRef<HTMLDivElement>(null);
  const [measuredContentHeight, setMeasuredContentHeight] = useState<number | null>(null);
  const [pageOffsets, setPageOffsets] = useState<number[]>([]);

  // Get fallback template (Executive Professional) if template is missing
  const fallbackTemplate = useMemo(() => {
    return HARDCODED_TEMPLATES.find((t: any) => 
      t.id === 'executive-professional-layout-template' || 
      t.name === 'Executive Professional'
    ) || null;
  }, []);

  // Use provided template or fallback to Executive Professional
  const effectiveTemplate = useMemo(() => {
    console.log('🔍 CVPreview - Template check:', {
      hasTemplate: !!template,
      templateId: template?.id || template?._id,
      templateName: template?.name,
      customRenderer: template?.customRenderer,
      hasFallback: !!fallbackTemplate,
      fallbackId: fallbackTemplate?.id
    });
    
    if (template) {
      console.log('✅ CVPreview - Using provided template:', template.name);
      return template;
    }
    if (fallbackTemplate) {
      console.log('⚠️ CVPreview - No template provided, using Executive Professional as fallback');
      return fallbackTemplate;
    }
    console.error('❌ CVPreview - No template and no fallback available!');
    return null;
  }, [template, fallbackTemplate]);

  // Use effective template's styles if customCSS/templateStyles not provided
  const effectiveCustomCSS = useMemo(() => {
    if (customCSS) return customCSS;
    if (effectiveTemplate) {
      return (effectiveTemplate as any)?.customCSS || 
             (effectiveTemplate as any)?.globalStyles?.customCSS || 
             '';
    }
    return '';
  }, [customCSS, effectiveTemplate]);

  const effectiveTemplateStyles = useMemo(() => {
    if (templateStyles) return templateStyles;
    if (effectiveTemplate) {
      return (effectiveTemplate as any)?.globalStyles || {};
    }
    return {};
  }, [templateStyles, effectiveTemplate]);

  // Get current page dimensions
  const currentDimensions = PAGE_DIMENSIONS[paperSize];

  // Calculate uniform padding for all sides (use average of top/bottom or default to 32px)
  const uniformPadding = useMemo(() => {
    const avgPadding = Math.round((pagePadding.top + pagePadding.bottom) / 2);
    return avgPadding > 0 ? avgPadding : 32;
  }, [pagePadding.top, pagePadding.bottom]);

  // Get visible sections using centralized selector
  const visibleSectionsList = useMemo(
    () => getVisibleCVSections(cvData, documentType || 'cv'),
    [cvData, documentType]
  );

  // Create fast lookup Set for section visibility
  const visibleSectionTypes = useMemo(
    () => new Set(visibleSectionsList.map(s => s.type)),
    [visibleSectionsList]
  );

  // Get section order from selector (maintains structure order) or use prop
  const effectiveSectionOrder = useMemo(() => {
    if (visibleSectionsList.length > 0) {
      return visibleSectionsList.map(s => s.type);
    }
    return sectionOrder || ['personal_header', 'work_experience', 'education', 'skills', 'projects', 'certificates', 'languages'];
  }, [visibleSectionsList, sectionOrder]);

  // Estimate section height based on content - improved with entry-level awareness
  // Only counts sections that have actual data
  const getSectionHeight = useMemo(() => {
    return (section: string): number => {
      if (!cvData || !visibleSectionTypes.has(section)) return 0;
      
      // Helper to check if section has data
      const hasData = (data: any): boolean => {
        if (!data) return false;
        if (Array.isArray(data)) {
          return data.length > 0 && data.some(item => {
            if (!item || typeof item !== 'object') return false;
            return Object.values(item).some(val => {
              if (typeof val === 'string') return val.trim() !== '';
              if (Array.isArray(val)) return val.length > 0;
              return val !== null && val !== undefined;
            });
          });
        }
        if (typeof data === 'object') {
          return Object.values(data).some(val => {
            if (typeof val === 'string') return val.trim() !== '';
            if (Array.isArray(val)) return val.length > 0;
            return val !== null && val !== undefined;
          });
        }
        return false;
      };
      
      // Helper to estimate entry height based on content - more conservative
      const estimateEntryHeight = (entry: any, baseHeight: number): number => {
        let height = baseHeight;
        // Add height for summary/description content
        if (entry.summary || entry.description) {
          const text = (entry.summary || entry.description || '').toString();
          // Strip HTML tags for accurate length calculation
          const cleanText = text.replace(/<[^>]*>/g, '');
          const lines = Math.ceil(cleanText.length / 90); // ~90 chars per line (more conservative)
          height += Math.max(15, lines * 16); // ~16px per line, min 15px (more conservative)
        }
        return height;
      };
      
      const baseHeights: { [key: string]: number } = {
        personal_header: (() => {
          if (!hasData(cvData.basics)) return 0;
          return 100; // Further reduced from 120
        })(),
        work_experience: (() => {
          const work = cvData.work || [];
          if (!hasData(work)) return 0;
          const headerHeight = 30; // Further reduced from 35
          const entryHeights = work.map(job => estimateEntryHeight(job, 60)); // Further reduced from 70
          return headerHeight + entryHeights.reduce((sum, h) => sum + h, 0) + (work.length * 8); // Further reduced gap
        })(),
        education: (() => {
          const edu = cvData.education || [];
          if (!hasData(edu)) return 0;
          const headerHeight = 30; // Further reduced from 35
          const entryHeights = edu.map(ed => estimateEntryHeight(ed, 50)); // Further reduced from 55
          return headerHeight + entryHeights.reduce((sum, h) => sum + h, 0) + (edu.length * 6); // Further reduced gap
        })(),
        skills: (() => {
          if (!hasData(cvData.skills)) return 0;
          return Math.max(80, (cvData.skills?.length || 0) * 35); // Further reduced from 100/40
        })(),
        projects: (() => {
          const proj = cvData.projects || [];
          if (!hasData(proj)) return 0;
          const headerHeight = 30; // Further reduced from 35
          const entryHeights = proj.map(p => estimateEntryHeight(p, 60)); // Further reduced from 65
          return headerHeight + entryHeights.reduce((sum, h) => sum + h, 0) + (proj.length * 10); // Further reduced gap
        })(),
        certificates: (() => {
          if (!hasData(cvData.certificates)) return 0;
          return Math.max(80, (cvData.certificates?.length || 0) * 55); // Further reduced from 100/65
        })(),
        languages: (() => {
          if (!hasData(cvData.languages)) return 0;
          return Math.max(60, (cvData.languages?.length || 0) * 40); // Further reduced from 80/50
        })(),
        volunteer: (() => {
          const vol = cvData.volunteer || [];
          if (!hasData(vol)) return 0;
          const headerHeight = 30; // Further reduced from 35
          const entryHeights = vol.map(v => estimateEntryHeight(v, 60)); // Further reduced from 65
          return headerHeight + entryHeights.reduce((sum, h) => sum + h, 0) + (vol.length * 6); // Further reduced gap
        })(),
        awards: (() => {
          if (!hasData(cvData.awards)) return 0;
          return Math.max(60, (cvData.awards?.length || 0) * 55); // Further reduced from 80/65
        })(),
        publications: (() => {
          if (!hasData(cvData.publications)) return 0;
          return Math.max(60, (cvData.publications?.length || 0) * 55); // Further reduced from 80/65
        })(),
        interests: (() => {
          if (!hasData(cvData.interests)) return 0;
          return Math.max(50, (cvData.interests?.length || 0) * 20); // Further reduced from 60/25
        })(),
        references: (() => {
          if (!hasData(cvData.references)) return 0;
          return Math.max(60, (cvData.references?.length || 0) * 55); // Further reduced from 80/65
        })()
      };
      
      return baseHeights[section] || 0; // Return 0 instead of 100 for unknown sections
    };
  }, [cvData, visibleSectionTypes]);

  // Check if this is a custom template that should use natural page flow
  // ALL custom renderers bypass enabledSections and should use CSS-based natural flow
  const isCustomTemplateWithNaturalFlow = useMemo(() => {
    // If template has a customRenderer, it should use natural flow
    // Custom renderers render all content and rely on CSS for page breaks
    return !!effectiveTemplate?.customRenderer;
  }, [effectiveTemplate]);

  // Calculate pages based on content height
  const calculatePages = useMemo(() => {
    if (!cvData) return { pages: { 1: [] }, totalPages: 1 };

    // Check if this is a single-page template (like Tech Pro Blue)
    // Note: Even single-page templates should use natural flow if they're custom renderers
    // The natural flow system will handle them correctly
    const isSinglePageTemplate = effectiveTemplate?.customRenderer === 'TechProBlueTemplate' || 
                                 effectiveTemplate?.name?.toLowerCase().includes('tech pro blue') ||
                                 (effectiveTemplate?.layoutType === 'one-column' && 
                                  effectiveTemplate?.customRenderer && 
                                  !isCustomTemplateWithNaturalFlow);
    
    // For custom templates with natural flow, render all content and let CSS handle breaks
    if (isCustomTemplateWithNaturalFlow) {
      // Estimate total pages based on content height
      // Only count sections that have actual data
      const maxPageHeight = currentDimensions.height - (uniformPadding * 2);
      const sectionsWithData = effectiveSectionOrder.filter(section => {
        if (!visibleSectionTypes.has(section)) return false;
        const height = getSectionHeight(section);
        return height > 0; // Only include sections with actual height/data
      });
      
      let totalEstimatedHeight = 0;
      
      sectionsWithData.forEach(section => {
        const height = getSectionHeight(section);
        if (height > 0) {
          totalEstimatedHeight += height;
        }
      });
      
      // Add minimal spacing between sections (6px per section - more conservative)
      totalEstimatedHeight += sectionsWithData.length * 6;
      
      // Very conservative page calculation - add buffer to prevent overestimation
      // Use 0.85 multiplier to account for actual rendering being more compact than estimates
      const adjustedHeight = totalEstimatedHeight * 0.85;
      const estimatedPages = Math.max(1, Math.ceil(adjustedHeight / maxPageHeight));
      
      console.log('📄 CVPreview - Natural flow page calculation:', {
        sectionsWithData,
        totalEstimatedHeight,
        maxPageHeight,
        estimatedPages,
        sectionHeights: sectionsWithData.map(s => ({ section: s, height: getSectionHeight(s) }))
      });
      
      return { 
        pages: { 1: sectionsWithData }, // All sections on "page 1" - will flow naturally
        totalPages: estimatedPages 
      };
    }
    
    // Use full available height minus padding for accurate page breaks
    const maxPageHeight = currentDimensions.height - (uniformPadding * 2);
    
    // Use visible sections from selector (respects structure visibility)
    const sectionsWithData = effectiveSectionOrder.filter(section => visibleSectionTypes.has(section));
    
    // If no sections have data, return empty first page
    if (sectionsWithData.length === 0) {
      return { pages: { 1: [] }, totalPages: 1 };
    }
    
    // For single-page templates, force all content to one page
    if (isSinglePageTemplate) {
      return { pages: { 1: sectionsWithData }, totalPages: 1 };
    }
    
    // Calculate pages based on section heights with smart break logic
    const pages: { [key: number]: string[] } = {};
    let currentPage = 1;
    let currentPageHeight = 0;
    
    pages[currentPage] = [];
    
    // Track which sections have entries that can be split
    const sectionsWithEntries = ['work_experience', 'education', 'projects', 'volunteer'];
    
    for (let i = 0; i < sectionsWithData.length; i++) {
      const section = sectionsWithData[i];
      const sectionHeight = getSectionHeight(section);
      const isEntrySection = sectionsWithEntries.includes(section);
      
      // Priority 1: Try to keep section together
      const sectionFits = currentPageHeight + sectionHeight <= maxPageHeight;
      
      // Priority 2: If section doesn't fit and current page has content, start new page
      if (!sectionFits && pages[currentPage].length > 0) {
        // Check if we can break before this section (between sections)
        currentPage++;
        pages[currentPage] = [];
        currentPageHeight = 0;
      }
      
      // Priority 3: For entry sections, check if we need to split entries
      if (isEntrySection && !sectionFits && pages[currentPage].length > 0) {
        // Section doesn't fit on current page
        // Move to next page (already done above)
      }
      
      // Add section to current page
      pages[currentPage].push(section);
      currentPageHeight += sectionHeight;
      
      // Add spacing after section (except last section)
      if (i < sectionsWithData.length - 1) {
        currentPageHeight += 20; // Section spacing
      }
    }

    // Debug logging
    console.log('📄 CVPreview - Page calculation:', {
      maxPageHeight,
      sectionsWithData,
      pages,
      totalPages: currentPage,
      isSinglePageTemplate,
      isCustomTemplateWithNaturalFlow,
      pageHeights: Object.keys(pages).map(pageNum => ({
        page: pageNum,
        sections: pages[parseInt(pageNum)],
        height: pages[parseInt(pageNum)].reduce((sum, section) => sum + getSectionHeight(section), 0)
      }))
    });

    return { pages, totalPages: currentPage };
  }, [cvData, effectiveSectionOrder, currentDimensions.height, pagePadding, visibleSectionTypes, getSectionHeight, effectiveTemplate, isCustomTemplateWithNaturalFlow]);

  // Update total pages when content changes
  useEffect(() => {
    setTotalPages(calculatePages.totalPages);
  }, [calculatePages.totalPages]);

  // Measure natural flow content height and calculate page offsets
  useEffect(() => {
    if (!isCustomTemplateWithNaturalFlow || !measurementRef.current || !cvData || !effectiveTemplate) {
      setMeasuredContentHeight(null);
      setPageOffsets([]);
      return;
    }

    // Wait for content to render, then measure
    const measureContent = () => {
      const measurementElement = measurementRef.current;
      if (!measurementElement) return;

      // Force a reflow to ensure content is rendered
      measurementElement.offsetHeight;

      // Measure the actual rendered height
      // Find the inner content wrapper (matching the page content wrapper structure)
      const contentWrapper = measurementElement.querySelector('[data-measurement-wrapper="true"]') as HTMLElement;
      
      if (!contentWrapper) {
        // Content not ready yet, retry
        setTimeout(measureContent, 50);
        return;
      }

      // Measure the actual content height from the inner wrapper
      // This matches what we'll render in the page containers
      // Use scrollHeight to get full content including any overflow
      // Round to nearest integer to avoid sub-pixel issues that could cause duplication
      const rawHeight = contentWrapper.scrollHeight || contentWrapper.offsetHeight;
      const actualContentHeight = Math.round(rawHeight);
      
      if (actualContentHeight === 0) {
        // Content not ready yet, retry
        setTimeout(measureContent, 50);
        return;
      }
      
      setMeasuredContentHeight(actualContentHeight);

      // Calculate page offsets
      // maxPageHeight is the available content area per page (page height minus padding)
      const maxPageHeight = Math.floor(currentDimensions.height - (uniformPadding * 2));
      const calculatedPages = Math.max(1, Math.ceil(actualContentHeight / maxPageHeight));
      
      const offsets: number[] = [];
      for (let i = 0; i < calculatedPages; i++) {
        // Calculate offset to show the correct page portion
        // Each page container has padding: uniformPadding (all sides)
        // Content area per page: maxPageHeight = pageHeight - (uniformPadding * 2)
        // 
        // For each page, we want to show content starting from:
        // Page 1: position 0 in the full content (offset: 0)
        // Page 2: position maxPageHeight in the full content (offset: -maxPageHeight)
        // Page 3: position 2 * maxPageHeight in the full content (offset: -2 * maxPageHeight)
        //
        // The wrapper has height maxPageHeight and overflow: hidden, so it clips content
        // We use negative translateY to shift content up, showing the correct portion
        // Use exact integer values to avoid floating point precision issues
        // Use Math.floor to ensure we never show content from previous page (prevents duplication)
        const contentStartPosition = Math.floor(i * maxPageHeight);
        offsets.push(-contentStartPosition);
      }
      
      setPageOffsets(offsets);
      setTotalPages(calculatedPages);

      console.log('📏 CVPreview - Natural flow measurement:', {
        actualContentHeight,
        maxPageHeight,
        calculatedPages,
        pageHeight: currentDimensions.height,
        uniformPadding,
        offsets,
        contentFitsOnOnePage: actualContentHeight <= maxPageHeight
      });
    };

    // Use ResizeObserver for more accurate measurement when content changes
    const resizeObserver = new ResizeObserver(() => {
      measureContent();
    });

    const measurementElement = measurementRef.current;
    if (measurementElement) {
      resizeObserver.observe(measurementElement);
      
      // Also measure immediately after a short delay to catch initial render
      const timeoutId = setTimeout(() => {
        measureContent();
      }, 150);

      return () => {
        clearTimeout(timeoutId);
        resizeObserver.disconnect();
      };
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [isCustomTemplateWithNaturalFlow, cvData, effectiveTemplate, currentDimensions.height, uniformPadding, effectiveSectionOrder]);

  // Calculate total height needed for all pages (before zoom)
  // MUST be called before any conditional returns (Rules of Hooks)
  const totalContentHeight = useMemo(() => {
    const pageHeight = currentDimensions.height;
    const gapBetweenPages = 16; // 16px gap between pages
    const padding = 40; // top and bottom padding
    
    // For custom templates with natural flow, estimate height based on content
    if (isCustomTemplateWithNaturalFlow) {
      const maxPageHeight = currentDimensions.height - (uniformPadding * 2);
      const sectionsWithData = effectiveSectionOrder.filter(section => visibleSectionTypes.has(section));
      let totalEstimatedHeight = 0;
      
      sectionsWithData.forEach(section => {
        totalEstimatedHeight += getSectionHeight(section);
      });
      
      // Add some buffer for spacing and ensure minimum height
      const estimatedHeight = Math.max(pageHeight, totalEstimatedHeight + 100);
      return estimatedHeight;
    }
    
    return (pageHeight * calculatePages.totalPages) + (gapBetweenPages * Math.max(0, calculatePages.totalPages - 1)) + padding;
  }, [calculatePages.totalPages, currentDimensions.height, isCustomTemplateWithNaturalFlow, effectiveSectionOrder, visibleSectionTypes, getSectionHeight, uniformPadding]);

  // Download handlers
  const handleDownloadPDF = async () => {
    if (!contentRef.current) return;
    
    setIsDownloading(true);
    try {
      await downloadAsPDF(contentRef.current, `CV-${cvData?.basics?.name || 'Document'}.pdf`);
    } catch (error) {
      console.error('PDF download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadDOCX = async () => {
    if (!contentRef.current) return;
    
    setIsDownloading(true);
    try {
      await downloadAsDOCX(contentRef.current as any, `CV-${cvData?.basics?.name || 'Document'}.docx`);
    } catch (error) {
      console.error('DOCX download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!contentRef.current) return;
    
    setIsDownloading(true);
    try {
      await downloadAsImage(contentRef.current, `CV-${cvData?.basics?.name || 'Document'}.png`);
    } catch (error) {
      console.error('Image download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  // Zoom handlers
  const handleZoomIn = () => {
    if (setZoom) {
      setZoom(Math.min(2, zoom + 0.1));
    }
  };

  const handleZoomOut = () => {
    if (setZoom) {
      setZoom(Math.max(0.5, zoom - 0.1));
    }
  };

  const handleZoomReset = () => {
    if (setZoom) {
      setZoom(1);
    }
  };

  // Paper size handler
  const handlePaperSizeChange = (size: 'A4' | 'Letter') => {
    if (setPaperSize) {
      setPaperSize(size);
    }
  };

  // Auto-fit zoom calculation based on container width
  useEffect(() => {
    const calculateAutoFitZoom = () => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const containerWidth = container.clientWidth;
      
      // Skip if container has no width yet
      if (containerWidth === 0) return;
      
      // Get the page width (A4 or Letter)
      const pageWidth = currentDimensions.width;
      
      // Calculate scale to fit width with some padding (20px on each side)
      const padding = 40; // 20px on each side
      const availableWidth = containerWidth - padding;
      const calculatedZoom = availableWidth / pageWidth;
      
      // Clamp zoom between 0.3 and 2.0 to prevent too small or too large
      const clampedZoom = Math.max(0.3, Math.min(2.0, calculatedZoom));
      
      setAutoFitZoom(clampedZoom);
      
      // Auto-update zoom if setZoom is available
      if (setZoom && Math.abs(clampedZoom - zoom) > 0.01) {
        setZoom(clampedZoom);
      }
    };

    // Calculate on mount and when dimensions change
    calculateAutoFitZoom();

    // Use ResizeObserver to recalculate when container resizes
    const resizeObserver = new ResizeObserver(() => {
      calculateAutoFitZoom();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Also listen to window resize
    window.addEventListener('resize', calculateAutoFitZoom);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', calculateAutoFitZoom);
    };
  }, [currentDimensions.width, paperSize, setZoom, zoom]);

  if (!cvData) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-[#1a230f]">
        <div className="text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No CV data available</p>
        </div>
      </div>
    );
  }

  // Use auto-fit zoom if available, otherwise use manual zoom
  const effectiveZoom = autoFitZoom > 0 ? autoFitZoom : zoom;

  return (
    <div 
      className="relative w-full h-full" 
      ref={containerRef}
      style={{
        overflow: 'auto'
      }}
    >
      <div
        ref={contentRef}
        style={{
          height: `${totalContentHeight * effectiveZoom}px`,
          minHeight: `${totalContentHeight * effectiveZoom}px`
        }}
      >
            {/* Page break CSS for proper pagination */}
            <style>{`
              ${generatePageBreakCSS()}
              ${isCustomTemplateWithNaturalFlow ? `
                /* For custom templates with natural flow - allow content to flow across pages */
                .cv-preview-page {
                  width: ${paperSize === 'A4' ? '794px' : '816px'};
                  min-height: ${paperSize === 'A4' ? '1123px' : '1056px'};
                  height: auto;
                  page-break-after: auto;
                  break-after: auto;
                  overflow: visible;
                }
                
                /* Ensure custom template content can flow naturally */
                .template-rendered-content {
                  width: 100%;
                  height: auto;
                  min-height: auto;
                  max-height: none;
                  overflow: visible;
                  page-break-inside: auto;
                  break-inside: auto;
                }
                
                /* Natural flow wrapper spans all pages */
                .natural-flow-content-wrapper {
                  position: relative;
                  width: 100%;
                  height: auto;
                }
                
                /* Apply smart page breaks within custom templates */
                .template-rendered-content .section-content,
                .template-rendered-content [class*="section"] {
                  page-break-inside: avoid;
                  break-inside: avoid;
                }
                
                /* Prevent breaking inside entries - keep entries together */
                .template-rendered-content [class*="item"],
                .template-rendered-content [class*="entry"],
                .template-rendered-content [class*="experience"],
                .template-rendered-content [class*="education"],
                .template-rendered-content [class*="project"],
                .template-rendered-content [class*="certificate"],
                .template-rendered-content [class*="volunteer"] {
                  page-break-inside: avoid;
                  break-inside: avoid;
                }
                
                /* Allow breaking between sections, but keep section headers with content */
                .template-rendered-content .section-content:not(:first-child) {
                  page-break-before: auto;
                  break-before: auto;
                }
                
                /* Keep section headers with their first item */
                .template-rendered-content .section-header {
                  page-break-after: avoid;
                  break-after: avoid;
                }
              ` : `
                /* Standard template - fixed page heights */
                .cv-preview-page {
                  page-break-after: always;
                  break-after: page;
                  width: ${paperSize === 'A4' ? '794px' : '816px'};
                  height: ${paperSize === 'A4' ? '1123px' : '1056px'};
                }
                .cv-preview-page:last-child {
                  page-break-after: auto;
                  break-after: auto;
                }
              `}
              @media print {
                .cv-preview-page {
                  ${isCustomTemplateWithNaturalFlow ? `
                    min-height: ${paperSize === 'A4' ? '297mm' : '11in'};
                    height: auto;
                    page-break-after: auto;
                    break-after: auto;
                    overflow: visible;
                  ` : `
                    page-break-after: always;
                    break-after: page;
                    height: ${paperSize === 'A4' ? '297mm' : '11in'};
                  `}
                  width: ${paperSize === 'A4' ? '210mm' : '8.5in'};
                }
                @page {
                  size: ${paperSize === 'A4' ? 'A4' : 'letter'};
                  margin: 0;
                }
              }
            `}</style>
      {/* Vertical scrollable container for all pages */}
      <div 
        className="flex flex-col items-center"
        style={{ 
          width: '100%',
          height: `${totalContentHeight}px`,
          minHeight: `${totalContentHeight}px`,
          padding: '20px 0',
          transform: `scale(${effectiveZoom})`,
          transformOrigin: 'top center',
          position: 'relative'
        }}
      >
        {/* For custom templates with natural flow: Two-pass system */}
        {/* Pass 1: Hidden measurement | Pass 2: Visible rendering with transforms */}
        {isCustomTemplateWithNaturalFlow ? (
          <>
            {/* Pass 1: Hidden measurement container - must match page container structure exactly */}
            {effectiveTemplate && cvData && (
              <div
                ref={measurementRef}
                style={{
                  position: 'absolute',
                  visibility: 'hidden',
                  width: `${currentDimensions.width}px`,
                  padding: `${uniformPadding}px`,
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: -1,
                  pointerEvents: 'none',
                  boxSizing: 'border-box'
                }}
              >
                {/* Measurement wrapper matching the page content wrapper structure */}
                <div
                  data-measurement-wrapper="true"
                  style={{
                    width: '100%',
                    height: 'auto',
                    position: 'relative',
                    overflow: 'visible',
                    margin: 0,
                    padding: 0,
                    boxSizing: 'border-box'
                  }}
                >
                  <TemplateRenderer
                    cvData={cvData}
                    template={effectiveTemplate as any}
                    sectionOrder={effectiveSectionOrder}
                    sectionVisibility={sectionVisibility}
                    className="template-rendered-content"
                    customStyles={{
                      width: '100%',
                      height: 'auto',
                      minHeight: 'auto',
                      overflow: 'visible',
                      margin: 0,
                      padding: 0
                    }}
                  />
                </div>
              </div>
            )}

            {/* Pass 2: Visible page containers with transformed content */}
            {effectiveTemplate && cvData && pageOffsets.length > 0 ? (
              Array.from({ length: pageOffsets.length }, (_, index) => {
            const pageNumber = index + 1;
                const isLastPage = pageNumber === pageOffsets.length;
                const gapBetweenPages = 16;
                const offset = pageOffsets[index];
                const maxPageHeight = currentDimensions.height - (uniformPadding * 2);
            
            return (
              <div 
                key={pageNumber}
                className="bg-white relative shadow-lg cv-preview-page flex-shrink-0"
                style={{
                  width: `${currentDimensions.width}px`,
                  height: `${currentDimensions.height}px`,
                  maxHeight: `${currentDimensions.height}px`,
                  minHeight: `${currentDimensions.height}px`,
                  padding: `${uniformPadding}px`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  display: 'block',
                  overflow: 'hidden',
                      position: 'relative',
                  pageBreakAfter: !isLastPage ? 'always' : 'auto',
                  breakAfter: !isLastPage ? 'page' : 'auto',
                  marginBottom: !isLastPage ? `${gapBetweenPages}px` : '0'
                }}
              >
                {/* Page number indicator */}
                    {pageOffsets.length > 1 && (
                  <div 
                    className="absolute top-2 right-2 text-xs text-gray-500 bg-white px-2 py-1 rounded"
                    style={{ fontSize: '10px', zIndex: 10 }}
                  >
                        Page {pageNumber} of {pageOffsets.length}
                  </div>
                )}

                    {/* Full content rendered once, translated to show correct page window */}
                    {/* Content wrapper: fixed height matching page content area, clips overflow */}
                    {/* This wrapper sits inside the page container's padding, so it naturally has spacing */}
                  <div
                    style={{
                      width: '100%',
                      height: `${maxPageHeight}px`,
                      maxHeight: `${maxPageHeight}px`,
                      position: 'relative',
                      overflow: 'hidden',
                      margin: 0,
                      padding: 0,
                      boxSizing: 'border-box'
                    }}
                  >
                    {/* Transformed content: absolute positioned, shifted to show correct page portion */}
                    {/* Content height matches measured height, transform shifts to show correct portion */}
                    <div
                      style={{
                        width: '100%',
                        height: `${measuredContentHeight || maxPageHeight}px`,
                        minHeight: `${measuredContentHeight || maxPageHeight}px`,
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        transform: `translate3d(0, ${offset}px, 0)`,
                        transition: 'none',
                        margin: 0,
                        padding: 0,
                        willChange: 'transform',
                        backfaceVisibility: 'hidden'
                    }}
                  >
                    <TemplateRenderer
                      cvData={cvData}
                      template={effectiveTemplate as any}
                      sectionOrder={effectiveSectionOrder}
                      sectionVisibility={sectionVisibility}
                      className="template-rendered-content"
                      customStyles={{
                        width: '100%',
                          height: 'auto',
                        minHeight: 'auto',
                          overflow: 'visible',
                          margin: 0,
                          padding: 0
                      }}
                    />
                  </div>
                  </div>
                  </div>
                );
              })
            ) : effectiveTemplate && cvData && !measuredContentHeight ? (
              // Show loading state while measuring
              <div className="bg-white relative shadow-lg cv-preview-page flex-shrink-0 flex items-center justify-center"
                style={{
                  width: `${currentDimensions.width}px`,
                  height: `${currentDimensions.height}px`
                }}
              >
                <div className="text-center text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                  <p className="text-sm">Measuring content...</p>
                </div>
              </div>
            ) : !cvData ? (
              <div className="bg-white relative shadow-lg cv-preview-page flex-shrink-0 flex items-center justify-center"
                style={{
                  width: `${currentDimensions.width}px`,
                  height: `${currentDimensions.height}px`
                }}
              >
                <div className="text-center text-gray-400">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-lg font-medium">No CV data available</p>
                      <p className="text-sm mt-2">Please add your CV information to see the preview</p>
                    </div>
                  </div>
            ) : (
              <div className="bg-white relative shadow-lg cv-preview-page flex-shrink-0 flex items-center justify-center"
                style={{
                  width: `${currentDimensions.width}px`,
                  height: `${currentDimensions.height}px`
                }}
              >
                <div className="text-center text-gray-400">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-lg font-medium">No template available</p>
                      <p className="text-sm mt-2">Please select a template to preview your CV</p>
                    </div>
                  </div>
            )}
          </>
        ) : (
          /* Standard template rendering with page-by-page sections */
          Object.keys(calculatePages.pages).map((pageKey, index) => {
            const pageNumber = parseInt(pageKey);
            const pageSections = calculatePages.pages[pageNumber];
            
            // Debug: Log page rendering with detailed section assignments
            console.log(`📄 CVPreview - Rendering Page ${pageNumber}:`, {
              pageNumber,
              assignedSections: pageSections,
              sectionCount: pageSections.length,
              allPages: Object.keys(calculatePages.pages).map(k => ({
                page: parseInt(k),
                sections: calculatePages.pages[parseInt(k)]
              }))
            });
            
            // Verify no duplicate sections across pages
            const allAssignedSections = Object.values(calculatePages.pages).flat();
            const duplicates = allAssignedSections.filter((section, idx) => 
              allAssignedSections.indexOf(section) !== idx
            );
            if (duplicates.length > 0 && index === 0) {
              console.warn('⚠️ CVPreview - Duplicate sections detected:', duplicates);
            }
            
            return (
              <div 
                key={pageNumber}
                className="bg-white relative shadow-lg cv-preview-page flex-shrink-0"
                style={{
                  width: `${currentDimensions.width}px`,
                  height: `${currentDimensions.height}px`,
                  maxHeight: `${currentDimensions.height}px`,
                  minHeight: `${currentDimensions.height}px`,
                  overflow: 'hidden',
                  padding: `${uniformPadding}px`,
                  pageBreakAfter: pageNumber < calculatePages.totalPages ? 'always' : 'auto',
                  breakAfter: pageNumber < calculatePages.totalPages ? 'page' : 'auto',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  display: 'block',
                  marginBottom: pageNumber < calculatePages.totalPages ? '16px' : '0'
                }}
              >
                {/* Page number indicator */}
                {totalPages > 1 && (
                  <div 
                    className="absolute top-2 right-2 text-xs text-gray-500 bg-white px-2 py-1 rounded"
                    style={{ fontSize: '10px' }}
                  >
                    Page {pageNumber} of {totalPages}
                  </div>
                )}

                {/* Use TemplateRenderer with current page sections */}
                {/* IMPORTANT: Only render if cvData exists - never use sample/hardcoded data */}
                {effectiveTemplate && cvData ? (
                  (() => {
                    console.log('🎨 CVPreview - Rendering TemplateRenderer:', {
                      hasTemplate: !!effectiveTemplate,
                      templateName: effectiveTemplate?.name,
                      customRenderer: effectiveTemplate?.customRenderer,
                      hasCvData: !!cvData,
                      enabledSections: pageSections,
                      sectionOrder: effectiveSectionOrder
                    });
                    return (
                      <div 
                        className="template-rendered-content"
                        style={{
                          height: `${currentDimensions.height - (uniformPadding * 2)}px`,
                          maxHeight: `${currentDimensions.height - (uniformPadding * 2)}px`,
                          overflow: 'hidden',
                          position: 'relative'
                        }}
                      >
                        <TemplateRenderer
                          cvData={cvData}
                          template={effectiveTemplate as any}
                          sectionOrder={effectiveSectionOrder}
                          sectionVisibility={sectionVisibility}
                          enabledSections={pageSections}
                          className="template-rendered-content"
                          customStyles={{
                            height: '100%',
                            maxHeight: `${currentDimensions.height - (uniformPadding * 2)}px`,
                            overflow: 'hidden',
                            pageBreakInside: 'avoid',
                            breakInside: 'avoid'
                          }}
                        />
                      </div>
                    );
                  })()
                ) : !cvData ? (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <div className="text-center">
                      <FileText size={48} className="mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">No CV data available</p>
                      <p className="text-sm mt-2">Please add your CV information to see the preview</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <div className="text-center">
                      <FileText size={48} className="mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">No template available</p>
                      <p className="text-sm mt-2">Please select a template to preview your CV</p>
                    </div>
                  </div>
                )}

              {/* Custom CSS */}
              {effectiveCustomCSS && (
                <style dangerouslySetInnerHTML={{ __html: effectiveCustomCSS }} />
              )}
              
              {/* Page break CSS - optimized for both screen and print */}
              <style dangerouslySetInnerHTML={{ __html: `
                .template-rendered-content {
                  height: 100%;
                  overflow: hidden;
                  page-break-inside: avoid;
                  break-inside: avoid;
                }
                
                .template-rendered-content .section-content {
                  page-break-inside: avoid;
                  break-inside: avoid;
                }
                
                .template-rendered-content .experience-item,
                .template-rendered-content .education-item,
                .template-rendered-content .project-item {
                  page-break-inside: avoid;
                  break-inside: avoid;
                }
                
                .template-rendered-content .section-header {
                  page-break-after: avoid;
                  break-after: avoid;
                }
                
                /* Print-specific optimizations for better PDF output */
                @media print {
                  .template-rendered-content {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                    color-adjust: exact;
                  }
                  
                  * {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                  }
                }
              ` }}></style>
            </div>
          );
        })
        )}
      </div>
      </div>
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
// Only re-render when props actually change (deep comparison for objects)
const CVPreview = memo(CVPreviewComponent, (prevProps, nextProps) => {
  // Custom comparison for performance
  // Re-render only if critical props change
  return (
    prevProps.cvData === nextProps.cvData &&
    prevProps.template === nextProps.template &&
    prevProps.jobData === nextProps.jobData &&
    prevProps.zoom === nextProps.zoom &&
    prevProps.paperSize === nextProps.paperSize &&
    prevProps.documentType === nextProps.documentType &&
    JSON.stringify(prevProps.sectionOrder) === JSON.stringify(nextProps.sectionOrder) &&
    JSON.stringify(prevProps.sectionVisibility) === JSON.stringify(nextProps.sectionVisibility) &&
    JSON.stringify(prevProps.pagePadding) === JSON.stringify(nextProps.pagePadding)
  );
});

CVPreview.displayName = 'CVPreview';

export default CVPreview;
