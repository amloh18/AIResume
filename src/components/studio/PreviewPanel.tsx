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
import { UnifiedUnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { Template } from '@/lib/stores/templateStore';
import { Job } from '@/lib/stores/jobStore';
import CVPreview from './CVPreview';
import CoverLetterPreview from './CoverLetterPreview';
import { downloadAsJSON, downloadAsPDF, downloadAsDOCX, downloadAsImage } from '@/lib/utils/download';
import { useTheme } from '@/lib/contexts/ThemeContext';

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
  const [fitMode, setFitMode] = useState<'fit-height' | 'custom'>('fit-height');
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

  // Auto-fit to container height
  useEffect(() => {
    if (!containerRef.current || fitMode !== 'fit-height') return;

    const container = containerRef.current;
    const containerHeight = container.clientHeight - 32; // Reduced padding since no floating bar
    const scale = containerHeight / currentDimensions.height;
    
    // Cap zoom between 0.25x and 2x for better fit
    const clampedScale = Math.max(0.25, Math.min(scale, 2));
    setZoom(clampedScale);
  }, [fitMode, paperSize, currentDimensions.height, setZoom]);

  const handleZoomIn = () => {
    setFitMode('custom');
    setZoom(Math.min(zoom + 0.25, 2));
  };

  const handleZoomOut = () => {
    setFitMode('custom');
    setZoom(Math.max(zoom - 0.25, 0.25));
  };

  const handleResetZoom = () => {
    setFitMode('fit-height');
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
    );
  };

  const renderCoverLetterPreview = () => {
    return (
      <div 
        ref={contentRef}
        className="relative bg-white shadow-lg mx-auto"
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
    <div className="h-full flex flex-col bg-white/95 dark:bg-[#141810] border border-white/20 dark:border-white/10 rounded-2xl shadow-lg relative">
      {/* Document Type Switcher - Centered above the first page */}
      {onDocumentTypeChange && (
        <div className="flex justify-center items-center pt-6 pb-2 space-x-4">
          {/* Document Type Switch */}
          <div className="flex items-center space-x-1 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-lg p-1 shadow-lg">
            <button
              onClick={() => onDocumentTypeChange('cv')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                documentType === 'cv'
                  ? 'bg-lime-600 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
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
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                documentType === 'cover-letter'
                  ? 'bg-lime-600 text-white'
                  : isMasterCV
                  ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
              title={isMasterCV ? 'Cover letters cannot be created for Master CV' : 'Switch to Cover Letter'}
            >
              Cover Letter
            </button>
          </div>

          {/* Controls - Only show for CV */}
          {documentType === 'cv' && (
            <div className="flex items-center space-x-2">
              {/* Paper Size Toggle */}
              <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setPaperSize('A4')}
                  className={`px-2 py-1 text-xs rounded ${
                    paperSize === 'A4' 
                      ? 'bg-blue-500 text-white' 
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  A4
                </button>
                <button
                  onClick={() => setPaperSize('Letter')}
                  className={`px-2 py-1 text-xs rounded ${
                    paperSize === 'Letter' 
                      ? 'bg-blue-500 text-white' 
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  Letter
                </button>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
                  disabled={zoom <= 0.25}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  <ZoomOut className="w-3 h-3" />
                </button>
                
                <span className="text-xs font-mono text-gray-600 dark:text-gray-400 min-w-[40px] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                
                <button
                  onClick={() => setZoom(Math.min(2, zoom + 0.25))}
                  disabled={zoom >= 2}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  <ZoomIn className="w-3 h-3" />
                </button>
                
                <button
                  onClick={() => setZoom(1)}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>

              {/* Download Options */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={handleDownloadPDF}
                  disabled={isDownloading}
                  className="flex items-center space-x-1 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {isDownloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                  <span>PDF</span>
                </button>
                
                <button
                  onClick={handleDownloadDOCX}
                  disabled={isDownloading}
                  className="flex items-center space-x-1 px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:opacity-50"
                >
                  {isDownloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                  <span>DOCX</span>
                </button>
                
                <button
                  onClick={handleDownloadImage}
                  disabled={isDownloading}
                  className="flex items-center space-x-1 px-2 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600 disabled:opacity-50"
                >
                  {isDownloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                  <span>PNG</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview Area */}
      <div 
        ref={containerRef}
        className="flex-1 flex items-start justify-center overflow-auto p-4"
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

      {/* Background Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div 
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
          }}
        />
      </div>
    </div>
  );
};

export default PreviewPanel;
