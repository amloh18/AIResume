'use client';

import React, { useMemo, useEffect } from 'react';
import { StaticLayoutRenderer, EditableField } from '@/components/cv-builder-pro/components/CoreUI';
import { CANVAS_TEMPLATES } from '@/components/cv-builder-pro/registry';
import { initialData } from '@/lib/templates/canvas-initial-data';
import { normalizeCvDataForCanvas } from '@/lib/utils/cv-canvas-normalizer';

export const CV_SNAPSHOT_A4_WIDTH = 794;
export const CV_SNAPSHOT_A4_HEIGHT = 1123;

// Inject Google Fonts link once per document lifetime so thumbnail renders use preloaded fonts
const GOOGLE_FONTS_URL = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300;1,400&family=Roboto+Mono:wght@300;400;500;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=Outfit:wght@300;400;500;600;700&display=swap';
let fontsInjected = false;
function ensureFontsLoaded() {
  if (fontsInjected || typeof document === 'undefined') return;
  fontsInjected = true;
  // preconnect
  const preconnect = document.createElement('link');
  preconnect.rel = 'preconnect';
  preconnect.href = 'https://fonts.gstatic.com';
  preconnect.crossOrigin = 'anonymous';
  document.head.appendChild(preconnect);
  // font stylesheet
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = GOOGLE_FONTS_URL;
  document.head.appendChild(link);
}

const SNAPSHOT_STYLES = `
  @import url('${GOOGLE_FONTS_URL}');
  .cv-snapshot-wrapper .cv-document {
    font-family: var(--cv-font), sans-serif;
    color: #111827;
    font-size: var(--cv-base-size);
    position: relative;
    z-index: 10;
    min-height: var(--cv-page-height);
    background: #ffffff;
  }
  .cv-snapshot-wrapper .cv-document .text-gray-900 { color: #111827 !important; }
  .cv-snapshot-wrapper .cv-document .text-gray-800 { color: #1f2937 !important; }
  .cv-snapshot-wrapper .cv-document .text-gray-700 { color: #374151 !important; }
  .cv-snapshot-wrapper .cv-document .text-gray-600 { color: #4b5563 !important; }
  .cv-snapshot-wrapper .cv-document .text-gray-500 { color: #6b7280 !important; }
  .cv-snapshot-wrapper .cv-document .text-gray-400 { color: #9ca3af !important; }
  .cv-snapshot-wrapper .cv-document .text-gray-300 { color: #d1d5db !important; }
  .cv-snapshot-wrapper .cv-document .text-gray-200 { color: #e5e7eb !important; }
  .cv-snapshot-wrapper .cv-document .text-gray-100 { color: #f3f4f6 !important; }
  .cv-snapshot-wrapper .cv-document .text-white { color: #ffffff !important; }
  .cv-snapshot-wrapper .cv-document,
  .cv-snapshot-wrapper .cv-document > div,
  .cv-snapshot-wrapper .cv-document > div > div {
    container-type: inline-size;
  }

  .cv-snapshot-wrapper .cv-header-name,
  .cv-snapshot-wrapper .cv-header-role {
    display: inline-block;
    max-width: 100%;
    overflow: hidden;
    text-overflow: clip;
    white-space: nowrap !important;
    word-break: normal;
    overflow-wrap: normal;
  }

  .cv-snapshot-wrapper .cv-name { font-size: min(calc(var(--cv-base-size) * 2.5), 8cqw); line-height: 1.1; }
  .cv-snapshot-wrapper .cv-name-narrow { font-size: min(calc(var(--cv-base-size) * 2.0), 8cqw); line-height: 1.1; }
  .cv-snapshot-wrapper .cv-role { font-size: min(calc(var(--cv-base-size) * 1.15), 5.5cqw); }
  .cv-snapshot-wrapper .cv-heading { font-size: calc(var(--cv-base-size) * 1.1); }
  .cv-snapshot-wrapper .cv-title { font-size: calc(var(--cv-base-size) * 1.05); }
  .cv-snapshot-wrapper .cv-subtitle { font-size: calc(var(--cv-base-size) * 0.95); }
  .cv-snapshot-wrapper .cv-date { font-size: calc(var(--cv-base-size) * 0.85); }
  .cv-snapshot-wrapper .cv-contact { font-size: calc(var(--cv-base-size) * 0.85); }
  .cv-snapshot-wrapper .cv-contact-horizontal {
    flex-wrap: nowrap !important;
    overflow: hidden;
    font-size: min(calc(var(--cv-base-size) * 0.85), 2cqw) !important;
  }
  .cv-snapshot-wrapper .cv-body { font-size: inherit; line-height: calc(1.6 * var(--cv-spacing)); }
  .cv-snapshot-wrapper .cv-document p,
  .cv-snapshot-wrapper .cv-document ul,
  .cv-snapshot-wrapper .cv-document li {
    font-size: inherit !important;
    line-height: inherit !important;
    margin: 0;
    padding: 0;
  }
  .cv-snapshot-wrapper .cv-prose p { margin-bottom: calc(0.3em * var(--cv-spacing)) !important; }
  .cv-snapshot-wrapper .cv-prose ul {
    list-style-type: disc;
    padding-left: 1.2em;
    margin-top: calc(0.25em * var(--cv-spacing)) !important;
    margin-bottom: calc(0.25em * var(--cv-spacing)) !important;
  }
  .cv-snapshot-wrapper .cv-prose li { margin-bottom: calc(0.15em * var(--cv-spacing)) !important; }
  .cv-snapshot-wrapper .cv-accent-text { color: var(--cv-accent) !important; }
  .cv-snapshot-wrapper .cv-accent-bg { background-color: var(--cv-accent) !important; }
  .cv-snapshot-wrapper .cv-accent-border { border-color: var(--cv-accent) !important; }
  .cv-snapshot-wrapper .cv-document .cv-gap-sm { gap: calc(0.5rem * var(--cv-spacing)) !important; }
  .cv-snapshot-wrapper .cv-document .cv-gap-md { gap: calc(0.75rem * var(--cv-spacing)) !important; }
  .cv-snapshot-wrapper .cv-document .cv-gap-lg { gap: calc(1rem * var(--cv-spacing)) !important; }
  
  /* Layout formats */
  .cv-format-bullets-only .cv-prose p {
    display: none !important;
    margin-bottom: 0 !important;
  }
  .cv-format-paragraph-only .cv-prose ul {
    display: none !important;
    margin-top: 0 !important;
    margin-bottom: 0 !important;
  }
  .cv-document p:empty,
  .cv-document p:has(> br:only-child),
  .cv-document ul:empty {
    display: none !important;
    margin: 0 !important;
    padding: 0 !important;
  }
`;

interface CVSnapshotDocumentProps {
  cvData: any;
  template?: any;
  className?: string;
  documentClassName?: string;
}

export default function CVSnapshotDocument({
  cvData,
  template,
  className = '',
  documentClassName = '',
}: CVSnapshotDocumentProps) {
  const normalizedCvData = useMemo(() => normalizeCvDataForCanvas(cvData), [cvData]);
  const displayTemplate = useMemo(() => {
    if (!template) return null;
    return CANVAS_TEMPLATES.find((item) => item.id === template._id || item.id === template.id) || template;
  }, [template]);

  // Ensure Google Fonts are loaded once (module-level flag prevents duplicates)
  useEffect(() => { ensureFontsLoaded(); }, []);

  const design = cvData?.metadata?.canvasDesign || (normalizedCvData as any)?.metadata?.canvasDesign || (normalizedCvData as any)?.design || cvData?.design || (initialData as any).design;

  const ReadOnlyWrapper = function Editable(props: any) {
    return <EditableField {...props} data={normalizedCvData || initialData} readOnly={true} />;
  };

  if (!displayTemplate || !normalizedCvData) {
    return null;
  }

  return (
    <div className={`relative w-full h-full ${className}`}>
      <style dangerouslySetInnerHTML={{ __html: SNAPSHOT_STYLES }} />
      <div
        className={`bg-white relative overflow-hidden cv-snapshot-wrapper ${documentClassName}`}
        style={{
          width: `${CV_SNAPSHOT_A4_WIDTH}px`,
          height: `${CV_SNAPSHOT_A4_HEIGHT}px`,
          pointerEvents: 'none',
          '--cv-font': design?.font || 'Inter',
          '--cv-base-size': `${design?.fontSize || 12}px`,
          '--cv-spacing': design?.spacing || 1.0,
          '--cv-accent': design?.accentColor || '#22c55e',
          '--cv-page-margin': `${design?.pageMargin || 40}px`,
          '--cv-sidebar-bg': design?.sidebarBgColor || '#f8fafc',
          '--cv-section-gap': `${design?.sectionGap || 16}px`,
          '--cv-page-width': '210mm',
          '--cv-page-height': '297mm',
        } as React.CSSProperties}
      >
        <StaticLayoutRenderer
          template={displayTemplate}
          cvData={normalizedCvData}
          ReadOnlyWrapper={ReadOnlyWrapper}
          design={design}
        />
      </div>
    </div>
  );
}
