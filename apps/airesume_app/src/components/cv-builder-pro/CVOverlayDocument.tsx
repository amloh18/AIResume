'use client';

import React, { useMemo, useEffect } from 'react';
import { StaticLayoutRenderer, EditableField } from '@/components/cv-builder-pro/components/CoreUI';
import { CANVAS_TEMPLATES, SNIPPETS } from '@/components/cv-builder-pro/registry';
import { initialData } from '@/lib/templates/canvas-initial-data';
import { normalizeCvDataForCanvas } from '@/lib/utils/cv-canvas-normalizer';
import { getNestedValue } from '@/components/cv-builder-pro/helpers';
import AnnotatedText from '@/components/resume-enhancer/annotations/AnnotatedText';
import type { FixAnnotation } from '@/components/resume-enhancer/annotations/fix-annotation';
import {
  SNAPSHOT_STYLES,
  ensureFontsLoaded,
  CV_SNAPSHOT_A4_WIDTH,
  CV_SNAPSHOT_A4_HEIGHT,
} from '@/components/cv-builder-pro/CVSnapshotDocument';
import { getDocumentFontStack } from '@/lib/templates/document-fonts';

interface CVOverlayDocumentProps {
  cvData: any;
  template?: any;
  annotations?: FixAnnotation[];
  activeFixId?: string;
  onSelectFix?: (fixId: string) => void;
  onApplyFix?: (fix: FixAnnotation) => void;
  onDismissFix?: (fixId: string) => void;
  ghostSkills?: Array<{ skill: string; category?: string; fixId?: string }>;
  onAddGhostSkill?: (skill: string, category?: string, fixId?: string) => void;
  overlaysEnabled?: boolean;
  overlayInlineCard?: boolean;
  renderMode?: 'pages' | 'continuous';
  customCSS?: string;
  className?: string;
}

interface OverlayFieldProps {
  data: any;
  path?: string;
  overrideValue?: any;
  arrayIndex?: number;
  isDate?: boolean;
  dateFormat?: string;
  nowrap?: boolean;
  multiline?: boolean;
  className?: string;
  annotations: FixAnnotation[];
  overlaysEnabled: boolean;
  activeFixId?: string;
  onSelectFix?: (fixId: string) => void;
  onApplyFix?: (fix: FixAnnotation) => void;
  onDismissFix?: (fixId: string) => void;
  overlayInlineCard: boolean;
}

/**
 * Field wrapper used inside StaticLayoutRenderer.
 *
 * When fix annotations are enabled and an annotation's originalText appears in
 * this field's plain text, the field renders through AnnotatedText so users can
 * click a highlighted issue to select it. Content matching (not path equality)
 * lets annotations built against the unified schema (work[0].highlights[0])
 * still land on the merged canvas description field (experience.0.description).
 * Otherwise the field renders exactly like the editor's read-only EditableField,
 * so the base document is identical to thumbnails/snapshots.
 */
function OverlayField({
  data,
  path,
  overrideValue,
  arrayIndex,
  isDate,
  dateFormat,
  nowrap,
  multiline,
  className: fieldClassName,
  annotations,
  overlaysEnabled,
  activeFixId,
  onSelectFix,
  onApplyFix,
  onDismissFix,
  overlayInlineCard,
}: OverlayFieldProps) {
  const raw = overrideValue !== undefined
    ? overrideValue
    : (path ? getNestedValue(data, path) || '' : '');
  const text = useMemo(() => (typeof raw === 'string' ? stripRichText(raw) : ''), [raw]);

  if (overlaysEnabled && text && annotations.some((a) => a.status === 'open' && a.originalText && text.includes(a.originalText))) {
    return (
      <AnnotatedText
        as="span"
        className={fieldClassName}
        fieldPath={path || ''}
        text={text}
        enabled
        annotations={annotations}
        activeFixId={activeFixId}
        onSelectFix={onSelectFix}
        onApplyFix={onApplyFix}
        onDismissFix={onDismissFix}
        inlineCard={overlayInlineCard}
        contentMatch
      />
    );
  }

  if (!path && overrideValue === undefined) {
    return <span className={fieldClassName} />;
  }

  return (
    <EditableField
      data={data}
      path={path}
      readOnly
      overrideValue={overrideValue}
      arrayIndex={arrayIndex}
      isDate={isDate}
      dateFormat={dateFormat}
      nowrap={nowrap}
      className={fieldClassName}
      multiline={multiline}
    />
  );
}

function GhostSkillPills({
  skills,
  onAdd,
}: {
  skills: Array<{ skill: string; category?: string; fixId?: string }>;
  onAdd?: (skill: string, category?: string, fixId?: string) => void;
}) {
  if (skills.length === 0) return null;
  return (
    <div className="mt-2 flex flex-col gap-1.5 cv-page-breakable">
      {skills.map((ghost, index) => (
        <div key={`ghost-${index}`} className="flex items-start gap-2">
          {ghost.category && (
            <span className="font-bold text-base text-gray-400 whitespace-nowrap" style={{ fontWeight: 700, fontSize: 15, opacity: 0.5 }}>
              {ghost.category}:
            </span>
          )}
          <button
            type="button"
            onClick={() => onAdd?.(ghost.skill, ghost.category, ghost.fixId)}
            className="text-sm text-gray-400 italic hover:text-gray-600 hover:not-italic transition-all cursor-pointer border-b border-dashed border-gray-300 hover:border-gray-500"
            style={{ opacity: 0.6 }}
            title="Click to add this skill"
          >
            + Add {ghost.skill} (suggested)
          </button>
        </div>
      ))}
    </div>
  );
}

/**
 * Canonical read-only CV document renderer with an overlay layer.
 *
 * Renders the SAME StaticLayoutRenderer used by the editor and thumbnails, so the
 * base layout is a single source of truth. On top of it this component mounts the
 * report-specific overlays (fix-annotation highlights via AnnotatedText, ghost-skill
 * suggestions injected after the skills snippet).
 */
export default function CVOverlayDocument({
  cvData,
  template,
  annotations = [],
  activeFixId,
  onSelectFix,
  onApplyFix,
  onDismissFix,
  ghostSkills = [],
  onAddGhostSkill,
  overlaysEnabled = false,
  overlayInlineCard = true,
  renderMode = 'pages',
  customCSS,
  className = '',
}: CVOverlayDocumentProps) {
  const normalizedCvData = useMemo(() => normalizeCvDataForCanvas(cvData), [cvData]);
  const data = normalizedCvData || initialData;

  const displayTemplate = useMemo(() => {
    const requested = template || cvData?.metadata?.canvasTemplate;
    if (!requested) return CANVAS_TEMPLATES[0] || null;
    return CANVAS_TEMPLATES.find((item) => item.id === requested._id || item.id === requested.id) || requested;
  }, [template, cvData]);

  useEffect(() => {
    ensureFontsLoaded();
  }, []);

  const design = cvData?.metadata?.canvasDesign || data.metadata?.canvasDesign || (data as any).design || cvData?.design || (initialData as any).design;

  const ReadOnlyWrapper = (fieldProps: any) => (
    <OverlayField
      {...fieldProps}
      data={data}
      annotations={annotations}
      overlaysEnabled={overlaysEnabled}
      activeFixId={activeFixId}
      onSelectFix={onSelectFix}
      onApplyFix={onApplyFix}
      onDismissFix={onDismissFix}
      overlayInlineCard={overlayInlineCard}
    />
  );

  const snippetExtra = overlaysEnabled && ghostSkills.length > 0
    ? (type: string) => (SNIPPETS[type]?.category === 'Skills' ? <GhostSkillPills skills={ghostSkills} onAdd={onAddGhostSkill} /> : null)
    : undefined;

  if (!displayTemplate || !normalizedCvData) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      <style dangerouslySetInnerHTML={{ __html: SNAPSHOT_STYLES }} />
      {customCSS && <style dangerouslySetInnerHTML={{ __html: customCSS }} />}
      <div
        className="cv-snapshot-wrapper"
        style={{
          width: CV_SNAPSHOT_A4_WIDTH,
          height: renderMode === 'pages' ? CV_SNAPSHOT_A4_HEIGHT : undefined,
          overflow: renderMode === 'pages' ? 'hidden' : 'visible',
          backgroundColor: '#ffffff',
          '--cv-font': getDocumentFontStack(design?.font || 'Inter'),
          '--cv-base-size': `${design?.fontSize || 12}px`,
          '--cv-spacing': design?.spacing || 1.0,
          '--cv-accent': design?.accentColor || '#22c55e',
          '--cv-page-margin': `${design?.pageMargin || 40}px`,
          '--cv-sidebar-bg': design?.sidebarBgColor || '#f8fafc',
          // `??`, not `||`: 0 is a legal gap (see the Design panel's sliders), and
          // `||` would silently put a 16px/12px gap into a document that has none.
          '--cv-section-gap': `${design?.sectionGap ?? 16}px`,
          '--cv-item-gap': `${design?.itemGap ?? 12}px`,
          '--cv-page-width': '210mm',
          '--cv-page-height': '297mm',
        } as React.CSSProperties}
      >
        <StaticLayoutRenderer
          template={displayTemplate}
          cvData={normalizedCvData}
          ReadOnlyWrapper={ReadOnlyWrapper}
          design={design}
          snippetExtra={snippetExtra}
          interactive
        />
      </div>
    </div>
  );
}

function stripRichText(value: string): string {
  if (!value) return '';

  const hasTags = /<[^>]+>/.test(value);
  if (!hasTags) return value;

  return value
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<ul[^>]*>/gi, '')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<ol[^>]*>/gi, '')
    .replace(/<\/ol>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/div>/gi, '\n')
    .replace(/<div[^>]*>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}