'use client';


import React, { useRef, useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ImageIcon, Plus, RefreshCw, ChevronUp, ChevronDown, Trash2, PlusCircle, Wand2, Bold, Italic, Underline, List, AlignLeft, AlignCenter, AlignRight, AlignJustify, Sparkles, ChevronLeft, ChevronRight, Columns } from 'lucide-react';
import { SNIPPETS, TITLE_STYLES } from '../registry';
import { buildHybridBands, type HybridBlock } from '../hybrid-flow';
import { getNestedValue, escapeRegExp, formatCVDate } from '../helpers';
import { AnimatePresence } from 'framer-motion';
import { SNIPPET_CATEGORY_JSON_PATH } from '@/lib/utils/cv-snippet-data';
import { resolveEmptyFieldPlaceholder } from '@/lib/utils/cv-field-labels';

// CORE UI COMPONENTS
// ==========================================

export const CanvasContext = React.createContext<any>(null);

export const SnippetContext = React.createContext<{
  blockId: string;
  pageIdx: number;
  pageAssignments: Record<string, number>;
} | null>(null);

/**
 * How far the section frame sits OUTSIDE the section's own box, per axis.
 *
 * The frame is the lime box drawn around the selected section. It used to be
 * pinned to the section's edges (`-1px` on every side), so its 2px border landed
 * ON the text — the title and the first and last lines touched it.
 *
 * The padding the user sees is therefore bought OUTWARD, never inward: the frame
 * is absolutely positioned, so growing it cannot reflow a single line of the CV.
 * Padding the section itself (or insetting the frame) would move the text, which
 * is the one thing a selection affordance must never do.
 *
 * Kept modest on purpose: the vertical inset eats into `--cv-section-gap` and the
 * horizontal one into `--cv-column-gap`, and a frame that reaches its neighbour's
 * text reads as damage rather than as a selection.
 */
export const SECTION_FRAME_INSET_X = 8;
export const SECTION_FRAME_INSET_Y = 6;

/** Rendered height of the rail's bar (`h-9`) — used when it has not been measured yet. */
export const TOOLRAIL_HEIGHT_PX = 36;
/**
 * Clearance between the bar and the top edge of the section it acts on. Has to
 * clear the section frame's outward expansion (see SECTION_FRAME_INSET_*) plus
 * the 4px halo on that frame, or the bar reads as a second border on it.
 */
export const TOOLRAIL_GAP_PX = 14;
/** Smallest distance kept between the bar and the edge of the visible canvas. */
export const TOOLRAIL_EDGE_X_PX = 8;
/**
 * Vertical equivalent, deliberately smaller: when the section sits right under
 * the canvas' top edge there is no room above it, so the bar pins itself here.
 * Anything larger starts overlapping the section's own first line of text.
 */
export const TOOLRAIL_EDGE_Y_PX = 4;

/**
 * Geometry of the "Add Section" divider (`InsertSnippetHandle`).
 *
 * The strip is 6px tall and pulled 3px into EACH neighbour (`my-[-3px]`), so it
 * straddles the boundary — which means the section above it ends 3px below the
 * strip's own top. The section's lime frame then overhangs that edge by
 * SECTION_FRAME_INSET_Y. So the frame's outer border sits
 * `SNIPPET_STRIP_OVERLAP + SECTION_FRAME_INSET_Y` px below the strip's top.
 *
 * The pill must hang below THAT edge — not below the strip. Anchoring it to the
 * strip (`top: calc(100% + 4px)`, which is what this used to do) put its top at
 * 196 against a frame bottom of 195: one pixel of clearance, which reads as the
 * pill sitting *on* the border, and overlaps the frame's 4px halo outright.
 * `PILL_BORDER_CLEARANCE` is the visible breather the user asked for.
 */
const SNIPPET_STRIP_H = 6; // h-[6px]
const SNIPPET_STRIP_OVERLAP = SNIPPET_STRIP_H / 2; // my-[-3px]
export const PILL_BORDER_CLEARANCE = 6;
/** `top` is relative to the strip's top, so discount the strip's own height. */
export const PILL_TOP_OFFSET_PX =
  SNIPPET_STRIP_OVERLAP + SECTION_FRAME_INSET_Y + PILL_BORDER_CLEARANCE - SNIPPET_STRIP_H; // = 9

/**
 * When the section BELOW this handle is selected (`isNextSelected`), that section
 * has the top format rail (`CanvasToolRail`, height 36px, gap 14px) mounted above it.
 * The "+ Add Section" pill must sit OUTSIDE of the section and be offset ABOVE the
 * format rail so the top format rail and section content remain completely visible.
 */
export const PILL_ABOVE_TOOLRAIL_OFFSET_PX =
  TOOLRAIL_GAP_PX + TOOLRAIL_HEIGHT_PX + 4; // = 14 + 36 + 4 = 54px

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

export const DEFAULT_SECTION_TITLES: Record<string, string> = {
  summary: 'Professional Summary',
  experience: 'Professional Experience',
  work: 'Work Experience',
  education: 'Education',
  projects: 'Projects',
  skills: 'Skills',
  certifications: 'Certifications',
  certificates: 'Certifications',
  awards: 'Awards',
  languages: 'Languages',
  interests: 'Interests',
  publications: 'Publications',
  volunteer: 'Volunteer Experience',
  references: 'References',
  header: 'Header',
  contact: 'Contact',
};

export const getFormattedDisplayValue = (
  value: any,
  isDate: boolean,
  dateFormat: string,
  multiline: boolean,
  aiIssues: any[],
  activeIssueId: any,
  path: string
) => {
  let displayValue = typeof value === 'string' ? value : '';

  if (isDate) {
    displayValue = formatCVDate(value, dateFormat);
  }

  // Fix pasted white text issues by removing bad tags and inline styles, while preserving text alignments.
  // Multiline fields must keep their block tags: contentEditable Enter
  // produces <div>/<br> line breaks, and stripping them here made every
  // non-editing render (blur, prop change) concatenate the lines back
  // into one — the next keystroke then saved the merged text.
  if (displayValue) {
    displayValue = multiline
      ? displayValue.replace(/<\/?(?:span|font|label)[^>]*>/gi, '')
      : displayValue.replace(/<\/?(?:span|div|font|label)[^>]*>/gi, '');
    displayValue = displayValue.replace(/style=(["'])(.*?)\1/gi, (match, quote, styleContent) => {
      const alignMatch = styleContent.match(/text-align\s*:\s*(left|center|right|justify)/i);
      return alignMatch ? `style="text-align: ${alignMatch[1].toLowerCase()};"` : '';
    });
  }

  const relevantIssues = aiIssues ? aiIssues.filter((i: any) => i.path === path) : [];
  if (relevantIssues.length > 0) {
    relevantIssues.forEach((issue: any) => {
      if (issue.targetText && typeof issue.targetText === 'string' && issue.targetText.trim() !== '') {
        const escaped = escapeRegExp(issue.targetText);
        if (escaped) {
          // Tag-safe replacement: match any HTML tag OR the word. If we match a tag, return it unchanged.
          const regex = new RegExp(`(<[^>]+>)|(${escaped})`, 'g');
          if (regex.test('')) return;

          const typeColors: Record<string, string> = {
            complex_word: 'rgba(168, 85, 247, 0.4)',
            weakening: 'rgba(59, 130, 246, 0.4)',
            passive_voice: 'rgba(34, 197, 94, 0.4)',
            lengthy_sentence: 'rgba(234, 179, 8, 0.4)',
            complex_sentence: 'rgba(239, 68, 68, 0.4)',
            spelling_variant: 'rgba(239, 68, 68, 0.4)'
          };
          const bg = typeColors[issue.type] || 'rgba(234, 179, 8, 0.35)';
          const highlightClass = issue.id === activeIssueId ? 'text-black shadow-sm' : 'border-b-2 border-white/30 cursor-pointer text-gray-900';
          const title = issue.suggestion ? `${issue.message || ''} Fix: ${issue.suggestion}` : (issue.message || 'Suggestion');

          const safeSuggestion = (issue.suggestion || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
          const safeTitle = title.replace(/"/g, '&quot;').replace(/'/g, '&#39;');

          displayValue = displayValue.replace(regex, (match, tag, word) => {
            if (tag) return tag; // Return HTML tag unchanged
            return `<mark class="${highlightClass} rounded-sm px-0.5 transition-all" style="background-color:${bg}" data-issue="${issue.id}" data-suggestion="${safeSuggestion}" title="${safeTitle}">${word}</mark>`;
          });
        }
      }
    });
  }
  return displayValue;
};

export const EditableField = ({ data: explicitData, path, multiline, onChange: explicitOnChange, setFocusedRef: explicitSetFocusedRef, readOnly, nowrap, breakAll, aiIssues: explicitAiIssues, activeIssueId: explicitActiveIssueId, onIssueClick: explicitOnIssueClick, isDate = false, dateFormat: explicitDateFormat, overrideValue, arrayIndex, className = '' }: any) => {
  const ctx = React.useContext(CanvasContext);
  
  const data = explicitData || (readOnly ? ctx?.cvData : ctx?.cvData);
  const onChange = explicitOnChange || ctx?.handleDataChange;
  const setFocusedRef = explicitSetFocusedRef || ctx?.setFocusedNode;
  const aiIssues = explicitAiIssues || ctx?.aiIssues || [];
  const activeIssueId = explicitActiveIssueId || ctx?.activeIssueId;
  const onIssueClick = explicitOnIssueClick || ctx?.onIssueClick;
  const dateFormat = explicitDateFormat || ctx?.design?.dateFormat || 'MMM YYYY';
  const moriChatMode = ctx?.moriChatMode || false;

  const contentRef = useRef<HTMLSpanElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const value = overrideValue !== undefined ? overrideValue : (getNestedValue(data, path) || '');

  const isEditable = !readOnly;

  const renderedHtml = useMemo(() => {
    return getFormattedDisplayValue(value, isDate, dateFormat, multiline, aiIssues, activeIssueId, path);
  }, [value, isDate, dateFormat, multiline, aiIssues, activeIssueId, path]);

  useIsomorphicLayoutEffect(() => {
    if (contentRef.current && !isEditing) {
      if (contentRef.current.innerHTML !== renderedHtml) {
        contentRef.current.innerHTML = renderedHtml;
      }
    }
  }, [renderedHtml, isEditing]);

  const handleInput = () => {
    if (!isEditable || !contentRef.current) return;
    
    // Use the DOM parser to robustly remove mark tags and avoid string parsing errors
    const temp = document.createElement('div');
    temp.innerHTML = contentRef.current.innerHTML;
    
    const marks = Array.from(temp.getElementsByTagName('mark'));
    for (const mark of marks) {
      const parent = mark.parentNode;
      if (parent) {
        while (mark.firstChild) {
          parent.insertBefore(mark.firstChild, mark);
        }
        parent.removeChild(mark);
      }
    }
    
    let cleanHtml = temp.innerHTML;
    // Fallback regex cleanup to ensure absolute safety
    cleanHtml = cleanHtml
      .replace(/<mark[^>]*>/gi, '')
      .replace(/<\/mark>/gi, '');
      
    if (arrayIndex !== undefined) {
      const fullStr = getNestedValue(data, path) || '';
      const arr = fullStr.split(',').map((s: string) => s.trim());
      arr[arrayIndex] = cleanHtml;
      onChange(path, arr.join(', '));
    } else {
      onChange(path, cleanHtml);
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!multiline && e.key === 'Enter') {
      e.preventDefault();
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      const sel = typeof window !== 'undefined' ? window.getSelection() : null;
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);

        // Find enclosing <li> if any
        let node: Node | null = range.startContainer;
        let liNode: HTMLElement | null = null;
        while (node && node !== contentRef.current) {
          if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === 'LI') {
            liNode = node as HTMLElement;
            break;
          }
          node = node.parentNode;
        }

        if (liNode) {
          e.preventDefault();
          e.stopPropagation();

          const newLi = document.createElement('li');

          // Split contents of current li after cursor
          const afterRange = document.createRange();
          afterRange.setStart(range.endContainer, range.endOffset);
          afterRange.setEndAfter(liNode.lastChild || liNode);
          const fragment = afterRange.extractContents();

          if (fragment.childNodes.length > 0 && fragment.textContent?.trim() !== '') {
            newLi.appendChild(fragment);
          } else {
            newLi.innerHTML = '<br>';
          }

          if (liNode.nextSibling) {
            liNode.parentNode?.insertBefore(newLi, liNode.nextSibling);
          } else {
            liNode.parentNode?.appendChild(newLi);
          }

          // Move cursor into newLi
          const newRange = document.createRange();
          newRange.setStart(newLi, 0);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);

          handleInput();
          return;
        }

        // If not directly inside <li>, but container has <ul> (or is entry description with bullets)
        const isDescription = path?.toLowerCase().includes('description');
        const containerUl = contentRef.current?.querySelector('ul');
        if (containerUl) {
          e.preventDefault();
          e.stopPropagation();
          const newLi = document.createElement('li');
          newLi.innerHTML = '<br>';
          containerUl.appendChild(newLi);

          const newRange = document.createRange();
          newRange.setStart(newLi, 0);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);

          handleInput();
          return;
        }

        if (isDescription) {
          e.preventDefault();
          e.stopPropagation();
          document.execCommand('insertUnorderedList', false);
          handleInput();
          return;
        }
      }
    }
  };
  const handleFocus = () => {
    if (!isEditable) return;
    setIsEditing(true);
    if (setFocusedRef) setFocusedRef(contentRef.current);
    if (ctx?.setFocusedJsonPath && path) ctx.setFocusedJsonPath(path);
  };
  const handleBlur = () => {
    if (!isEditable) return;
    setIsEditing(false);
    if (setFocusedRef) {
      const blurredNode = contentRef.current;
      window.setTimeout(() => {
        const activeElement = document.activeElement as HTMLElement | null;
        const activeEditable = activeElement?.closest?.('[contenteditable="true"]');
        if (!activeEditable || activeEditable === blurredNode) {
          setFocusedRef(null);
        }
      }, 120);
    }
  };
  const handleClick = (e: React.MouseEvent) => {
    // Alt+Click is the "hand this to the AI" shortcut, but it deliberately does
    // NOT dispatch from here. This field's `path` is field-level
    // (`experience[0].description`), and handing that to the chat made the model
    // rewrite a single field — the product rule is that AI targets a SECTION or
    // the whole page, never a field or a list entry. Returning without
    // `stopPropagation` lets the click bubble to the section wrapper, whose
    // handler resolves the selection at section level.
    if (e.altKey) return;

    if ((e.target as HTMLElement).tagName === 'MARK' && onIssueClick) {
      const el = e.target as HTMLElement;
      const id = el.getAttribute('data-issue');
      if (!id) return;
      onIssueClick(id, el.getBoundingClientRect());
    }
  };
  const handlePaste = (e: React.ClipboardEvent) => {
    if (!isEditable) return;
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    // Ensure we don't paste line breaks if not multiline
    const cleanText = multiline ? text : text.replace(/[\r\n]+/g, ' ');
    document.execCommand('insertText', false, cleanText);
  };

  let wrapClass = 'whitespace-normal';
  if (nowrap) wrapClass = 'whitespace-nowrap'; // Force no wrap
  if (breakAll) wrapClass = 'break-all whitespace-normal';
  if (multiline) wrapClass = 'whitespace-pre-wrap';

  const lowerPath = path?.toLowerCase() || '';

  // Add specific class for header name and role to allow auto-sizing
  const isNameField = lowerPath === 'basics.name';
  const isRoleField = lowerPath === 'basics.title';
  const finalClassName = `${wrapClass} ${isNameField ? 'cv-header-name' : ''} ${isRoleField ? 'cv-header-role' : ''} ${className}`;

  /* Empty-field label: NAME the fact that belongs in the slot.
   *
   * The generic "Type here..." (and the old flat ladder of path substrings,
   * which had no idea that `experience.2.company` and `work.2.name` are the same
   * fact) is replaced by one resolver in lib/utils/cv-field-labels.ts. It is
   * section- and field-aware, so the blank slot reads as a labelled blank —
   * "Company/Organisation", "Degree", "Modules summary or achievements",
   * "Project summary or achievements", "Start"/"End" — in every template that
   * renders the same field. The named-profile URL keeps its network lookup so
   * the slot says "LinkedIn" for a LinkedIn row and "GitHub" for a GitHub one. */
  const profilePath = lowerPath.includes('.profiles.') ? path.split('.').slice(0, -1).join('.') : '';
  const profileNetwork = profilePath ? String(getNestedValue(data, `${profilePath}.network`) || '') : '';
  const emptyText = resolveEmptyFieldPlaceholder(path, profileNetwork);

  /* Chat-mode focus ring — the "this is the field Mori will act on" target.
   *
   * The radius MUST match the section frame's (`rounded-lg` = `var(--radius)` =
   * 12px, see `[data-section-frame]` in CanvasSnippet). It used to be
   * `rounded-sm`, which this theme defines as `calc(var(--radius) - 4px)` = 8px,
   * so the entry's ring and the section's frame were drawn with two different
   * corner radii 4px apart and read as two unrelated boxes. Keep them equal: if
   * the theme's `--radius` ever moves, both move together.
   *
   * `!` (important) is load-bearing. `editHoverClass` also sets a radius
   * (`rounded-[3px]`), and which of the two wins is decided by the order
   * Tailwind emits them in — not by the order they appear in this className. The
   * bare `rounded-sm` happened to win; a differently-named utility might not.
   * The important modifier makes the ring's radius independent of that ordering.
   *
   * A large radius is safe on a short field: CSS clamps a corner radius to half
   * the box's height, so an 11px-tall date span renders as a 5.5px corner rather
   * than a broken pill. */
  const moriHoverClass = moriChatMode ? 'hover:bg-emerald-500/20 hover:shadow-[0_0_0_2px_rgba(16,185,129,0.4)] cursor-pointer !rounded-lg' : '';
  /* ONE focus indicator, never two.
   *
   * This used to carry `focus:outline focus:outline-2 focus:outline-emerald-400/60`
   * ALONGSIDE `focus:border-emerald-300`. On focus the field therefore painted a
   * 1px emerald border on its own box and a 2px emerald outline around it, and
   * the outline sat at the theme's `outline-offset` — so the two rings were
   * separated by a visible ring of bare background and read as two boxes rather
   * than one focused field. The section frame is documented as "ONE frame, never
   * two" for exactly the same reason; the field has to hold the same line.
   *
   * The BORDER is the one that survives, because `border border-transparent`
   * already reserves its 1px: focusing can never reflow the CV. The colour is the
   * outline's old emerald-400 rather than the border's old emerald-300, so the
   * focus is exactly as visible as it was — there is simply one ring of it now.
   *
   * The base className already carries `outline-none`, so dropping the outline
   * utilities leaves no inherited outline behind either. */
  const editHoverClass = isEditable ? 'hover:bg-emerald-50/30 focus:bg-white/80 border border-transparent hover:border-gray-200 focus:border-emerald-400 focus:text-gray-900 rounded-[3px]' : '';
  // Empty-field placeholder chrome only belongs in edit mode — readOnly previews
  // must not show "Type here..."/"END DATE" hints over real documents.
  // The placeholder is a HINT, not content: light dashed rule + gray-300 text,
  // so an empty document still reads as a document rather than a form.
  const emptyPlaceholderClass = isEditable
    ? `empty:min-w-[60px] ${multiline ? 'empty:block' : 'empty:inline-block'} empty:border-dashed empty:border-gray-200 empty:after:content-[attr(data-empty-text)] empty:after:text-gray-300 empty:after:italic`
    : '';

  return (
      <span ref={contentRef} data-path={path} data-empty-text={emptyText} contentEditable={isEditable} suppressContentEditableWarning onPaste={handlePaste} onInput={handleInput} onKeyDown={handleKeyDown} onFocus={handleFocus} onBlur={handleBlur} onClick={handleClick} className={`outline-none transition-all duration-200 ${multiline ? 'block w-full' : 'inline'} ${finalClassName} ${moriHoverClass} ${editHoverClass} z-40 relative ${emptyPlaceholderClass}`} style={{ minHeight: '1.2em' }} />
    );
  };
  
  /* ─── Shared chrome ───────────────────────────────────────────────────────
   * Only the rail's own button/divider styles survive here. The old per-rail
   * shells (RAIL_SHELL for the vertical section rail, TOOLBAR_SHELL for the
   * floating text rail) and the JS placement helper `observeCanvasZoom` were
   * deleted with those rails — see CanvasToolRail below for why.
   *
   * NB: Tailwind v3 emits no CSS for an opacity modifier on an arbitrary var()
   * colour, so dark surfaces are literals rather than `dark:bg-[var(--bg-secondary)]/95`. */

  /* ─── THE ONE RAIL ────────────────────────────────────────────────────────
   * There used to be three: section actions down the RIGHT of the section, text
   * formatting floating ABOVE the focused field, and list-entry actions on the
   * LEFT of each entry. Three rails meant three places to look, two of which
   * moved around, and the two that moved kept landing on content.
   *
   * They are now ONE bar that FLOATS above whatever is being edited:
   *
   *   [ ✦ AI ] │ [ ✦ Improve writing ] │ [ B I U ] │ [ ≡ ] │ [ ⇤ ⇔ ⇥ ⇥ ] │ [ + ⟳ 🗑 ⌃ ⌄ ]
   *    ▲ section/page AI      ▲ field formatting          ▲ selected-section actions
   *
   * It follows the selected section (or the focused field's section) instead of
   * sitting in one fixed spot above the whole CV, so the controls are next to the
   * thing they change. When nothing is selected or focused there is nothing to
   * act on and the bar hides itself entirely — the whole-document AI menu is
   * still one click away on the paper (`mori-open-document-menu`).
   *
   * Only the LEFT entry rail survives alongside it, and it hugs its entry
   * instead of spanning the entry's full height (see ListEntry).
   */
  export const TOOLRAIL_FORMAT_SLOT = 'cv-toolrail-format-slot';
  export const TOOLRAIL_SECTION_SLOT = 'cv-toolrail-section-slot';

  /**
   * Resolve a slot element the rail publishes. Effects run after commit, so by
   * the time a section/field mounts the rail's slots are already in the DOM.
   * Returns null on the very first paint, which just means one frame without
   * the controls.
   */
  const usePortalSlot = (id: string) => {
    const [el, setEl] = useState<HTMLElement | null>(null);
    useEffect(() => {
      setEl(document.getElementById(id));
    }, [id]);
    return el;
  };

  /**
   * Surface of a floating rail. Shared by the top rail and the per-entry side
   * rail so the two can never drift apart visually: one rounded pill, a hairline
   * border, a lifted shadow and a blurred backing that keeps the CV text behind
   * it readable.
   *
   * NB: Tailwind v3 emits no CSS for an opacity modifier on an arbitrary var()
   * colour, so the dark surface is a literal rather than
   * `dark:bg-[var(--bg-secondary)]/95`.
   */
  export const TOOLRAIL_SURFACE = 'rounded-xl border border-gray-200/80 dark:border-[#2a2a2a] bg-white/95 dark:bg-[#111111]/95 shadow-xl shadow-black/20 backdrop-blur-md';

  /* Chrome for a button inside a rail. Matches the page controls: subtle
   * rounded corners, grey glyphs, and a light hover tint. Exported because
   * ListEntry's side rail uses the same buttons. */
  export const TOOLRAIL_BTN = 'w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-300 transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white';
  const TOOLRAIL_DIVIDER = 'w-px h-5 mx-1 bg-gray-200 dark:bg-white/10';

  /** A viewport-space rect (the subset of DOMRect this maths needs). */
  type RailRect = { top: number; bottom: number; left: number; width: number };

  /**
   * Where the floating rail hangs, in the scroll container's CONTENT coordinates
   * (an absolutely positioned child of a scroll container is measured in those).
   *
   * Pure on purpose: the rules below are the whole feature — hang above the
   * section · when there is no room above, pin to the canvas top WITHOUT covering
   * the section's own text · centre on the section but stay inside the visible
   * band · report nothing when the anchor is scrolled out of view — and they are
   * testable without a browser. `null` means "nothing to hang off".
   */
  export function computeToolRailPosition({
    anchor,
    host,
    barWidth,
    barHeight,
  }: {
    anchor: RailRect;
    /** The scroll container's rect plus the offsets it is scrolled to. */
    host: RailRect & { clientWidth: number; scrollTop: number; scrollLeft: number };
    barWidth: number;
    barHeight: number;
  }): { top: number; left: number } | null {
    // Scrolled clean out of view: hide rather than park the bar at the canvas
    // edge, which is the "fixed above the CV" behaviour this replaces.
    if (anchor.bottom < host.top || anchor.top > host.bottom) return null;

    const anchorTop = anchor.top - host.top + host.scrollTop;
    // The bar hangs GAP_PX above the section, clearing its frame.
    const preferredTop = anchorTop - TOOLRAIL_GAP_PX - barHeight;
    // Near the top of the canvas there is no room above the section, so the bar
    // pins to the visible top edge instead and may then cover the section's first
    // line. That is unavoidable — the section is closer to the edge than the bar
    // is tall — and it is why the two other candidate placements are worse: below
    // the section covers its text DELIBERATELY, and hanging it off the canvas is
    // not visible at all.
    const top = Math.max(preferredTop, host.scrollTop + TOOLRAIL_EDGE_Y_PX);

    // Centred on the section, then pulled back inside the VISIBLE band: the canvas
    // can be wider than its viewport (spread view, zoomed in), and a bar centred
    // on a section far off to the right would be unreachable.
    const centred = anchor.left - host.left + host.scrollLeft + anchor.width / 2 - barWidth / 2;
    const minLeft = host.scrollLeft + TOOLRAIL_EDGE_X_PX;
    const maxLeft = Math.max(minLeft, host.scrollLeft + host.clientWidth - barWidth - TOOLRAIL_EDGE_X_PX);
    const left = Math.min(Math.max(centred, minLeft), maxLeft);

    return { top, left };
  }

  /* ─── The per-entry rail ──────────────────────────────────────────────────
   * The entry's twin of the bar above: three buttons (up / down / delete) hung
   * off the LEFT of the entry it acts on.
   *
   * Rendered dimensions of that pill: 28px buttons + the same 4px padding the
   * top rail uses = 36px wide, and it hangs this far off the entry's left edge.
   * The gap clears the selected section's frame, which overhangs the section by
   * SECTION_FRAME_INSET_X plus its 4px halo — anything tighter and the rail lands
   * on the very frame that is meant to be the focus indicator.
   */
  export const ENTRY_RAIL_WIDTH_PX = 36;
  export const ENTRY_RAIL_GAP_PX = 10;
  /** Smallest distance kept between the rail and the edge of the visible canvas. */
  export const ENTRY_RAIL_EDGE_X_PX = TOOLRAIL_EDGE_X_PX;

  /**
   * Where the entry rail floats, in the scroll container's CONTENT coordinates.
   *
   * Pure on purpose — the two clamping rules ARE the feature and they are
   * testable without a browser. `null` means the entry is scrolled clean out of
   * view and there is nothing to hug.
   *
   * COORDINATE SPACE — read this before "simplifying" the arithmetic below.
   * The returned `top`/`left` are meant to be assigned to the absolutely
   * positioned rail as-is, and that is NOT screen space. For an absolutely
   * positioned child, `left` is measured from the containing block's PADDING box
   * and the container's own scroll then shifts it, so the same value paints at
   * `host.left + left - host.scrollLeft` on screen. Every term here carries a
   * `- host.left` / `+ host.scrollLeft` that cancels against that on the way out,
   * which is why the returned numbers look like content coordinates while the
   * clamps below are compared against `scrollLeft`-relative bounds. Do not drop
   * either half: `preferredLeft` alone would be off by exactly `host.left`
   * (measured: it looked like an 11px error against the painted rect), and the
   * clamps would stop tracking the scroll position. `computeToolRailPosition`
   * above uses the same convention, so the two rails stay comparable.
   *
   * WHY IT CLAMPS (this is the whole reason the rail was moved out of the page):
   * the rail used to be a normal-flow descendant of the entry, i.e. of
   * `.cv-page` — which is `overflow: hidden` — and of the `scale(zoom)` canvas
   * content. That made it (a) sliced by the sheet's own edge, (b) multiplied by
   * the zoom so a "small" pill rendered 54px wide at 160%, and (c) at high zoom
   * stranded in the workspace's LEFT OVERHANG: the workspace centres an
   * overflowing flex item, so `scrollLeft` can never go below 0 while the page's
   * left edge sits at a negative offset. There is no scroll position that
   * reveals that region — the rail was not merely off-screen, it was unreachable.
   * Clamping into the visible band turns it back into what it was always meant
   * to be: an overlay on the canvas, drawn above the sheet, next to its entry.
   */
  export function computeEntryRailPosition({
    anchor,
    host,
    railWidth,
    railHeight,
  }: {
    anchor: RailRect;
    /** The scroll container's rect plus the offsets it is scrolled to. */
    host: RailRect & { clientWidth: number; clientHeight: number; scrollTop: number; scrollLeft: number };
    railWidth: number;
    railHeight: number;
  }): { top: number; left: number } | null {
    if (anchor.bottom < host.top || anchor.top > host.bottom) return null;

    const anchorTop = anchor.top - host.top + host.scrollTop;
    const anchorHeight = anchor.bottom - anchor.top;

    // Centred on the entry, then pulled inside the visible band. An entry can be
    // taller than the canvas (a long job with many bullets), so its centre can
    // be off-screen even while most of it is visible.
    const centredTop = anchorTop + anchorHeight / 2 - railHeight / 2;
    const minTop = host.scrollTop + TOOLRAIL_EDGE_Y_PX;
    const maxTop = Math.max(minTop, host.scrollTop + host.clientHeight - railHeight - TOOLRAIL_EDGE_Y_PX);
    const top = Math.min(Math.max(centredTop, minTop), maxTop);

    // Hung off the entry's LEFT edge by the rail's own right edge, so the pill's
    // width can never push it onto the entry, then clamped so it stays reachable.
    const preferredLeft = anchor.left - host.left + host.scrollLeft - ENTRY_RAIL_GAP_PX - railWidth;
    const minLeft = host.scrollLeft + ENTRY_RAIL_EDGE_X_PX;
    const maxLeft = Math.max(minLeft, host.scrollLeft + host.clientWidth - railWidth - ENTRY_RAIL_EDGE_X_PX);
    const left = Math.min(Math.max(preferredLeft, minLeft), maxLeft);

    return { top, left };
  }

  /**
   * The merged rail — ONE bar carrying the section's actions (add entry, change
   * style, delete, move) and, in the same surface, the focused field's text
   * formatting. It is a FLOATING overlay anchored above whatever is being
   * edited, not a row parked at the top of the canvas: a bar that always sits in
   * the same place is a toolbar, and the user has to look away from the section
   * to find it.
   *
   * It renders INSIDE the canvas workspace (`closest('[data-cv-workspace]')`),
   * because that is the scroll container the anchor lives in: anchoring to the
   * container lets the bar scroll WITH the page and keeps it clipped to the
   * canvas instead of drifting over the editor's other chrome. Position is
   * therefore in the container's content space (see `measure`).
   *
   * Consequences worth knowing before changing this:
   *  - It reserves NO layout height, so CVCanvasEngine's auto-fit budget must not
   *    subtract anything for it (it used to: CANVAS_TOOL_RAIL_PX).
   *  - The two slot elements are portal targets for the focused field
   *    (FloatingToolbar) and for the selected section (CanvasSnippet). They must
   *    stay MOUNTED even while the bar is hidden — unmounting them would strand
   *    those portals on a detached node and the controls would simply vanish. So
   *    "no target" is `invisible` + `pointer-events-none`, never `null`.
   *  - Nothing selected and nothing focused means the bar is hidden. The
   *    whole-document AI menu is still one click away: clicking the paper
   *    dispatches `mori-open-document-menu` (see CVCanvasEngine).
   */
  export const CanvasToolRail = ({
    selectedBlockId,
    focusNode,
    zoom = 100,
    formatControls,
    sectionControls,
    onAiClick,
  }: {
    selectedBlockId?: string | null;
    /** The field the user is editing; its SECTION is used as the anchor. */
    focusNode?: HTMLElement | null;
    /** Only used as a re-measure trigger: the canvas eases its zoom transform. */
    zoom?: number;
    /**
     * Controls rendered straight into the rail's two slots.
     *
     * The CV fills them by PORTAL, because the group that owns each one lives
     * inside the section it formats (`FloatingToolbar` for the focused field,
     * `CanvasSnippet` for the selected section) and only that owner knows how to
     * build it. A host whose controls live in the same component as the rail has
     * no such owner to portal from — the cover letter has exactly two units and
     * renders both groups itself — so it can pass them directly instead. When
     * these are omitted the slots stay empty and the portals work exactly as
     * before, which is what the CV does.
     */
    formatControls?: React.ReactNode;
    sectionControls?: React.ReactNode;
    /**
     * Overrides what the AI pill opens. Default is the CV's own contract: the
     * section menu for the selected block, or the document menu with none.
     */
    onAiClick?: (selectedBlockId: string | null) => void;
  }) => {
    const barRef = useRef<HTMLDivElement | null>(null);
    /** `null` = nothing to act on (or the anchor is scrolled out of view). */
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

    useEffect(() => {
      // Either document's scroll container will do. The rail only needs the box
      // whose content coordinates its absolute `top`/`left` are measured in, and
      // the cover letter's workspace is that box for the letter.
      const host = barRef.current?.closest('[data-cv-workspace], [data-cl-workspace]') as HTMLElement | null;
      // ReadOnly renders, tests and any other host without a canvas workspace:
      // there is nothing to anchor to, so the bar stays hidden.
      if (!host) {
        setPos(null);
        return undefined;
      }

      /* The selected section wins; the focused field's section is the fallback,
       * which is what keeps the bar present when focus arrives from the keyboard
       * (Tab) rather than from a click on the section. Matching by attribute
       * rather than building a selector keeps ids with quotes/brackets safe. */
      const findAnchor = (): HTMLElement | null => {
        if (selectedBlockId) {
          const blocks = document.querySelectorAll('[data-block-id]');
          for (let i = 0; i < blocks.length; i += 1) {
            if (blocks[i].getAttribute('data-block-id') === selectedBlockId) return blocks[i] as HTMLElement;
          }
        }
        const fromFocusNode = focusNode?.closest?.('[data-block-id]') as HTMLElement | null;
        if (fromFocusNode) return fromFocusNode;
        // Fallback for a stale `focusNode`: React can replace a section's DOM on
        // an edit, leaving the recorded node detached while the browser focuses
        // the replacement. Going through the live active element keeps the field's
        // formatting reachable instead of silently hiding the whole bar.
        const live = document.activeElement as HTMLElement | null;
        return (live?.closest?.('[data-block-id]') as HTMLElement | null) || null;
      };

      const measure = () => {
        const bar = barRef.current;
        const anchor = findAnchor();
        if (!bar || !anchor || !anchor.isConnected) {
          setPos(null);
          return;
        }
        const hostRect = host.getBoundingClientRect();
        const anchorRect = anchor.getBoundingClientRect();
        const next = computeToolRailPosition({
          anchor: {
            top: anchorRect.top,
            bottom: anchorRect.bottom,
            left: anchorRect.left,
            width: anchorRect.width,
          },
          host: {
            top: hostRect.top,
            bottom: hostRect.bottom,
            left: hostRect.left,
            width: hostRect.width,
            clientWidth: host.clientWidth,
            scrollTop: host.scrollTop,
            scrollLeft: host.scrollLeft,
          },
          barWidth: bar.offsetWidth,
          barHeight: bar.offsetHeight || TOOLRAIL_HEIGHT_PX,
        });

        setPos((prev) => {
          if (!next) return null;
          return prev && Math.abs(prev.top - next.top) < 0.5 && Math.abs(prev.left - next.left) < 0.5
            ? prev
            : next;
        });
      };

      measure();
      // `measure` reads the bar's own width, so the first pass can only be
      // right once the bar has been laid out. The canvas glides its zoom over
      // ~200ms, which moves the anchor's screen rect without scrolling or
      // resizing anything, hence the one extra pass after the glide.
      const raf = window.requestAnimationFrame(measure);
      const settle = window.setTimeout(measure, 240);

      host.addEventListener('scroll', measure, { passive: true });
      window.addEventListener('resize', measure);
      // The bar changes width when the field-formatting group appears/disappears.
      const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
      if (observer && barRef.current) observer.observe(barRef.current);

      return () => {
        window.cancelAnimationFrame(raf);
        window.clearTimeout(settle);
        host.removeEventListener('scroll', measure);
        window.removeEventListener('resize', measure);
        observer?.disconnect();
      };
    }, [selectedBlockId, focusNode, zoom]);

    return (
      <div
        data-canvas-toolrail
        className={`no-print absolute z-[120] flex justify-center pointer-events-none ${pos ? '' : 'invisible'}`}
        // Position is always applied — even while hidden — so the (invisible) bar
        // sits at the content origin instead of its static position after the
        // page, where it would add phantom scroll height to the canvas.
        style={{ top: pos?.top ?? 0, left: pos?.left ?? 0 }}
      >
        <div ref={barRef} className={`pointer-events-auto flex flex-row items-center gap-0.5 h-9 pl-1.5 pr-1.5 ${TOOLRAIL_SURFACE}`}>
          {/* AI — one entry point for the AI menu. Hidden in focus mode (when a section
              is selected or focused) because the bottom Mori AI navigation bar is kept active
              directly below the section. */}
          {!selectedBlockId && !focusNode?.closest?.('[data-block-id]') && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onAiClick) {
                  onAiClick(null);
                  return;
                }
                window.dispatchEvent(new CustomEvent('mori-open-document-menu'));
              }}
              className="h-7 pl-1.5 pr-2.5 flex flex-row items-center gap-1.5 rounded-lg bg-[#013f2e] text-white text-[10px] font-black uppercase tracking-wider transition-transform duration-150 hover:scale-[1.04] active:scale-95"
              title="AI actions for this CV"
            >
              <Sparkles size={12} className="shrink-0" />
              AI
            </button>
          )}

          {/* Filled by the focused field: text formatting, plus its AI action. */}
          <div id={TOOLRAIL_FORMAT_SLOT} className="flex flex-row items-center gap-0.5">{formatControls}</div>

          {/* Filled by the selected section: add entry, change style, delete, move. */}
          <div id={TOOLRAIL_SECTION_SLOT} className="flex flex-row items-center gap-0.5">{sectionControls}</div>
        </div>
      </div>
    );
  };

  /**
   * The focused field's group inside the merged rail.
   *
   * This used to be its own `fixed` bar that JS-positioned above the anchor,
   * which is why it could end up on the far side of the page from the field it
   * formatted. It now renders INTO the rail (portal), so there is nothing to
   * place: the rail is always in the same spot and this group just fills its
   * format slot. Formatting commands still act on the live selection via
   * `execCommand`, which is why the group needs no node reference to work.
   */
  export const FloatingToolbar = ({ targetNode, anchorBlockId, onSuggestPoint }: any) => {
    const [canSuggest, setCanSuggest] = useState(false);
    const slot = usePortalSlot(TOOLRAIL_FORMAT_SLOT);

    // Which AI affordance the focused field supports.
    //
    // ⚠️ There is deliberately NO skills branch here. A skills field used to get
    // its own labelled "Skills" pill in this (format) slot, while the selected
    // Skills SECTION got an icon-only wand in the section slot — and both called
    // `openSkillsSuggestions()`. With a Skills section selected and one of its
    // fields focused the rail therefore showed THREE AI controls: the `[AI]`
    // pill, this "SKILLS" pill, and the wand. The rail's own rule is "AI — one
    // entry point for the AI menu", so the two skills buttons were the violation.
    // Skill recommendations are still reachable from the snippet dialog's
    // "AI Skill Recommendations" action.
    useEffect(() => {
      if (!targetNode) {
        setCanSuggest(false);
        return;
      }
      const path = (targetNode.getAttribute('data-path') || '').toLowerCase();
      const isBulletContext = targetNode.tagName === 'LI' || !!targetNode.closest('li') || !!targetNode.closest('ul') || path.includes('description');
      setCanSuggest(isBulletContext || path.includes('summary'));
    }, [targetNode]);

    const execCmd = (e: React.MouseEvent, cmd: string) => { e.preventDefault(); document.execCommand('styleWithCSS', false, 'true'); document.execCommand(cmd, false); };

    /* Labelled AI button, matching the reference ("Improve writing" / "Ask AI"):
       a sparkle plus a word, not an icon-only square. */
    const aiBtnCls = 'h-7 pl-1.5 pr-2.5 flex flex-row items-center gap-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors duration-150';

    if (!slot || !targetNode) return null;

    const isFocusMode = Boolean(anchorBlockId || targetNode.closest('[data-block-id]'));

    return createPortal(
      <>
        {canSuggest && !isFocusMode && (
          <>
            <button
              onClick={(e) => { e.preventDefault(); onSuggestPoint(); }}
              className={aiBtnCls}
              title="Improve this text with AI"
              type="button"
            >
              <Wand2 size={12} className="shrink-0" />
              Improve
            </button>
            <div className={TOOLRAIL_DIVIDER} />
          </>
        )}
        {([
          { cmd: 'bold', Icon: Bold, title: 'Bold (Ctrl+B)' },
          { cmd: 'italic', Icon: Italic, title: 'Italic (Ctrl+I)' },
          { cmd: 'underline', Icon: Underline, title: 'Underline (Ctrl+U)' },
        ] as const).map(({ cmd, Icon, title }) => (
          <button
            key={cmd}
            onClick={(e) => execCmd(e, cmd)}
            className={TOOLRAIL_BTN}
            title={title}
            type="button"
          >
            <Icon size={14} />
          </button>
        ))}
        <div className={TOOLRAIL_DIVIDER} />
        <button
          onClick={(e) => execCmd(e, 'insertUnorderedList')}
          className={TOOLRAIL_BTN}
          title="Bullet List"
          type="button"
        >
          <List size={14} />
        </button>
        <div className={TOOLRAIL_DIVIDER} />
        {([
          { cmd: 'justifyLeft', Icon: AlignLeft, title: 'Align Left' },
          { cmd: 'justifyCenter', Icon: AlignCenter, title: 'Center' },
          { cmd: 'justifyRight', Icon: AlignRight, title: 'Align Right' },
          { cmd: 'justifyFull', Icon: AlignJustify, title: 'Justify' },
        ] as const).map(({ cmd, Icon, title }) => (
          <button
            key={cmd}
            onClick={(e) => execCmd(e, cmd)}
            className={TOOLRAIL_BTN}
            title={title}
            type="button"
          >
            <Icon size={14} />
          </button>
        ))}
      </>,
      slot
    );
  };

let transparentDragImage: HTMLImageElement | null = null;

const getTransparentDragImage = () => {
  if (transparentDragImage) return transparentDragImage;
  const image = new Image();
  image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>');
  transparentDragImage = image;
  return image;
};

const buildSnippetPreviewMarkup = (source: HTMLElement) => {
  const clone = source.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.no-print').forEach((node) => node.remove());
  clone.querySelectorAll('[contenteditable="true"]').forEach((node) => {
    node.removeAttribute('contenteditable');
  });
  clone.style.margin = '0';
  clone.style.transform = 'none';
  clone.style.opacity = '1';
  clone.style.pointerEvents = 'none';
  clone.style.width = `${source.offsetWidth}px`;
  clone.style.maxWidth = `${source.offsetWidth}px`;
  return clone.outerHTML;
};

export const CanvasSnippet = ({ readOnly = false, instance, index, zoneId, cvData, EditableWrapper, moveSnippet, removeSnippet, onReplace, onTogglePhoto, onAddListEntry, moveEntry, deleteEntry, dragState, isDark, activeTemplate, layoutZones, isDropAllowed, onMoveToZone, isLastSnippetInZone: isLastSnippetInZoneProp }: any) => {
  const ctx = React.useContext(CanvasContext);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  // Hook stays above the conditional returns below (react-hooks/rules-of-hooks): it only reads
  // `confirmingRemove`, so running it while `instance` is null is a harmless no-op.
  useEffect(() => {
    if (!confirmingRemove) return undefined;
    const timer = window.setTimeout(() => setConfirmingRemove(false), 3000);
    return () => window.clearTimeout(timer);
  }, [confirmingRemove]);

  // The section rail is no longer rendered beside the section: its actions are
  // portaled into the merged top rail's section slot (see CanvasToolRail). The
  // hook sits above the early returns below (react-hooks/rules-of-hooks).
  const sectionSlot = usePortalSlot(TOOLRAIL_SECTION_SLOT);
  const sectionRef = useRef<HTMLDivElement | null>(null);

  if (!instance || !instance.type) return null;
  const SnippetComponent = SNIPPETS[instance.type] || SNIPPETS['summary-clean']; // Fallback
  if (!SnippetComponent) return null; // Safe guard if fallback fails
  const isDropTarget = dragState?.overZoneId === zoneId && dragState?.overIndex === index;
  const isBeingDragged = dragState?.isDragging && dragState?.sourceZoneId === zoneId && dragState?.sourceIndex === index;
  const isHeader = SnippetComponent?.category === 'Header';
  // (No `isSkillsSnippet` any more — the skills section no longer gets its own
  //  AI button. See the note in the section-controls block below.)

  const primaryTitleKey = (SnippetComponent?.category || '').toLowerCase();
  const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId.replace(/_page_\d+$/, ''));
  const showDropLine = !readOnly && isDropTarget && !(dragState.sourceZoneId === zoneId && (dragState.overIndex === dragState.sourceIndex || dragState.overIndex === dragState.sourceIndex + 1));
  // "Last snippet" must be page-local: the final snippet rendered on THIS page gets
  // no trailing section gap (the pagination model only budgets gaps *between* blocks).
  // The zoneId prop is page-suffixed (`left_page_0`) while layoutZones is keyed by
  // bare zone ids, so CanvasZone passes the page-local answer in directly.
  const bareZoneId = (zoneId || '').replace(/_page_\d+$/, '');
  const zoneBlockCount = Array.isArray(layoutZones?.[bareZoneId]) ? layoutZones[bareZoneId].length : 0;
  const isLastSnippetInZone = isLastSnippetInZoneProp ?? index === Math.max(0, zoneBlockCount - 1);

  const handleRemoveSnippet = () => {
    if (!confirmingRemove) {
      setConfirmingRemove(true);
      return;
    }
    removeSnippet(zoneId, index);
    setConfirmingRemove(false);
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (isHeader || readOnly) return;
    const sourceElement = e.currentTarget as HTMLElement;
    const previewMarkup = buildSnippetPreviewMarkup(sourceElement);
    e.dataTransfer.setData('application/json', JSON.stringify({
      source: 'canvas',
      zoneId: bareZoneId,
      index: (layoutZones?.[bareZoneId] || []).findIndex((block: any) => block.id === instance.id),
      instance,
    }));
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setDragImage(getTransparentDragImage(), 0, 0);
    document.dispatchEvent(new CustomEvent('snippet-drag-start', {
      detail: {
        zoneId: bareZoneId,
        index: (layoutZones?.[bareZoneId] || []).findIndex((block: any) => block.id === instance.id),
        instance,
        pointer: { x: e.clientX, y: e.clientY },
        previewMarkup,
        width: sourceElement.offsetWidth,
        height: sourceElement.offsetHeight,
        label: SnippetComponent?.name || 'Section',
      }
    }));
  };
  const handleDragEnd = () => document.dispatchEvent(new CustomEvent('snippet-drag-end'));
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (isHeader || readOnly) return;
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (raw && isDropAllowed && !isDropAllowed(zoneId, JSON.parse(raw))) {
        return;
      }
    } catch {}
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const insertIndex = e.clientY < midY ? index : index + 1;
        if (dragState.overZoneId !== zoneId || dragState.overIndex !== insertIndex) {
      document.dispatchEvent(new CustomEvent('snippet-drag-over', { detail: { zoneId, index: insertIndex } }));
    }
  };

  const match = zoneId.match(/_page_(\d+)$/);
  const pageIdx = match ? parseInt(match[1]) : 0;

  const Title = ({ titleKey, overrideClass }: any) => {
    const headerUnitId = `${instance.id}_header`;
    const assignedPage = ctx?.pageAssignments?.[headerUnitId] ?? ctx?.pageAssignments?.[instance.id] ?? 0;
    if (assignedPage !== pageIdx) {
      return null;
    }

    const isSidebar = isNarrow;
    const styleKey = isSidebar && activeTemplate?.sidebarTitleStyle ? activeTemplate.sidebarTitleStyle : activeTemplate?.titleStyle;
    const Renderer = TITLE_STYLES[styleKey] || TITLE_STYLES['standard'];

    const fallbackTitle = DEFAULT_SECTION_TITLES[titleKey] || (typeof titleKey === 'string' ? titleKey.charAt(0).toUpperCase() + titleKey.slice(1) : 'Section');
    const titleVal = getNestedValue(ctx?.cvData, `sectionTitles.${titleKey}`) || fallbackTitle;

    /* Section headings are renameable inline ("Work Experience" ↔ "Experience"
       ↔ "Selected Projects"): the text is an ordinary editable field bound to
       `sectionTitles.<key>`, persisted with the rest of the CV. `cv-section-title`
       is the hook the canvas + snapshot stylesheets use for the title's own
       spacing (it follows the Design panel's item gap), for icon sizing relative
       to the title's type, and for the hover cue that says "click to rename". */
    const titleField = <EditableWrapper path={`sectionTitles.${titleKey}`} overrideValue={titleVal} nowrap />;

    if (overrideClass) {
      return <h3 className={`${overrideClass} cv-section-title`}>{titleField}</h3>;
    }

    return <Renderer isDark={isDark} showIcons={ctx?.design?.showHeaderIcons ?? true} titleKey={titleKey}>{titleField}</Renderer>;
  };

  const headerUnitId = `${instance.id}_header`;
  const assignedPage = ctx?.pageAssignments?.[headerUnitId] ?? ctx?.pageAssignments?.[instance.id] ?? 0;
  const isHeaderPage = assignedPage === pageIdx;

  const showInlineControls = !readOnly && primaryTitleKey && isHeaderPage;
  // The section action rail always hangs off the section's RIGHT edge. It used
  // to sit on the left, where it landed on top of the per-entry rail (which is
  // pinned to every entry's left edge) — two vertical rails fighting over the
  // same gutter. Right is the one side no other rail claims: entry rail left,
  // text-formatting rail above, section rail right.
  const sectionRailSide = 'right' as const;
  const canAddListEntry = SnippetComponent && ['Experience', 'Education', 'Projects', 'Certifications', 'Awards', 'Publications', 'Volunteer', 'References', 'Languages', 'Interests', 'Skills'].includes(SnippetComponent.category);
  const isSelected = ctx?.selectedBlockId === instance.id;
  const controls = showInlineControls ? (
    <div
      data-section-rail
      // Horizontal group inside the merged rail — no surface of its own, no
      // absolute positioning, no hover-to-reveal. It is only rendered while the
      // section is selected, so it does not need to hide itself; the rail's
      // chrome is what the user sees.
      className="flex flex-row items-center gap-0.5"
    >
      <div className={TOOLRAIL_DIVIDER} />
      {/* Action icons group */}
      {isHeader && instance.type !== 'header-accent' && instance.type !== 'header-minimal' && (
        <button
          onClick={onTogglePhoto}
          className={`${TOOLRAIL_BTN} text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 hover:scale-105 active:scale-95`}
          title="Toggle Photo"
        >
          <ImageIcon size={13}/>
        </button>
      )}
      {canAddListEntry && (
        <button
          onClick={() => onAddListEntry(SnippetComponent.category)}
          className={`${TOOLRAIL_BTN} text-emerald-500 dark:text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300 hover:scale-105 active:scale-95`}
          title={`Add ${SnippetComponent.category} entry`}
        >
          <Plus size={13}/>
        </button>
      )}
      {/* ⚠️ No skills-specific AI button here.
          A Skills section used to render a wand titled "AI Skill Suggestions"
          in this slot, while a focused skills field rendered a "Skills" pill in
          the format slot — and BOTH called `openSkillsSuggestions()`. Selecting a
          Skills section and focusing one of its fields therefore put three AI
          controls in the rail (the `[AI]` pill, that pill, and this wand).
          The rail has one documented AI entry point — the `[AI]` pill, which
          opens the section AI menu — so both duplicates are gone. Skill
          recommendations remain reachable from the snippet dialog's
          "AI Skill Recommendations" action. */}
      {/* Mori AI used to live here as a second AI button. It is now the rail's
          leftmost pill (see CanvasToolRail), which targets the selected section
          — having two buttons that opened the same menu on the same section was
          the clearest sign the rails wanted merging. */}
      {isHeader && (
        <div className="flex flex-row items-center gap-0.5 pl-1 ml-0.5 border-l border-gray-200 dark:border-white/10">
          <button
            onClick={() => ctx?.setDesign?.({ ...ctx.design, headerAlign: 'left' })}
            className={`${TOOLRAIL_BTN} hover:scale-105 active:scale-95 ${
              (ctx?.design?.headerAlign || 'left') === 'left' ? 'text-emerald-500' : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white'
            }`}
            title="Align text left"
          >
            <AlignLeft size={13} />
          </button>
          <button
            onClick={() => ctx?.setDesign?.({ ...ctx.design, headerAlign: 'center' })}
            className={`${TOOLRAIL_BTN} hover:scale-105 active:scale-95 ${
              ctx?.design?.headerAlign === 'center' ? 'text-emerald-500' : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white'
            }`}
            title="Center text"
          >
            <AlignCenter size={13} />
          </button>
          <button
            onClick={() => ctx?.setDesign?.({ ...ctx.design, headerAlign: 'right' })}
            className={`${TOOLRAIL_BTN} hover:scale-105 active:scale-95 ${
              ctx?.design?.headerAlign === 'right' ? 'text-emerald-500' : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white'
            }`}
            title="Align text right"
          >
            <AlignRight size={13} />
          </button>
        </div>
      )}
      <button
        onClick={() => onReplace(zoneId, index, instance.type)}
        className={`${TOOLRAIL_BTN} hover:text-gray-800 dark:hover:text-white hover:scale-105 active:scale-95`}
        title="Change Style"
      >
        <RefreshCw size={13}/>
      </button>
      <button
        onClick={() => removeSnippet(zoneId, index)}
        className={`${TOOLRAIL_BTN} text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:scale-105 active:scale-95`}
        title="Delete section"
      >
        <Trash2 size={13}/>
      </button>
      {!isHeader && (
        <>
          <div className={TOOLRAIL_DIVIDER} />
          {/* Layout-aware directional arrow controls */}
          {(() => {
            const tplType: string = activeTemplate?.type || '1-col';
            // Determine the bare zoneId (without _page_N suffix)
            const bareZoneId = (zoneId || '').replace(/_page_\d+$/, '');

            // Determine sibling zones for cross-column movement
            const getSiblingZone = (dir: 'left' | 'right'): string | null => {
              // 2-col: left <-> right
              if (tplType === '2-col') {
                if (bareZoneId === 'left' && dir === 'right') return 'right';
                if (bareZoneId === 'right' && dir === 'left') return 'left';
              }
              // top-sidebar-right: main -> sidebar (right), sidebar -> main (left)
              if (tplType === 'top-sidebar-right') {
                if (bareZoneId === 'main' && dir === 'right') return 'sidebar';
                if (bareZoneId === 'sidebar' && dir === 'left') return 'main';
              }
              // top-sidebar-left: sidebar -> main (right), main -> sidebar (left)
              if (tplType === 'top-sidebar-left') {
                if (bareZoneId === 'sidebar' && dir === 'right') return 'main';
                if (bareZoneId === 'main' && dir === 'left') return 'sidebar';
              }
              // sidebar-left / sidebar-left-dark: sidebar -> main (right), main -> sidebar (left)
              if (tplType === 'sidebar-left' || tplType === 'sidebar-left-dark') {
                if (bareZoneId === 'sidebar' && dir === 'right') return 'main';
                if (bareZoneId === 'main' && dir === 'left') return 'sidebar';
              }
              // sidebar-right / sidebar-right-dark: main -> sidebar (right), sidebar -> main (left)
              if (tplType === 'sidebar-right' || tplType === 'sidebar-right-dark') {
                if (bareZoneId === 'main' && dir === 'right') return 'sidebar';
                if (bareZoneId === 'sidebar' && dir === 'left') return 'main';
              }
              // hybrid-split: left <-> right
              if (tplType === 'hybrid-split') {
                if (bareZoneId === 'left' && dir === 'right') return 'right';
                if (bareZoneId === 'right' && dir === 'left') return 'left';
              }
              return null;
            };

            const leftZone = getSiblingZone('left');
            const rightZone = getSiblingZone('right');
            const showLeft = !!leftZone;
            const showRight = !!rightZone;

            const btnCls = 'w-6 h-6 flex items-center justify-center rounded-md text-gray-500 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 active:scale-90 transition-colors duration-150 cursor-pointer select-none';

            return (
              // Horizontal: these used to stack vertically in the right-hand
              // rail. In the merged top rail they read left-to-right.
              <div className="flex flex-row items-center gap-0.5">
                {showLeft && (
                  <button
                    onClick={() => onMoveToZone?.(index, leftZone)}
                    className={btnCls}
                    title={`Move to ${leftZone} zone`}
                  >
                    <ChevronLeft size={12} />
                  </button>
                )}
                <button
                  onClick={() => moveSnippet(zoneId, index, -1)}
                  className={btnCls}
                  title="Move up"
                >
                  <ChevronUp size={12} />
                </button>
                <button
                  onClick={() => moveSnippet(zoneId, index, 1)}
                  className={btnCls}
                  title="Move down"
                >
                  <ChevronDown size={12} />
                </button>
                {showRight && (
                  <button
                    onClick={() => onMoveToZone?.(index, rightZone)}
                    className={btnCls}
                    title={`Move to ${rightZone} zone`}
                  >
                    <ChevronRight size={12} />
                  </button>
                )}
                 {tplType === 'hybrid-split' && (
                  <>
                    <div className={TOOLRAIL_DIVIDER} />
                    {bareZoneId === 'main' ? (
                      <button
                        onClick={() => onMoveToZone?.(index, 'left')}
                        className={`${btnCls} text-blue-500 hover:text-blue-600`}
                        title="Convert to 50:50 Columns"
                      >
                        <Columns size={12} />
                      </button>
                    ) : (
                      <button
                        onClick={() => onMoveToZone?.(index, 'main')}
                        className={`${btnCls} text-blue-500 hover:text-blue-600`}
                        title="Convert to Full Width"
                      >
                        <AlignJustify size={12} />
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })()}
        </>
      )}
    </div>
  ) : null;

  const handleSectionClick = (e: React.MouseEvent) => {
    if (readOnly) return;
    if (ctx?.selectedBlockId && ctx.selectedBlockId !== instance.id) {
      // When in focused section, clicking outside should close the focus from
      // the section rather than activating it on the other section.
      e.stopPropagation();
      ctx.setSelectedBlockId(null);
      return;
    }
    // Clicking anywhere inside the section makes it the focused OBJECT: solid
    // lime frame, every other section on the sheet blurred and dimmed, and its
    // own rail pinned open. (Alt-click keeps the old "hand this section to the
    // chat" shortcut.)
    ctx?.setSelectedBlockId?.(instance.id);
    if (!e.altKey) return;
    e.stopPropagation();
    const text = (e.currentTarget as HTMLElement).innerText || '';
    const path = SnippetComponent.category.toLowerCase();
    window.dispatchEvent(new CustomEvent('mori-cv-selection', { 
      detail: { path, text: `(Section ${SnippetComponent.category}): ${text.substring(0, 100)}...` } 
    }));
  };

  const content = SnippetComponent.render({ data: cvData, Editable: EditableWrapper, zoneId: zoneId.replace(/_page_\d+$/, ''), isDark, Title, moveEntry, deleteEntry, showIcons: ctx?.design?.showContactIcons ?? true, design: ctx?.design, activeTemplate, layoutZones, readOnly });
  
  // In chat mode, hovering a section highlights it as a chat target. Suppressed
  // while the section is the SELECTED object: the lime frame already owns that
  // state, and an emerald ring on the same box read as a second border.
  const moriHoverClass = ctx?.moriChatMode && !isSelected ? 'hover:bg-emerald-500/10 hover:shadow-[0_0_0_2px_rgba(16,185,129,0.4)] rounded-lg transition-all' : '';
  
  return (
    <SnippetContext.Provider value={{ blockId: instance.id, pageIdx, pageAssignments: ctx?.pageAssignments || {} }}>
      <div
        ref={sectionRef}
        data-block-id={instance.id}
        data-selected={isSelected ? 'true' : 'false'}
        className={`relative group/snippet cv-section-wrapper ${showDropLine ? 'mt-10' : 'mt-0'} ${moriHoverClass} ${isSelected ? 'z-[60]' : ''}`}
        data-json-section={SNIPPET_CATEGORY_JSON_PATH[SnippetComponent.category] || ''}
        style={isHeader ? {} : { marginBottom: isLastSnippetInZone ? 0 : 'var(--cv-section-gap, 16px)' }}
        onMouseDown={() => {
          const jsonPath = SNIPPET_CATEGORY_JSON_PATH[SnippetComponent.category];
          if (jsonPath) ctx?.setFocusedJsonPath?.(jsonPath);
        }}
        onClick={handleSectionClick}
      >
        {showDropLine && (
          <div className="absolute -top-8 left-0 w-full min-h-[30px] rounded-xl border-2 border-dashed border-emerald-400 bg-emerald-50/95 shadow-[0_0_0_1px_rgba(16,185,129,0.1),0_10px_30px_rgba(16,185,129,0.12)] flex items-center justify-center pointer-events-none z-30 animate-pulse">
            <span className="px-3 py-1 rounded-full bg-white text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-700">Drop Section Here</span>
          </div>
        )}
        <div className={`relative hover:z-[150] group/inner w-full`}>
          {/* Exactly one section contributes actions to the rail at a time: the
              selected one. `controls` is a plain group of buttons with no
              positioning of its own, so the portal is just a relocation. */}
          {isSelected && sectionSlot && controls ? createPortal(controls, sectionSlot) : null}
          <div className={`${isNarrow ? '' : ''} pointer-events-auto snippet-content relative z-10 w-full min-w-0 ${!content && !readOnly ? 'min-h-[60px] flex flex-col justify-center' : ''}`}>
            {!readOnly && (
              /* Section frame — ONE frame, never two. On HOVER of an unselected
                 section it is a faint dashed lime outline ("clickable object");
                 once SELECTED it is the single solid lime frame with a soft halo
                 and lift. The round corner handles that used to ride this edge
                 are gone: three 8px lime-bordered dots down the section's edge
                 read as extra borders rather than as handles. The other half of
                 the selected state is the `cv-has-selection` rule in
                 CVCanvasEngine, which blurs and dims every other section, plus
                 the nested-ring suppression that keeps a hovered entry or a
                 focused field from adding a second lime box inside this one. */
              <div
                data-section-frame={isSelected ? 'selected' : 'hover'}
                className={`pointer-events-none absolute rounded-lg transition-all duration-200 ${
                  isSelected
                    ? 'z-20 border-2 border-[#84cc16] shadow-[0_0_0_4px_rgba(132,204,22,0.20),0_12px_32px_rgba(0,0,0,0.16)]'
                    : 'z-[-1] border border-dashed border-transparent bg-[#84cc16]/[0.05] opacity-0 group-hover/inner:opacity-100 group-hover/inner:border-[#84cc16]'
                }`}
                // Outward, per SECTION_FRAME_INSET_* — see the note there. The
                // frame keeps clear of the text instead of sitting on it.
                //
                // ⚠️ `maxWidth: 'none'` is load-bearing. The CV stylesheet has
                // `#cv-document-root.cv-document * { max-width: 100% }`, which
                // caps this frame at the width of its containing block — i.e. at
                // the section's own width. With left AND right insets set, the
                // stretched width (`100% + 16px`) was clamped back to 100%, and
                // the browser drops the trailing inset when it clamps: the LEFT,
                // TOP and BOTTOM edges kept their padding while the RIGHT border
                // snapped onto the text. An inline `max-width` outranks that
                // selector (inline beats any non-!important rule), so the frame
                // is free to overhang on both sides.
                style={{
                  top: -SECTION_FRAME_INSET_Y,
                  right: -SECTION_FRAME_INSET_X,
                  bottom: -SECTION_FRAME_INSET_Y,
                  left: -SECTION_FRAME_INSET_X,
                  maxWidth: 'none',
                }}
              />
            )}
            {content || (!readOnly && (
              <div className="text-center opacity-40 select-none cursor-pointer hover:opacity-80 transition-opacity p-4 border border-dashed border-gray-300 rounded-lg mt-2" onClick={() => onAddListEntry(SnippetComponent.category)}>
                <Title titleKey={SnippetComponent.category.toLowerCase()} />
                <div className="text-[11px] uppercase tracking-widest mt-3 font-bold text-gray-500 flex items-center justify-center gap-1"><PlusCircle size={14}/> Add {SnippetComponent.category}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SnippetContext.Provider>
  );
};

export const InsertSnippetHandle = ({
  onAddSnippet,
  zoneId,
  index,
  alwaysVisible = false,
  isNextSelected = false,
  isPrevSelected = false,
}: any) => {
  return (
    // z-[160], not z-40. This strip is a SIBLING of the section wrappers, and a
    // selected section wrapper carries `z-[60]` — so at z-40 the pill was
    // painted UNDER the selected section, and its own bottom lime border ran
    // straight across the pill. 160 also clears the `hover:z-[150]` that a
    // section's inner wrapper takes while the pointer is over it.
    //
    // The button hangs BELOW the line for the bottom pill (`isPrevSelected` or default),
    // clearing the section's lime frame by PILL_BORDER_CLEARANCE.
    //
    // When the section BELOW is selected (`isNextSelected`), that section has the top
    // format rail (CanvasToolRail) mounted above it. The pill is offset ABOVE that format
    // rail (`PILL_ABOVE_TOOLRAIL_OFFSET_PX`) so the top format rail, section frame, and
    // section content remain completely visible and unoccluded.
    <div className="group/insert relative w-full h-[6px] my-[-3px] flex items-center justify-center z-[160] transition-all no-print">
      <div className="absolute inset-0 cursor-pointer" />
      <div className={`w-full h-[2px] bg-emerald-400 ${alwaysVisible ? 'opacity-100' : 'opacity-0 group-hover/insert:opacity-100'} transition-opacity pointer-events-none absolute left-0 right-0`} />
      <button
        type="button"
        data-insert-snippet-btn
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onAddSnippet(zoneId, index);
        }}
        style={
          isNextSelected
            ? { bottom: `calc(100% + ${PILL_ABOVE_TOOLRAIL_OFFSET_PX}px)`, top: 'auto' }
            : { top: `calc(100% + ${PILL_TOP_OFFSET_PX}px)` }
        }
        className={`${alwaysVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90 group-hover/insert:opacity-100 group-hover/insert:scale-100'} transition-all duration-200 delay-150 group-hover/insert:delay-0 hover:!opacity-100 hover:!scale-100 flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-2.5 py-1 rounded-full text-[10px] shadow-md hover:shadow-lg font-sans absolute left-1/2 -translate-x-1/2 cursor-pointer pointer-events-auto`}
      >
        <Plus size={11} /> Add Section
      </button>
    </div>
  );
};

export const CanvasZone = ({ readOnly = false, zoneId, blocks, cvData, EditableWrapper, handleDrop, moveSnippet, removeSnippet, onReplace, onAddSnippet, onTogglePhoto, onAddListEntry, moveEntry, deleteEntry, dragState, activeTemplate, layoutZones, isDark = false, className = "", isDropAllowed, onMoveToZone }: any) => {
  const ctx = React.useContext(CanvasContext);
  const selectedBlockId = ctx?.selectedBlockId || ctx?.focusedNode?.closest?.('[data-block-id]')?.getAttribute('data-block-id');
  const [isOverZone, setIsOverZone] = useState(false);
  const [dropIntent, setDropIntent] = useState<'valid' | 'invalid' | null>(null);
  const bareZoneId = (zoneId || '').replace(/_page_\d+$/, '');
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOverZone(true);
    if (readOnly) return;
    let canDropHere = true;
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (dataStr && isDropAllowed) {
        canDropHere = isDropAllowed(zoneId, JSON.parse(dataStr));
      }
    } catch {
      canDropHere = true;
    }
    setDropIntent(canDropHere ? 'valid' : 'invalid');
    if (canDropHere && e.target === e.currentTarget) {
      document.dispatchEvent(new CustomEvent('snippet-drag-over', { detail: { zoneId, index: blocks.length } }));
    }
  };
  const onDragLeave = () => { setIsOverZone(false); setDropIntent(null); };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOverZone(false);
    if (readOnly) return;
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (dataStr) {
        const dragData = JSON.parse(dataStr);
        if (!isDropAllowed || isDropAllowed(zoneId, dragData)) {
          handleDrop(zoneId, dragData, dragState?.overIndex);
        }
      }
    } catch {}
    setDropIntent(null);
    document.dispatchEvent(new CustomEvent('snippet-drag-end'));
  };
  const isAppendTarget = dragState?.overZoneId === zoneId && dragState?.overIndex === blocks.length;
  const showAppendLine = !readOnly && isAppendTarget && !(dragState.sourceZoneId === zoneId && (dragState.overIndex === dragState.sourceIndex || dragState.overIndex === dragState.sourceIndex + 1));
  
  // Highlight empty zones or all zones during drag for hybrid layouts
  const isDragging = dragState?.isDragging;
  const dragHighlightClass = isDragging && !readOnly ? 'min-h-[120px] border-2 border-dashed rounded-2xl bg-gray-50/40' : 'min-h-0';
  const dropStateClass = dropIntent === 'invalid'
    ? '!border-red-400 !bg-red-50/70 shadow-[0_0_0_1px_rgba(239,68,68,0.15)]'
    : dropIntent === 'valid'
      ? '!border-emerald-400 !bg-emerald-50/60 shadow-[0_0_0_1px_rgba(16,185,129,0.15)]'
      : isOverZone && !readOnly
        ? '!border-emerald-300 !bg-emerald-50/50'
        : isDragging && !readOnly
          ? 'border-gray-200/70'
          : 'border-transparent';

  return (
    <div data-zone-id={zoneId} className="relative group/zone flex flex-col h-full">
      <div className={`${dragHighlightClass} ${dropStateClass} transition-all duration-300 pb-0 ${className}`} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
        
        <div className="flex flex-col gap-0">
          {!readOnly && blocks.length === 0 && (layoutZones?.[bareZoneId]?.length ?? 0) === 0 && (
            <InsertSnippetHandle onAddSnippet={onAddSnippet} zoneId={zoneId} index={0} alwaysVisible={true} />
          )}
          <AnimatePresence mode="popLayout">
            {blocks.map((instance: any, index: number) => (
              <React.Fragment key={instance?.id || `snippet-${index}`}>
                <CanvasSnippet
                  readOnly={readOnly}
                  instance={instance}
                  index={index}
                  zoneId={zoneId}
                  isLastSnippetInZone={index === blocks.length - 1}
                  cvData={cvData}
                  EditableWrapper={EditableWrapper}
                  moveSnippet={moveSnippet}
                  removeSnippet={removeSnippet}
                  onReplace={onReplace}
                  onTogglePhoto={onTogglePhoto}
                  onAddListEntry={onAddListEntry}
                  moveEntry={moveEntry}
                  deleteEntry={deleteEntry}
                  dragState={dragState}
                  activeTemplate={activeTemplate}
                  layoutZones={layoutZones}
                  isDark={isDark}
                  isDropAllowed={isDropAllowed}
                  onMoveToZone={onMoveToZone}
                />
                {!readOnly && (
                  <InsertSnippetHandle
                    onAddSnippet={onAddSnippet}
                    zoneId={zoneId}
                    index={index + 1}
                    alwaysVisible={false}
                    isNextSelected={Boolean(selectedBlockId && blocks[index + 1]?.id === selectedBlockId)}
                    isPrevSelected={Boolean(selectedBlockId && instance?.id === selectedBlockId)}
                  />
                )}
              </React.Fragment>
            ))}
          </AnimatePresence>
        </div>
        {showAppendLine && <div className="w-full min-h-[34px] bg-emerald-50/95 border-2 border-dashed border-emerald-400 rounded-xl mt-4 pointer-events-none shadow-[0_10px_30px_rgba(16,185,129,0.12)] flex items-center justify-center"><span className="px-3 py-1 rounded-full bg-white text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-700">Insert Here</span></div>}
      </div>
    </div>
  );
};

export const StaticLayoutRenderer = ({ template, cvData, ReadOnlyWrapper, design, snippetExtra, interactive }: any) => {
  // Priority: explicit design prop > saved canvas design in metadata > hardcoded defaults
  const savedDesign = cvData?.metadata?.canvasDesign || {};
  const defaultDesign = {
    font: 'Inter', fontSize: 12, spacing: 1.0, accentColor: '#22c55e',
    pageMargin: 40, showContactIcons: true, showHeaderIcons: true,
    sidebarBgColor: '#f8fafc', sectionGap: 16,
    ...savedDesign,  // overlay with user's saved design (fixes dashboard card thumbnails)
    ...design,       // overlay with explicit prop (fixes template-modal thumbnails)
  };
  // Entry descriptions are ONE combined view: paragraphs and bullets always
  // render together. There is deliberately no description-layout switch — the
  // old `bullets_only`/`paragraph_only` classes display:none'd half of the
  // stored content, which made typed text vanish from the document.
  const wrapperStyle = { '--cv-font': defaultDesign.font, '--cv-base-size': `${defaultDesign.fontSize}px`, '--cv-spacing': defaultDesign.spacing, '--cv-accent': defaultDesign.accentColor, '--cv-page-margin': `${defaultDesign.pageMargin}px`, '--cv-sidebar-bg': defaultDesign.sidebarBgColor, '--cv-section-gap': `${defaultDesign.sectionGap}px`, '--cv-item-gap': `${defaultDesign.itemGap ?? 12}px`, '--cv-column-gap': `${Math.max(8, (defaultDesign.sectionGap ?? 1) + 8)}px` } as React.CSSProperties;

  const renderZone = (zoneId: string, className: string, isDark = false) => {
    const snippets = template.zones[zoneId] || [];
    return (
      <div data-zone-id={zoneId} className={`flex flex-col ${className}`}>
        {snippets.map((type: string, index: number) => {
          const SnippetComponent = SNIPPETS[type] || SNIPPETS['summary-clean'];
          if (!SnippetComponent) return null;
          const isSidebar = ['sidebar', 'left', 'right'].includes(zoneId);
          const styleKey = isSidebar && template.sidebarTitleStyle ? template.sidebarTitleStyle : template.titleStyle;
          const TitleRenderer = TITLE_STYLES[styleKey] || TITLE_STYLES['standard'];
          const Title = ({ titleKey, overrideClass }: any) => {
            const fallbackTitle = DEFAULT_SECTION_TITLES[titleKey] || (typeof titleKey === 'string' ? titleKey.charAt(0).toUpperCase() + titleKey.slice(1) : 'Section');
            const titleVal = getNestedValue(cvData, `sectionTitles.${titleKey}`) || fallbackTitle;
            return overrideClass ? <h3 className={overrideClass}><ReadOnlyWrapper path={`sectionTitles.${titleKey}`} overrideValue={titleVal} nowrap /></h3> : <TitleRenderer isDark={isDark} showIcons={defaultDesign.showHeaderIcons} titleKey={titleKey}><ReadOnlyWrapper path={`sectionTitles.${titleKey}`} overrideValue={titleVal} nowrap /></TitleRenderer>;
          };
          const isLastSnippet = index === snippets.length - 1;
          return (
            <div key={index} className="flex flex-col">
              <div className="cv-section-wrapper cv-page-breakable" style={{ marginBottom: isLastSnippet ? 0 : 'var(--cv-section-gap, 16px)', ...(interactive ? {} : { pointerEvents: 'none' }) }}><SnippetComponent.render data={cvData} Editable={ReadOnlyWrapper} zoneId={zoneId} isDark={isDark} Title={Title} moveEntry={() => {}} deleteEntry={() => {}} showIcons={defaultDesign.showContactIcons} design={defaultDesign} readOnly={true} /></div>
              {snippetExtra?.(type)}
            </div>
          );
        })}
      </div>
    );
  };
  const isColorDark = (hex: string) => {
    if (!hex || hex[0] !== '#') return false;
    const cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
      const r = parseInt(cleanHex[0] + cleanHex[0], 16);
      const g = parseInt(cleanHex[1] + cleanHex[1], 16);
      const b = parseInt(cleanHex[2] + cleanHex[2], 16);
      return (r * 299 + g * 587 + b * 114) / 1000 < 140;
    }
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 140;
  };
  const isDarkSidebar = isColorDark(defaultDesign.sidebarBgColor || '#f8fafc');

  switch (template.type) {
    case '1-col':
      return (
        <div className={`w-full h-full cv-document`} style={{ ...wrapperStyle, padding: 'var(--cv-page-margin)', backgroundColor: '#ffffff' }}>
          {renderZone('main', 'w-full min-w-0')}
        </div>
      );
    case '2-col':
      return (
        <div className={`w-full h-full flex flex-col cv-document`} style={{ ...wrapperStyle, backgroundColor: '#ffffff' }}>
          {(template.zones['header'] || []).length > 0 && (
            <div className="w-full min-w-0" style={{ paddingTop: 'var(--cv-page-margin)', paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingBottom: 0, marginBottom: 'var(--cv-section-gap, 16px)' }}>
              {renderZone('header', 'w-full min-w-0')}
            </div>
          )}
          <div className="flex flex-1 items-start gap-[var(--cv-column-gap)]" style={{ paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingBottom: 'var(--cv-page-margin)', paddingTop: 0 }}>
            <div className="flex-1 min-w-0">{renderZone('left', 'h-max')}</div>
            <div className="flex-1 min-w-0">{renderZone('right', 'h-max')}</div>
          </div>
        </div>
      );
    case 'sidebar-left':
    case 'sidebar-left-dark':
      return (
        <div className={`w-full h-full flex relative cv-document`} style={{ ...wrapperStyle, padding: 'var(--cv-page-margin)', backgroundColor: '#ffffff' }}>
          <div className="absolute left-0 top-0 bottom-0 z-0" style={{ backgroundColor: 'var(--cv-sidebar-bg)', width: 'calc(32% + 0.36 * var(--cv-page-margin))' }}></div>
          <div className={`w-[32%] min-w-0 relative z-10 ${isDarkSidebar ? 'cv-dark-sidebar text-white' : ''}`} style={{ paddingRight: '5mm' }}>
            {renderZone('sidebar', 'h-max', isDarkSidebar)}
          </div>
          <div className="w-[68%] min-w-0 relative z-10" style={{ paddingLeft: '5mm' }}>
            {renderZone('main', 'h-max')}
          </div>
        </div>
      );
    case 'sidebar-right':
    case 'sidebar-right-dark':
      return (
        <div className={`w-full h-full flex relative cv-document`} style={{ ...wrapperStyle, padding: 'var(--cv-page-margin)', backgroundColor: '#ffffff' }}>
          <div className="absolute right-0 top-0 bottom-0 z-0" style={{ backgroundColor: 'var(--cv-sidebar-bg)', width: 'calc(32% + 0.36 * var(--cv-page-margin))' }}></div>
          <div className="w-[68%] min-w-0 relative z-10" style={{ paddingRight: '5mm' }}>
            {renderZone('main', 'h-max')}
          </div>
          <div className={`w-[32%] min-w-0 relative z-10 ${isDarkSidebar ? 'cv-dark-sidebar text-white' : ''}`} style={{ paddingLeft: '5mm' }}>
            {renderZone('sidebar', 'h-max', isDarkSidebar)}
          </div>
        </div>
      );
    case 'top-sidebar-right':
      return (
        <div className={`w-full h-full flex flex-col relative cv-document`} style={{ ...wrapperStyle, minHeight: 'var(--cv-page-height)', backgroundColor: '#ffffff' }}>
          {(template.zones['header'] || []).length > 0 && (
            <div className="relative z-10" style={{ paddingTop: 'var(--cv-page-margin)', paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingBottom: 0 }}>
              {renderZone('header', 'w-full min-w-0')}
            </div>
          )}
          <div className="flex flex-1 relative z-10 items-start gap-[var(--cv-column-gap)]" style={{ paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingBottom: 'var(--cv-page-margin)', paddingTop: 'var(--cv-section-gap, 16px)' }}>
            <div className="w-[68%] min-w-0">{renderZone('main', 'h-max')}</div>
            <div className="absolute right-[var(--cv-page-margin)] top-[var(--cv-section-gap,16px)] bottom-0 rounded-lg z-[-1]" style={{ backgroundColor: 'var(--cv-sidebar-bg)', width: 'calc(32% - 16px)' }}></div>
            <div className={`w-[32%] min-w-0 ${isDarkSidebar ? 'cv-dark-sidebar text-white' : ''}`} style={{ paddingLeft: '5mm' }}>
              {renderZone('sidebar', 'h-max', isDarkSidebar)}
            </div>
          </div>
        </div>
      );
    case 'top-sidebar-left':
      return (
        <div className={`w-full h-full flex flex-col relative cv-document`} style={{ ...wrapperStyle, minHeight: 'var(--cv-page-height)', backgroundColor: '#ffffff' }}>
          {(template.zones['header'] || []).length > 0 && (
            <div className="relative z-10" style={{ paddingTop: 'var(--cv-page-margin)', paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingBottom: 0 }}>
              {renderZone('header', 'w-full min-w-0')}
            </div>
          )}
          <div className="flex flex-1 relative z-10 items-start gap-[var(--cv-column-gap)]" style={{ paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingBottom: 'var(--cv-page-margin)', paddingTop: 'var(--cv-section-gap, 16px)' }}>
            <div className="absolute left-[var(--cv-page-margin)] top-[var(--cv-section-gap,16px)] bottom-0 rounded-lg z-[-1]" style={{ backgroundColor: 'var(--cv-sidebar-bg)', width: 'calc(32% - 16px)' }}></div>
            <div className={`w-[32%] min-w-0 ${isDarkSidebar ? 'cv-dark-sidebar text-white' : ''}`} style={{ paddingRight: '5mm' }}>
              {renderZone('sidebar', 'h-max', isDarkSidebar)}
            </div>
            <div className="w-[68%] min-w-0">{renderZone('main', 'h-max')}</div>
          </div>
        </div>
      );
    case 'hybrid-split':
      return (
        <div className={`w-full h-full flex flex-col cv-document`} style={{ ...wrapperStyle, minHeight: 'var(--cv-page-height)', backgroundColor: '#ffffff' }}>
          {(template.zones['header'] || []).length > 0 && (
            <div style={{ paddingTop: 'var(--cv-page-margin)', paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingBottom: 0 }}>
              {renderZone('header', 'w-full min-w-0')}
            </div>
          )}
          {(template.zones['main'] || []).length > 0 && (
            <div style={{ paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingTop: (template.zones['header'] || []).length > 0 ? 'var(--cv-section-gap, 16px)' : 'var(--cv-page-margin)', paddingBottom: 0 }}>
              {renderZone('main', 'w-full min-w-0')}
            </div>
          )}
          <div className="flex flex-1 items-start gap-[var(--cv-column-gap)]" style={{ paddingLeft: 'var(--cv-page-margin)', paddingRight: 'var(--cv-page-margin)', paddingBottom: 'var(--cv-page-margin)', paddingTop: (template.zones['main'] || []).length > 0 || (template.zones['header'] || []).length > 0 ? 'var(--cv-section-gap, 16px)' : 'var(--cv-page-margin)' }}>
            <div className="flex-1 min-w-0">{renderZone('left', 'h-max')}</div>
            <div className="flex-1 min-w-0">{renderZone('right', 'h-max')}</div>
          </div>
        </div>
      );
    default: return <div>Layout not found</div>;
  }
};

// ==========================================
