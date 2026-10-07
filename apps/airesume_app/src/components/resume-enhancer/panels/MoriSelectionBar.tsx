'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';
import MoriChatInterface from './MoriChatInterface';

export type MoriDocument = 'cv' | 'cover-letter';

/** A section inside the CV, or the document as a whole. */
type Scope = 'section' | 'document';

interface Anchor {
  /** The element the menu is pinned to (a section, the page, or the letter). */
  el: HTMLElement;
  /** Section category as the AI layer knows it (data-json-section), or the document. */
  path: string;
  title: string;
  text: string;
  scope: Scope;
}

interface MoriSelectionBarProps {
  document: MoriDocument;
  /** Renders nothing while the docked conversation panel is open. */
  enabled: boolean;
  /**
   * Opens the docked conversation. Only used for the COVER LETTER, which keeps
   * its own chat engine. The CV grows the search bar into an inline
   * conversation instead, so this is never called for a CV target.
   */
  onOpenChat: () => void;
}

type Suggestion = { label: string; prompt: string };

/* ── Section-scoped chips ────────────────────────────────────────────────── */
const SECTION_SUGGESTIONS: Suggestion[] = [
  { label: 'Improve this section', prompt: 'Rewrite this section to be stronger and more specific, using only facts already present in my CV.' },
  { label: 'Make it shorter', prompt: 'Make this section shorter and more direct, without dropping any factual detail.' },
  { label: 'Add measurable impact', prompt: 'Make the impact in this section more concrete and quantifiable, without inventing any numbers or claims.' },
  { label: 'More…', prompt: 'What would you improve in this section?' },
];

/* An empty/stub section must never be handed to the model as "rewrite this" —
   with no facts to work from it will invent them. */
const EMPTY_SECTION_SUGGESTIONS: Suggestion[] = [
  { label: 'Write this section', prompt: 'Draft this section using only the facts already present in my CV. Ask me for anything that is missing instead of inventing it.' },
  { label: 'What should go here?', prompt: 'What should this section contain for this kind of CV, using only facts I already have?' },
];

/* ── Document-scoped chips ───────────────────────────────────────────────────
 * A whole-document request is not "this section, but bigger". These are the
 * jobs someone actually has for a finished CV, so they never name a section. */
const DOCUMENT_SUGGESTIONS: Record<MoriDocument, Suggestion[]> = {
  cv: [
    { label: 'Make this CV better', prompt: 'Improve my whole CV: tighten the language, strengthen the impact and keep every fact accurate.' },
    { label: 'Align to the job description', prompt: 'Align my whole CV with the target job description, emphasising the experience that matches it.' },
    { label: 'Improve bullets in every section', prompt: 'Rewrite the bullet points in every section with stronger action verbs and concrete outcomes.' },
    { label: 'Tighten the whole CV', prompt: 'Make my whole CV shorter and more direct without dropping any factual detail.' },
  ],
  'cover-letter': [
    { label: 'Improve tone', prompt: 'Improve the overall tone of this cover letter to be professional, confident and personal.' },
    { label: 'Align with the job', prompt: 'Align this cover letter with the core requirements of the job description.' },
    { label: 'Make it shorter', prompt: 'Shorten and tighten this cover letter while keeping the substance.' },
    { label: 'Sharpen the opening', prompt: 'Rewrite the opening paragraph so it earns attention in the first sentence.' },
  ],
};

const MIN_SECTION_CHARS = 40;

/** The single prompt the search bar shows, whichever target it is aimed at. */
const ASK_PLACEHOLDER = 'ASK Mori AI for adjustments';

/* ── Geometry ─────────────────────────────────────────────────────────────── */
const MARGIN = 12;
/** Gap between the target, the search bar, the chips and the conversation. */
const GAP = 10;
const BAR_W = 340;
const BAR_H = 44;
const PANEL_W = 372;
const PANEL_MIN_H = 180;
const PANEL_MAX_H = 360;
const CHIP_H = 28;
const CHIP_GAP = 6;
/** The widest a suggestion pill may grow before it truncates. */
const CHIP_MAX_W = 240;
/** Floor for the stack when the sheet overflows the canvas and there is no room
 *  to its right at all — see the horizontal placement note in the component. */
const CHIP_MIN_W = 132;
/** How much of a section / the document to hand the model as context. */
const SECTION_CHARS = 600;
const DOCUMENT_CHARS = 2000;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));

/* ── App-theme surfaces ────────────────────────────────────────────────────
 * These three panes used to be `bg-white/70 backdrop-blur-xl`. Over the
 * editor's warm-grey workspace a 70%-white wash resolves to flat grey, so the
 * pills read as DISABLED controls rather than as live suggestions — the
 * "looks greyed out" report. They now use the same surface language as every
 * other floating control in the editor (TOOLRAIL_SURFACE in
 * cv-builder-pro/components/CoreUI): a near-opaque white pane in light mode,
 * the editor's dark olive in dark mode, and the brand emerald reserved for the
 * interactive accents. */
const SURFACE =
  'border border-gray-200/80 dark:border-white/10 bg-white/95 dark:bg-[#23271f]/95 backdrop-blur-sm shadow-[0_8px_24px_rgba(0,0,0,0.10)]';
const CHIP_SURFACE =
  'border border-gray-200/80 dark:border-white/10 bg-white/95 dark:bg-[#23271f]/95 backdrop-blur-sm shadow-[0_4px_14px_rgba(0,0,0,0.08)] text-gray-700 dark:text-gray-200 hover:border-emerald-500 hover:bg-emerald-500 hover:text-white';

const flatten = (el: HTMLElement, max: number) =>
  (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, max);

/** Hands a prompt to the chat engine over the existing window contract. */
const dispatchToMori = (prompt: string, path: string, text: string) => {
  const selection = { path, text };
  window.dispatchEvent(new CustomEvent('mori-cv-selection', { detail: selection }));
  window.dispatchEvent(
    new CustomEvent('mori-chat-send-prompt', { detail: { prompt, selection } })
  );
};

/**
 * The editor's AI entry point, opened by the merged top rail's AI pill (or, for
 * the whole document, by a click on the paper outside any section).
 *
 * It used to be hover-driven: a `mousemove` listener opened it for whatever
 * section the pointer happened to cross, so the suggestions trailed the cursor
 * around the page. It is now explicitly triggered — `mori-open-section-menu`
 * (detail: blockId) from the rail, `mori-open-document-menu` for the whole CV —
 * and dismissed by Escape, a click outside, or by opening the chat.
 *
 * Targeting is SECTION- or PAGE-level by product rule. Both entry points resolve
 * through `closest('[data-block-id]')`, and the field- and entry-level
 * `mori-cv-selection` dispatches that used to exist were removed, so the chat can
 * never be pointed at a single bullet or field.
 *
 * Two shapes, one component:
 *
 *   SECTION  the search bar is centred on the section and sits OUTSIDE it. The
 *            suggestion chips ride in the canvas GUTTER beside the bar rather
 *            than under it, so they never cover the page (see the horizontal
 *            note further down). The conversation opens on the far side of the
 *            bar from the section, so the section is never covered by its own
 *            chat.
 *
 *   DOCUMENT the bar is pinned to the bottom centre of the canvas area, with
 *            the chips in the gutter beside it, and the conversation grows
 *            upward from the bar.
 *
 * Prompts travel over the same window events the existing Mori chat already
 * listens to (`mori-cv-selection` + `mori-chat-send-prompt`), so the chat engine
 * itself is unchanged. For the CV the conversation is that same engine rendered
 * inline (MoriChatInterface, embedded); the cover letter keeps its own engine and
 * still opens in the dock.
 */
const MoriSelectionBar: React.FC<MoriSelectionBarProps> = ({ document: doc, enabled, onOpenChat }) => {
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  /** The canvas area — the frame the whole-document bar is centred in. */
  const [canvasRect, setCanvasRect] = useState<DOMRect | null>(null);
  /**
   * The paper itself. Only used to find the GUTTER: the space between the
   * sheet's right edge and the canvas workspace's right edge is the one strip
   * of screen that is guaranteed to be "outside the CV".
   */
  const [sheetRect, setSheetRect] = useState<DOMRect | null>(null);
  const [value, setValue] = useState('');
  /** True once the search bar has grown into a conversation. */
  const [expanded, setExpanded] = useState(false);

  /** The suggestion-pill stack. */
  const barRef = useRef<HTMLDivElement | null>(null);
  /**
   * The search bar. It is a SIBLING of the chip stack and of the conversation
   * panel (three separately-positioned `fixed` boxes), so the outside-click guard
   * has to know about all of them — otherwise clicking into the input would read
   * as a click outside and dismiss the menu.
   */
  const askBarRef = useRef<HTMLFormElement | null>(null);
  /** The inline conversation. */
  const panelRef = useRef<HTMLDivElement | null>(null);
  /**
   * When the menu was opened. The whole-CV menu is opened *by* the same
   * `pointerdown` that the outside-click handler below reacts to (the canvas
   * engine dispatches `mori-open-document-menu` during that event), so without
   * this guard the handler would close the menu in the same tick it appeared.
   */
  const openedAtRef = useRef(0);
  /**
   * A prompt typed before the conversation existed. The inline chat mounts on
   * the same render that expands the bar, and React runs the child's effects
   * before the parent's, so the listener is registered by the time the effect
   * below fires this — no timeout is needed to win that race.
   */
  const pendingPromptRef = useRef<string | null>(null);

  const readSection = useCallback((el: HTMLElement): Anchor | null => {
    // The letter is one document rather than a stack of sections, so the whole
    // page is the target and the suggestions act on the letter body.
    if (doc === 'cover-letter') {
      const page = el.closest('.cover-letter-document') as HTMLElement | null;
      if (!page) return null;
      return { el: page, path: 'coverLetter', title: 'this cover letter', text: flatten(page, SECTION_CHARS), scope: 'section' };
    }

    const block = el.closest('[data-block-id]') as HTMLElement | null;
    if (!block) return null;

    // Prefer the section's own heading as the human label, and its JSON category
    // as the path the AI layer understands.
    const heading = block.querySelector('h1, h2, h3, h4');
    const title = (heading?.textContent || '').trim().slice(0, 60);

    return {
      el: block,
      path: block.getAttribute('data-json-section') || 'cv',
      title: title || 'this section',
      text: flatten(block, SECTION_CHARS),
      scope: 'section',
    };
  }, [doc]);

  /** The whole document — what a click on the paper outside any section targets. */
  const readDocument = useCallback((): Anchor | null => {
    if (doc === 'cover-letter') {
      const page = document.querySelector('.cover-letter-document') as HTMLElement | null;
      if (!page) return null;
      return { el: page, path: 'coverLetter', title: 'this cover letter', text: flatten(page, DOCUMENT_CHARS), scope: 'document' };
    }
    // `.cv-document-wrapper` holds every page; `.cv-page` alone is only page one.
    const page = (document.querySelector('.cv-document-wrapper') || document.querySelector('.cv-page')) as HTMLElement | null;
    if (!page) return null;
    return { el: page, path: 'cv', title: 'your whole CV', text: flatten(page, DOCUMENT_CHARS), scope: 'document' };
  }, [doc]);

  // Opening, dismissing and switching targets.
  useEffect(() => {
    if (!enabled) {
      setAnchor(null);
      return undefined;
    }

    const onOpenSection = (e: Event) => {
      const blockId = (e as CustomEvent).detail?.blockId as string | undefined;
      if (!blockId) return;
      const block = document.querySelector(`[data-block-id="${CSS.escape(blockId)}"]`) as HTMLElement | null;
      if (!block) return;
      openedAtRef.current = Date.now();
      setValue('');
      // A new target is a new intent — collapse back to the search bar so the
      // previous conversation is not left hanging over the new section.
      setExpanded(false);
      setAnchor(readSection(block));
    };

    const onOpenDocument = () => {
      openedAtRef.current = Date.now();
      setValue('');
      setExpanded(false);
      setAnchor(readDocument());
    };

    const onClose = () => setAnchor(null);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAnchor(null);
    };

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // The click that opened this menu is still in flight — see openedAtRef.
      if (Date.now() - openedAtRef.current < 250) return;
      // A click on the menu itself (any of its three boxes) or on the rail button
      // that opened it is not "outside" — otherwise reaching for a suggestion
      // would dismiss the menu.
      if (barRef.current?.contains(target)) return;
      if (askBarRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      if (target.closest('[data-section-rail]')) return;
      setAnchor(null);
    };

    window.addEventListener('mori-open-section-menu', onOpenSection as EventListener);
    window.addEventListener('mori-open-document-menu', onOpenDocument);
    window.addEventListener('mori-close-menus', onClose);
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      window.removeEventListener('mori-open-section-menu', onOpenSection as EventListener);
      window.removeEventListener('mori-open-document-menu', onOpenDocument);
      window.removeEventListener('mori-close-menus', onClose);
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [enabled, readSection, readDocument]);

  // The menu is `fixed`, so its position has to be re-measured whenever the
  // canvas scrolls, the window resizes, or the anchor is unmounted by an edit.
  useEffect(() => {
    if (!anchor) {
      setRect(null);
      setCanvasRect(null);
      setSheetRect(null);
      return undefined;
    }
    const measure = () => {
      if (!anchor.el.isConnected) {
        setAnchor(null);
        return;
      }
      setRect(anchor.el.getBoundingClientRect());
      const workspace = document.querySelector('[data-cv-workspace]') as HTMLElement | null;
      setCanvasRect(workspace ? workspace.getBoundingClientRect() : null);
      // The paper. `.cv-document-wrapper` holds every page; `.cv-page` alone is
      // only page one; the letter uses its own root. Any of them answers the
      // one question this needs: where does the sheet end on the right?
      const sheet = (
        document.querySelector('#cv-document-root .cv-document-wrapper')
        || document.querySelector('#cv-document-root .cv-page')
        || document.querySelector('.cover-letter-document')
      ) as HTMLElement | null;
      setSheetRect(sheet ? sheet.getBoundingClientRect() : null);
    };
    measure();

    const scrollContainers = document.querySelectorAll('.overflow-auto');
    scrollContainers.forEach(c => c.addEventListener('scroll', measure, { passive: true }));
    window.addEventListener('resize', measure);
    return () => {
      scrollContainers.forEach(c => c.removeEventListener('scroll', measure));
      window.removeEventListener('resize', measure);
    };
  }, [anchor]);

  /**
   * Fires a prompt that was typed before the inline conversation existed.
   * `expanded` flipping to true mounts MoriChatInterface in the same commit, and
   * a child's effects run before its parent's, so its `mori-chat-send-prompt`
   * listener is already attached when this runs.
   */
  useEffect(() => {
    if (!expanded || !pendingPromptRef.current || !anchor) return;
    const prompt = pendingPromptRef.current;
    pendingPromptRef.current = null;
    dispatchToMori(prompt, anchor.path, anchor.text);
  }, [expanded, anchor]);

  const send = useCallback(
    (prompt: string) => {
      const text = prompt.trim();
      if (!text || !anchor) return;
      setValue('');

      // The cover letter keeps its own chat engine in the dock; only the CV grows
      // the bar into an inline conversation.
      if (doc !== 'cv') {
        onOpenChat();
        window.setTimeout(() => dispatchToMori(text, anchor.path, anchor.text), 120);
        setAnchor(null);
        return;
      }

      if (expanded) {
        // The engine is already mounted, so this can go straight out.
        dispatchToMori(text, anchor.path, anchor.text);
      } else {
        pendingPromptRef.current = text;
        setExpanded(true);
      }
    },
    [anchor, doc, expanded, onOpenChat]
  );

  if (!enabled || !anchor || !rect) return null;

  const isDocument = anchor.scope === 'document';
  const isStubSection = doc === 'cv' && !isDocument && anchor.text.length < MIN_SECTION_CHARS;

  const suggestions = isDocument
    ? DOCUMENT_SUGGESTIONS[doc]
    : isStubSection
      ? [...EMPTY_SECTION_SUGGESTIONS, ...SECTION_SUGGESTIONS.slice(-1)]
      : SECTION_SUGGESTIONS;

  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1440;
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 900;

  const barW = Math.min(BAR_W, viewportW - 2 * MARGIN);
  const panelW = Math.min(PANEL_W, viewportW - 2 * MARGIN);
  const chipsHeight = suggestions.length * CHIP_H + Math.max(0, suggestions.length - 1) * CHIP_GAP;

  /* ── Horizontal: the bar and the conversation are centred on the target's own
     centre line, so the whole group reads as belonging to that section rather
     than floating in a corner of the viewport. ───────────────────────────── */
  const targetCentre = isDocument
    ? (canvasRect ? canvasRect.left + canvasRect.right : viewportW) / 2
    : rect.left + rect.width / 2;

  const barLeft = clamp(
    targetCentre - barW / 2,
    MARGIN,
    Math.max(MARGIN, viewportW - MARGIN - barW)
  );
  const panelLeft = clamp(
    targetCentre - panelW / 2,
    MARGIN,
    Math.max(MARGIN, viewportW - MARGIN - panelW)
  );

  /* ── Horizontal: hug the PAPER, not the window ─────────────────────────────
   * They used to be centred on the same axis as the bar, which stacked the whole
   * suggestion column on top of the CV's own text — the section you were asking
   * about was half covered by the list of things you could ask. They were then
   * moved into the gutter but right-aligned against the WORKSPACE edge, which
   * parked them at the far side of the canvas with a wide dead gap between them
   * and the document they act on.
   *
   * They are now anchored to the SECTION's own page: the stack's LEFT edge starts
   * one GAP outside the sheet, so the chips read as belonging to the section they
   * apply to while still sitting entirely off the paper. `items-start` keeps every
   * pill's left edge on that line, so the stack grows to the right as a column.
   *
   * ⚠️ This degrades, it does not fail. At high zoom the sheet is wider than the
   * workspace, so there is no room to the right and the stack is floored at
   * CHIP_MIN_W and overflows the canvas edge. That is unavoidable — no screen
   * position is outside a page that overflows its own viewport. */
  const chipRightLimit = (canvasRect ? canvasRect.right : viewportW) - MARGIN;
  const chipsLeft = sheetRect
    ? sheetRect.right + GAP
    : chipRightLimit - CHIP_MAX_W;
  const chipStackW = Math.min(CHIP_MAX_W, Math.max(CHIP_MIN_W, chipRightLimit - chipsLeft));

  /* ── Vertical ──────────────────────────────────────────────────────────────
   * The bar is always the piece closest to the target and the conversation is
   * always on the far side of the bar from it, so an expanded chat can never
   * cover the thing being discussed. The chips no longer take part in this
   * stacking at all: they live in the gutter beside the bar (see above), so
   * nothing has to be reserved for them between the bar and the panel. */
  let barTop: number;
  let panelTop: number;
  let panelHeight: number;

  if (isDocument) {
    /* Pinned to the bottom centre of the canvas area; the conversation grows
       UPWARD from the bar, leaving the paper itself uncovered. */
    const frame = canvasRect;
    const bottom = frame ? frame.bottom : viewportH;

    barTop = clamp(bottom - MARGIN - BAR_H, MARGIN, viewportH - MARGIN - BAR_H);
    panelHeight = clamp(barTop - GAP - MARGIN, PANEL_MIN_H, PANEL_MAX_H);
    panelTop = barTop - GAP - panelHeight;
  } else {
    /* Outside the section, centred on it. Prefer BELOW: the conversation then
       opens into the empty paper under the section, which is what keeps the
       section visible while the chat is expanded. Above is the fallback for a
       section that runs past the bottom of the viewport. */
    const roomBelow = viewportH - MARGIN - rect.bottom;
    const roomAbove = rect.top - MARGIN;
    const needForPanel = expanded ? PANEL_MIN_H + GAP : 0;
    const belowFits = roomBelow >= BAR_H + GAP + needForPanel;
    const aboveFits = roomAbove >= BAR_H + GAP + needForPanel;
    const placeBelow = belowFits || !aboveFits;

    if (placeBelow) {
      barTop = clamp(rect.bottom + GAP, MARGIN, viewportH - MARGIN - BAR_H);
      panelTop = barTop + BAR_H + GAP;
      panelHeight = clamp(viewportH - MARGIN - panelTop, PANEL_MIN_H, PANEL_MAX_H);
    } else {
      barTop = clamp(rect.top - GAP - BAR_H, MARGIN, viewportH - MARGIN - BAR_H);
      panelHeight = clamp(barTop - GAP - MARGIN, PANEL_MIN_H, PANEL_MAX_H);
      panelTop = barTop - GAP - panelHeight;
    }
  }

  /** The chips ride beside the bar, so they line up with its top edge. */
  const chipTop = clamp(
    barTop,
    MARGIN,
    Math.max(MARGIN, viewportH - MARGIN - chipsHeight)
  );

  return (
    <>
      {/* Suggestion chips — in the canvas GUTTER beside the bar, right-aligned
          against the workspace edge so they never sit on the page. Hidden while
          the conversation is open: it takes that space instead. */}
      {!expanded && (
        <div
          ref={barRef}
          data-mori-selection-bar
          className="fixed z-[190] flex flex-col items-start no-print"
          style={{ top: chipTop, left: chipsLeft, width: chipStackW, gap: CHIP_GAP }}
        >
          {suggestions.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => send(s.prompt)}
              style={{ height: CHIP_H, maxWidth: CHIP_MAX_W }}
              className={`truncate rounded-full px-3.5 text-xs font-semibold transition-colors duration-150 ${CHIP_SURFACE}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* The search bar — centred on the target and, for a section, sitting
          outside it. This is the only input in the inline flow. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(value);
        }}
        ref={askBarRef}
        data-mori-ask-bar
        className={`fixed z-[190] flex items-center gap-1.5 rounded-full pl-3.5 pr-1.5 py-1.5 no-print ${SURFACE}`}
        style={{ top: barTop, left: barLeft, width: barW, height: BAR_H }}
      >
        <Sparkles size={14} className="shrink-0 text-emerald-500" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={ASK_PLACEHOLDER}
          aria-label={`ASK Mori AI for adjustments to ${anchor.title}`}
          className="min-w-0 flex-1 bg-transparent text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none dark:text-white dark:placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className="shrink-0 rounded-full p-1.5 bg-emerald-500 text-white shadow-[0_2px_8px_rgba(16,185,129,0.35)] transition-colors hover:bg-emerald-600 disabled:bg-transparent disabled:text-slate-400 disabled:shadow-none dark:disabled:text-slate-500"
          aria-label="Send"
        >
          <ChevronRight size={15} />
        </button>
      </form>

      {/* The inline conversation. Only the CV has an inline engine; the cover
          letter still opens its own panel, so nothing renders here for it. */}
      {doc === 'cv' && expanded && (
        <div
          ref={panelRef}
          data-mori-inline-chat
          className={`fixed z-[190] flex flex-col overflow-hidden rounded-2xl no-print ${SURFACE}`}
          style={{ top: panelTop, left: panelLeft, width: panelW, height: panelHeight }}
        >
          <MoriChatInterface embedded />
        </div>
      )}
    </>
  );
};

export default MoriSelectionBar;
