'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Move, 
  Edit3, 
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { TemplateDefinition, ThemeConfig, generateThemeCSS } from '@/lib/templates/template-definition';
import { TemplateRenderer } from '@/lib/templates/template-renderer';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { ITemplate } from '@/types/template';
import { A4_HEIGHT_PX, A4_WIDTH_PX, calculatePageBreaks } from '@/lib/utils/pageBreakHelper';

export type PreviewMode = 'preview' | 'edit-in-place';

interface LivePreviewProps {
  cvData: UnifiedCVDataStructure | null;
  template: ITemplate | null;
  templateDefinition?: TemplateDefinition;
  theme?: ThemeConfig;
  mode?: PreviewMode;
  onDataChange?: (data: UnifiedCVDataStructure) => void;
  className?: string;
}

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const DEFAULT_ZOOM = 0.75;

export const LivePreview: React.FC<LivePreviewProps> = ({
  cvData,
  template,
  templateDefinition,
  theme,
  mode = 'preview',
  onDataChange,
  className = '',
}) => {
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollOffset, setScrollOffset] = useState({ x: 0, y: 0 });
  const previewRef = useRef<HTMLDivElement>(null);

  const pageBreakConfig = useMemo(() => ({
    minBottomSpace: 80,
    avoidBreakInside: [
      '.cv-section-item',
      '.cv-entry-item',
      '.work-experience-item',
      '.experience-item',
      '.education-item',
      '.project-item',
      '.cv-section-header',
      '.section-header',
    ],
    breakBefore: ['.cv-section', '.section-content'],
  }), []);

  const pages = useMemo(() => {
    if (!cvData) return [];

    const content = previewRef.current;
    if (!content) return [{ index: 0, height: A4_HEIGHT_PX }];

    const sections = content.querySelectorAll('.cv-section, .section-content');
    const sectionHeights: { id: string; height: number; canBreak: boolean }[] = [];

    sections.forEach((section, index) => {
      const rect = section.getBoundingClientRect();
      sectionHeights.push({
        id: `section-${index}`,
        height: rect.height || 100,
        canBreak: false,
      });
    });

    if (sectionHeights.length === 0) {
      return [{ index: 0, height: A4_HEIGHT_PX }];
    }

    const breakPoints = calculatePageBreaks(sectionHeights, pageBreakConfig);
    const pageData: { index: number; height: number }[] = [];
    let pageIndex = 0;
    let currentHeight = 0;

    breakPoints.push(sectionHeights.length);

    let lastBreak = 0;
    breakPoints.forEach((breakPoint) => {
      const pageSections = sectionHeights.slice(lastBreak, breakPoint);
      const pageHeight = pageSections.reduce((sum, s) => sum + s.height, 0);

      pageData.push({
        index: pageIndex,
        height: Math.max(pageHeight, 200),
      });

      pageIndex++;
      lastBreak = breakPoint;
    });

    return pageData.length > 0 ? pageData : [{ index: 0, height: A4_HEIGHT_PX }];
  }, [cvData, pageBreakConfig]);

  useEffect(() => {
    setTotalPages(pages.length);
    setCurrentPage(prev => Math.min(prev, pages.length - 1));
  }, [pages.length]);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => {
      const currentIndex = ZOOM_LEVELS.indexOf(prev);
      if (currentIndex < ZOOM_LEVELS.length - 1) {
        return ZOOM_LEVELS[currentIndex + 1];
      }
      return prev;
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => {
      const currentIndex = ZOOM_LEVELS.indexOf(prev);
      if (currentIndex > 0) {
        return ZOOM_LEVELS[currentIndex - 1];
      }
      return prev;
    });
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(DEFAULT_ZOOM);
    setScrollOffset({ x: 0, y: 0 });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (mode !== 'edit-in-place') return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - scrollOffset.x, y: e.clientY - scrollOffset.y });
  }, [mode, scrollOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setScrollOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handlePrevPage = useCallback(() => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  }, [totalPages]);

  const themeCSS = useMemo(() => {
    return theme ? generateThemeCSS(theme) : '';
  }, [theme]);

  const scaledWidth = A4_WIDTH_PX * zoom;
  const scaledHeight = A4_HEIGHT_PX * zoom;

  if (!template || !cvData) {
    return (
      <div className={`flex items-center justify-center h-96 bg-gray-100 dark:bg-gray-800 rounded-lg ${className}`}>
        <div className="text-center text-gray-500 dark:text-gray-400">
          <Eye className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No preview available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`live-preview-container flex flex-col h-full ${className}`}>
      {/* Toolbar */}
      <div className="toolbar flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            disabled={zoom <= ZOOM_LEVELS[0]}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
            title="Zoom Out"
          >
            <ZoomOut size={18} />
          </button>
          <span className="text-sm min-w-[50px] text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={handleZoomIn}
            disabled={zoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
            title="Zoom In"
          >
            <ZoomIn size={18} />
          </button>
          <button
            onClick={handleZoomReset}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Reset Zoom"
          >
            <Maximize2 size={18} />
          </button>
        </div>

        {/* Page Navigation */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 0}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm">
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages - 1}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* Mode Toggle */}
        <div className="flex items-center gap-2">
          <button
            className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm ${
              mode === 'preview' 
                ? 'bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-300'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            <Eye size={14} />
            Preview
          </button>
          <button
            className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm ${
              mode === 'edit-in-place' 
                ? 'bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-300'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            <Edit3 size={14} />
            Edit
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div 
        className="preview-viewport flex-1 overflow-auto bg-[#f3f2ee] dark:bg-[#1a230f] p-8"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isDragging ? 'grabbing' : mode === 'edit-in-place' ? 'grab' : 'default' }}
      >
        <style>{themeCSS}</style>

        <div 
          ref={previewRef}
          className="preview-page relative bg-white shadow-lg"
          style={{
            width: scaledWidth,
            height: scaledHeight,
            transform: `translate(${scrollOffset.x}px, ${scrollOffset.y}px)`,
            transformOrigin: 'top center',
          }}
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
              <Loader2 className="w-8 h-8 animate-spin text-lime-500" />
            </div>
          )}

          {/* Content - Using TemplateRenderer */}
          <div className="cv-preview-content">
            <TemplateRenderer
              cvData={cvData}
              template={template}
              className="preview-renderer"
            />
          </div>

          {/* Page Number */}
          {totalPages > 1 && (
            <div className="absolute bottom-4 right-4 text-xs text-gray-400">
              {currentPage + 1} / {totalPages}
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="status-bar flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-500 dark:text-gray-400">
        <div>
          {template.name}
        </div>
        <div>
          {templateDefinition?.layout.type || template.layoutType || 'single-column'}
        </div>
      </div>
    </div>
  );
};

export default LivePreview;