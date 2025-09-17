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
import { CVDataStructure } from '@/types/cv';
import { Template } from '@/lib/stores/templateStore';
import { Job } from '@/lib/stores/jobStore';
import CVPreviewContent from './CVPreviewContent';
import CoverLetterPreview from './CoverLetterPreview';
import { downloadAsJSON, downloadAsPDF, downloadAsDOCX, downloadAsImage } from '@/lib/utils/download';
import { useTheme } from '@/lib/contexts/ThemeContext';

interface PreviewPanelProps {
  cvData: CVDataStructure | null;
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
  sectionOrder = ['basics', 'work', 'education', 'skills', 'projects', 'certificates', 'languages'],
  sectionVisibility = {},
  pagePadding,
  setPagePadding,
  onDocumentTypeChange,
  isMasterCV = false
}) => {
  console.log('PreviewPanel received cvData:', cvData);
  
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
    // Apply template styles if available
    const templateStyles = template?.globalStyles;
    const customCSS = template?.customCSS || template?.globalStyles?.customCSS;
    const templateName = template?.name;
    
    console.log('PreviewPanel - Template:', template);
    console.log('PreviewPanel - Template Styles:', templateStyles);
    
    return (
      <div 
        ref={contentRef}
        className="relative bg-white shadow-lg mx-auto"
        style={{
          width: currentDimensions.width,
          minHeight: currentDimensions.height,
          transform: `scale(${zoom})`,
          transformOrigin: 'top center',
          marginTop: '0',
          marginBottom: '0'
        }}
      >
        <CVPreviewContent 
          cvData={cvData} 
          theme="light" // Always use light theme for preview
          showBadge={false}
          sectionOrder={sectionOrder}
          sectionVisibility={sectionVisibility}
          templateStyles={templateStyles}
          customCSS={customCSS}
          templateName={templateName}
          pagePadding={pagePadding}
        />
      </div>
    );
  };

  const renderCoverLetterPreview = () => {
    return (
      <div 
        className="bg-white shadow-lg mx-auto"
        style={{
          width: currentDimensions.width * zoom,
          height: currentDimensions.height * zoom,
          transform: `scale(${zoom})`,
          transformOrigin: 'top center'
        }}
      >
        <CoverLetterPreview
          content={cvData?.basics?.summary || ''}
          cvData={cvData}
          jobData={jobData}
          selectedCVData={null}
        />
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 rounded-2xl shadow-lg relative">
      {/* Document Type Switcher - Centered above the first page */}
      {onDocumentTypeChange && (
        <div className="flex justify-center pt-6 pb-2">
          <div className="flex items-center space-x-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-1 shadow-lg">
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
              onClick={() => !isMasterCV && onDocumentTypeChange('cover-letter')}
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
