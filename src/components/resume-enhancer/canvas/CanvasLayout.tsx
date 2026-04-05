'use client';

/**
 * CanvasLayout -- renders the correct zone arrangement based on the
 * active layout type. Handles all layout variations: 1-col, 2-col,
 * sidebar-left/right, dark sidebar variants, top-sidebar, hybrid-split.
 */

import React, { memo } from 'react';
import CanvasZone from './CanvasZone';
import type { Zone, LayoutType, SnippetData, DesignVars, DragState } from './snippetTypes';

interface CanvasLayoutProps {
  layout: LayoutType;
  zones: Zone[];
  data: SnippetData;
  designVars: DesignVars;
  isEditing: boolean;
  dragState: DragState;
  onFieldChange: (path: string, value: string) => void;
  onSnippetMoveUp: (zoneId: string, index: number) => void;
  onSnippetMoveDown: (zoneId: string, index: number) => void;
  onSnippetDelete: (zoneId: string, index: number) => void;
  onSnippetReplace: (zoneId: string, index: number) => void;
  onSnippetAddBelow: (zoneId: string, index: number) => void;
  onAddSection: (zoneId: string) => void;
  onDragStart: (e: React.DragEvent, zoneId: string, index: number) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, zoneId: string, index: number) => void;
  onDrop: (e: React.DragEvent, zoneId: string, index: number) => void;
  highlightedField?: string | null;
  fixAnnotations?: any[];
  onAnnotationClick?: (fixId: string) => void;
}

function getZoneById(zones: Zone[], id: string): Zone | undefined {
  return zones.find((z) => z.id === id);
}

function CanvasLayoutInner(props: CanvasLayoutProps) {
  const { layout, zones, ...zoneProps } = props;

  const mainZone = getZoneById(zones, 'main') || zones[0];
  const sidebarZone = getZoneById(zones, 'sidebar');

  // Common zone props pass-through
  const commonProps = {
    ...zoneProps,
  };

  switch (layout) {
    case '1-col':
      return (
        <div className="cv-layout cv-layout--1col">
          {mainZone && <CanvasZone zone={mainZone} {...commonProps} />}
        </div>
      );

    case '2-col':
      return (
        <div className="cv-layout cv-layout--2col flex gap-4">
          <div className="flex-1">
            {mainZone && <CanvasZone zone={mainZone} {...commonProps} />}
          </div>
          <div className="flex-1">
            {sidebarZone && <CanvasZone zone={sidebarZone} {...commonProps} />}
          </div>
        </div>
      );

    case 'sidebar-left':
      return (
        <div className="cv-layout cv-layout--sidebar-left flex gap-4">
          <div className="w-[35%] min-w-0">
            {sidebarZone && (
              <CanvasZone
                zone={sidebarZone}
                {...commonProps}
                className="bg-gray-50 dark:bg-gray-800/30 rounded-lg p-3"
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            {mainZone && <CanvasZone zone={mainZone} {...commonProps} />}
          </div>
        </div>
      );

    case 'sidebar-right':
      return (
        <div className="cv-layout cv-layout--sidebar-right flex gap-4">
          <div className="flex-1 min-w-0">
            {mainZone && <CanvasZone zone={mainZone} {...commonProps} />}
          </div>
          <div className="w-[35%] min-w-0">
            {sidebarZone && (
              <CanvasZone
                zone={sidebarZone}
                {...commonProps}
                className="bg-gray-50 dark:bg-gray-800/30 rounded-lg p-3"
              />
            )}
          </div>
        </div>
      );

    case 'dark-sidebar-left':
      return (
        <div className="cv-layout cv-layout--dark-sidebar-left flex">
          <div className="w-[35%] min-w-0 bg-gray-900 text-white p-4 rounded-l-lg">
            {sidebarZone && (
              <CanvasZone zone={sidebarZone} {...commonProps} className="[&_*]:text-white/90" />
            )}
          </div>
          <div className="flex-1 min-w-0 p-4">
            {mainZone && <CanvasZone zone={mainZone} {...commonProps} />}
          </div>
        </div>
      );

    case 'dark-sidebar-right':
      return (
        <div className="cv-layout cv-layout--dark-sidebar-right flex">
          <div className="flex-1 min-w-0 p-4">
            {mainZone && <CanvasZone zone={mainZone} {...commonProps} />}
          </div>
          <div className="w-[35%] min-w-0 bg-gray-900 text-white p-4 rounded-r-lg">
            {sidebarZone && (
              <CanvasZone zone={sidebarZone} {...commonProps} className="[&_*]:text-white/90" />
            )}
          </div>
        </div>
      );

    case 'top-sidebar':
      return (
        <div className="cv-layout cv-layout--top-sidebar">
          {/* Header zone spans full width */}
          {mainZone && mainZone.snippets.length > 0 && (
            <div className="mb-4">
              <CanvasZone
                zone={{ ...mainZone, snippets: mainZone.snippets.slice(0, 1) }}
                {...commonProps}
              />
            </div>
          )}
          {/* Rest is two-column */}
          <div className="flex gap-4">
            <div className="flex-1 min-w-0">
              <CanvasZone
                zone={{ ...mainZone, snippets: mainZone.snippets.slice(1) }}
                {...commonProps}
              />
            </div>
            {sidebarZone && (
              <div className="w-[35%] min-w-0">
                <CanvasZone
                  zone={sidebarZone}
                  {...commonProps}
                  className="bg-gray-50 dark:bg-gray-800/30 rounded-lg p-3"
                />
              </div>
            )}
          </div>
        </div>
      );

    case 'hybrid-split':
    case 'modern-split':
      return (
        <div className="cv-layout cv-layout--hybrid-split">
          {/* Full width header */}
          {mainZone && mainZone.snippets.length > 0 && (
            <div className="mb-4 pb-3 border-b-2 border-[var(--cv-accent)]">
              <CanvasZone
                zone={{ ...mainZone, snippets: mainZone.snippets.slice(0, 2) }}
                {...commonProps}
              />
            </div>
          )}
          {/* Split content */}
          <div className="flex gap-4">
            <div className="flex-[2] min-w-0">
              <CanvasZone
                zone={{ ...mainZone, snippets: mainZone.snippets.slice(2) }}
                {...commonProps}
              />
            </div>
            {sidebarZone && (
              <div className="flex-1 min-w-0">
                <CanvasZone zone={sidebarZone} {...commonProps} />
              </div>
            )}
          </div>
        </div>
      );

    default:
      return (
        <div className="cv-layout cv-layout--fallback">
          {zones.map((zone) => (
            <CanvasZone key={zone.id} zone={zone} {...commonProps} />
          ))}
        </div>
      );
  }
}

const CanvasLayout = memo(CanvasLayoutInner);
export default CanvasLayout;
