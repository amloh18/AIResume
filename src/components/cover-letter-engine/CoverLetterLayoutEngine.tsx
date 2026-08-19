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
import { Sparkles, Type, Layout, Baseline, MoveHorizontal, LayoutTemplate, X, ChevronDown, Check, ShieldCheck } from 'lucide-react';

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
  fontFamily: 'font-sans' | 'font-serif' | 'font-mono';
}

interface CanvasSectionWrapperProps {
  children: React.ReactNode;
  isEditing: boolean;
  controls?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const CanvasSectionWrapper: React.FC<CanvasSectionWrapperProps> = ({
  children,
  isEditing,
  controls,
  className = '',
  onClick
}) => {
  if (!isEditing) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div 
      className={`relative group/inner w-full transition-all duration-200 p-2 -mx-2 rounded-md hover:z-30 cursor-pointer ${className}`}
      onClick={onClick}
    >
      {/* Top right tight toolbar */}
      {controls && (
        <div className="absolute -top-3.5 right-0 opacity-0 group-hover/inner:opacity-100 focus-within:opacity-100 transition-all duration-200 flex items-center bg-white dark:bg-[#141810] border border-slate-200 dark:border-white/10 shadow-lg rounded-xl p-0.5 gap-0.5 z-[50] no-print font-sans select-none">
          {controls}
        </div>
      )}
      
      {/* Hover border and background layer */}
      <div className="absolute inset-0 bg-emerald-500/[0.03] opacity-0 group-hover/inner:opacity-100 pointer-events-none transition-all duration-200 z-0 border border-transparent group-hover/inner:border-emerald-400 group-hover/inner:border-dashed shadow-none rounded-md group-hover/inner:rounded-tr-none group-hover/inner:rounded-tl-none animate-fade-in-up"></div>
      
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
  onToggleMoriChat,
  onChangeHeaderStyle,
  zoom = 100,
  sessionUndoStack,
  sessionRedoStack,
  onSessionUndo,
  onSessionRedo
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
    accentColor: '#80FF00',
    fontFamily: templateType === 'classic' ? 'font-serif' : 'font-sans'
  };

  const activeDesign = { ...defaultDesign, ...design };
  const fontClass = activeDesign.fontFamily;

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
    <div id="cl-document-root" className="flex flex-col items-center gap-6 cover-letter-wrapper" style={{ width }}>
      <style>
        {`
          .cl-document *, .cl-page * {
            min-width: 0 !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            word-break: normal !important;
            hyphens: none !important;
          }
        `}
      </style>
      {activePages.map(pageIdx => {
        return (
          <div 
            key={pageIdx}
            className={`bg-white dark:bg-white shadow-2xl flex flex-col text-black transition-all duration-500 ease-in-out relative cover-letter-document cv-document ${fontClass}`}
            style={{ 
              width,
              height: minHeight,
              minHeight,
              containerType: 'inline-size',
              fontSize: `${activeDesign.fontSize}px`,
              lineHeight: activeDesign.lineHeight,
              '--cv-accent': activeDesign.accentColor,
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
                    onClick={() => onChangeHeaderStyle && onChangeHeaderStyle()}
                    controls={
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onChangeHeaderStyle) onChangeHeaderStyle();
                        }}
                        className="flex items-center gap-1.5 h-7 px-2.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-bold text-[11px] transition-all duration-200 rounded-lg hover:scale-105 active:scale-95 bg-transparent" 
                        title="Change Header Style"
                      >
                        <LayoutTemplate size={12}/> 
                        <span>Change</span>
                      </button>
                    }
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
                    controls={
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onToggleMoriChat) onToggleMoriChat();
                        }}
                        className="flex items-center gap-1 h-7 px-2.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-bold text-[11px] transition-all duration-200 rounded-lg hover:scale-105 active:scale-95 bg-transparent" 
                        title="Ask Mori to improve"
                      >
                        <Sparkles size={12}/> 
                        <span>Ask Mori</span>
                      </button>
                    }
                  >
                    <WYSIWYGEditor
                      value={bodyContent}
                      onChange={onBodyChange || (() => {})}
                      className={`w-full ${fontClass} text-black bg-transparent mt-2`}
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
