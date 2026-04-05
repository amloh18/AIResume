'use client';

import React, { useCallback, useMemo } from 'react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { ITemplate } from '@/types/template';
import type { FixAnnotation } from '@/components/resume-enhancer/annotations/fix-annotation';
import { CVCanvasEngine } from '@/components/cv-canvas/CVCanvasEngine';
import { translatePathWithArray, translatePath, isExperiencePath } from '@/lib/utils/path-translation';
import type { SurgicalFix } from '@/lib/services/cv-surgeon-service';

interface CVBuilderProAdapterProps {
  cvData: UnifiedCVDataStructure | null;
  template: ITemplate | null;
  mode?: 'preview' | 'edit';
  pageFormat?: 'a4' | 'letter';
  showToolbar?: boolean;
  initialZoom?: number;
  className?: string;
  onCVDataChange?: (data: Partial<UnifiedCVDataStructure>) => void;
  onSectionClick?: (sectionId: string) => void;
  highlightedField?: string | null;
  fixAnnotations?: FixAnnotation[];
  onAnnotationClick?: (fixId: string) => void;
  surgeonFixes?: SurgicalFix[];
  onApplyFix?: (fix: SurgicalFix) => void;
  onDismissFix?: (fixId: string) => void;
  toolbarRightSlot?: React.ReactNode;
  isLoading?: boolean;
}

export const CVBuilderProAdapter: React.FC<CVBuilderProAdapterProps> = ({
  cvData,
  template,
  mode = 'preview',
  pageFormat = 'a4',
  showToolbar = true,
  initialZoom = 1,
  className = '',
  onCVDataChange,
  onSectionClick,
  highlightedField,
  fixAnnotations = [],
  onAnnotationClick,
  surgeonFixes = [],
  onApplyFix,
  onDismissFix,
  toolbarRightSlot,
  isLoading = false,
}) => {
  const translatedAnnotations = useMemo(() => {
    return fixAnnotations.map(annotation => ({
      ...annotation,
      fieldPath: isExperiencePath(annotation.fieldPath)
        ? translatePathWithArray(annotation.fieldPath, 'cvcircleToCanvas')
        : annotation.fieldPath,
    }));
  }, [fixAnnotations]);

  const translatedHighlightedField = useMemo(() => {
    if (!highlightedField) return null;
    return isExperiencePath(highlightedField)
      ? translatePathWithArray(highlightedField, 'cvcircleToCanvas')
      : highlightedField;
  }, [highlightedField]);

  const handleSectionClick = useCallback((sectionId: string) => {
    if (onSectionClick) {
      onSectionClick(sectionId);
    }
  }, [onSectionClick]);

  const handleAnnotationClick = useCallback((fixId: string) => {
    if (onAnnotationClick) {
      onAnnotationClick(fixId);
    }
  }, [onAnnotationClick]);

  const handleCVDataChange = useCallback((updatedData: Partial<UnifiedCVDataStructure>) => {
    if (onCVDataChange) {
      const translatedData = translateCVDataToCanvas(updatedData);
      onCVDataChange(translatedData);
    }
  }, [onCVDataChange]);

  if (isLoading || !cvData) {
    return (
      <div className={`cv-builder-pro-adapter flex flex-col h-full ${className}`}>
        <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-[#1a230f]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#80FF00] border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Loading CV Canvas...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`cv-builder-pro-adapter flex flex-col h-full ${className}`}>
      <CVCanvasEngine
        cvData={cvData}
        template={template}
        mode={mode}
        pageFormat={pageFormat}
        showToolbar={showToolbar}
        initialZoom={initialZoom}
        onCVDataChange={handleCVDataChange}
        onSectionClick={handleSectionClick}
        highlightedField={translatedHighlightedField}
        fixAnnotations={translatedAnnotations}
        onAnnotationClick={handleAnnotationClick}
        toolbarRightSlot={toolbarRightSlot}
      />
    </div>
  );
};

function translateCVDataToCanvas(data: Partial<UnifiedCVDataStructure>): Partial<UnifiedCVDataStructure> {
  const translated: Partial<UnifiedCVDataStructure> = { ...data };
  
  if (data.work) {
    (translated as any).experience = data.work.map((work: any) => ({
      id: work.id || `exp-${Date.now()}`,
      role: work.position,
      company: work.name,
      date: work.startDate && work.endDate 
        ? `${work.startDate} - ${work.endDate}` 
        : work.startDate || work.endDate || '',
      description: formatDescription(work.summary, work.highlights),
    }));
    delete (translated as any).work;
  }
  
  return translated;
}

function formatDescription(summary: string, highlights: string[]): string {
  if (!highlights || highlights.length === 0) {
    return summary || '';
  }
  
  const bullets = highlights
    .map(h => `<li>${h}</li>`)
    .join('');
  
  return `<ul>${bullets}</ul>`;
}

export default CVBuilderProAdapter;