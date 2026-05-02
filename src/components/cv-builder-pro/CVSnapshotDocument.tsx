'use client';

import React, { useMemo } from 'react';
import { StaticLayoutRenderer, EditableField } from '@/components/cv-builder-pro/components/CoreUI';
import { CANVAS_TEMPLATES } from '@/components/cv-builder-pro/registry';
import { initialData } from '@/lib/templates/canvas-initial-data';
import { normalizeCvDataForCanvas } from '@/lib/utils/cv-canvas-normalizer';

export const CV_SNAPSHOT_A4_WIDTH = 794;
export const CV_SNAPSHOT_A4_HEIGHT = 1123;

const SNAPSHOT_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300;1,400&family=Roboto+Mono:wght@300;400;500;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Lora:ital,wght@0,400;0,600;0,700;1,400&display=swap');
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
  .cv-snapshot-wrapper .cv-name { font-size: calc(var(--cv-base-size) * 2.5); line-height: 1.1; }
  .cv-snapshot-wrapper .cv-name-narrow { font-size: calc(var(--cv-base-size) * 2); line-height: 1.1; }
  .cv-snapshot-wrapper .cv-role { font-size: calc(var(--cv-base-size) * 1.15); }
  .cv-snapshot-wrapper .cv-heading { font-size: calc(var(--cv-base-size) * 1.1); }
  .cv-snapshot-wrapper .cv-title { font-size: calc(var(--cv-base-size) * 1.05); }
  .cv-snapshot-wrapper .cv-subtitle { font-size: calc(var(--cv-base-size) * 0.95); }
  .cv-snapshot-wrapper .cv-date { font-size: calc(var(--cv-base-size) * 0.85); }
  .cv-snapshot-wrapper .cv-contact { font-size: calc(var(--cv-base-size) * 0.85); }
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

  const design = (normalizedCvData as any)?.design || cvData?.design || (initialData as any).design;

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
