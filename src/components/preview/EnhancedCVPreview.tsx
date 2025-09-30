/**
 * Enhanced CV Preview Component
 * 
 * Uses the new PreviewEngine with advanced layout and pagination
 * Supports both single-column and multi-column templates
 */

import React, { useState, useEffect, useRef } from 'react';
import { ITemplate } from '@/models/Template';
import { UnifiedUnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { PreviewResult, renderCVPreview } from '@/lib/preview-engine';
import { Loader2, Eye, Download, ZoomIn, ZoomOut, RotateCcw, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface EnhancedCVPreviewProps {
  template: ITemplate;
  cvData: UnifiedCVDataStructure;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  showControls?: boolean;
  className?: string;
}

const EnhancedCVPreview: React.FC<EnhancedCVPreviewProps> = ({
  template,
  cvData,
  zoom = 1,
  onZoomChange,
  showControls = true,
  className = ''
}) => {
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const previewRef = useRef<HTMLDivElement>(null);

  // Render preview when template or CV data changes
  useEffect(() => {
    renderPreview();
  }, [template, cvData]);

  const renderPreview = async () => {
    if (!template || !cvData) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('🎨 Rendering preview with template:', template.name);
      const result = await renderCVPreview(template, cvData);
      setPreviewResult(result);
      console.log(`✅ Preview rendered: ${result.totalPages} pages`);
    } catch (err: any) {
      console.error('❌ Preview render failed:', err);
      setError(err.message || 'Failed to render preview');
    } finally {
      setIsLoading(false);
    }
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(zoom * 1.2, 3);
    onZoomChange?.(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom / 1.2, 0.3);
    onZoomChange?.(newZoom);
  };

  const handleResetZoom = () => {
    onZoomChange?.(1);
  };

  const handleDownload = async () => {
    // TODO: Implement PDF generation from preview result
    console.log('📄 Download initiated for:', previewResult?.totalPages, 'pages');
  };

  const handlePrint = () => {
    if (previewRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>CV Preview</title>
              <style>
                ${template.globalStyles.customCSS || ''}
                body { 
                  font-family: ${template.globalStyles.fontFamily}; 
                  font-size: ${template.globalStyles.fontSize};
                  line-height: ${template.globalStyles.lineHeight};
                  color: ${template.globalStyles.primaryColor};
                  background: ${template.globalStyles.backgroundColor};
                  margin: 0;
                  padding: 20px;
                }
                .page { page-break-after: always; }
                .page:last-child { page-break-after: auto; }
              </style>
            </head>
            <body>
              ${previewRef.current.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  if (isLoading) {
    return (
      <Card className={`flex items-center justify-center h-96 ${className}`}>
        <CardContent className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-lime-500" />
          <p className="text-gray-600 dark:text-gray-400">Rendering preview...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`flex items-center justify-center h-96 ${className}`}>
        <CardContent className="flex flex-col items-center space-y-4">
          <div className="text-red-500 text-center">
            <h3 className="font-semibold">Preview Error</h3>
            <p className="text-sm mt-2">{error}</p>
          </div>
          <Button onClick={renderPreview} variant="outline" size="sm">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!previewResult) {
    return (
      <Card className={`flex items-center justify-center h-96 ${className}`}>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-400">No preview available</p>
        </CardContent>
      </Card>
    );
  }

  const currentPageData = previewResult.pages[currentPage - 1];

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Control Bar */}
      {showControls && (
        <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          {/* Template Info */}
          <div className="flex items-center space-x-3">
            <Badge variant="outline" className="text-xs">
              {template.layoutType}
            </Badge>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {template.name}
            </span>
          </div>

          {/* Page Navigation */}
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            
            <span className="text-sm px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded">
              {currentPage} of {previewResult.totalPages}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(previewResult.totalPages, p + 1))}
              disabled={currentPage === previewResult.totalPages}
            >
              Next
            </Button>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            
            <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
              {Math.round(zoom * 100)}%
            </span>
            
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            
            <Button variant="outline" size="sm" onClick={handleResetZoom}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
            </Button>
            
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Preview Content */}
      <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-950 p-6">
        <div className="flex justify-center">
          <div
            ref={previewRef}
            className="cv-page-container"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
              transition: 'transform 0.2s ease-in-out'
            }}
          >
            {/* Render Current Page */}
            <div
              className="cv-page"
              style={{
                width: template.pageSettings?.format === 'Letter' ? '216mm' : '210mm',
                minHeight: template.pageSettings?.format === 'Letter' ? '279mm' : '297mm',
                background: template.globalStyles.backgroundColor,
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                padding: `${template.pageSettings?.margins?.top || '20mm'} ${template.pageSettings?.margins?.right || '20mm'} ${template.pageSettings?.margins?.bottom || '20mm'} ${template.pageSettings?.margins?.left || '20mm'}`,
                fontFamily: template.globalStyles.fontFamily,
                fontSize: template.globalStyles.fontSize,
                lineHeight: template.globalStyles.lineHeight,
                color: template.globalStyles.primaryColor
              }}
            >
              {/* Apply template layout */}
              {template.layoutType === 'one-column' ? (
                <div className="single-column-layout">
                  {currentPageData?.sections.map((section, index) => (
                    <div
                      key={`${section.key}-${index}`}
                      className={`section section-${section.key}`}
                      dangerouslySetInnerHTML={{ __html: section.content }}
                    />
                  ))}
                </div>
              ) : template.layoutType === 'two-column' ? (
                <div className="flex two-column-layout" style={{ gap: '20px' }}>
                  {/* Left Column */}
                  <div 
                    className="left-column"
                    style={{ 
                      width: template.columnLayout.leftColumn?.width || '30%',
                      background: template.globalStyles.customCSS?.includes('.left-column { background: #FFFFFF') ? '#FFFFFF' : 'transparent'
                    }}
                  >
                    {currentPageData?.sections
                      .filter(section => template.columnLayout.leftColumn?.sections.includes(section.key))
                      .map((section, index) => (
                        <div
                          key={`${section.key}-${index}`}
                          className={`section section-${section.key}`}
                          dangerouslySetInnerHTML={{ __html: section.content }}
                        />
                      ))}
                  </div>
                  
                  {/* Right Column */}
                  <div 
                    className="right-column"
                    style={{ width: template.columnLayout.rightColumn?.width || '70%' }}
                  >
                    {currentPageData?.sections
                      .filter(section => template.columnLayout.rightColumn?.sections.includes(section.key))
                      .map((section, index) => (
                        <div
                          key={`${section.key}-${index}`}
                          className={`section section-${section.key}`}
                          dangerouslySetInnerHTML={{ __html: section.content }}
                        />
                      ))}
                  </div>
                </div>
              ) : (
                // Fallback for other layout types
                <div className="custom-layout">
                  {currentPageData?.sections.map((section, index) => (
                    <div
                      key={`${section.key}-${index}`}
                      className={`section section-${section.key}`}
                      dangerouslySetInnerHTML={{ __html: section.content }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Page Info Footer */}
      {showControls && (
        <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center text-xs text-gray-500">
            <div>
              <span>Render time: {previewResult.metadata.renderTime}ms</span>
              <span className="mx-2">•</span>
              <span>{previewResult.metadata.sectionCount} sections</span>
              <span className="mx-2">•</span>
              <span>{previewResult.metadata.itemCount} items</span>
            </div>
            
            <div>
              {currentPageData?.overflow && (
                <Badge variant="destructive" className="text-xs">
                  Page overflow detected
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Apply template's custom CSS */}
      <style jsx>{`
        ${template.globalStyles.customCSS || ''}
        
        .section-header {
          font-size: 16pt;
          font-weight: 600;
          margin-bottom: 12px;
          color: ${template.globalStyles.primaryColor};
        }
        
        .section {
          margin-bottom: ${template.globalStyles.spacing};
        }
        
        .work-item, .education-item, .skill-item {
          margin-bottom: 12px;
        }
        
        .work-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 6px;
        }
        
        .highlights {
          margin: 8px 0;
          padding-left: 20px;
        }
        
        .highlights li {
          margin-bottom: 4px;
        }
        
        .personal-info .name {
          font-size: 24pt;
          font-weight: 700;
          margin-bottom: 6px;
        }
        
        .contact-details {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }
      `}</style>
    </div>
  );
};

export default EnhancedCVPreview;

