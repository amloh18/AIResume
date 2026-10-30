'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2, FileText, Layout, Sparkles, LayoutTemplate } from 'lucide-react';
import CoverLetterLayoutEngine, {
  type CoverLetterDesignProps,
} from '@/components/cover-letter-engine/CoverLetterLayoutEngine';
import { CanvasToolRail, TOOLRAIL_BTN } from '@/components/cv-builder-pro/components/CoreUI';
import { getPageDimensions } from '@/lib/templates/page-dimensions';
import { useCanvasFit, ZOOM_STEP, ZOOM_WHEEL_SENSITIVITY } from '@/hooks/useCanvasFit';
import { useCanvasPinchZoom } from '@/hooks/useCanvasPinchZoom';

/**
 * Height of the floating tool strip pinned to the bottom of the frame.
 * Mirrors `CANVAS_TOOL_STRIP_PX` in CVCanvasEngine so both documents reserve the
 * same gutter and their tool strips sit in the same place.
 */
const TOOL_STRIP_PX = 64;

/** The letter's two focusable regions — the analogue of a CV section. */
export type CoverLetterUnit = 'header' | 'body';

export type CoverLetterTemplateType =
  | 'classic'
  | 'modern'
  | 'minimal'
  | 'typographic'
  | 'column-split'
  | 'accent-banner'
  | 'creative-edge'
  | 'executive-slate';

export interface CoverLetterCanvasProps {
  cvData: any;
  jobData: any;
  bodyContent: string;
  templateType: CoverLetterTemplateType;
  design: CoverLetterDesignProps;
  isEditing: boolean;
  onBodyChange: (content: string) => void;
  /** Reports the natural (zoomed) content height so the shell can hug the page. */
  onCanvasContentHeightChange?: (height: number) => void;
  onOpenHeaderStyles?: () => void;
  /** Called when the canvas cannot proceed without a job description. */
  onRequestJob?: () => void;
  undoStack?: unknown[];
  redoStack?: unknown[];
  onUndo?: () => void;
  onRedo?: () => void;
  /** Opens the letter's AI (the Mori letter chat). */
  onToggleMoriChat?: () => void;
}

const stripHtml = (value: unknown): string =>
  typeof value === 'string' ? value.replace(/<[^>]*>/g, '').trim() : '';

/**
 * The cover letter as it appears inside the Step-3 canvas frame.
 *
 * This is deliberately the same document shell as the CV canvas (page, zoom,
 * tools) wrapping the existing letter engine, so switching the document tab
 * changes only what fills the frame — not the editor around it.
 */
const CoverLetterCanvas: React.FC<CoverLetterCanvasProps> = ({
  cvData,
  jobData,
  bodyContent,
  templateType,
  design,
  isEditing,
  onBodyChange,
  onCanvasContentHeightChange,
  onOpenHeaderStyles,
  onRequestJob,
  undoStack,
  redoStack,
  onUndo,
  onRedo,
  onToggleMoriChat,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  /**
   * The letter's focused object — the direct analogue of the CV's
   * `selectedBlockId`. `null` means nothing is in focus mode and the canvas is
   * in its plain "both units editable" state.
   */
  const [selectedUnit, setSelectedUnit] = useState<CoverLetterUnit | null>(null);
  const [pageFormat, setPageFormat] = useState<'a4' | 'letter'>('a4');
  const pageDims = useMemo(
    () => getPageDimensions(pageFormat === 'letter' ? 'Letter' : 'A4'),
    [pageFormat]
  );
  // Layout width in CSS pixels — the zoom transform scales the page from here.
  const pageWidth = pageDims.widthPx;
  // `p-4 lg:p-8` on the scroll box below; the lg value is used for the fit budget
  // at every breakpoint, which is merely a little conservative on small screens.
  const SCROLL_PAD_PX = 32;
  // Auto-fit, exactly like the CV canvas. The letter used to open at a fixed
  // 100%, so on any normal viewport its bottom half sat below the fold — clipped
  // by the frame and hidden behind the tool strip. Opening at a fit zoom is what
  // makes the two documents feel like one editor.
  const {
    containerRef,
    zoom,
    setZoom,
    isAutoFit,
    triggerAutoFit,
  } = useCanvasFit({
    documentPixelWidth: pageDims.widthPx,
    documentPixelHeight: pageDims.heightPx,
    paddingPx: SCROLL_PAD_PX * 2,
    paddingYPx: SCROLL_PAD_PX * 2,
    maxScale: 2,
    minScale: 0.4,
  });

  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  // Pinch-to-zoom for mobile touch gestures
  useCanvasPinchZoom({
    containerRef,
    zoomRef,
    setZoom,
    scaleFor: (distancePx) => (distancePx / 100) * 100,
    speedMultiplier: 1.5,
    minZoom: 40,
    maxZoom: 200,
  });

  // Trackpad / wheel swipe-to-zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? container.clientHeight : 1;
      const deltaPx = e.deltaY * unit;
      setZoom((prev: number) => {
        const next = prev * Math.exp(-deltaPx * ZOOM_WHEEL_SENSITIVITY);
        return Math.min(200, Math.max(40, next));
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [containerRef, setZoom]);

  const [workspaceHeight, setWorkspaceHeight] = useState(0);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const measure = () => setWorkspaceHeight(el.clientHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const [contentNaturalHeight, setContentNaturalHeight] = useState(0);

  // Same contract as the CV canvas: report the content height plus the frame's
  // own padding so the shell can size the frame to the document instead of
  // stretching it and leaving dead space under the page.
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const measure = () => {
      const padding = window.innerWidth >= 1024 ? 32 : 16;
      const natural = el.offsetHeight;
      if (Number.isFinite(natural) && natural > 0) {
        setContentNaturalHeight(natural);
      }
      if (!onCanvasContentHeightChange) return;
      const documentPx = Math.max(pageDims.heightPx, natural);
      const scaled = documentPx * (zoom / 100);
      onCanvasContentHeightChange(Math.ceil(scaled + padding * 2));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [onCanvasContentHeightChange, zoom, bodyContent, pageFormat, isEditing, pageDims.heightPx]);

  const paddingY = typeof window !== 'undefined' && window.innerWidth >= 1024 ? 32 : 16;
  const unscaledHeight = Math.max(pageDims.heightPx, contentNaturalHeight || 0);
  const scaledHeight = Math.round(unscaledHeight * (zoom / 100));
  const scaleDiffY = Math.round(unscaledHeight * (1 - zoom / 100));
  const marginBottomPx = -scaleDiffY;
  const fitsVertically = workspaceHeight > 0 && (scaledHeight + paddingY * 2) <= workspaceHeight;

  const today = useMemo(
    () => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    []
  );

  /**
   * Dismiss the spotlight exactly the way the CV does: Escape, or a pointerdown
   * that lands on neither a unit nor the rail.
   *
   * The handler runs in the CAPTURE phase so it sees the press before the unit's
   * own `onClick` — which matters, because pressing a DIFFERENT unit has to both
   * clear the old selection and let the new one land. Anything inside a unit or
   * inside the rail returns early, so operating a control can never dismiss the
   * thing it operates on.
   */
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-block-id], [data-canvas-toolrail], .no-print')) return;
      setSelectedUnit(null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setSelectedUnit(null);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  /**
   * The selected unit's actions — the rail's entire contents.
   *
   * No leading divider: the rail's format slot is empty for the letter (its
   * design controls live in the design tab), so a separator would have nothing
   * on its left. The header keeps both icons, the body only the AI one.
   */
  const unitActions = selectedUnit === 'header' ? (
    <>
      <button
        type="button"
        className={TOOLRAIL_BTN}
        onClick={onOpenHeaderStyles}
        title="Change header style"
      >
        <LayoutTemplate size={13} />
      </button>
      <button
        type="button"
        className={`${TOOLRAIL_BTN} text-emerald-600 dark:text-emerald-400`}
        onClick={() => onToggleMoriChat?.()}
        title="Ask Mori to improve"
      >
        <Sparkles size={13} />
      </button>
    </>
  ) : selectedUnit === 'body' ? (
    <button
      type="button"
      className={`${TOOLRAIL_BTN} text-emerald-600 dark:text-emerald-400`}
      onClick={() => onToggleMoriChat?.()}
      title="Ask Mori to improve"
    >
      <Sparkles size={13} />
    </button>
  ) : null;

  const headerProps = useMemo(() => {
    const basics = cvData?.basics || {};
    const location = basics.location?.city
      ? `${basics.location.city}${basics.location.countryCode ? `, ${basics.location.countryCode}` : ''}`
      : '';
    return {
      name: stripHtml(basics.name) || 'Your Name',
      email: stripHtml(basics.email) || 'email@example.com',
      phone: stripHtml(basics.phone),
      location,
      date: today,
      recipientName: stripHtml(jobData?.contactPerson) || 'Hiring Manager',
      companyName: stripHtml(jobData?.company) || 'Company Name',
    };
  }, [cvData, jobData, today]);

  const hasJob = !!(jobData?.description || jobData?.jobDescription);

  return (
    /* `h-full`, not `flex-1`: the editor shell renders this inside a plain block
       wrapper, so a `flex-1` root had no flex parent to resolve against and fell
       back to auto height. With a long letter that made the root taller than the
       frame it lives in — the frame clipped it, and the tool strip, pinned to the
       root's bottom, was clipped away with it. `h-full` fills the frame instead.

       ⚠️ The tool-strip reserve is `paddingBottom` on the SCROLL BOX, not on this
       root — the same place the CV canvas puts it (see CANVAS_TOOL_STRIP_PX in
       CVCanvasEngine). Reserving it on the root instead left the scroll box ending
       64px ABOVE the frame's bottom, so the strip floated in a dead band of its
       own rather than over the canvas. The two canvases then disagreed about what
       the controls overlay, which is exactly what "the letter shows a background
       behind the canvas controls" looked like. Because it is padding on the scroll
       container, it is still part of the scrollable area: the letter's last lines
       stop short of the strip and never scroll under it.

       ⚠️ The root still carries the canvas surface colour. The scroll box paints
       it too, but if the two ever disagree (or a 1px seam opens between them) the
       strip's translucent backdrop would reveal it as a band behind the controls.
       One colour on both makes the whole canvas a single surface. */
    <div
      data-cl-canvas
      className="h-full min-h-0 relative flex flex-col bg-[#f3f2ee] dark:bg-[#1a1a1a]"
    >
      <div
        ref={containerRef}
        data-cl-workspace
        // `items-start` is load-bearing: the scroll box is a flex row, so without
        // it the content wrapper is STRETCHED to the scroll box's own height and
        // reports that instead of the document's. The letter page then overflows
        // the wrapper invisibly, `offsetHeight` comes back as 1px, and the height
        // reported to the shell collapses the frame to nothing. (The CV wrapper
        // sidesteps the same trap with `h-max`.)
        // `relative` is load-bearing for focus mode: the shared tool rail is an
        // absolutely positioned child of this box and resolves its `top`/`left`
        // against it, exactly as it does against the CV's `[data-cv-workspace]`.
        className={`relative flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-[#f3f2ee] dark:bg-[#1a1a1a] px-4 lg:px-8 py-4 lg:py-8 flex justify-center ${fitsVertically ? 'items-center' : 'items-start'}`}
      >
        {bodyContent ? (
          <div
            ref={contentRef}
            className="origin-top"
            style={{
              transform: `scale(${zoom / 100})`,
              marginBottom: `${marginBottomPx}px`,
              transition: 'transform 200ms ease-out, margin-bottom 200ms ease-out',
            }}
          >
            <CoverLetterLayoutEngine
              templateType={templateType}
              onTemplateTypeChange={onOpenHeaderStyles as any}
              pageFormat={pageFormat}
              headerProps={headerProps as any}
              bodyContent={bodyContent}
              isEditing={isEditing}
              onBodyChange={onBodyChange}
              design={design as Partial<CoverLetterDesignProps>}
              zoom={zoom}
              onChangeHeaderStyle={onOpenHeaderStyles}
              sessionUndoStack={undoStack}
              sessionRedoStack={redoStack}
              onSessionUndo={onUndo}
              onSessionRedo={onRedo}
              selectedUnit={selectedUnit}
              onSelectUnit={setSelectedUnit}
            />
          </div>
        ) : (
          /* Empty state. It sits OUTSIDE the zoom wrapper — there is no document
             to zoom, and scaling a placeholder only made it shrink away from the
             user. `w-full min-h-full` stretches it to the canvas and the flex
             centring puts it in the middle, so an empty letter reads as "this
             space is waiting for you" rather than as a small card parked at the
             top of a large blank area. Both resolve because the scroll box is a
             flex row with a definite height. */
          <div
            ref={contentRef}
            className="w-full min-h-full flex items-center justify-center"
          >
            <div
              data-cl-empty-state
              className="max-w-full bg-white dark:bg-[#141810] rounded-2xl border border-dashed border-gray-300 dark:border-white/10 shadow-sm px-8 py-14 lg:px-12 lg:py-20 flex flex-col items-center text-center gap-5"
              style={{ width: pageWidth }}
            >
              <FileText className="w-12 h-12 text-emerald-500" />
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">No cover letter yet</p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-[440px]">
                  A cover letter is written against a specific job. Start from a scaffold and fill it in,
                  or generate a first draft from the job description.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => onBodyChange(buildStarterBody(headerProps))}
                  className="px-3 py-2 rounded-lg text-xs font-bold bg-[#013f2e] text-white hover:opacity-90 transition-opacity"
                >
                  Write it myself
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!hasJob) {
                      onRequestJob?.();
                      return;
                    }
                    onOpenHeaderStyles?.();
                  }}
                  className="px-3 py-2 rounded-lg text-xs font-bold border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors inline-flex items-center gap-1.5"
                  title={hasJob ? 'Open the letter panel to generate a draft' : 'Add a job description first'}
                >
                  <Sparkles size={12} className="text-emerald-500" />
                  Generate with AI
                </button>
              </div>
              {!hasJob && (
                <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Add a job description to tailor this letter
                </p>
              )}
            </div>
          </div>
        )}

        {/* ─── Focus mode rail ────────────────────────────────────────────────
            The CV's merged rail, unchanged: same surface, same buttons, same
            geometry helper, same AI pill. It anchors itself to the unit whose
            `data-block-id` matches, so the letter's two units get the identical
            affordance a CV section gets — the rail hangs above whichever one is
            the focused object.

            It carries the UNIT's actions only (change header style / ask Mori).
            The letter's design numbers — typeface, size, line spacing, margin,
            accent — used to fill the rail's format slot too, which made the rail
            a second, cramped route to the design panel. They live in the design
            tab (`CoverLetterDesignPanel`) and nowhere else now, so the rail is a
            two-icon strip for the header and a one-icon strip for the body.

            It is rendered only while something is selected. The CV can leave its
            rail permanently mounted because a focused FIELD also anchors it; the
            letter's units are the only anchors, so with nothing selected there is
            nothing for the rail to hang off and mounting it would just be an
            invisible element in the scroll box. */}
        {selectedUnit && (
          <CanvasToolRail
            selectedBlockId={`cl-${selectedUnit}`}
            zoom={zoom}
            onAiClick={() => onToggleMoriChat?.()}
            sectionControls={unitActions}
          />
        )}
      </div>

      {/* Tools — mirrors the CV canvas tools so the two documents feel like one editor. */}
      <div className="absolute bottom-4 left-3 right-3 md:bottom-6 md:left-auto md:right-6 z-[40] flex flex-wrap justify-end items-center gap-1.5 md:gap-2 pointer-events-none">
        <div className="flex items-center gap-1.5 md:gap-2 pointer-events-auto rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white/95 dark:bg-[#141414]/95 backdrop-blur-md px-2.5 h-9 shadow-2xl shadow-black/15 dark:shadow-black/50">
          <button
            type="button"
            onClick={() => setPageFormat(pageFormat === 'a4' ? 'letter' : 'a4')}
            className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-[#7EE787] hover:bg-emerald-500/10 transition-all"
            title="Toggle page size"
          >
            <Layout size={11} />
            {pageFormat === 'a4' ? 'A4' : 'Letter'}
          </button>
          <span className="w-px h-4 bg-gray-200 dark:bg-white/10" />
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(40, z - ZOOM_STEP))}
            className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-emerald-500/20 transition-all"
            title="Zoom out"
          >
            <ZoomOut size={14} />
          </button>
          <input
            type="range"
            min={40}
            max={200}
            step={5}
            value={zoom}
            onChange={(e) => setZoom(parseInt(e.target.value, 10))}
            className="w-14 md:w-20 accent-emerald-500 h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            aria-label="Zoom"
          />
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(200, z + ZOOM_STEP))}
            className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-emerald-500/20 transition-all"
            title="Zoom in"
          >
            <ZoomIn size={14} />
          </button>
          <button
            type="button"
            onClick={() => setZoom(100)}
            className={`min-w-[42px] px-1.5 py-1 text-[9px] font-black rounded-md transition-all border ${
              zoom === 100 && !isAutoFit
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-600 dark:text-emerald-400'
                : 'bg-transparent border-gray-500/20 text-gray-500 dark:text-gray-400'
            }`}
            title="Reset zoom to 100%"
          >
            {/* Zoom is fractional — the label rounds. */}
            {Math.round(zoom)}%
          </button>
          <button
            type="button"
            onClick={triggerAutoFit}
            aria-pressed={isAutoFit}
            className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors ${
              isAutoFit
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
            }`}
            title="Fit the whole page in view"
          >
            <Maximize2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * A neutral scaffold — headings and prompts only, never claims about the
 * candidate. The user (or the AI, from the Master CV) fills the substance in.
 */
function buildStarterBody(header: { name: string; recipientName: string; companyName: string }) {
  return [
    `<p>Dear ${header.recipientName},</p>`,
    `<p>I am writing to apply for this role at ${header.companyName}.</p>`,
    `<p>[Add a sentence about why this role and company interest you.]</p>`,
    `<p>[Add two or three sentences on the most relevant experience from your CV.]</p>`,
    `<p>Thank you for your time and consideration.</p>`,
    `<p>Sincerely,<br/>${header.name}</p>`,
  ].join('');
}

export default CoverLetterCanvas;
