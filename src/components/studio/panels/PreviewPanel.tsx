'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Eye, 
  Download, 
  Share2, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Monitor,
  Smartphone,
  FileText,
  Printer
} from 'lucide-react';

import { DocumentType } from '@/types/studio';
import { UnifiedUnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';

interface PreviewPanelProps {
  documentType: DocumentType;
  documentData: UnifiedCVDataStructure | string;
  templateId: string;
  designOverrides: Record<string, any>;
  previewSettings: {
    zoom: number;
    paperSize: 'A4' | 'Letter';
  };
}

/**
 * Preview Panel Component
 * 
 * This panel renders the live document by combining:
 * 1. Raw Content (cvData or coverLetterData)
 * 2. Template Styling (from templateId)
 * 3. Live Design Changes (designOverrides)
 * 
 * Features:
 * - Real-time preview updates
 * - Multiple zoom levels
 * - Different paper sizes
 * - Device preview modes
 * - Export options
 */
export function PreviewPanel({
  documentType,
  documentData,
  templateId,
  designOverrides,
  previewSettings
}: PreviewPanelProps) {
  const [templateData, setTemplateData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile' | 'print'>('desktop');
  const [zoom, setZoom] = useState(previewSettings.zoom);

  // Load template data
  useEffect(() => {
    if (templateId) {
      loadTemplateData(templateId);
    }
  }, [templateId]);

  const loadTemplateData = async (id: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/templates/${id}`);
      if (response.ok) {
        const template = await response.json();
        setTemplateData(template);
      }
    } catch (error) {
      console.error('Failed to load template:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900">
      {/* Preview Header */}
      <PreviewHeader
        documentType={documentType}
        previewMode={previewMode}
        zoom={zoom}
        paperSize={previewSettings.paperSize}
        onPreviewModeChange={setPreviewMode}
        onZoomChange={setZoom}
        onExport={() => handleExport(documentType, documentData)}
        onShare={() => handleShare(documentType)}
      />

      {/* Preview Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="flex justify-center">
          <PreviewRenderer
            documentType={documentType}
            documentData={documentData}
            templateData={templateData}
            designOverrides={designOverrides}
            previewMode={previewMode}
            zoom={zoom}
            paperSize={previewSettings.paperSize}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Preview Footer */}
      <PreviewFooter
        documentType={documentType}
        documentData={documentData}
        zoom={zoom}
      />
    </div>
  );
}

/**
 * Preview Header
 * Controls for preview modes, zoom, and actions
 */
function PreviewHeader({
  documentType,
  previewMode,
  zoom,
  paperSize,
  onPreviewModeChange,
  onZoomChange,
  onExport,
  onShare
}: {
  documentType: DocumentType;
  previewMode: 'desktop' | 'mobile' | 'print';
  zoom: number;
  paperSize: 'A4' | 'Letter';
  onPreviewModeChange: (mode: 'desktop' | 'mobile' | 'print') => void;
  onZoomChange: (zoom: number) => void;
  onExport: () => void;
  onShare: () => void;
}) {
  return (
    <div className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4">
      <div className="flex items-center space-x-3">
        <Eye className="w-4 h-4 text-gray-500" />
        <span className="font-medium text-gray-700 dark:text-gray-300">Preview</span>
        
        <Badge variant="outline" size="sm">
          {documentType === 'cv' ? 'CV' : 'Cover Letter'}
        </Badge>
      </div>

      <div className="flex items-center space-x-2">
        {/* Preview Mode Toggle */}
        <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <Button
            variant={previewMode === 'desktop' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onPreviewModeChange('desktop')}
            className="h-7 px-2"
          >
            <Monitor className="w-3 h-3" />
          </Button>
          <Button
            variant={previewMode === 'mobile' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onPreviewModeChange('mobile')}
            className="h-7 px-2"
          >
            <Smartphone className="w-3 h-3" />
          </Button>
          <Button
            variant={previewMode === 'print' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onPreviewModeChange('print')}
            className="h-7 px-2"
          >
            <Printer className="w-3 h-3" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Zoom Controls */}
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onZoomChange(Math.max(0.25, zoom - 0.25))}
            disabled={zoom <= 0.25}
          >
            <ZoomOut className="w-3 h-3" />
          </Button>
          
          <span className="text-sm font-mono text-gray-600 dark:text-gray-400 min-w-[50px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onZoomChange(Math.min(2, zoom + 0.25))}
            disabled={zoom >= 2}
          >
            <ZoomIn className="w-3 h-3" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onZoomChange(1)}
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Action Buttons */}
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="w-3 h-3 mr-1" />
          Export
        </Button>
        
        <Button variant="outline" size="sm" onClick={onShare}>
          <Share2 className="w-3 h-3 mr-1" />
          Share
        </Button>
      </div>
    </div>
  );
}

/**
 * Preview Renderer
 * Renders the actual document preview with template styling
 */
function PreviewRenderer({
  documentType,
  documentData,
  templateData,
  designOverrides,
  previewMode,
  zoom,
  paperSize,
  isLoading
}: {
  documentType: DocumentType;
  documentData: UnifiedCVDataStructure | string;
  templateData: any;
  designOverrides: Record<string, any>;
  previewMode: 'desktop' | 'mobile' | 'print';
  zoom: number;
  paperSize: 'A4' | 'Letter';
  isLoading: boolean;
}) {
  if (isLoading) {
    return <PreviewSkeleton />;
  }

  const getPreviewDimensions = () => {
    const baseWidth = paperSize === 'A4' ? 210 : 216; // mm
    const baseHeight = paperSize === 'A4' ? 297 : 279; // mm
    
    // Convert to pixels (assuming 96 DPI)
    const scale = 3.78; // mm to pixels at 96 DPI
    let width = baseWidth * scale;
    let height = baseHeight * scale;

    if (previewMode === 'mobile') {
      width = 375; // iPhone width
      height = 667; // iPhone height
    } else if (previewMode === 'desktop') {
      // Keep A4/Letter proportions but scale for screen
      width = 400;
      height = (400 / baseWidth) * baseHeight;
    }

    return {
      width: width * zoom,
      height: height * zoom
    };
  };

  const dimensions = getPreviewDimensions();
  const appliedStyles = { ...templateData?.globalStyles, ...designOverrides };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="bg-white shadow-lg rounded-lg overflow-hidden"
      style={{
        width: dimensions.width,
        height: dimensions.height,
        minHeight: 400
      }}
    >
      <div 
        className="w-full h-full p-6 overflow-auto"
        style={{
          fontFamily: appliedStyles?.fontFamily || 'Inter, sans-serif',
          fontSize: appliedStyles?.fontSize || '14px',
          lineHeight: appliedStyles?.lineHeight || '1.6',
          color: appliedStyles?.primaryColor || '#1f2937'
        }}
      >
        {documentType === 'cv' ? (
          <CVPreview 
            cvData={documentData as UnifiedCVDataStructure}
            templateData={templateData}
            appliedStyles={appliedStyles}
            previewMode={previewMode}
          />
        ) : (
          <CoverLetterPreview
            content={documentData as string}
            templateData={templateData}
            appliedStyles={appliedStyles}
            previewMode={previewMode}
          />
        )}
      </div>
    </motion.div>
  );
}

/**
 * CV Preview Component
 */
function CVPreview({
  cvData,
  templateData,
  appliedStyles,
  previewMode
}: {
  cvData: UnifiedCVDataStructure;
  templateData: any;
  appliedStyles: any;
  previewMode: string;
}) {
  return (
    <div className="space-y-6">
      {/* Header Section */}
      {cvData.basics && (
        <div className="text-center pb-4 border-b-2" style={{ borderColor: appliedStyles?.primaryColor }}>
          <h1 className="text-2xl font-bold mb-2" style={{ color: appliedStyles?.primaryColor }}>
            {cvData.basics.name || 'Your Name'}
          </h1>
          {cvData.basics.label && (
            <p className="text-lg text-gray-600 mb-2">{cvData.basics.label}</p>
          )}
          <div className="flex justify-center space-x-4 text-sm text-gray-600">
            {cvData.basics.email && <span>{cvData.basics.email}</span>}
            {cvData.basics.phone && <span>{cvData.basics.phone}</span>}
            {cvData.basics.location?.city && <span>{cvData.basics.location.city}</span>}
          </div>
        </div>
      )}

      {/* Summary */}
      {cvData.basics?.summary && (
        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: appliedStyles?.primaryColor }}>
            Professional Summary
          </h2>
          <p className="text-gray-700 leading-relaxed">{cvData.basics.summary}</p>
        </section>
      )}

      {/* Work Experience */}
      {cvData.work && cvData.work.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: appliedStyles?.primaryColor }}>
            Work Experience
          </h2>
          <div className="space-y-4">
            {cvData.work.map((job, index) => (
              <div key={index} className="border-l-2 pl-4" style={{ borderColor: appliedStyles?.secondaryColor }}>
                <h3 className="font-semibold">{job.position}</h3>
                <p className="text-gray-600">{job.name} • {job.startDate} - {job.endDate || 'Present'}</p>
                {job.summary && <p className="mt-2 text-gray-700">{job.summary}</p>}
                {job.highlights && job.highlights.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {job.highlights.map((highlight, idx) => (
                      <li key={idx} className="text-gray-700 text-sm">• {highlight}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education */}
      {cvData.education && cvData.education.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: appliedStyles?.primaryColor }}>
            Education
          </h2>
          <div className="space-y-3">
            {cvData.education.map((edu, index) => (
              <div key={index}>
                <h3 className="font-semibold">{edu.studyType} in {edu.area}</h3>
                <p className="text-gray-600">{edu.institution} • {edu.startDate} - {edu.endDate}</p>
                {edu.score && <p className="text-gray-700">GPA: {edu.score}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {cvData.skills && cvData.skills.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: appliedStyles?.primaryColor }}>
            Skills
          </h2>
          <div className="flex flex-wrap gap-2">
            {cvData.skills.map((skill, index) => (
              <span 
                key={index}
                className="px-3 py-1 rounded text-sm"
                style={{ 
                  backgroundColor: `${appliedStyles?.primaryColor}20`,
                  color: appliedStyles?.primaryColor
                }}
              >
                {skill.name}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * Cover Letter Preview Component
 */
function CoverLetterPreview({
  content,
  templateData,
  appliedStyles,
  previewMode
}: {
  content: string;
  templateData: any;
  appliedStyles: any;
  previewMode: string;
}) {
  return (
    <div className="space-y-6">
      <div 
        className="prose max-w-none"
        style={{
          fontFamily: appliedStyles?.fontFamily,
          fontSize: appliedStyles?.fontSize,
          lineHeight: appliedStyles?.lineHeight
        }}
      >
        {content.split('\n').map((paragraph, index) => (
          <p key={index} className="mb-4 text-gray-700">
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}

/**
 * Preview Footer
 * Shows document stats and information
 */
function PreviewFooter({
  documentType,
  documentData,
  zoom
}: {
  documentType: DocumentType;
  documentData: UnifiedCVDataStructure | string;
  zoom: number;
}) {
  const getDocumentStats = () => {
    if (documentType === 'cv') {
      const cvData = documentData as UnifiedCVDataStructure;
      const sectionCount = Object.keys(cvData).filter(key => 
        cvData[key] && (Array.isArray(cvData[key]) ? cvData[key].length > 0 : true)
      ).length;
      
      return {
        sections: sectionCount,
        words: JSON.stringify(cvData).split(' ').length,
        pages: '1'
      };
    } else {
      const content = documentData as string;
      return {
        words: content.split(' ').filter(word => word.length > 0).length,
        characters: content.length,
        pages: Math.ceil(content.split(' ').length / 250) // ~250 words per page
      };
    }
  };

  const stats = getDocumentStats();

  return (
    <div className="h-10 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 text-sm text-gray-500 dark:text-gray-400">
      <div className="flex items-center space-x-4">
        <span>Zoom: {Math.round(zoom * 100)}%</span>
        {documentType === 'cv' ? (
          <>
            <span>Sections: {stats.sections}</span>
            <span>Words: {stats.words}</span>
          </>
        ) : (
          <>
            <span>Words: {stats.words}</span>
            <span>Characters: {stats.characters}</span>
          </>
        )}
        <span>Pages: {stats.pages}</span>
      </div>
      
      <div className="flex items-center space-x-2">
        <FileText className="w-3 h-3" />
        <span>Live Preview</span>
      </div>
    </div>
  );
}

/**
 * Preview Skeleton
 * Loading state for preview
 */
function PreviewSkeleton() {
  return (
    <div className="w-96 h-[500px] bg-white shadow-lg rounded-lg p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        </div>
        <div className="space-y-2">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    </div>
  );
}

// Helper Functions

async function handleExport(documentType: DocumentType, documentData: UnifiedCVDataStructure | string) {
  try {
    const response = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentType,
        documentData,
        format: 'pdf'
      })
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${documentType}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error('Export failed:', error);
  }
}

async function handleShare(documentType: DocumentType) {
  try {
    await navigator.share({
      title: `My ${documentType}`,
      text: `Check out my ${documentType}`,
      url: window.location.href
    });
  } catch (error) {
    console.log('Share not supported or cancelled');
  }
}
