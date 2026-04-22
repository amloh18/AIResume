'use client';

import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { gsap } from 'gsap';
import {
  ZoomIn, ZoomOut, Maximize2,
  Plus, Trash2, Bold, Italic,
  Underline, Strikethrough,
  List, ListOrdered, Undo2, Redo2,
  Heading1, Heading2,
  Type,
  ChevronUp, ChevronDown, X,
  GripVertical, Palette, Sparkles, Loader2,
  Calendar, Eye, EyeOff
} from 'lucide-react';
import { ThemeConfig } from '@/lib/templates/template-definition';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { ITemplate } from '@/types/template';
import type { FixAnnotation } from '@/components/resume-enhancer/annotations/fix-annotation';
import { getHighlitHTML } from '@/components/resume-enhancer/annotations/highlitHtml';
import { generateBullet } from '@/services/aiBulletService';
import { useFormatStore } from '@/lib/stores/formatStore';
import { DATE_FORMAT_OPTIONS } from '@/lib/utils/textFormatting';

const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1122;
const LETTER_WIDTH_PX = 816;
const LETTER_HEIGHT_PX = 1056;
const PAGE_MARGIN = 48;

export type PageFormat = 'a4' | 'letter';

interface BuilderPreviewProps {
  cvData: UnifiedCVDataStructure | null;
  template: ITemplate | null;
  theme?: ThemeConfig;
  mode?: 'preview' | 'edit';
  pageFormat?: PageFormat;
  showToolbar?: boolean;
  initialZoom?: number;
  className?: string;
  onCVDataChange?: (data: Partial<UnifiedCVDataStructure>) => void;
  onSectionClick?: (sectionId: string) => void;
  /** Rendered inside the toolbar on the right side (e.g. FloatingPulsePill) */
  toolbarRightSlot?: React.ReactNode;
  /** Whether the side panel is open */
  sidePanelOpen?: boolean;
  /** Ref forwarded to the side panel container — used as portal target for pill panels */
  sidePanelRef?: React.Ref<HTMLDivElement>;
  /** Field path to highlight in the CV preview (e.g. 'work[0].highlights[2]') */
  highlightedField?: string | null;
  /** Open fix annotations for inline highlighting in preview */
  fixAnnotations?: FixAnnotation[];
  /** Called when a highlight span is clicked in the preview */
  onAnnotationClick?: (fixId: string) => void;
}

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5];

// ========== FORMAT TOOLBAR (persistent in edit mode) ==========
const FormatToolbar = memo(() => {
  const exec = useCallback((cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
  }, []);

  const dateFormat = useFormatStore((s) => s.dateFormat);
  const setDateFormat = useFormatStore((s) => s.setDateFormat);
  const showContactIcons = useFormatStore((s) => s.showContactIcons);
  const setShowContactIcons = useFormatStore((s) => s.setShowContactIcons);
  const sectionTitleStyle = useFormatStore((s) => s.sectionTitleStyle);
  const setSectionTitleStyle = useFormatStore((s) => s.setSectionTitleStyle);

  const cycleTitleStyle = useCallback(() => {
    const styles: Array<'bordered' | 'minimal' | 'accent' | 'spaced'> = ['bordered', 'minimal', 'accent', 'spaced'];
    const currentIdx = styles.indexOf(sectionTitleStyle);
    const next = styles[(currentIdx + 1) % styles.length];
    setSectionTitleStyle(next);
  }, [sectionTitleStyle, setSectionTitleStyle]);

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto">
      <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-full px-1 py-0.5 shadow-sm">
        <FmtBtn onClick={() => exec('bold')} title="Bold"><Bold size={14} /></FmtBtn>
        <FmtBtn onClick={() => exec('italic')} title="Italic"><Italic size={14} /></FmtBtn>
        <FmtBtn onClick={() => exec('underline')} title="Underline"><Underline size={14} /></FmtBtn>
        <FmtBtn onClick={() => exec('strikeThrough')} title="Strikethrough"><Strikethrough size={14} /></FmtBtn>
      </div>
      <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-full px-1 py-0.5 shadow-sm">
        <FmtBtn onClick={() => exec('formatBlock', 'h1')} title="Heading 1"><Heading1 size={14} /></FmtBtn>
        <FmtBtn onClick={() => exec('formatBlock', 'h2')} title="Heading 2"><Heading2 size={14} /></FmtBtn>
        <FmtBtn onClick={() => exec('formatBlock', 'p')} title="Paragraph"><Type size={14} /></FmtBtn>
      </div>
      <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-full px-1 py-0.5 shadow-sm">
        <FmtBtn onClick={() => exec('insertUnorderedList')} title="Bullet List"><List size={14} /></FmtBtn>
        <FmtBtn onClick={() => exec('insertOrderedList')} title="Numbered List"><ListOrdered size={14} /></FmtBtn>
      </div>
      <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-full px-1 py-0.5 shadow-sm">
        <FmtBtn onClick={() => exec('undo')} title="Undo"><Undo2 size={14} /></FmtBtn>
        <FmtBtn onClick={() => exec('redo')} title="Redo"><Redo2 size={14} /></FmtBtn>
      </div>

      <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />

      {/* Date format selector */}
      <div className="relative group/date">
        <FmtBtn onClick={() => {}} title="Date Format"><Calendar size={14} /></FmtBtn>
        <div className="hidden group-hover/date:block absolute top-full left-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 py-1 min-w-[160px]">
          {DATE_FORMAT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDateFormat(opt.value)}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                dateFormat === opt.value ? 'text-lime-600 dark:text-lime-400 font-medium' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              <div>{opt.label}</div>
              <div className="text-[10px] text-gray-400">{opt.example}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Contact icons toggle */}
      <FmtBtn
        onClick={() => setShowContactIcons(!showContactIcons)}
        title={showContactIcons ? 'Hide icons' : 'Show icons'}
        active={showContactIcons}
      >
        {showContactIcons ? <Eye size={14} /> : <EyeOff size={14} />}
      </FmtBtn>

      {/* Title style cycle */}
      <FmtBtn onClick={cycleTitleStyle} title={`Title: ${sectionTitleStyle}`}>
        <span className="text-[10px] font-medium capitalize">{sectionTitleStyle[0]}</span>
      </FmtBtn>
    </div>
  );
});
FormatToolbar.displayName = 'FormatToolbar';

function FmtBtn({ onClick, title, children, active }: { onClick: () => void; title: string; children: React.ReactNode; active?: boolean }) {
  return (
    <button
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-full transition-all ${active ? 'bg-lime-500/20 text-lime-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200'}`}
    >
      {children}
    </button>
  );
}

// ========== SECTION TOOLBAR (per-section controls) ==========
const SectionToolbar = memo(({
  label,
  onAddEntry,
  onDeleteSection,
  canDelete,
  onMoveUp,
  onMoveDown,
  onSnippetClick,
  hasSnippets,
  onDragStart,
}: {
  label: string;
  onAddEntry?: () => void;
  onDeleteSection?: () => void;
  canDelete?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onSnippetClick?: () => void;
  hasSnippets?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}) => {
  return (
    <div className="flex items-center gap-0.5 absolute -left-2 top-0 z-[100] bg-gray-900/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700 px-1.5 py-1 opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none group-hover:pointer-events-auto -translate-x-full">
      {/* Drag handle */}
      <button
        draggable
        onDragStart={onDragStart}
        className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-grab active:cursor-grabbing"
        title="Drag to reorder"
      >
        <GripVertical size={12} />
      </button>

      <div className="w-px h-3.5 bg-gray-600 mx-0.5" />

      {/* Section name */}
      <span className="text-[10px] font-semibold text-lime-400 px-1 whitespace-nowrap">{label}</span>

      <div className="w-px h-3.5 bg-gray-600 mx-0.5" />

      {/* Move controls */}
      {onMoveUp && (
        <button onClick={(e) => { e.stopPropagation(); onMoveUp(); }} className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors" title="Move Up">
          <ChevronUp size={11} />
        </button>
      )}
      {onMoveDown && (
        <button onClick={(e) => { e.stopPropagation(); onMoveDown(); }} className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors" title="Move Down">
          <ChevronDown size={11} />
        </button>
      )}

      {/* Add entry */}
      {onAddEntry && (
        <button onClick={(e) => { e.stopPropagation(); onAddEntry(); }} className="p-1 rounded text-gray-400 hover:text-lime-400 hover:bg-lime-400/10 transition-colors" title={`Add ${label}`}>
          <Plus size={11} />
        </button>
      )}

      {/* Snippet design change */}
      {hasSnippets && onSnippetClick && (
        <button onClick={(e) => { e.stopPropagation(); onSnippetClick(); }} className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors" title="Change design">
          <Palette size={11} />
        </button>
      )}

      {/* Delete section */}
      {canDelete && onDeleteSection && (
        <button onClick={(e) => { e.stopPropagation(); onDeleteSection(); }} className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors" title="Remove">
          <Trash2 size={11} />
        </button>
      )}
    </div>
  );
});
SectionToolbar.displayName = 'SectionToolbar';

// ========== ENTRY TOOLBAR (per-entry add/delete) ==========
const EntryToolbar = memo(({
  onDelete,
  onAddBelow,
  onAIGenerate,
  label,
}: {
  onDelete?: () => void;
  onAddBelow?: () => void;
  onAIGenerate?: () => Promise<void>;
  label?: string;
}) => {
  const [generating, setGenerating] = useState(false);

  const handleAIGenerate = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (generating || !onAIGenerate) return;
    setGenerating(true);
    try {
      await onAIGenerate();
    } finally {
      setGenerating(false);
    }
  }, [generating, onAIGenerate]);

  return (
    <div className="flex items-center gap-0.5 absolute -right-2 top-0 z-[100] bg-gray-900/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-md border border-gray-700 px-1.5 py-0.5 opacity-0 group-hover/item:opacity-100 transition-all duration-150 pointer-events-none group-hover/item:pointer-events-auto">
      {label && <span className="text-[8px] text-gray-500 px-1 max-w-[60px] truncate">{label}</span>}
      {onAddBelow && (
        <button onClick={(e) => { e.stopPropagation(); onAddBelow(); }} className="p-0.5 rounded text-gray-400 hover:text-lime-400 hover:bg-lime-400/10 transition-colors" title="Add below">
          <Plus size={10} />
        </button>
      )}
      {onAIGenerate && (
        <button
          onClick={handleAIGenerate}
          disabled={generating}
          className={`p-0.5 rounded transition-colors ${generating ? 'text-lime-400 animate-pulse' : 'text-gray-400 hover:text-lime-400 hover:bg-lime-400/10'}`}
          title="AI generate bullet point"
        >
          {generating ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
        </button>
      )}
      {onDelete && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-0.5 rounded text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors" title="Delete">
          <Trash2 size={10} />
        </button>
      )}
    </div>
  );
});
EntryToolbar.displayName = 'EntryToolbar';

// ========== EDITABLE TEXT ==========
const EditableText = memo(({
  value,
  onChange,
  className = '',
  tag: Tag = 'span',
  multiline = false,
  placeholder = 'Click to edit...',
  style = {},
  annotations = [],
  fieldPath = '',
}: {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  tag?: keyof React.JSX.IntrinsicElements;
  multiline?: boolean;
  placeholder?: string;
  style?: React.CSSProperties;
  annotations?: FixAnnotation[];
  fieldPath?: string;
}) => {
  const ref = useRef<HTMLElement>(null);
  const [isEmpty, setIsEmpty] = useState(!value || value.trim() === '' || value === '<br>');
  const [isFocused, setIsFocused] = useState(false);

  // Annotations that apply to this field
  const fieldAnnotations = fieldPath
    ? annotations.filter(a => a.fieldPath === fieldPath && a.status === 'open')
    : [];
  const hasAnnotations = fieldAnnotations.length > 0;
  // When annotations exist and we're not focused, we use dangerouslySetInnerHTML
  // so the useEffect must NOT overwrite it
  const useAnnotationMode = hasAnnotations && !isFocused;

  useEffect(() => {
    if (useAnnotationMode) return; // Don't overwrite annotation HTML
    if (ref.current && document.activeElement !== ref.current) {
      const html = value || '';
      if (ref.current.innerHTML !== html) {
        ref.current.innerHTML = html;
      }
      setIsEmpty(!html || html.trim() === '' || html === '<br>');
    }
  }, [value, useAnnotationMode]);

  const handleInput = useCallback(() => {
    if (ref.current) {
      const text = ref.current.innerHTML;
      setIsEmpty(!text || text.trim() === '' || text === '<br>');
    }
  }, []);

  const handleFocus = useCallback(() => setIsFocused(true), []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    if (ref.current) {
      const newValue = ref.current.innerHTML;
      if (newValue === '<br>' || newValue.trim() === '') {
        ref.current.innerHTML = '';
        setIsEmpty(true);
      }
      if (newValue !== value && newValue !== '<br>') {
        onChange(newValue);
      }
    }
  }, [value, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      (ref.current as HTMLElement)?.blur();
    }
    if (e.key === 'Escape') {
      if (ref.current) ref.current.innerHTML = value || '';
      (ref.current as HTMLElement)?.blur();
    }
  }, [multiline, value]);

  return (
    <span className="relative inline-block w-full">
      {/* Show highlighted preview when not focused and annotations exist */}
      {hasAnnotations && !isFocused ? (
        React.createElement(Tag, {
          ref,
          className: `${className} cursor-text min-h-[1em] rounded-sm px-0.5`,
          style: { ...style, minHeight: '1em' },
          onClick: () => { ref.current?.focus(); },
          dangerouslySetInnerHTML: { __html: getHighlitHTML(value || '', fieldAnnotations, false) },
        })
      ) : (
        React.createElement(Tag, {
          ref,
          contentEditable: true,
          suppressContentEditableWarning: true,
          onFocus: handleFocus,
          onBlur: handleBlur,
          onInput: handleInput,
          onKeyDown: handleKeyDown,
          className: `${className} outline-none transition-all cursor-text min-h-[1em] text-inherit hover:bg-lime-50/30 dark:hover:bg-lime-900/10 focus:bg-lime-50/50 dark:focus:bg-lime-900/20 focus:ring-1 focus:ring-lime-400/30 rounded-sm px-0.5`,
          style: { ...style, minHeight: '1em', caretColor: '#84cc16' },
        })
      )}
      {isEmpty && (
        <span
          className="absolute left-0.5 top-0 pointer-events-none text-gray-400/60 italic text-[inherit]"
          style={{ fontSize: 'inherit', lineHeight: 'inherit' }}
        >
          {placeholder}
        </span>
      )}
    </span>
  );
});
EditableText.displayName = 'EditableText';

// ========== EDITABLE BULLETS ==========
const EditableBullets = memo(({
  items,
  onChange,
  className = '',
}: {
  items: string[];
  onChange: (items: string[]) => void;
  className?: string;
}) => {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (listRef.current && !listRef.current.contains(document.activeElement)) {
      const lis = listRef.current.querySelectorAll('li');
      lis.forEach((li, i) => {
        if (li.innerHTML !== (items[i] || '')) {
          li.innerHTML = items[i] || '';
        }
      });
    }
  }, [items]);

  const handleBlur = useCallback(() => {
    if (!listRef.current) return;
    const lis = listRef.current.querySelectorAll('li');
    const newItems = Array.from(lis).map(li => li.innerHTML).filter(s => s.trim() && s !== '<br>');
    if (JSON.stringify(newItems) !== JSON.stringify(items)) {
      onChange(newItems);
    }
  }, [items, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const li = document.createElement('li');
        li.innerHTML = '<br>';
        const currentLi = (e.target as HTMLElement).closest('li');
        if (currentLi && currentLi.parentNode) {
          currentLi.parentNode.insertBefore(li, currentLi.nextSibling);
          const range = document.createRange();
          range.setStart(li, 0);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    }
    if (e.key === 'Backspace' && items.length > 1) {
      const currentLi = (e.target as HTMLElement).closest('li');
      if (currentLi && (!currentLi.textContent || currentLi.textContent.trim() === '')) {
        e.preventDefault();
        const idx = Array.from(listRef.current!.querySelectorAll('li')).indexOf(currentLi as HTMLLIElement);
        if (idx > 0) {
          currentLi.remove();
          const newItems = [...items];
          newItems.splice(idx, 1);
          onChange(newItems);
        }
      }
    }
  }, [items, onChange]);

  return (
    <ul
      ref={listRef}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={`${className} outline-none ml-5 list-disc space-y-0.5 focus:bg-lime-50/30 dark:focus:bg-lime-900/10 focus:ring-1 focus:ring-lime-400/30 rounded-sm`}
    >
      {(items.length > 0 ? items : ['']).map((item, i) => (
        <li key={i} dangerouslySetInnerHTML={{ __html: item || '<br>' }} className="cursor-text hover:bg-lime-50/20 dark:hover:bg-lime-90/10 rounded-sm px-0.5" />
      ))}
    </ul>
  );
});
EditableBullets.displayName = 'EditableBullets';

// ========== MAIN COMPONENT ==========
export const BuilderPreview: React.FC<BuilderPreviewProps> = ({
  cvData,
  template,
  theme,
  mode = 'preview',
  pageFormat = 'a4',
  showToolbar = true,
  initialZoom = 1,
  className = '',
  onCVDataChange,
  onSectionClick,
  toolbarRightSlot,
  sidePanelOpen = false,
  sidePanelRef,
  highlightedField,
  fixAnnotations = [],
  onAnnotationClick,
}) => {
  const [zoom, setZoom] = useState(initialZoom);
  const [activePageFormat, setActivePageFormat] = useState<PageFormat>(pageFormat);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const pageWidth = activePageFormat === 'letter' ? LETTER_WIDTH_PX : A4_WIDTH_PX;
  const pageHeight = activePageFormat === 'letter' ? LETTER_HEIGHT_PX : A4_HEIGHT_PX;
  const primaryColor = template?.globalStyles?.primaryColor || '#84cc16';
  const fontFamily = template?.globalStyles?.fontFamily || 'Inter, system-ui, sans-serif';
  const isEdit = mode === 'edit';

  const handleZoomIn = useCallback(() => {
    setZoom(prev => { const idx = ZOOM_LEVELS.indexOf(prev); return idx < ZOOM_LEVELS.length - 1 ? ZOOM_LEVELS[idx + 1] : prev; });
  }, []);
  const handleZoomOut = useCallback(() => {
    setZoom(prev => { const idx = ZOOM_LEVELS.indexOf(prev); return idx > 0 ? ZOOM_LEVELS[idx - 1] : prev; });
  }, []);

  // Annotation click handler — detects clicks on .cv-highlight spans
  const handlePreviewClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const highlight = target.closest('.cv-highlight') as HTMLElement | null;
    if (highlight && onAnnotationClick) {
      const fixId = highlight.getAttribute('data-fix-id');
      if (fixId) {
        e.preventDefault();
        e.stopPropagation();
        onAnnotationClick(fixId);
      }
    }
  }, [onAnnotationClick]);

  // Data helpers
  const updateField = useCallback((path: (string | number)[], value: any) => {
    if (!cvData || !onCVDataChange) return;
    const updated = JSON.parse(JSON.stringify(cvData));
    let obj: any = updated;
    for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]];
    obj[path[path.length - 1]] = value;
    onCVDataChange(updated);
  }, [cvData, onCVDataChange]);

  const addItem = useCallback((path: (string | number)[], tpl: any) => {
    if (!cvData || !onCVDataChange) return;
    const updated = JSON.parse(JSON.stringify(cvData));
    let arr: any = updated;
    for (const p of path) arr = arr[p];
    if (Array.isArray(arr)) { arr.push({ ...tpl }); onCVDataChange(updated); }
  }, [cvData, onCVDataChange]);

  const removeItem = useCallback((path: (string | number)[], index: number) => {
    if (!cvData || !onCVDataChange) return;
    const updated = JSON.parse(JSON.stringify(cvData));
    let arr: any = updated;
    for (const p of path) arr = arr[p];
    if (Array.isArray(arr)) { arr.splice(index, 1); onCVDataChange(updated); }
  }, [cvData, onCVDataChange]);

  const moveItem = useCallback((path: (string | number)[], from: number, to: number) => {
    if (!cvData || !onCVDataChange) return;
    const updated = JSON.parse(JSON.stringify(cvData));
    let arr: any = updated;
    for (const p of path) arr = arr[p];
    if (Array.isArray(arr) && to >= 0 && to < arr.length) {
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      onCVDataChange(updated);
    }
  }, [cvData, onCVDataChange]);

  // AI bullet generation handler
  const handleAIBulletGenerate = useCallback(async (
    sectionType: string,
    entryIndex: number,
    entryData: any,
    existingBullets: string[]
  ): Promise<string> => {
    try {
      const result = await generateBullet({
        sectionType: sectionType as 'experience' | 'education' | 'project',
        entryData,
        existingBullets,
        profileSummary: cvData?.basics?.summary,
      });
      return result.success ? result.bullet : '';
    } catch (err) {
      console.error('AI bullet generation failed:', err);
      return '';
    }
  }, [cvData?.basics?.summary]);

  return (
    <div className={`builder-preview flex flex-col h-full ${className}`}>
      {/* TOP TOOLBAR — left: controls, right: pill */}
      {showToolbar && (
        <div className="toolbar flex items-center justify-between px-4 py-1.5 flex-shrink-0">
          {/* Left: format controls */}
          <div className="flex items-center gap-2">
            {isEdit && <FormatToolbar />}
          </div>

          {/* Right: floating pill slot */}
          {toolbarRightSlot && (
            <div className="flex items-center flex-shrink-0">
              {toolbarRightSlot}
            </div>
          )}
        </div>
      )}

      {/* MAIN CONTENT — CV preview + optional side panel */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* CV PREVIEW */}
        <div className="flex-1 overflow-auto bg-[#525659] p-6 flex justify-center transition-all duration-300" onClick={handlePreviewClick}>
          <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
            <div className="bg-white shadow-2xl relative" style={{ width: `${pageWidth}px`, minHeight: `${pageHeight}px`, fontFamily }}>
              <div style={{ padding: `${PAGE_MARGIN}px` }}>
                {cvData ? (
                  <InlineCVDocument
                    cvData={cvData}
                    primaryColor={primaryColor}
                    isEdit={isEdit}
                    activeSection={activeSection}
                    highlightedField={highlightedField}
                    fixAnnotations={fixAnnotations}
                    onSectionFocus={setActiveSection}
                    updateField={updateField}
                    addItem={addItem}
                    removeItem={removeItem}
                    moveItem={moveItem}
                    onAIBulletGenerate={handleAIBulletGenerate}
                  />
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-400">No CV data available</div>
                )}
              </div>
              <div className="absolute bottom-3 right-4 text-[10px] text-gray-300">1</div>
            </div>
          </div>
        </div>

        </div>


      {/* Status */}
      <div className="flex items-center justify-between px-4 py-1 border-t border-gray-200/50 dark:border-gray-700/50 text-[10px] text-gray-400">
        {/* Left: Page Info */}
        <div className="flex items-center gap-1.5 font-medium min-w-[120px]">
          <button 
            onClick={() => setActivePageFormat(prev => prev === 'a4' ? 'letter' : 'a4')}
            className="hover:text-lime-500 transition-colors uppercase cursor-pointer"
          >
            {activePageFormat.toUpperCase()}
          </button>
          <span>• {pageWidth}x{pageHeight}px</span>
        </div>

        {/* Center: Zoom Controls */}
        <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-full p-0.5 shadow-sm scale-90 origin-center">
          <button onClick={handleZoomOut} disabled={zoom <= ZOOM_LEVELS[0]} className="p-1 rounded-full hover:bg-white dark:hover:bg-gray-700 disabled:opacity-50 transition-all"><ZoomOut size={13} /></button>
          <span className="text-[10px] min-w-[35px] text-center font-bold px-1">{Math.round(zoom * 100)}%</span>
          <button onClick={handleZoomIn} disabled={zoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]} className="p-1 rounded-full hover:bg-white dark:hover:bg-gray-700 disabled:opacity-50 transition-all"><ZoomIn size={13} /></button>
          <button onClick={() => setZoom(1)} className="p-1 rounded-full hover:bg-white dark:hover:bg-gray-700 transition-all"><Maximize2 size={13} /></button>
        </div>

        {/* Right: Spacer/Empty for now */}
        <div className="min-w-[120px] flex justify-end">
          <span className="opacity-50">Page 1 of 1</span>
        </div>
      </div>
    </div>
  );
};

// ========== INLINE CV DOCUMENT ==========
function InlineCVDocument({
  cvData,
  primaryColor,
  isEdit,
  activeSection,
  highlightedField,
  fixAnnotations = [],
  onSectionFocus,
  updateField,
  addItem,
  removeItem,
  moveItem,
  onAIBulletGenerate,
}: {
  cvData: UnifiedCVDataStructure;
  primaryColor: string;
  isEdit: boolean;
  activeSection: string | null;
  highlightedField?: string | null;
  fixAnnotations?: FixAnnotation[];
  onSectionFocus: (id: string | null) => void;
  updateField: (path: (string | number)[], value: any) => void;
  addItem: (path: (string | number)[], tpl: any) => void;
  removeItem: (path: (string | number)[], idx: number) => void;
  moveItem: (path: (string | number)[], from: number, to: number) => void;
  onAIBulletGenerate?: (sectionType: string, entryIndex: number, entryData: any, existingBullets: string[]) => Promise<string>;
}) {
  const b = cvData.basics || {};
  const work = cvData.work || [];
  const edu = cvData.education || [];
  const skills = cvData.skills || [];
  const proj = cvData.projects || [];
  const certs = cvData.certificates || [];
  const langs = cvData.languages || [];
  const vol = cvData.volunteer || [];
  const awards = cvData.awards || [];

  // Format store values
  const showContactIcons = useFormatStore((s) => s.showContactIcons);
  const sectionTitleStyle = useFormatStore((s) => s.sectionTitleStyle);

  // Section title class based on style
  const getTitleClass = () => {
    switch (sectionTitleStyle) {
      case 'minimal':
        return 'text-sm font-bold uppercase tracking-wider pb-1 mb-3';
      case 'accent':
        return 'text-sm font-bold uppercase tracking-wider pl-2 mb-3 border-l-2';
      case 'spaced':
        return 'text-sm font-bold uppercase tracking-wider pb-1 mb-3 flex items-center gap-2 after:flex-1 after:h-px after:bg-gray-200';
      case 'bordered':
      default:
        return 'text-sm font-bold uppercase tracking-wider border-b pb-1 mb-3';
    }
  };

  const getTitleStyle = (): React.CSSProperties => {
    switch (sectionTitleStyle) {
      case 'accent':
        return { color: primaryColor, borderColor: primaryColor };
      case 'minimal':
        return { color: primaryColor };
      case 'spaced':
        return { color: primaryColor };
      case 'bordered':
      default:
        return { color: primaryColor, borderColor: primaryColor + '40' };
    }
  };

  // Inline contact icon SVGs
  const ContactIcon = ({ type }: { type: string }) => {
    if (!showContactIcons) return null;
    const icons: Record<string, React.ReactNode> = {
      email: <svg className="w-2.5 h-2.5 inline-block mr-1 opacity-60" fill="currentColor" viewBox="0 0 20 20"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>,
      phone: <svg className="w-2.5 h-2.5 inline-block mr-1 opacity-60" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>,
      location: <svg className="w-2.5 h-2.5 inline-block mr-1 opacity-60" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>,
      url: <svg className="w-2.5 h-2.5 inline-block mr-1 opacity-60" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" /></svg>,
    };
    return <>{icons[type]}</>;
  };

  // Check if a field path matches the highlighted field
  const isHighlighted = (fieldPath: string) => {
    if (!highlightedField) return false;
    return highlightedField === fieldPath || highlightedField.startsWith(fieldPath + '.') || highlightedField.startsWith(fieldPath + '[');
  };

  // Get highlight class for a section
  const hlClass = (sectionId: string) => {
    if (isHighlighted(sectionId)) return 'ring-2 ring-[#80FF00]/60 bg-[#80FF00]/5';
    return '';
  };

  return (
    <div className="space-y-4 text-[11px] leading-relaxed text-gray-900 select-text" style={{ color: '#1f2937' }}>

      {/* ===== BASICS ===== */}
      <div
        data-section-id="basics"
        className={`relative group overflow-visible rounded-md transition-all ${isEdit ? 'cursor-text' : ''} ${activeSection === 'basics' ? 'ring-2 ring-lime-400/40 bg-lime-50/20' : ''} ${hlClass('basics')}`}
        onClick={() => isEdit && onSectionFocus('basics')}
      >
        {isEdit && <SectionToolbar label="Personal Info" />}
        <EditableText tag="h1" value={b.name || ''} onChange={(v) => updateField(['basics', 'name'], v)} className="text-2xl font-bold text-gray-900" placeholder="Your Name" annotations={fixAnnotations} fieldPath="basics.name" />
        <EditableText tag="p" value={b.label || ''} onChange={(v) => updateField(['basics', 'label'], v)} className="text-sm text-gray-600 mt-0.5" placeholder="Professional Title" annotations={fixAnnotations} fieldPath="basics.label" />
        <div className="flex flex-wrap items-center gap-x-1 mt-2 text-[10px] text-gray-500">
          {b.email && (
            <>
              <span className="inline-flex items-center"><ContactIcon type="email" /><EditableText value={b.email || ''} onChange={(v) => updateField(['basics', 'email'], v)} placeholder="email@example.com" className="text-gray-500" annotations={fixAnnotations} fieldPath="basics.email" /></span>
              {(b.phone || b.location?.city || b.url) && <span className="text-gray-300 mx-1">|</span>}
            </>
          )}
          {b.phone && (
            <>
              <span className="inline-flex items-center"><ContactIcon type="phone" /><EditableText value={b.phone || ''} onChange={(v) => updateField(['basics', 'phone'], v)} placeholder="+1 234 567 890" className="text-gray-500" annotations={fixAnnotations} fieldPath="basics.phone" /></span>
              {(b.location?.city || b.url) && <span className="text-gray-300 mx-1">|</span>}
            </>
          )}
          {b.location?.city && (
            <>
              <span className="inline-flex items-center"><ContactIcon type="location" /><EditableText value={b.location?.city || ''} onChange={(v) => updateField(['basics', 'location', 'city'], v)} placeholder="City, Country" className="text-gray-500" annotations={fixAnnotations} fieldPath="basics.location.city" /></span>
              {b.url && <span className="text-gray-300 mx-1">|</span>}
            </>
          )}
          {b.url && (
            <span className="inline-flex items-center"><ContactIcon type="url" /><EditableText value={b.url || ''} onChange={(v) => updateField(['basics', 'url'], v)} placeholder="website.com" className="text-lime-600" annotations={fixAnnotations} fieldPath="basics.url" /></span>
          )}
        </div>
        <EditableText tag="p" value={b.summary || ''} onChange={(v) => updateField(['basics', 'summary'], v)} className="mt-3 text-gray-700 leading-relaxed" multiline placeholder="Professional summary..." annotations={fixAnnotations} fieldPath="basics.summary" />
      </div>

      {/* ===== WORK ===== */}
      {work.length > 0 && (
        <div data-section-id="work" className={`relative group overflow-visible rounded-md transition-all hover:bg-black/[0.012] ${activeSection === 'work' ? 'ring-2 ring-lime-400/40 bg-lime-50/20' : ''} ${hlClass('work')}`} onClick={() => isEdit && onSectionFocus('work')}>
          {isEdit && <SectionToolbar label="Experience" onAddEntry={() => addItem(['work'], { name: '', position: '', startDate: '', endDate: '', summary: '', highlights: [] })} hasSnippets={false} />}
          <h2 className={getTitleClass()} style={getTitleStyle()}>Experience</h2>
          <div className="space-y-4">
            {work.map((job: any, i: number) => (
              <div key={i} className="relative group/item pl-2">
                {isEdit && (
                  <EntryToolbar
                    onDelete={() => removeItem(['work'], i)}
                    onAddBelow={() => addItem(['work'], { name: '', position: '', startDate: '', endDate: '', summary: '', highlights: [] })}
                    onAIGenerate={onAIBulletGenerate ? async () => {
                      const bullet = await onAIBulletGenerate('experience', i, job, job.highlights || []);
                      if (bullet) {
                        updateField(['work', i, 'highlights'], [...(job.highlights || []), bullet]);
                      }
                    } : undefined}
                    label={job.position || 'Entry'}
                  />
                )}
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <EditableText tag="div" value={String(job.position || '')} onChange={(v) => updateField(['work', i, 'position'], v)} className="font-semibold text-gray-900" placeholder="Position Title" annotations={fixAnnotations} fieldPath={`work[${i}].position`} />
                    <EditableText tag="div" value={String(job.name || '')} onChange={(v) => updateField(['work', i, 'name'], v)} className="text-gray-600" placeholder="Company Name" annotations={fixAnnotations} fieldPath={`work[${i}].name`} />
                  </div>
                  <div className="text-[10px] text-gray-400 flex items-center gap-1 flex-shrink-0">
                    <EditableText value={String(job.startDate || '')} onChange={(v) => updateField(['work', i, 'startDate'], v)} placeholder="2020" annotations={fixAnnotations} fieldPath={`work[${i}].startDate`} />
                    <span>–</span>
                    <EditableText value={String(job.endDate || '')} onChange={(v) => updateField(['work', i, 'endDate'], v)} placeholder="Present" annotations={fixAnnotations} fieldPath={`work[${i}].endDate`} />
                  </div>
                </div>
                <EditableText tag="p" value={String(job.summary || '')} onChange={(v) => updateField(['work', i, 'summary'], v)} className="mt-1 text-gray-600" multiline placeholder="Describe your role..." annotations={fixAnnotations} fieldPath={`work[${i}].summary`} />
                <EditableBullets items={job.highlights || []} onChange={(v) => updateField(['work', i, 'highlights'], v)} className="mt-1 text-gray-600" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== EDUCATION ===== */}
      {edu.length > 0 && (
        <div data-section-id="education" className={`relative group overflow-visible rounded-md transition-all hover:bg-black/[0.012] ${activeSection === 'education' ? 'ring-2 ring-lime-400/40 bg-lime-50/20' : ''} ${hlClass('education')}`} onClick={() => isEdit && onSectionFocus('education')}>
          {isEdit && <SectionToolbar label="Education" onAddEntry={() => addItem(['education'], { institution: '', studyType: '', area: '', startDate: '', endDate: '' })} hasSnippets={false} />}
          <h2 className={getTitleClass()} style={getTitleStyle()}>Education</h2>
          <div className="space-y-3">
            {edu.map((e: any, i: number) => (
              <div key={i} className="relative group/item flex justify-between items-start pl-2">
                {isEdit && <EntryToolbar onDelete={() => removeItem(['education'], i)} onAddBelow={() => addItem(['education'], { institution: '', studyType: '', area: '', startDate: '', endDate: '' })} />}
                <div className="flex-1">
                  <div className="flex gap-1 flex-wrap">
                    <EditableText tag="span" value={String(e.studyType || '')} onChange={(v) => updateField(['education', i, 'studyType'], v)} className="font-semibold text-gray-900" placeholder="Degree" annotations={fixAnnotations} fieldPath={`education[${i}].studyType`} />
                    <EditableText tag="span" value={String(e.area ? `in ${e.area}` : '')} onChange={(v) => updateField(['education', i, 'area'], v.replace(/^in\s+/i, ''))} className="text-gray-700" placeholder="in Field" annotations={fixAnnotations} fieldPath={`education[${i}].area`} />
                  </div>
                  <EditableText tag="div" value={String(e.institution || '')} onChange={(v) => updateField(['education', i, 'institution'], v)} className="text-gray-600" placeholder="Institution Name" annotations={fixAnnotations} fieldPath={`education[${i}].institution`} />
                </div>
                <div className="text-[10px] text-gray-400 flex items-center gap-1 flex-shrink-0">
                  <EditableText value={String(e.startDate || '')} onChange={(v) => updateField(['education', i, 'startDate'], v)} placeholder="2016" annotations={fixAnnotations} fieldPath={`education[${i}].startDate`} />
                  <span>–</span>
                  <EditableText value={String(e.endDate || '')} onChange={(v) => updateField(['education', i, 'endDate'], v)} placeholder="2020" annotations={fixAnnotations} fieldPath={`education[${i}].endDate`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== SKILLS ===== */}
      {skills.length > 0 && (
        <div data-section-id="skills" className={`relative group overflow-visible rounded-md transition-all hover:bg-black/[0.012] ${activeSection === 'skills' ? 'ring-2 ring-lime-400/40 bg-lime-50/20' : ''} ${hlClass('skills')}`} onClick={() => isEdit && onSectionFocus('skills')}>
          {isEdit && <SectionToolbar label="Skills" onAddEntry={() => addItem(['skills'], { category: '', skills: [] })} hasSnippets={true} onSnippetClick={() => {}} />}
          <h2 className={getTitleClass()} style={getTitleStyle()}>Skills</h2>
          <div className="space-y-2">
            {skills.map((sg: any, i: number) => (
              <div key={i} className="relative group/item pl-2">
                {isEdit && <EntryToolbar onDelete={() => removeItem(['skills'], i)} onAddBelow={() => addItem(['skills'], { category: '', skills: [] })} />}
                <EditableText tag="span" value={String(sg.category ? `${sg.category}: ` : '')} onChange={(v) => updateField(['skills', i, 'category'], v.replace(/:\s*$/, ''))} className="font-semibold text-gray-700" placeholder="Category: " annotations={fixAnnotations} fieldPath={`skills[${i}].category`} />
                <EditableText tag="span" value={String((sg.skills || []).join(', '))} onChange={(v) => updateField(['skills', i, 'skills'], v.split(',').map((s: string) => s.trim()).filter(Boolean))} className="text-gray-600" placeholder="Skill 1, Skill 2, Skill 3" annotations={fixAnnotations} fieldPath={`skills[${i}].skills`} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== PROJECTS ===== */}
      {proj.length > 0 && (
        <div data-section-id="projects" className={`relative group overflow-visible rounded-md transition-all hover:bg-black/[0.012] ${activeSection === 'projects' ? 'ring-2 ring-lime-400/40 bg-lime-50/20' : ''} ${hlClass('projects')}`} onClick={() => isEdit && onSectionFocus('projects')}>
          {isEdit && <SectionToolbar label="Projects" onAddEntry={() => addItem(['projects'], { name: '', description: '', highlights: [] })} hasSnippets={false} />}
          <h2 className={getTitleClass()} style={getTitleStyle()}>Projects</h2>
          <div className="space-y-3">
            {proj.map((p: any, i: number) => (
              <div key={i} className="relative group/item pl-2">
                {isEdit && (
                  <EntryToolbar
                    onDelete={() => removeItem(['projects'], i)}
                    onAddBelow={() => addItem(['projects'], { name: '', description: '', highlights: [] })}
                    onAIGenerate={onAIBulletGenerate ? async () => {
                      const bullet = await onAIBulletGenerate('project', i, p, p.highlights || []);
                      if (bullet) {
                        updateField(['projects', i, 'highlights'], [...(p.highlights || []), bullet]);
                      }
                    } : undefined}
                  />
                )}
                <div className="flex justify-between items-start">
                  <EditableText tag="div" value={String(p.name || '')} onChange={(v) => updateField(['projects', i, 'name'], v)} className="font-semibold text-gray-900" placeholder="Project Name" annotations={fixAnnotations} fieldPath={`projects[${i}].name`} />
                  <div className="text-[10px] text-gray-400 flex items-center gap-1 flex-shrink-0">
                    <EditableText value={String(p.startDate || '')} onChange={(v) => updateField(['projects', i, 'startDate'], v)} placeholder="Start" annotations={fixAnnotations} fieldPath={`projects[${i}].startDate`} />
                    <span>–</span>
                    <EditableText value={String(p.endDate || '')} onChange={(v) => updateField(['projects', i, 'endDate'], v)} placeholder="End" annotations={fixAnnotations} fieldPath={`projects[${i}].endDate`} />
                  </div>
                </div>
                <EditableText tag="p" value={String(p.description || '')} onChange={(v) => updateField(['projects', i, 'description'], v)} className="mt-0.5 text-gray-600" multiline placeholder="Describe the project..." annotations={fixAnnotations} fieldPath={`projects[${i}].description`} />
                <EditableBullets items={p.highlights || []} onChange={(v) => updateField(['projects', i, 'highlights'], v)} className="mt-1 text-gray-600" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== CERTIFICATES ===== */}
      {certs.length > 0 && (
        <div data-section-id="certificates" className={`relative group overflow-visible rounded-md transition-all hover:bg-black/[0.012] ${activeSection === 'certificates' ? 'ring-2 ring-lime-400/40 bg-lime-50/20' : ''} ${hlClass('certificates')}`} onClick={() => isEdit && onSectionFocus('certificates')}>
          {isEdit && <SectionToolbar label="Certificates" onAddEntry={() => addItem(['certificates'], { name: '', issuer: '', date: '' })} hasSnippets={false} />}
          <h2 className={getTitleClass()} style={getTitleStyle()}>Certificates</h2>
          <div className="space-y-2">
            {certs.map((c: any, i: number) => (
              <div key={i} className="relative group/item flex justify-between items-start pl-2">
                {isEdit && <EntryToolbar onDelete={() => removeItem(['certificates'], i)} onAddBelow={() => addItem(['certificates'], { name: '', issuer: '', date: '' })} />}
                <div>
                  <EditableText tag="div" value={String(c.name || '')} onChange={(v) => updateField(['certificates', i, 'name'], v)} className="font-semibold text-gray-900" placeholder="Certificate Name" annotations={fixAnnotations} fieldPath={`certificates[${i}].name`} />
                  <EditableText tag="div" value={String(c.issuer || '')} onChange={(v) => updateField(['certificates', i, 'issuer'], v)} className="text-gray-600" placeholder="Issuing Organization" annotations={fixAnnotations} fieldPath={`certificates[${i}].issuer`} />
                </div>
                <EditableText value={String(c.date || '')} onChange={(v) => updateField(['certificates', i, 'date'], v)} className="text-[10px] text-gray-400 flex-shrink-0" placeholder="2023" annotations={fixAnnotations} fieldPath={`certificates[${i}].date`} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== LANGUAGES ===== */}
      {langs.length > 0 && (
        <div data-section-id="languages" className={`relative group overflow-visible rounded-md transition-all hover:bg-black/[0.012] ${activeSection === 'languages' ? 'ring-2 ring-lime-400/40 bg-lime-50/20' : ''} ${hlClass('languages')}`} onClick={() => isEdit && onSectionFocus('languages')}>
          {isEdit && <SectionToolbar label="Languages" onAddEntry={() => addItem(['languages'], { language: '', fluency: '' })} hasSnippets={false} />}
          <h2 className={getTitleClass()} style={getTitleStyle()}>Languages</h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {langs.map((l: any, i: number) => (
              <div key={i} className="relative group/item">
                {isEdit && <EntryToolbar onDelete={() => removeItem(['languages'], i)} onAddBelow={() => addItem(['languages'], { language: '', fluency: '' })} />}
                <EditableText tag="span" value={String(l.language || '')} onChange={(v) => updateField(['languages', i, 'language'], v)} className="text-gray-700 font-medium" placeholder="Language" annotations={fixAnnotations} fieldPath={`languages[${i}].language`} />
                <EditableText tag="span" value={String(l.fluency ? ` – ${l.fluency}` : '')} onChange={(v) => updateField(['languages', i, 'fluency'], v.replace(/^[\s–-]+/, '').trim())} className="text-gray-500 text-[10px]" placeholder="Fluency" annotations={fixAnnotations} fieldPath={`languages[${i}].fluency`} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== VOLUNTEER ===== */}
      {vol.length > 0 && (
        <div data-section-id="volunteer" className={`relative group overflow-visible rounded-md transition-all hover:bg-black/[0.012] ${activeSection === 'volunteer' ? 'ring-2 ring-lime-400/40 bg-lime-50/20' : ''} ${hlClass('volunteer')}`} onClick={() => isEdit && onSectionFocus('volunteer')}>
          {isEdit && <SectionToolbar label="Volunteer" onAddEntry={() => addItem(['volunteer'], { position: '', organization: '', startDate: '', endDate: '', summary: '' })} hasSnippets={false} />}
          <h2 className={getTitleClass()} style={getTitleStyle()}>Volunteer</h2>
          <div className="space-y-3">
            {vol.map((v: any, i: number) => (
              <div key={i} className="relative group/item pl-2">
                {isEdit && <EntryToolbar onDelete={() => removeItem(['volunteer'], i)} onAddBelow={() => addItem(['volunteer'], { position: '', organization: '', startDate: '', endDate: '', summary: '' })} />}
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <EditableText tag="div" value={String(v.position || '')} onChange={(val) => updateField(['volunteer', i, 'position'], val)} className="font-semibold text-gray-900" placeholder="Role" annotations={fixAnnotations} fieldPath={`volunteer[${i}].position`} />
                    <EditableText tag="div" value={String(v.organization || '')} onChange={(val) => updateField(['volunteer', i, 'organization'], val)} className="text-gray-600" placeholder="Organization" annotations={fixAnnotations} fieldPath={`volunteer[${i}].organization`} />
                  </div>
                  <div className="text-[10px] text-gray-400 flex items-center gap-1 flex-shrink-0">
                    <EditableText value={String(v.startDate || '')} onChange={(val) => updateField(['volunteer', i, 'startDate'], val)} placeholder="Start" annotations={fixAnnotations} fieldPath={`volunteer[${i}].startDate`} />
                    <span>–</span>
                    <EditableText value={String(v.endDate || '')} onChange={(val) => updateField(['volunteer', i, 'endDate'], val)} placeholder="End" annotations={fixAnnotations} fieldPath={`volunteer[${i}].endDate`} />
                  </div>
                </div>
                <EditableText tag="p" value={String(v.summary || '')} onChange={(val) => updateField(['volunteer', i, 'summary'], val)} className="mt-0.5 text-gray-600" multiline placeholder="Describe..." annotations={fixAnnotations} fieldPath={`volunteer[${i}].summary`} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== AWARDS ===== */}
      {awards.length > 0 && (
        <div data-section-id="awards" className={`relative group overflow-visible rounded-md transition-all hover:bg-black/[0.012] ${activeSection === 'awards' ? 'ring-2 ring-lime-400/40 bg-lime-50/20' : ''} ${hlClass('awards')}`} onClick={() => isEdit && onSectionFocus('awards')}>
          {isEdit && <SectionToolbar label="Awards" onAddEntry={() => addItem(['awards'], { title: '', awarder: '', date: '' })} hasSnippets={false} />}
          <h2 className={getTitleClass()} style={getTitleStyle()}>Awards</h2>
          <div className="space-y-2">
            {awards.map((a: any, i: number) => (
              <div key={i} className="relative group/item flex justify-between items-start pl-2">
                {isEdit && <EntryToolbar onDelete={() => removeItem(['awards'], i)} onAddBelow={() => addItem(['awards'], { title: '', awarder: '', date: '' })} />}
                <div>
                  <EditableText tag="div" value={String(a.title || '')} onChange={(v) => updateField(['awards', i, 'title'], v)} className="font-semibold text-gray-900" placeholder="Award Title" annotations={fixAnnotations} fieldPath={`awards[${i}].title`} />
                  <EditableText tag="div" value={String(a.awarder || '')} onChange={(v) => updateField(['awards', i, 'awarder'], v)} className="text-gray-600" placeholder="Awarder" annotations={fixAnnotations} fieldPath={`awards[${i}].awarder`} />
                </div>
                <EditableText value={String(a.date || '')} onChange={(v) => updateField(['awards', i, 'date'], v)} className="text-[10px] text-gray-400 flex-shrink-0" placeholder="2023" annotations={fixAnnotations} fieldPath={`awards[${i}].date`} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default BuilderPreview;
