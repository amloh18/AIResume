import React, { useMemo, useState, useEffect, useRef } from 'react';
import { getPageDimensions } from '@/lib/templates/page-dimensions';
import { 
  ClassicHeader, 
  ModernHeader, 
  MinimalHeader,
  TypographicHeader,
  ColumnSplitHeader,
  AccentBannerHeader,
  CreativeEdgeHeader,
  ExecutiveSlateHeader,
  HeaderSnippetProps 
} from './snippets/headers/HeaderSnippets';
import WYSIWYGEditor from '@/components/ui/WYSIWYGEditor';
import {
  SECTION_FRAME_INSET_X,
  SECTION_FRAME_INSET_Y,
} from '@/components/cv-builder-pro/components/CoreUI';
import { Sparkles, Type, Layout, Baseline, MoveHorizontal, LayoutTemplate, X, ChevronDown, Check, ShieldCheck } from 'lucide-react';
import { getDocumentFontStack, DOCUMENT_GOOGLE_FONTS_URL } from '@/lib/templates/document-fonts';

const TEMPLATES = [
  { id: 'modern', name: 'Modern', icon: Sparkles, desc: 'Professional, lime accents' },
  { id: 'classic', name: 'Classic', icon: Type, desc: 'Traditional serif style' },
  { id: 'minimal', name: 'Minimal', icon: Layout, desc: 'Clean and simple' },
  { id: 'typographic', name: 'Typographic', icon: Baseline, desc: 'Bold display' },
  { id: 'column-split', name: 'Column Split', icon: MoveHorizontal, desc: 'Side-by-side header' },
  { id: 'accent-banner', name: 'Accent Banner', icon: LayoutTemplate, desc: 'High-impact banner' },
  { id: 'creative-edge', name: 'Creative Edge', icon: Sparkles, desc: 'Chic accent style' },
  { id: 'executive-slate', name: 'Executive Slate', icon: ShieldCheck, desc: 'Sleek executive layout' }
] as const;

export interface CoverLetterDesignProps {
  fontSize: number;
  lineHeight: number;
  pageMargin: number;
  accentColor: string;
  fontFamily: string;
}

/**
 * One focusable region of the letter, wrapped in the CV editor's focus-mode
 * chrome.
 *
 * The letter has exactly two of these — the header and the body — so this is the
 * direct analogue of a CV section, and it deliberately reuses the CV's
 * `SECTION_FRAME_INSET_*` values and its frame treatment: a faint dashed lime
 * outline on hover of an unselected unit ("clickable object"), and ONE solid
 * lime frame with the same halo once selected. The blur/dim of everything else
 * is the `.cl-has-selection` rule below, which mirrors `.cv-has-selection`.
 *
 * The unit also carries `data-block-id` / `data-selected`, which is what lets
 * the shared `CanvasToolRail` find it as its anchor.
 */
interface CanvasSectionWrapperProps {
  children: React.ReactNode;
  isEditing: boolean;
  className?: string;
  onClick?: () => void;
  /** Which region this is — becomes its `data-block-id` (`cl-<unit>`). */
  unit?: 'header' | 'body';
  /** True while this unit is the focused object. */
  selected?: boolean;
}

const CanvasSectionWrapper: React.FC<CanvasSectionWrapperProps> = ({
  children,
  isEditing,
  className = '',
  onClick,
  unit,
  selected = false,
}) => {
  if (!isEditing) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      data-block-id={unit ? `cl-${unit}` : undefined}
      data-selected={selected ? 'true' : 'false'}
      className={`cl-unit relative group/inner w-full transition-all duration-200 p-2 -mx-2 rounded-md cursor-pointer ${selected ? 'z-[60]' : 'hover:z-30'} ${className}`}
      onClick={onClick}
    >
      {/* The frame. `maxWidth: none` is load-bearing for the same reason it is
          in the CV: `.cl-document *` caps descendants at `max-width: 100%`, and
          a clamped frame silently drops its trailing inset, snapping the right
          border onto the text. An inline max-width outranks that rule. */}
      <div
        data-unit-frame={selected ? 'selected' : 'hover'}
        className={`pointer-events-none absolute rounded-lg transition-all duration-200 ${
          selected
            ? 'z-20 border-2 border-[#84cc16] shadow-[0_0_0_4px_rgba(132,204,22,0.20),0_12px_32px_rgba(0,0,0,0.16)]'
            : 'z-[-1] border border-dashed border-transparent bg-[#84cc16]/[0.05] opacity-0 group-hover/inner:opacity-100 group-hover/inner:border-[#84cc16]'
        }`}
        style={{
          top: -SECTION_FRAME_INSET_Y,
          right: -SECTION_FRAME_INSET_X,
          bottom: -SECTION_FRAME_INSET_Y,
          left: -SECTION_FRAME_INSET_X,
          maxWidth: 'none',
        }}
      />

      <div className="relative z-10 pointer-events-auto w-full">
        {children}
      </div>
    </div>
  );
};

interface CoverLetterLayoutEngineProps {
  headerProps: HeaderSnippetProps;
  bodyContent: string;
  templateType?: 'classic' | 'modern' | 'minimal' | 'typographic' | 'column-split' | 'accent-banner' | 'creative-edge' | 'executive-slate';
  isEditing?: boolean;
  onBodyChange?: (content: string) => void;
  pageFormat?: 'a4' | 'letter';
  design?: Partial<CoverLetterDesignProps>;
  onTemplateTypeChange?: (type: 'classic' | 'modern' | 'minimal' | 'typographic' | 'column-split' | 'accent-banner' | 'creative-edge' | 'executive-slate') => void;
  showMoriChat?: boolean;
  onToggleMoriChat?: () => void;
  onChangeHeaderStyle?: () => void;
  zoom?: number;
  sessionUndoStack?: unknown[];
  sessionRedoStack?: unknown[];
  onSessionUndo?: () => void;
  onSessionRedo?: () => void;
  /** The letter's focused object — the analogue of the CV's `selectedBlockId`. */
  selectedUnit?: 'header' | 'body' | null;
  onSelectUnit?: (unit: 'header' | 'body' | null) => void;
}

const splitHtmlIntoBlocks = (html: string): string[] => {
  if (!html) return [];
  const cleanContent = html.trim();
  const isHtml = /<[a-z][\s\S]*>/i.test(cleanContent);
  if (!isHtml) {
    return cleanContent.split('\n\n').filter(p => p.trim() !== '').map(p => `<p>${p}</p>`);
  }
  
  let normalized = cleanContent;
  
  if (normalized.startsWith('<p>') && normalized.endsWith('</p>')) {
    const inner = normalized.substring(3, normalized.length - 4);
    if (!inner.includes('<p>') && !inner.includes('</p>')) {
      normalized = inner;
    }
  } else if (normalized.startsWith('<div>') && normalized.endsWith('</div>')) {
    const inner = normalized.substring(5, normalized.length - 6);
    if (!inner.includes('<div>') && !inner.includes('</div>')) {
      normalized = inner;
    }
  }

  let parts: string[] = [];
  if (normalized.includes('<p>') || normalized.includes('<div>')) {
    const temp = normalized
      .replace(/<\/p>/gi, '</p>|||')
      .replace(/<\/div>/gi, '</div>|||')
      .split('|||');
    parts = temp.filter(p => p.trim() !== '');
  } else {
    const temp = normalized.split(/(?:<br\s*\/?>\s*){2,}/gi);
    parts = temp.filter(p => p.trim() !== '').map(p => {
      const trimmed = p.trim();
      if (!trimmed.startsWith('<')) {
        return `<p>${trimmed}</p>`;
      }
      return trimmed;
    });
  }

  return parts.map(part => {
    const trimmed = part.trim();
    if (!trimmed.startsWith('<')) {
      return `<p>${trimmed}</p>`;
    }
    return trimmed;
  });
};

export default function CoverLetterLayoutEngine({
  headerProps,
  bodyContent,
  templateType = 'modern',
  isEditing = false,
  onBodyChange,
  pageFormat = 'a4',
  design = {},
  onTemplateTypeChange,
  showMoriChat,
  // Kept in the contract (the canvas still passes them) but no longer consumed
  // here: the header-style switch and "Ask Mori" are now actions in the shared
  // focus-mode rail, which `CoverLetterCanvas` renders. A hover toolbar pinned to
  // each unit was the letter's ad-hoc version of that rail, and two places to
  // reach the same action is what the CV's merged rail exists to prevent.
  onToggleMoriChat,
  onChangeHeaderStyle,
  zoom = 100,
  sessionUndoStack,
  sessionRedoStack,
  onSessionUndo,
  onSessionRedo,
  selectedUnit = null,
  onSelectUnit
}: CoverLetterLayoutEngineProps) {

  const HeaderComponent = useMemo(() => {
    switch (templateType) {
      case 'classic':
        return ClassicHeader;
      case 'minimal':
        return MinimalHeader;
      case 'typographic':
        return TypographicHeader;
      case 'column-split':
        return ColumnSplitHeader;
      case 'accent-banner':
        return AccentBannerHeader;
      case 'creative-edge':
        return CreativeEdgeHeader;
      case 'executive-slate':
        return ExecutiveSlateHeader;
      case 'modern':
      default:
        return ModernHeader;
    }
  }, [templateType]);

  const defaultDesign: CoverLetterDesignProps = {
    fontSize: 15,
    lineHeight: 1.6,
    pageMargin: 6,
    accentColor: '#013f2e',
    fontFamily: templateType === 'classic' ? 'Garamond' : 'Calibri'
  };

  const activeDesign = { ...defaultDesign, ...design };

  // Unify body content into block units (HTML tags or double newlines)
  const letterBlocks = useMemo(() => {
    return splitHtmlIntoBlocks(bodyContent);
  }, [bodyContent]);

  const width = pageFormat === 'letter' ? getPageDimensions('Letter').widthCss : getPageDimensions('A4').widthCss;
  const minHeight = pageFormat === 'letter' ? getPageDimensions('Letter').heightCss : getPageDimensions('A4').heightCss;

  const [pageAssignments, setPageAssignments] = useState<Record<string, number>>({});
  const pageAssignmentsRef = useRef(pageAssignments);
  pageAssignmentsRef.current = pageAssignments;
  const recentAssignmentsRef = useRef<string[]>([]);

  useEffect(() => {
    const docElement = document.querySelector('.cover-letter-wrapper');
    if (!docElement) return;

    const measureAndPaginate = () => {
      const scale = zoom / 100;
      const pageDims = getPageDimensions(pageFormat === 'letter' ? 'Letter' : 'A4');
      const H = pageDims.heightPx;
      // Usable height = page minus the ACTUAL top/bottom margins. The page content
      // wrapper uses `${activeDesign.pageMargin}cqw` padding (cqw = % of page width),
      // so the real margin in px is (pageMargin / 100) * widthPx — not the old
      // hardcoded 160px estimate, which under-filled pages and caused premature
      // page breaks / blank trailing pages.
      const marginPx = (activeDesign.pageMargin / 100) * pageDims.widthPx;
      const usableHeight = H - 2 * marginPx;

      const unitHeights: Record<string, number> = {};

      const headerEl = docElement.querySelector('[data-unit-id="header"]');
      if (headerEl) {
        unitHeights['header'] = headerEl.getBoundingClientRect().height / scale;
      }

      docElement.querySelectorAll('[data-paragraph-id]').forEach(el => {
        const pId = el.getAttribute('data-paragraph-id');
        if (pId) {
          unitHeights[pId] = el.getBoundingClientRect().height / scale;
        }
      });

      const newAssignments: Record<string, number> = {};
      let currentPage = 0;
      let currentHeight = 0;

      // 1. Header
      const headerH = unitHeights['header'] || 160;
      const firstPH = letterBlocks.length > 0 ? (unitHeights['p_0'] || 80) : 0;
      
      if (currentHeight + headerH + 24 + firstPH > usableHeight && currentHeight > 0) {
        currentPage++;
        currentHeight = 0;
      }
      
      newAssignments['header'] = currentPage;
      currentHeight += headerH + 24;

      // 2. Paragraphs
      const pCount = letterBlocks.length;
      for (let i = 0; i < pCount; i++) {
        const pId = `p_${i}`;
        const pH = unitHeights[pId] || 80;
        if (currentHeight + pH > usableHeight && currentHeight > 0) {
          currentPage++;
          currentHeight = 0;
        }
        newAssignments[pId] = currentPage;
        currentHeight += pH + 16;
      }

      const assignmentsStr = JSON.stringify(newAssignments);
      if (recentAssignmentsRef.current.includes(assignmentsStr)) {
        return;
      }

      const oldAssignments = pageAssignmentsRef.current;
      const isChanged = Object.keys(newAssignments).some(id => newAssignments[id] !== oldAssignments[id]) ||
                        Object.keys(oldAssignments).some(id => newAssignments[id] !== oldAssignments[id]);
      if (isChanged) {
        recentAssignmentsRef.current.push(assignmentsStr);
        if (recentAssignmentsRef.current.length > 5) {
          recentAssignmentsRef.current.shift();
        }
        setPageAssignments(newAssignments);
      }
    };

    const rafId = requestAnimationFrame(measureAndPaginate);
    
    // Ensure fonts are loaded before initial measurement
    if (typeof document !== 'undefined' && (document as any).fonts) {
      (document as any).fonts.ready.then(() => {
        measureAndPaginate();
      });
    }

    let debounceTimer: any;
    const observer = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(measureAndPaginate, 80);
    });
    observer.observe(docElement, { childList: true, subtree: true, characterData: true });

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(debounceTimer);
      observer.disconnect();
    };
  }, [bodyContent, pageFormat, activeDesign, letterBlocks.length]);

  const maxPage = Object.values(pageAssignments).reduce((max, p) => Math.max(max, p), 0);
  const totalPages = maxPage + 1;
  const pages = Array.from({ length: totalPages }, (_, i) => i);
  const activePages = isEditing ? [0] : pages;

  return (
    <div
      id="cl-document-root"
      className={`flex flex-col items-center gap-6 cover-letter-wrapper ${selectedUnit ? 'cl-has-selection' : ''}`}
      style={{ width }}
    >
      <style>
        {`
          @import url('${DOCUMENT_GOOGLE_FONTS_URL}');
          .cl-document *, .cl-page * {
            min-width: 0 !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            word-break: normal !important;
            hyphens: none !important;
          }
          .cover-letter-document {
            font-family: var(--cv-font) !important;
          }
          .cover-letter-document * {
            font-family: inherit !important;
          }
          /* ─── FOCUS MODE — the letter's half of the CV spotlight ────────
           * The selected unit keeps full contrast; the other one is blurred and
           * dimmed so the focused object reads as the thing in focus. Applied per
           * UNIT rather than to the page, for the same reason the CV does it that
           * way: a filter on an ancestor cannot be undone by a descendant, so
           * blurring the page would blur the selected unit too. */
          .cl-has-selection .cl-unit {
            filter: blur(2px);
            opacity: 0.4;
            transition: filter 0.2s ease, opacity 0.2s ease;
          }
          .cl-has-selection .cl-unit[data-selected="true"] {
            filter: none;
            opacity: 1;
          }
          /* ONE border on the selected unit: the frame owns the only lime box, so
           * a focused contenteditable inside it must not add a second one. The
           * grey "this is editable" hover border is deliberately kept — it is an
           * affordance, not a selection border, and only ever on the field under
           * the pointer. */
          .cl-has-selection .cl-unit[data-selected="true"] [contenteditable]:focus,
          .cl-has-selection .cl-unit[data-selected="true"] [contenteditable]:focus-visible {
            box-shadow: none !important;
            outline: none !important;
            border-color: transparent !important;
          }
        `}
      </style>
      {activePages.map(pageIdx => {
        return (
          <div 
            key={pageIdx}
            className="bg-white dark:bg-white shadow-2xl flex flex-col text-black transition-all duration-500 ease-in-out relative cover-letter-document cv-document"
            style={{ 
              width,
              height: minHeight,
              minHeight,
              containerType: 'inline-size',
              fontSize: `${activeDesign.fontSize}px`,
              lineHeight: activeDesign.lineHeight,
              fontFamily: getDocumentFontStack(activeDesign.fontFamily),
              '--cv-accent': activeDesign.accentColor,
              '--cv-font': getDocumentFontStack(activeDesign.fontFamily),
              boxSizing: 'border-box',
              overflowWrap: 'break-word',
              whiteSpace: 'normal',
              wordBreak: 'normal',
              // Clip content at the physical page edge (like the CV canvas and
              // the DOM-capture PDF export) so long paragraphs cannot spill
              // past the page box into the next page's gap. Editing keeps
              // overflow visible so typing is not visually cut mid-document.
              overflow: isEditing ? 'visible' : 'hidden',
            } as React.CSSProperties}
          >
            <div 
              className="flex flex-col relative z-10 w-full h-full cover-letter-page-content"
              style={{ 
                padding: `${activeDesign.pageMargin}cqw`,
                boxSizing: 'border-box',
                height: '100%'
              }}
            >
              {/* Render Selected Header Snippet */}
              {pageIdx === 0 && (
                <div data-unit-id="header" className="w-full">
                  <CanvasSectionWrapper
                    isEditing={isEditing}
                    unit="header"
                    selected={selectedUnit === 'header'}
                    onClick={() => onSelectUnit?.('header')}
                  >
                    <HeaderComponent {...headerProps} />
                  </CanvasSectionWrapper>
                </div>
              )}

              {/* Body Layout - Single Column Responsive */}
              <div className="flex-1 min-h-0 mt-4">
                {isEditing ? (
                  <CanvasSectionWrapper
                    isEditing={isEditing}
                    unit="body"
                    selected={selectedUnit === 'body'}
                    onClick={() => onSelectUnit?.('body')}
                  >
                    <WYSIWYGEditor
                      value={bodyContent}
                      onChange={onBodyChange || (() => {})}
                      className="w-full text-black bg-transparent mt-2"
                      showToolbar={true}
                      reviewMode={false}
                      grammarLocale="us"
                      textColor="black"
                      autoExpand
                      noPadding={true}
                      sessionUndoStack={sessionUndoStack}
                      sessionRedoStack={sessionRedoStack}
                      onSessionUndo={onSessionUndo}
                      onSessionRedo={onSessionRedo}
                    />
                  </CanvasSectionWrapper>
                ) : (
                  <div className="space-y-4">
                    {letterBlocks.map((block, idx) => {
                      const assignedPage = pageAssignments[`p_${idx}`] ?? 0;
                      if (assignedPage !== pageIdx) return null;
                      return (
                        <div 
                          key={idx} 
                          data-paragraph-id={`p_${idx}`}
                          className="prose prose-sm max-w-none text-black text-justify leading-relaxed"
                          style={{ fontSize: 'inherit', lineHeight: 'inherit', overflowWrap: 'anywhere', wordBreak: 'normal' }}
                          dangerouslySetInnerHTML={{ __html: block }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
