'use client';

/**
 * CVPreviewDocument
 *
 * The single shared renderer for read-only CV previews across the app.
 *
 * Every preview surface (the dashboard "My CVs" sidebar, the global-search CV
 * modal, the editor Step5Review panel, journey timelines) renders through this
 * one component so template resolution, zone fallback and provider handling
 * stay in one place instead of drifting apart per surface.
 *
 * It handles the two legacy-data gaps that used to break previews:
 *  1. Legacy templates — CVs saved before the canvas flow carry a template like
 *     { _id, name, globalStyles, availableSections } with no `type`/`zones`.
 *     We resolve the id against CANVAS_TEMPLATES (falling back to the 1-col
 *     template) so the canvas never hits "Layout not found".
 *  2. Missing canvas zones — if the CV has no saved `metadata.canvasZones`, we
 *     build zones from the resolved template, keeping only snippet types whose
 *     data actually exists on the CV (empty sections are filtered out).
 *
 * The canvas engine itself tolerates a missing ResumeEnhancerProvider via
 * useResumeEnhancerSafe, so this component is safe to mount anywhere.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import CVBuilderProAdapter from '@/components/cv-builder-pro/CVBuilderProAdapter';
import { CANVAS_TEMPLATES, SNIPPETS } from '@/components/cv-builder-pro/registry';
import { CV_SNAPSHOT_A4_WIDTH } from '@/components/cv-builder-pro/CVSnapshotDocument';

const generateId = () => Math.random().toString(36).substr(2, 9);

/* Map canvas snippet category -> the data keys (canvas + unified aliases) that feed it */
const LIST_CATEGORY_KEYS: Record<string, string[]> = {
  experience: ['experience', 'work'],
  education: ['education'],
  projects: ['projects'],
  certifications: ['certifications', 'certificates'],
  awards: ['awards'],
  publications: ['publications'],
  volunteer: ['volunteer'],
  references: ['references'],
};

function hasArrayData(cvData: any, keys: string[]): boolean {
  return keys.some((key) => Array.isArray(cvData?.[key]) && cvData[key].length > 0);
}

function hasStringData(value: any): boolean {
  if (!value) return false;
  if (Array.isArray(value)) return value.length > 0;
  return String(value).trim().length > 0;
}

/** Whether the given snippet type has real content to show for this CV. */
function snippetHasData(cvData: any, type: string): boolean {
  const def = SNIPPETS[type];
  if (!def) return false;

  const category = def.category;
  const basics = cvData?.basics || {};

  switch (category) {
    case 'Header':
      return !!(basics.name || basics.title || basics.label || basics.email || basics.phone || basics.website);
    case 'Summary':
      return !!(basics.summary || (Array.isArray(basics.profiles) && basics.profiles.length > 0));
    case 'Contact':
      return !!(
        basics.email ||
        basics.phone ||
        basics.website ||
        basics.location ||
        basics.linkedin ||
        (Array.isArray(basics.profiles) && basics.profiles.length > 0)
      );
    case 'Skills':
      return Array.isArray(cvData?.skills) && cvData.skills.length > 0;
    case 'Languages':
      return hasStringData(cvData?.languages);
    case 'Interests':
      return hasStringData(cvData?.interests);
    default: {
      const keys = LIST_CATEGORY_KEYS[category.toLowerCase()];
      return keys ? hasArrayData(cvData, keys) : true;
    }
  }
}

/** Build canvas zones from a template's zone layout, keeping only populated snippets. */
function buildZonesFromTemplate(cvData: any, template: any): Record<string, any[]> {
  const zones: Record<string, any[]> = {};
  Object.keys(template.zones || {}).forEach((zoneId: string) => {
    zones[zoneId] = (template.zones[zoneId] || [])
      .filter((type: string) => snippetHasData(cvData, type))
      .map((type: string) => ({ id: generateId(), type }));
  });
  return zones;
}

/** Resolve a legacy template to a canvas template, falling back to the 1-col layout. */
function resolveCanvasTemplate(template: any, cvData: any): any {
  const requested = template || cvData?.metadata?.canvasTemplate;
  if (requested && (requested.zones || requested.type)) return requested;

  const id = requested?.id || requested?._id || '';
  const found = CANVAS_TEMPLATES.find((t) => t.id === id);
  if (found) return found;

  return CANVAS_TEMPLATES.find((t) => t.id === '1-col') || CANVAS_TEMPLATES[0] || null;
}

interface CVPreviewDocumentProps {
  cvData: any;
  template?: any;
  theme?: 'light' | 'dark';
  className?: string;
}

export default function CVPreviewDocument({
  cvData,
  template,
  theme = 'light',
  className = '',
}: CVPreviewDocumentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState(0);

  const resolvedTemplate = useMemo(() => resolveCanvasTemplate(template, cvData), [template, cvData]);

  // Prepare the data the canvas will consume WITHOUT pre-normalizing (the adapter
  // normalizes once itself — double normalization corrupts education/projects).
  const previewData = useMemo(() => {
    if (!cvData || !resolvedTemplate) return null;

    const savedZones =
      cvData.metadata?.canvasZones && Object.keys(cvData.metadata.canvasZones).length > 0
        ? cvData.metadata.canvasZones
        : null;
    const zones = savedZones || buildZonesFromTemplate(cvData, resolvedTemplate);

    // Alias unified `certificates` -> canvas `certifications` (only when missing)
    const certifications =
      Array.isArray(cvData.certifications) && cvData.certifications.length > 0
        ? cvData.certifications
        : Array.isArray(cvData.certificates) && cvData.certificates.length > 0
          ? cvData.certificates
          : undefined;

    return {
      ...cvData,
      ...(certifications ? { certifications } : {}),
      metadata: {
        ...(cvData.metadata || {}),
        canvasTemplate: resolvedTemplate,
        canvasZones: zones,
      },
    };
  }, [cvData, resolvedTemplate]);

  const previewReady = !!previewData && !!resolvedTemplate;

  // Scale the fixed A4-width canvas down to fit the container (never up).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      setScale(Math.min(1, el.clientWidth / CV_SNAPSHOT_A4_WIDTH));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [previewReady]);

  // Track the unscaled content height so the wrapper reserves the scaled height
  // (transform doesn't affect layout — without this there'd be dead scroll space).
  useEffect(() => {
    if (!previewReady) return;
    const el = contentRef.current;
    if (!el) return;
    const update = () => setContentHeight(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [previewReady]);

  if (!previewReady) return null;

  return (
    <div
      ref={containerRef}
      className={`w-full overflow-hidden ${className}`}
      style={contentHeight > 0 ? { height: contentHeight * scale } : undefined}
    >
      <div
        ref={contentRef}
        className="origin-top-left"
        style={{
          width: CV_SNAPSHOT_A4_WIDTH,
          transform: `scale(${scale})`,
        }}
      >
        <CVBuilderProAdapter
          cvData={previewData}
          template={resolvedTemplate}
          theme={theme}
          readOnly={true}
        />
      </div>
    </div>
  );
}
