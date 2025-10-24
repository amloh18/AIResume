'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  ZoomIn, 
  ZoomOut,
  RotateCcw,
  Download,
  FileText,
  Loader2
} from 'lucide-react';
import { UnifiedUnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { Template } from '@/lib/stores/templateStore';
import { Job } from '@/lib/stores/jobStore';
import { downloadAsPDF, downloadAsDOCX, downloadAsImage } from '@/lib/utils/download';
import { TemplateRenderer } from '@/lib/templates/template-renderer';

interface CVPreviewProps {
  cvData: UnifiedUnifiedCVDataStructure | null;
  template: Template | null;
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

const CVPreview: React.FC<CVPreviewProps> = ({
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

  // Get current page dimensions
  const currentDimensions = PAGE_DIMENSIONS[paperSize];

  // Estimate section height based on content
  const getSectionHeight = useCallback((section: string): number => {
    if (!cvData) return 0;
    
    const baseHeights: { [key: string]: number } = {
      personal_header: 150,
      work_experience: Math.max(300, (cvData.workExperience?.length || 0) * 150),
      education: Math.max(200, (cvData.education?.length || 0) * 100),
      skills: Math.max(150, (cvData.skills?.length || 0) * 50),
      projects: Math.max(200, (cvData.projects?.length || 0) * 120),
      certificates: Math.max(150, (cvData.certificates?.length || 0) * 80),
      languages: Math.max(120, (cvData.languages?.length || 0) * 60),
      volunteer: Math.max(150, (cvData.volunteer?.length || 0) * 100),
      awards: Math.max(120, (cvData.awards?.length || 0) * 80),
      publications: Math.max(120, (cvData.publications?.length || 0) * 80)
    };
    
    return baseHeights[section] || 100;
  }, [cvData]);

  // Calculate pages based on content height
  const calculatePages = useMemo(() => {
    if (!cvData) return { pages: { 1: [] }, totalPages: 1 };

    // Make page splitting more aggressive by reducing available height
    const maxPageHeight = (currentDimensions.height - pagePadding.top - pagePadding.bottom) * 0.7;
    
    // Get all sections in order
    const sections = sectionOrder || ['personal_header', 'work_experience', 'education', 'skills', 'projects', 'certificates', 'languages'];
    
    const pages: { [key: number]: string[] } = {};
    let currentPage = 1;
    let currentPageHeight = 0;
    
    // Add header to first page
    if (sections.includes('personal_header')) {
      pages[currentPage] = ['personal_header'];
      currentPageHeight = getSectionHeight('personal_header');
    }

    // Distribute other sections
    sections.forEach(section => {
      if (section === 'personal_header') return; // Already handled
      
      const estimatedHeight = getSectionHeight(section);
      
      // Add some buffer to prevent sections from being cut off
      const bufferHeight = 50;
      
      if (currentPageHeight + estimatedHeight + bufferHeight > maxPageHeight) {
        currentPage++;
        currentPageHeight = 0;
      }
      
      if (!pages[currentPage]) {
        pages[currentPage] = [];
      }
      
      pages[currentPage].push(section);
      currentPageHeight += estimatedHeight;
    });

    // Clean up empty pages
    const cleanedPages: { [key: number]: string[] } = {};
    let actualPageCount = 0;
    
    for (let i = 1; i <= currentPage; i++) {
      if (pages[i] && pages[i].length > 0) {
        actualPageCount++;
        cleanedPages[actualPageCount] = pages[i];
      }
    }

    // Debug logging
    console.log('Page Calculation Debug:', {
      maxPageHeight,
      sections,
      originalPages: pages,
      cleanedPages,
      totalPages: actualPageCount,
      sectionHeights: sections.map(s => ({ section: s, height: getSectionHeight(s) }))
    });

    return { pages: cleanedPages, totalPages: actualPageCount };
  }, [cvData, sectionOrder, currentDimensions.height, pagePadding, getSectionHeight]);

  // Update total pages when content changes
  useEffect(() => {
    setTotalPages(calculatePages.totalPages);
  }, [calculatePages.totalPages]);

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
      await downloadAsDOCX(contentRef.current, `CV-${cvData?.basics?.name || 'Document'}.docx`);
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
      setZoom(Math.min(2, zoom + 0.25));
    }
  };

  const handleZoomOut = () => {
    if (setZoom) {
      setZoom(Math.max(0.25, zoom - 0.25));
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

  if (!cvData) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-800">
        <div className="text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No CV data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical scrollable container for all pages */}
      <div>
        {Object.keys(calculatePages.pages).map((pageKey, index) => {
          const pageNumber = parseInt(pageKey);
          const pageSections = calculatePages.pages[pageNumber];
          
          console.log(`Rendering page ${pageNumber} with sections:`, pageSections);
          
          return (
            <div 
              key={pageNumber}
              className="bg-white shadow-xl mx-auto relative"
              style={{
                width: currentDimensions.width,
                minHeight: currentDimensions.height,
                transform: `scale(${zoom})`,
                transformOrigin: 'top center',
                padding: `${pagePadding.top}px ${pagePadding.bottom}px`,
                marginTop: '0',
                marginBottom: '15px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)'
              }}
            >
              {/* Page number indicator */}
              {totalPages > 1 && (
                <div 
                  className="absolute top-2 right-2 text-xs text-gray-500 bg-white px-2 py-1 rounded shadow-sm"
                  style={{ fontSize: '10px' }}
                >
                  Page {pageNumber} of {totalPages}
                </div>
              )}

              {/* Use TemplateRenderer with current page sections */}
              <TemplateRenderer
                cvData={cvData}
                template={template}
                sectionOrder={sectionOrder}
                sectionVisibility={sectionVisibility}
                enabledSections={pageSections}
                className="template-rendered-content"
              />

              {/* Custom CSS */}
              {customCSS && (
                <style dangerouslySetInnerHTML={{ __html: customCSS }} />
              )}
            </div>
          );
        })}
      </div>
      
      {/* Debug info - remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 right-4 bg-black text-white p-2 text-xs z-50 max-w-xs">
          <div>Total Pages: {totalPages}</div>
          <div>All Pages: {JSON.stringify(calculatePages.pages)}</div>
        </div>
      )}
    </div>
  );
};

export default CVPreview;
