'use client';

/**
 * SnippetPreview -- read-only preview renderer using the snippet canvas system.
 * Used by Step4Review for consistent preview between editor and review steps.
 * No editing controls, no drag-and-drop, no floating toolbar.
 */

import React, { useMemo, useEffect, useState, useRef } from 'react';
import CanvasLayout from './CanvasLayout';
import { unifiedToSnippetData, templateToZones, getDefaultCanvasTemplate } from './dataAdapter';
import { INITIAL_DRAG_STATE, DEFAULT_DESIGN_VARS } from './snippetTypes';
import type { Zone, LayoutType, DesignVars } from './snippetTypes';
import type { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import type { ITemplate } from '@/types/template';
import '@/styles/cv-canvas-editor.css';

const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1122;

interface SnippetPreviewProps {
  cvData: UnifiedCVDataStructure;
  template: ITemplate | null;
  zoom?: number;
  className?: string;
}

export default function SnippetPreview({ cvData, template, zoom = 1, className = '' }: SnippetPreviewProps) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [layout, setLayout] = useState<LayoutType>('1-col');
  const [designVars, setDesignVars] = useState<DesignVars>(DEFAULT_DESIGN_VARS);

  const snippetData = useMemo(() => unifiedToSnippetData(cvData), [cvData]);

  useEffect(() => {
    if (template) {
      const { layout: l, zones: z } = templateToZones(template);
      setLayout(l);
      setZones(z);
      if (template.globalStyles?.primaryColor) {
        setDesignVars((d) => ({ ...d, accentColor: template.globalStyles.primaryColor }));
      }
    } else if (zones.length === 0) {
      const def = getDefaultCanvasTemplate();
      setLayout(def.layout);
      setZones(def.zones);
    }
  }, [template]); // eslint-disable-line react-hooks/exhaustive-deps

  const cssVars = useMemo(
    () =>
      ({
        '--cv-font': designVars.fontFamily,
        '--cv-font-size': `${designVars.fontSize}pt`,
        '--cv-line-height': `${designVars.lineSpacing}`,
        '--cv-margin': `${designVars.pageMargin}mm`,
        '--cv-accent': designVars.accentColor,
        '--cv-header-size': `${designVars.headerFontSize}pt`,
        '--cv-section-size': `${designVars.sectionFontSize}pt`,
      }) as React.CSSProperties,
    [designVars],
  );

  // No-op handlers for read-only mode
  const noop = () => {};
  const noopField = (_path: string, _value: string) => {};
  const noopDrag = (_e: React.DragEvent, _z: string, _i: number) => {};
  const noopDrop = (_e: React.DragEvent, _z: string, _i: number) => {};

  return (
    <div
      className={`snippet-preview-root ${className}`}
      style={{
        width: A4_WIDTH_PX,
        minHeight: A4_HEIGHT_PX,
        transform: `scale(${zoom})`,
        transformOrigin: 'top center',
        ...cssVars,
      }}
    >
      <div
        className="cv-document bg-white dark:bg-[#1a1d16] shadow-xl rounded-sm"
        style={{
          fontFamily: 'var(--cv-font)',
          fontSize: 'var(--cv-font-size)',
          lineHeight: 'var(--cv-line-height)',
          padding: 'var(--cv-margin)',
          minHeight: A4_HEIGHT_PX,
        }}
      >
        <CanvasLayout
          layout={layout}
          zones={zones}
          data={snippetData}
          designVars={designVars}
          isEditing={false}
          dragState={INITIAL_DRAG_STATE}
          onFieldChange={noopField}
          onSnippetMoveUp={noop as any}
          onSnippetMoveDown={noop as any}
          onSnippetDelete={noop as any}
          onSnippetReplace={noop as any}
          onSnippetAddBelow={noop as any}
          onAddSection={noop as any}
          onDragStart={noopDrag}
          onDragEnd={noop}
          onDragOver={noopDrag}
          onDrop={noopDrop}
        />
      </div>
    </div>
  );
}
