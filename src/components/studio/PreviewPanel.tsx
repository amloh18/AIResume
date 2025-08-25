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
  Moon
} from 'lucide-react';
import { CVDataStructure } from '@/types/cv';
import { Template } from '@/lib/stores/templateStore';
import { Job } from '@/lib/stores/jobStore';
import CVPreviewContent from './CVPreviewContent';

interface PreviewPanelProps {
  cvData: CVDataStructure | null;
  template: Template | null;
  jobData: Job | null;
  zoom: number;
  setZoom: (zoom: number) => void;
  paperSize: 'A4' | 'Letter';
  setPaperSize: (size: 'A4' | 'Letter') => void;
  documentType: 'cv' | 'cover-letter';
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({
  cvData,
  template,
  jobData,
  zoom,
  setZoom,
  paperSize,
  setPaperSize,
  documentType
}) => {
  console.log('PreviewPanel received cvData:', cvData);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [fitMode, setFitMode] = useState<'fit-height' | 'custom'>('fit-height');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [totalPages, setTotalPages] = useState(1);
  const previewRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Paper dimensions in pixels (assuming 96 DPI)
  const paperDimensions = {
    A4: { width: 794, height: 1123 }, // 8.27" x 11.69"
    Letter: { width: 816, height: 1056 } // 8.5" x 11"
  };

  const currentDimensions = paperDimensions[paperSize];

  // Calculate total pages based on content height
  useEffect(() => {
    if (contentRef.current) {
      const contentHeight = contentRef.current.scrollHeight;
      const pageHeight = currentDimensions.height - 64; // Account for padding
      const pages = Math.ceil(contentHeight / pageHeight);
      setTotalPages(Math.max(1, pages));
      
      // Reset to page 1 if current page exceeds total pages
      if (currentPage > pages) {
        setCurrentPage(1);
      }
    }
  }, [cvData, currentDimensions.height, currentPage]);

  // Auto-fit to container height
  useEffect(() => {
    if (!containerRef.current || fitMode !== 'fit-height') return;

    const container = containerRef.current;
    const containerHeight = container.clientHeight - 32; // Account for padding
    const scale = containerHeight / currentDimensions.height;
    
    // Cap zoom between 0.5x and 2x
    const clampedScale = Math.max(0.5, Math.min(scale, 2));
    setZoom(clampedScale);
  }, [fitMode, paperSize, currentDimensions.height, setZoom]);

  const handleZoomIn = () => {
    setFitMode('custom');
    setZoom(Math.min(zoom + 0.1, 2));
  };

  const handleZoomOut = () => {
    setFitMode('custom');
    setZoom(Math.max(zoom - 0.1, 0.5));
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

  const renderCVPreview = () => {
    // Always show our enhanced preview regardless of template
    return (
      <div 
        className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'} min-h-full p-8`}
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'top center'
        }}
      >
        <CVPreviewContent 
          cvData={cvData} 
          theme={theme}
          showBadge={false}
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
        <div className="p-8 h-full">
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-4">
              {cvData?.basics.name}<br />
              {cvData?.basics.email}<br />
              {cvData?.basics.phone}<br />
              {cvData?.basics.location.city}
            </p>
            
            <p className="text-sm text-gray-600 mb-4">
              {jobData ? (
                <>
                  Hiring Manager<br />
                  {jobData.company}<br />
                  {jobData.location}
                </>
              ) : (
                <>
                  Hiring Manager<br />
                  [Company Name]<br />
                  [Company Address]
                </>
              )}
            </p>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-4">Dear Hiring Manager,</p>
            
            <p className="text-sm text-gray-700 mb-4">
              [Your cover letter content will appear here. Use the AI Assistant to generate tailored content.]
            </p>
            
            <p className="text-sm text-gray-700 mb-4">
              I am writing to express my interest in the [Position] role at [Company]. With my background in [relevant experience], I am confident in my ability to contribute effectively to your team.
            </p>
            
            <p className="text-sm text-gray-700 mb-4">
              [Additional paragraphs with specific examples and achievements...]
            </p>
            
            <p className="text-sm text-gray-700 mb-4">
              Thank you for considering my application. I look forward to discussing how my skills and experience can benefit [Company].
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-2">Sincerely,</p>
            <p className="text-sm text-gray-600">{cvData?.basics.name}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 relative">
      {/* Preview Area */}
      <div 
        ref={containerRef}
        className="flex-1 flex items-center justify-center overflow-auto p-8"
      >
        <div ref={previewRef}>
          {documentType === 'cv' ? renderCVPreview() : renderCoverLetterPreview()}
        </div>
      </div>

      {/* Floating Document Controls */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-3 flex items-center space-x-4">
        {/* Zoom Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleZoomOut}
            className="p-2 text-gray-400 hover:text-white transition-colors rounded hover:bg-gray-700 focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          
          <div className="w-20">
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={zoom}
              onChange={(e) => {
                setFitMode('custom');
                setZoom(parseFloat(e.target.value));
              }}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
          
          <button
            onClick={handleZoomIn}
            className="p-2 text-gray-400 hover:text-white transition-colors rounded hover:bg-gray-700 focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>

        {/* Page Navigator */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className="p-2 text-gray-400 hover:text-white transition-colors rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            title="Previous Page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <span className="text-sm text-gray-300 min-w-[3rem] text-center">
            {currentPage} / {totalPages}
          </span>
          
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="p-2 text-gray-400 hover:text-white transition-colors rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            title="Next Page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Paper Size Toggle */}
        <div className="flex items-center space-x-1 bg-gray-700 rounded p-1">
          <button
            onClick={() => setPaperSize('A4')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              paperSize === 'A4'
                ? 'bg-lime-600 text-white'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            A4
          </button>
          <button
            onClick={() => setPaperSize('Letter')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              paperSize === 'Letter'
                ? 'bg-lime-600 text-white'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            Letter
          </button>
        </div>

        {/* Theme Toggle */}
        <div className="flex items-center space-x-1 bg-gray-700 rounded p-1">
          <button
            onClick={() => setTheme('dark')}
            className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
              theme === 'dark'
                ? 'bg-gray-800 text-lime-400'
                : 'text-gray-400 hover:text-white'
            }`}
            title="Dark Theme"
          >
            <Moon className="h-3 w-3" />
            Dark
          </button>
          <button
            onClick={() => setTheme('light')}
            className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
              theme === 'light'
                ? 'bg-gray-800 text-lime-400'
                : 'text-gray-400 hover:text-white'
            }`}
            title="Light Theme"
          >
            <Sun className="h-3 w-3" />
            Light
          </button>
        </div>

        {/* Fit Controls */}
        <div className="flex items-center space-x-1">
          <button
            onClick={handleResetZoom}
            className={`p-2 rounded transition-colors ${
              fitMode === 'fit-height'
                ? 'bg-lime-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            } focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 focus:ring-offset-gray-800`}
            title="Fit to Height"
          >
            <Maximize className="h-4 w-4" />
          </button>
          
          <button
            onClick={handleResetZoom}
            className="p-2 text-gray-400 hover:text-white transition-colors rounded hover:bg-gray-700 focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            title="Reset Zoom"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
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
