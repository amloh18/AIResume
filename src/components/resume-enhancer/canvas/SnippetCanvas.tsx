'use client';

/**
 * SnippetCanvas -- main orchestrator component that replaces BuilderPreview +
 * FloatingFormEditor. It manages zone state, handles drag-and-drop, converts
 * data between snippet and unified models, and renders the WYSIWYG canvas.
 */

import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  memo,
} from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import CanvasLayout from './CanvasLayout';
import FloatingToolbar, { useFloatingToolbar } from './FloatingToolbar';
import DesignPanel from './DesignPanel';
import TemplateModal from './TemplateModal';
import SnippetPickerModal from './SnippetPickerModal';
import { SNIPPETS, CANVAS_TEMPLATES, getSnippetsForCategory } from './snippets';
import {
  unifiedToSnippetData,
  snippetDataToUnified,
  templateToZones,
  getDefaultCanvasTemplate,
} from './dataAdapter';
import type {
  SnippetData,
  Zone,
  ZoneSnippet,
  LayoutType,
  DesignVars,
  DragState,
  CanvasTemplate,
  SnippetCategoryId,
} from './snippetTypes';
import { DEFAULT_DESIGN_VARS, INITIAL_DRAG_STATE } from './snippetTypes';
import type { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import type { ITemplate } from '@/types/template';
import type { FixAnnotation } from '@/components/resume-enhancer/annotations/fix-annotation';

// Page dimensions
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1122;
const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5];

export interface SnippetCanvasRef {
  scrollToSection: (sectionId: string) => void;
  openAddSection: () => void;
  openTemplateSelector: () => void;
}

interface SnippetCanvasProps {
  cvData: UnifiedCVDataStructure;
  template: ITemplate | null;
  fixAnnotations?: FixAnnotation[];
  onCVDataChange: (data: UnifiedCVDataStructure) => void;
  toolbarRightSlot?: React.ReactNode;
  onRunAnalysis?: () => void;
  highlightedField?: string | null;
  onAnnotationClick?: (fixId: string) => void;
  onIssueHover?: (fieldPath: string | null) => void;
}

let _uid = 0;
function uid(): string {
  return `snp_${Date.now()}_${++_uid}`;
}

const SnippetCanvas = forwardRef<SnippetCanvasRef, SnippetCanvasProps>(function SnippetCanvas(
  {
    cvData,
    template,
    fixAnnotations,
    onCVDataChange,
    toolbarRightSlot,
    onRunAnalysis,
    highlightedField,
    onAnnotationClick,
    onIssueHover,
  },
  ref,
) {
  // ----- State -----
  const [zoom, setZoom] = useState(1);
  const [zones, setZones] = useState<Zone[]>([]);
  const [layout, setLayout] = useState<LayoutType>('1-col');
  const [designVars, setDesignVars] = useState<DesignVars>(DEFAULT_DESIGN_VARS);
  const [dragState, setDragState] = useState<DragState>(INITIAL_DRAG_STATE);
  const [showDesignPanel, setShowDesignPanel] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showSnippetPicker, setShowSnippetPicker] = useState(false);
  const [snippetPickerContext, setSnippetPickerContext] = useState<{
    zoneId: string;
    index: number;
    mode: 'replace' | 'add';
    category?: SnippetCategoryId;
  } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ----- Convert unified CV data to snippet data -----
  const snippetData = useMemo(() => unifiedToSnippetData(cvData), [cvData]);

  // ----- Initialize zones from template -----
  useEffect(() => {
    if (template) {
      const { layout: l, zones: z } = templateToZones(template);
      setLayout(l);
      setZones(z);

      // Apply template accent color
      if (template.globalStyles?.primaryColor) {
        setDesignVars((d) => ({ ...d, accentColor: template.globalStyles.primaryColor }));
      }
    } else if (zones.length === 0) {
      const defaultTemplate = getDefaultCanvasTemplate();
      setLayout(defaultTemplate.layout);
      setZones(defaultTemplate.zones);
    }
  }, [template]); // eslint-disable-line react-hooks/exhaustive-deps

  // ----- Sync snippet edits back to unified CV data (debounced) -----
  const syncToUnified = useCallback(
    (updatedSnippetData: SnippetData) => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => {
        const updatedCv = snippetDataToUnified(updatedSnippetData, cvData);
        onCVDataChange(updatedCv);
      }, 300);
    },
    [cvData, onCVDataChange],
  );

  // ----- Field change handler -----
  const handleFieldChange = useCallback(
    (path: string, value: string) => {
      // Deep-set into snippetData and sync
      const parts = path.split('.');
      const updated = JSON.parse(JSON.stringify(snippetData)) as SnippetData;
      let target: any = updated;
      for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        const idx = parseInt(key, 10);
        target = isNaN(idx) ? target[key] : target[idx];
      }
      const lastKey = parts[parts.length - 1];
      const lastIdx = parseInt(lastKey, 10);
      if (isNaN(lastIdx)) {
        target[lastKey] = value;
      } else {
        target[lastIdx] = value;
      }
      syncToUnified(updated);
    },
    [snippetData, syncToUnified],
  );

  // ----- Zone manipulation -----
  const moveSnippet = useCallback(
    (zoneId: string, fromIndex: number, toIndex: number) => {
      setZones((prev) =>
        prev.map((z) => {
          if (z.id !== zoneId) return z;
          const snippets = [...z.snippets];
          const [moved] = snippets.splice(fromIndex, 1);
          snippets.splice(toIndex, 0, moved);
          return { ...z, snippets };
        }),
      );
    },
    [],
  );

  const handleSnippetMoveUp = useCallback(
    (zoneId: string, index: number) => {
      if (index > 0) moveSnippet(zoneId, index, index - 1);
    },
    [moveSnippet],
  );

  const handleSnippetMoveDown = useCallback(
    (zoneId: string, index: number) => {
      const zone = zones.find((z) => z.id === zoneId);
      if (zone && index < zone.snippets.length - 1) moveSnippet(zoneId, index, index + 1);
    },
    [zones, moveSnippet],
  );

  const handleSnippetDelete = useCallback((zoneId: string, index: number) => {
    setZones((prev) =>
      prev.map((z) => {
        if (z.id !== zoneId) return z;
        const snippets = [...z.snippets];
        snippets.splice(index, 1);
        return { ...z, snippets };
      }),
    );
  }, []);

  const handleSnippetReplace = useCallback(
    (zoneId: string, index: number) => {
      const zone = zones.find((z) => z.id === zoneId);
      const snippet = zone?.snippets[index];
      setSnippetPickerContext({
        zoneId,
        index,
        mode: 'replace',
        category: snippet?.category,
      });
      setShowSnippetPicker(true);
    },
    [zones],
  );

  const handleSnippetAddBelow = useCallback((zoneId: string, index: number) => {
    setSnippetPickerContext({ zoneId, index: index + 1, mode: 'add' });
    setShowSnippetPicker(true);
  }, []);

  const handleAddSection = useCallback((zoneId: string) => {
    setSnippetPickerContext({ zoneId, index: -1, mode: 'add' });
    setShowSnippetPicker(true);
  }, []);

  const handleSnippetSelect = useCallback(
    (snippetId: string, category: SnippetCategoryId) => {
      if (!snippetPickerContext) return;
      const { zoneId, index, mode } = snippetPickerContext;

      setZones((prev) =>
        prev.map((z) => {
          if (z.id !== zoneId) return z;
          const snippets = [...z.snippets];
          const newSnippet: ZoneSnippet = {
            instanceId: uid(),
            snippetId,
            category,
          };

          if (mode === 'replace') {
            snippets[index] = newSnippet;
          } else {
            const insertAt = index === -1 ? snippets.length : index;
            snippets.splice(insertAt, 0, newSnippet);
          }
          return { ...z, snippets };
        }),
      );

      setShowSnippetPicker(false);
      setSnippetPickerContext(null);
    },
    [snippetPickerContext],
  );

  // ----- Drag and Drop -----
  const handleDragStart = useCallback((_e: React.DragEvent, zoneId: string, index: number) => {
    setDragState({
      isDragging: true,
      dragType: 'snippet',
      dragSourceZoneId: zoneId,
      dragSourceIndex: index,
      dragOverZoneId: null,
      dragOverIndex: null,
    });
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragState(INITIAL_DRAG_STATE);
  }, []);

  const handleDragOver = useCallback((_e: React.DragEvent, zoneId: string, index: number) => {
    setDragState((prev) => ({
      ...prev,
      dragOverZoneId: zoneId,
      dragOverIndex: index,
    }));
  }, []);

  const handleDrop = useCallback(
    (_e: React.DragEvent, targetZoneId: string, targetIndex: number) => {
      const { dragSourceZoneId, dragSourceIndex } = dragState;
      if (dragSourceZoneId == null || dragSourceIndex == null) return;

      if (dragSourceZoneId === targetZoneId) {
        // Same zone reorder
        moveSnippet(dragSourceZoneId, dragSourceIndex, targetIndex);
      } else {
        // Cross-zone move
        setZones((prev) => {
          const next = prev.map((z) => ({ ...z, snippets: [...z.snippets] }));
          const sourceZone = next.find((z) => z.id === dragSourceZoneId);
          const targetZone = next.find((z) => z.id === targetZoneId);
          if (!sourceZone || !targetZone) return prev;

          const [moved] = sourceZone.snippets.splice(dragSourceIndex, 1);
          targetZone.snippets.splice(targetIndex, 0, moved);
          return next;
        });
      }
      setDragState(INITIAL_DRAG_STATE);
    },
    [dragState, moveSnippet],
  );

  // ----- Template selection -----
  const handleTemplateSelect = useCallback((tmpl: CanvasTemplate) => {
    setLayout(tmpl.layout);
    setZones(tmpl.zones.map((z) => ({
      ...z,
      snippets: z.snippets.map((s) => ({ ...s, instanceId: uid() })),
    })));
    setDesignVars((d) => ({ ...d, accentColor: tmpl.accentColor }));
    setShowTemplateModal(false);
  }, []);

  // ----- Zoom -----
  const zoomIn = useCallback(() => {
    setZoom((z) => {
      const idx = ZOOM_LEVELS.indexOf(z);
      return idx < ZOOM_LEVELS.length - 1 ? ZOOM_LEVELS[idx + 1] : z;
    });
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((z) => {
      const idx = ZOOM_LEVELS.indexOf(z);
      return idx > 0 ? ZOOM_LEVELS[idx - 1] : z;
    });
  }, []);

  const zoomReset = useCallback(() => setZoom(1), []);

  // ----- Floating toolbar -----
  const toolbarState = useFloatingToolbar();

  // ----- Ref API -----
  useImperativeHandle(ref, () => ({
    scrollToSection: (sectionId: string) => {
      const el = canvasRef.current?.querySelector(`[data-snippet-category="${sectionId}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
    openAddSection: () => {
      setSnippetPickerContext({ zoneId: 'main', index: -1, mode: 'add' });
      setShowSnippetPicker(true);
    },
    openTemplateSelector: () => setShowTemplateModal(true),
  }));

  // ----- CSS custom properties for design vars -----
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

  return (
    <div className="snippet-canvas-root flex flex-col h-full min-h-0 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#141810] flex-shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={zoomOut}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
            title="Zoom out"
          >
            <ZoomOut size={16} />
          </button>
          <span className="text-xs text-gray-500 min-w-[40px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={zoomIn}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
            title="Zoom in"
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={zoomReset}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
            title="Reset zoom"
          >
            <Maximize2 size={16} />
          </button>
        </div>

        {/* Right slot (FloatingPulsePill) */}
        <div className="flex items-center gap-2">{toolbarRightSlot}</div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 min-h-0 overflow-auto bg-gray-100 dark:bg-[#0d0f0a] p-4">
        <div
          ref={canvasRef}
          className="cv-canvas-wrapper mx-auto"
          style={{
            width: A4_WIDTH_PX,
            minHeight: A4_HEIGHT_PX,
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            ...cssVars,
          }}
        >
          {/* CV Document */}
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
              isEditing={true}
              dragState={dragState}
              onFieldChange={handleFieldChange}
              onSnippetMoveUp={handleSnippetMoveUp}
              onSnippetMoveDown={handleSnippetMoveDown}
              onSnippetDelete={handleSnippetDelete}
              onSnippetReplace={handleSnippetReplace}
              onSnippetAddBelow={handleSnippetAddBelow}
              onAddSection={handleAddSection}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              highlightedField={highlightedField}
              fixAnnotations={fixAnnotations}
              onAnnotationClick={onAnnotationClick}
            />
          </div>
        </div>
      </div>

      {/* Floating rich-text toolbar */}
      <FloatingToolbar
        visible={toolbarState.visible}
        position={toolbarState.position}
        onAISuggest={onRunAnalysis}
      />

      {/* Design Panel */}
      {showDesignPanel && (
        <DesignPanel
          designVars={designVars}
          onDesignChange={setDesignVars}
          onClose={() => setShowDesignPanel(false)}
        />
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <TemplateModal
          templates={CANVAS_TEMPLATES}
          onSelect={handleTemplateSelect}
          onClose={() => setShowTemplateModal(false)}
        />
      )}

      {/* Snippet Picker Modal */}
      {showSnippetPicker && snippetPickerContext && (
        <SnippetPickerModal
          mode={snippetPickerContext.mode}
          category={snippetPickerContext.category}
          onSelect={handleSnippetSelect}
          onClose={() => {
            setShowSnippetPicker(false);
            setSnippetPickerContext(null);
          }}
        />
      )}
    </div>
  );
});

export default memo(SnippetCanvas);
