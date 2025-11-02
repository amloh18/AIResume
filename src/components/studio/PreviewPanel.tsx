'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  FileText,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sun,
  Moon,
  Download,
  FileJson,
  FileText as FileTextIcon,
  FileDown,
  Loader2,
  Image
} from 'lucide-react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { Template } from '@/lib/stores/templateStore';
import { Job } from '@/lib/stores/jobStore';
import CVPreview from './CVPreview';
import CoverLetterPreview from './CoverLetterPreview';
import { downloadAsJSON, downloadAsPDF, downloadAsDOCX, downloadAsImage } from '@/lib/utils/download';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { generatePageBreakCSS, A4_HEIGHT_PX } from '@/lib/utils/pageBreakHelper';

interface PreviewPanelProps {
  cvData: UnifiedCVDataStructure | null;
  template: Template | null;
  jobData: Job | null;
  zoom: number;
  setZoom: (zoom: number) => void;
  paperSize: 'A4' | 'Letter';
  setPaperSize: (size: 'A4' | 'Letter') => void;
  documentType: 'cv' | 'cover-letter';
  sectionOrder?: string[];
  sectionVisibility?: Record<string, boolean>;
  pagePadding: { top: number; bottom: number };
  setPagePadding: (padding: { top: number; bottom: number }) => void;
  onDocumentTypeChange?: (type: 'cv' | 'cover-letter') => void;
  isMasterCV?: boolean;
  coverLetterData?: any;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({
  cvData,
  template,
  jobData,
  zoom,
  setZoom,
  paperSize,
  setPaperSize,
  documentType,
  sectionOrder = ['personal_header', 'work_experience', 'education', 'skills', 'projects', 'certificates', 'languages'],
  sectionVisibility = {},
  pagePadding,
  setPagePadding,
  onDocumentTypeChange,
  isMasterCV = false,
  coverLetterData
}) => {
  // Removed console log to prevent toast notifications
  
  const { theme } = useTheme();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isDownloading, setIsDownloading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Paper dimensions in pixels (assuming 96 DPI)
  const paperDimensions = {
    A4: { width: 794, height: 1123 }, // 8.27" x 11.69"
    Letter: { width: 816, height: 1056 } // 8.5" x 11"
  };

  const currentDimensions = paperDimensions[paperSize];

  // Calculate total pages based on content height and optimize layout
  useEffect(() => {
    if (contentRef.current) {
      const contentHeight = contentRef.current.scrollHeight;
      const pageHeight = currentDimensions.height - (pagePadding.top + pagePadding.bottom);
      const pages = Math.ceil(contentHeight / pageHeight);
      setTotalPages(Math.max(1, pages));
      
      // Reset to page 1 if current page exceeds total pages
      if (currentPage > pages) {
        setCurrentPage(1);
      }
    }
  }, [cvData, currentDimensions.height, currentPage, pagePadding]);

  const handleZoomIn = () => {
    setZoom(Math.min(zoom + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(zoom - 0.1, 0.5));
  };

  const handleResetZoom = () => {
    setZoom(1);
  };

  const handlePreviousPage = () => {
    setCurrentPage(Math.max(1, currentPage - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(Math.min(totalPages, currentPage + 1));
  };

  // Download handlers
  const handleDownloadJSON = () => {
    if (!cvData) return;
    try {
      const filename = `${cvData.basics.name?.toLowerCase().replace(/\s+/g, '-') || 'cv'}-data.json`;
      downloadAsJSON(cvData, filename);
    } catch (error) {
      console.error('Error downloading JSON:', error);
      alert('Failed to download JSON. Please try again.');
    }
  };

  const handleDownloadPDF = async () => {
    if (!previewRef.current || !cvData) return;
    setIsDownloading(true);
    try {
      const filename = `${cvData.basics.name?.toLowerCase().replace(/\s+/g, '-') || 'cv'}.pdf`;
      await downloadAsPDF(previewRef.current, filename);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadDOCX = async () => {
    if (!cvData) return;
    setIsDownloading(true);
    try {
      const filename = `${cvData.basics.name?.toLowerCase().replace(/\s+/g, '-') || 'cv'}.docx`;
      await downloadAsDOCX(cvData, filename);
    } catch (error) {
      console.error('Error downloading DOCX:', error);
      alert('Failed to download DOCX. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!previewRef.current || !cvData) return;
    setIsDownloading(true);
    try {
      const filename = `${cvData.basics.name?.toLowerCase().replace(/\s+/g, '-') || 'cv'}.png`;
      await downloadAsImage(previewRef.current, filename);
    } catch (error) {
      console.error('Error downloading image:', error);
      alert('Failed to download image. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const renderCVPreview = () => {
    return (
      <div className="cv-preview-container" style={{ minHeight: A4_HEIGHT_PX }}>
        <CVPreview
          cvData={cvData}
          template={template}
          jobData={jobData}
          zoom={zoom}
          setZoom={setZoom}
          paperSize={paperSize}
          setPaperSize={setPaperSize}
          documentType={documentType}
          sectionOrder={sectionOrder}
          sectionVisibility={sectionVisibility}
          pagePadding={pagePadding}
          setPagePadding={setPagePadding}
          onDocumentTypeChange={onDocumentTypeChange}
          isMasterCV={isMasterCV}
          coverLetterData={coverLetterData}
          theme="light"
          showBadge={false}
          templateStyles={template?.globalStyles}
          customCSS={template?.customCSS || template?.globalStyles?.customCSS}
          templateName={template?.name}
        />
      </div>
    );
  };

  const renderCoverLetterPreview = () => {
    return (
      <div 
        ref={contentRef}
        className="relative bg-white/95 dark:bg-[#1a230f] mx-auto"
        style={{
          width: currentDimensions.width,
          transform: `scale(${zoom})`,
          transformOrigin: 'top center',
          marginTop: '0',
          marginBottom: '0'
        }}
      >
        <CoverLetterPreview
          content={coverLetterData?.content || ''}
          cvData={cvData}
          jobData={jobData}
          selectedCVData={null}
        />
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-[#1A201A] relative">
      {/* Inject Page Break CSS for smart A4 splitting */}
      <style dangerouslySetInnerHTML={{ __html: generatePageBreakCSS() }} />
      
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/50 dark:border-white/10">
        {/* Left Side - Document Type Switcher */}
        {onDocumentTypeChange && (
          <div className="flex items-center space-x-1 bg-gradient-to-r from-lime-50 to-lime-100 dark:from-lime-900/20 dark:to-lime-800/20 border border-lime-200 dark:border-lime-700/50 rounded-lg p-1 shadow-sm">
            <button
              onClick={() => onDocumentTypeChange('cv')}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
                documentType === 'cv'
                  ? 'bg-lime-600 text-white shadow-md'
                  : 'text-lime-700 dark:text-lime-300 hover:text-lime-800 dark:hover:text-lime-200 hover:bg-lime-100 dark:hover:bg-lime-800/30'
              }`}
            >
              CV
            </button>
            <button
              onClick={() => {
                console.log('🖱️ Cover Letter button clicked!', { 
                  isMasterCV, 
                  onDocumentTypeChange: !!onDocumentTypeChange,
                  documentType 
                });
                if (isMasterCV) {
                  console.log('⚠️ Cannot create cover letter for Master CV');
                  return;
                }
                if (onDocumentTypeChange) {
                  console.log('✅ Calling onDocumentTypeChange with cover-letter');
                  onDocumentTypeChange('cover-letter');
                } else {
                  console.error('❌ onDocumentTypeChange handler is not defined!');
                }
              }}
              disabled={isMasterCV}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
                documentType === 'cover-letter'
                  ? 'bg-lime-600 text-white shadow-md'
                  : isMasterCV
                  ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : 'text-lime-700 dark:text-lime-300 hover:text-lime-800 dark:hover:text-lime-200 hover:bg-lime-100 dark:hover:bg-lime-800/30'
              }`}
              title={isMasterCV ? 'Cover letters cannot be created for Master CV' : 'Switch to Cover Letter'}
            >
              Cover Letter
            </button>
          </div>
        )}

        {/* Right Side - Controls */}
        <div className="flex items-center space-x-3">
          {/* Paper Size Toggle - Only for CV */}
          {documentType === 'cv' && (
            <div className="flex items-center space-x-1 bg-white dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setPaperSize('A4')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                  paperSize === 'A4'
                    ? 'bg-lime-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                A4
              </button>
              <button
                onClick={() => setPaperSize('Letter')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                  paperSize === 'Letter'
                    ? 'bg-lime-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                US Letter
              </button>
            </div>
          )}

          {/* Zoom Controls - Show for both CV and Cover Letter */}
          <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 rounded-lg px-3 py-1.5">
            <button
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
            </button>
            
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 min-w-[45px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            
            <button
              onClick={handleZoomIn}
              disabled={zoom >= 2}
              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
            </button>
            
            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>
            
            <button
              onClick={handleResetZoom}
              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
              title="Reset to 100%"
            >
              <RotateCcw className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>
      </div>

      {/* Preview Area */}
      <div 
        ref={containerRef}
        className="flex-1 flex items-start justify-center overflow-auto scrollbar-hide p-4"
        style={{ 
          minHeight: 0,
          paddingTop: '0.5rem',
          paddingBottom: '1rem'
        }}
      >
        <div ref={previewRef} className="flex items-start justify-center w-full">
          {documentType === 'cv' ? renderCVPreview() : renderCoverLetterPreview()}
        </div>
      </div>
    </div>
  );
};

export default PreviewPanel;
