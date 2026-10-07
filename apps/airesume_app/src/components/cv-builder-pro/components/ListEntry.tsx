'use client';

import React, { useEffect, useLayoutEffect, useState, useContext, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import {
  CanvasContext,
  SnippetContext,
  TOOLRAIL_BTN,
  TOOLRAIL_SURFACE,
  ENTRY_RAIL_WIDTH_PX,
  computeEntryRailPosition,
} from './CoreUI';

/**
 * Grace period between the pointer leaving an entry (or its rail) and the rail
 * fading out.
 *
 * The rail does not touch the entry — it floats in the page's left gutter — so
 * crossing to it always leaves the entry's box first. Without this delay
 * `mouseleave` would close the rail while the pointer is still in the gap, and
 * the control would be impossible to click. Long enough to cross 10px at any
 * sane pointer speed, short enough that the rail still feels attached.
 */
const RAIL_CLOSE_DELAY_MS = 180;

// REUSABLE ENTRY WRAPPER
// ==========================================
const ListEntry = ({ collection, index, moveEntry, deleteEntry, children }: any) => {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const ctx = useContext(CanvasContext);
  const snippetCtx = useContext(SnippetContext);
  const entryRef = useRef<HTMLDivElement>(null);

  /* ─── The rail is an OVERLAY on the canvas, not part of the sheet ─────────
   *
   * It used to be a normal-flow descendant of this entry, which made it a
   * descendant of `.cv-page` (which is `overflow: hidden`) and of the
   * `scale(zoom)` canvas content. Three things followed, all of them wrong:
   *
   *   1. The sheet's own `overflow: hidden` sliced the pill — it hangs to the
   *      LEFT of the entry, i.e. partly outside the page's box.
   *   2. The zoom transform multiplied it, so the "small" pill rendered 54px
   *      wide at 160% while its 14px glyphs stayed 14px and looked shrunken.
   *   3. Worst of all it became UNREACHABLE. The canvas workspace is a scroll
   *      container that centres an overflowing flex item, so at high zoom
   *      `scrollLeft` bottoms out at 0 while the page's left edge sits at a
   *      negative offset. Nothing can scroll that region into view — the rail
   *      was not merely off-screen, there was no scroll position that showed it.
   *
   * So the rail is portalled into the workspace (`[data-cv-workspace]`) instead,
   * exactly like the merged top rail: same coordinate space, same
   * clamping-into-the-visible-band treatment, no transform in its ancestor chain.
   * `computeEntryRailPosition` holds the placement rules and is unit-tested.
   *
   * Consequences worth knowing before changing this:
   *  - It is OUTSIDE the entry's subtree, so CSS `group-hover` cannot drive it —
   *    visibility is React state below (`railOpen`).
   *  - It is OUTSIDE `.cv-readonly`, so `ctx.readOnly` gates it explicitly.
   *  - The buttons keep their own handlers, so nothing had to be re-plumbed
   *    through events.
   */
  const readOnly = !!ctx?.readOnly;
  /**
   * Is this entry's SECTION the focused object?
   *
   * This is the gate on the rail. Hover used to be enough to open it, which
   * meant the canvas grew a floating control cluster for whatever entry the
   * pointer crossed — the section outline, the entry's own hover ring and a
   * three-button pill all at once. Hover is now purely a preview (the section
   * outline plus a border on the entry under the pointer); the rail is a
   * FOCUS-MODE control, and focus mode is entered by clicking the entry. One
   * gesture, one state, and the rail is only ever on screen for the thing you
   * actually selected.
   */
  const sectionSelected = !!snippetCtx?.blockId && ctx?.selectedBlockId === snippetCtx.blockId;
  const railRef = useRef<HTMLDivElement | null>(null);
  const [railHost, setRailHost] = useState<HTMLElement | null>(null);
  const [railOpen, setRailOpen] = useState(false);
  const [railPos, setRailPos] = useState<{ top: number; left: number } | null>(null);
  const closeTimer = useRef<number | null>(null);

  /** Hover can only ever open the rail while the section owns the focus. */
  const railArmed = !readOnly && sectionSelected;
  const railVisible = railArmed && railOpen;

  useEffect(() => {
    // `closest` on the committed node: the portal target has to be the scroll
    // container the entry actually lives in, or the rail would measure against
    // the wrong rect. Read-only previews render no workspace, hence the null.
    setRailHost((entryRef.current?.closest('[data-cv-workspace]') as HTMLElement | null) ?? null);
  }, []);

  // Leaving focus mode takes the rail with it — otherwise the next selection
  // would inherit an open rail nobody hovered.
  useEffect(() => {
    if (!railArmed && railOpen) setRailOpen(false);
  }, [railArmed, railOpen]);

  const openRail = () => {
    if (!railArmed) return;
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setRailOpen(true);
  };

  const closeRailSoon = () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null;
      setRailOpen(false);
    }, RAIL_CLOSE_DELAY_MS);
  };

  useEffect(() => () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
  }, []);

  useLayoutEffect(() => {
    if (!railVisible || !railHost || readOnly) return undefined;
    const host = railHost;

    const measure = () => {
      const entry = entryRef.current;
      const rail = railRef.current;
      if (!entry || !rail || !entry.isConnected) {
        setRailPos(null);
        return;
      }
      const entryRect = entry.getBoundingClientRect();
      const hostRect = host.getBoundingClientRect();
      const next = computeEntryRailPosition({
        anchor: {
          top: entryRect.top,
          bottom: entryRect.bottom,
          left: entryRect.left,
          width: entryRect.width,
        },
        host: {
          top: hostRect.top,
          bottom: hostRect.bottom,
          left: hostRect.left,
          width: hostRect.width,
          clientWidth: host.clientWidth,
          clientHeight: host.clientHeight,
          scrollTop: host.scrollTop,
          scrollLeft: host.scrollLeft,
        },
        railWidth: rail.offsetWidth || ENTRY_RAIL_WIDTH_PX,
        railHeight: rail.offsetHeight,
      });
      setRailPos((prev) => {
        if (!next) return null;
        return prev && Math.abs(prev.top - next.top) < 0.5 && Math.abs(prev.left - next.left) < 0.5
          ? prev
          : next;
      });
    };

    // Layout effect, so the FIRST painted frame of the hover is already in place
    // rather than showing last-open's position for a frame.
    measure();

    /* `measure` reads live rects, but two things move the anchor without ever
     * firing `scroll` or `resize`:
     *  - the canvas EASES its zoom over ~200ms, and a CSS transition mutates the
     *    `transform` attribute exactly once — the MutationObserver below fires at
     *    the START of the glide, so the first reading is taken mid-flight and is
     *    stale by however far the sheet still has to travel (measured: the rail
     *    landed 11px out, exactly the residual scroll offset);
     *  - the canvas' own `scrollLeft` can be settling when the hover arrives.
     * Hence the same two extra passes the merged top rail uses — one after the
     * frame, one after the glide — plus `transitionend` for the exact moment the
     * glide actually stops. */
    const raf = window.requestAnimationFrame(measure);
    const settle = window.setTimeout(measure, 240);

    host.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (resizeObserver && entryRef.current) resizeObserver.observe(entryRef.current);

    // Zoom is a CSS transform on the canvas content: it fires neither a resize
    // nor a scroll, so nothing above would notice it. The engine tags that layer
    // `data-cv-zoom-layer`, and its inline `transform` is the one thing that
    // changes — so watch that attribute, which also catches the eased glide.
    const zoomLayer = host.querySelector('[data-cv-zoom-layer]');
    const mutationObserver = zoomLayer && typeof MutationObserver !== 'undefined'
      ? new MutationObserver(measure)
      : null;
    mutationObserver?.observe(zoomLayer as Element, { attributes: true, attributeFilter: ['style'] });
    zoomLayer?.addEventListener('transitionend', measure);

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(settle);
      host.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      zoomLayer?.removeEventListener('transitionend', measure);
    };
  }, [railVisible, railHost, readOnly]);

  useEffect(() => {
    const handleUpdated = (e: CustomEvent) => {
      const { collection: eventCol, index: eventIdx, highlightIndex } = e.detail;
      if (eventCol === collection && eventIdx === index) {
        requestAnimationFrame(() => {
          if (typeof highlightIndex === 'number') {
            const element = entryRef.current?.querySelector(`[data-highlight-index="${highlightIndex}"]`);
            if (element) {
              element.classList.remove('mori-pulse-highlight');
              void (element as HTMLElement).offsetWidth;
              element.classList.add('mori-pulse-highlight');
              setTimeout(() => {
                element.classList.remove('mori-pulse-highlight');
              }, 2500);
            }
          } else {
            const element = entryRef.current;
            if (element) {
              element.classList.remove('mori-pulse-highlight');
              void (element as HTMLElement).offsetWidth;
              element.classList.add('mori-pulse-highlight');
              setTimeout(() => {
                element.classList.remove('mori-pulse-highlight');
              }, 2500);
            }
          }
        });
      }
    };

    window.addEventListener('mori-cv-updated-section', handleUpdated as EventListener);
    return () => {
      window.removeEventListener('mori-cv-updated-section', handleUpdated as EventListener);
    };
  }, [collection, index]);

  useEffect(() => {
    if (!confirmingDelete) return undefined;
    const timer = window.setTimeout(() => setConfirmingDelete(false), 3000);
    return () => window.clearTimeout(timer);
  }, [confirmingDelete]);

  const handleDelete = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    deleteEntry(collection, index);
    setConfirmingDelete(false);
  };

  /* Keep the rail alive while the pointer is over the ENTRY *or* the RAIL — they
   * are no longer the same subtree, so neither can imply the other. */
  const handleBlurWithin = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) closeRailSoon();
  };

  const baseClass = "relative group/entry cv-item cv-page-breakable transition-[background-color,border-color,box-shadow,opacity] duration-200 rounded-md border border-transparent";
  // No `moriChatMode` variant: AI targeting is section- or page-level, so an
  // entry must not advertise itself as a chat target. It used to paint an
  // emerald ring in chat mode and, on Alt+click, hand the chat an entry-level
  // path (`experience[2]`), which made the model rewrite one bullet. Alt+clicks
  // now bubble to the section wrapper, which resolves the selection at section
  // level — see handleSectionClick in CanvasSnippet.
  //
  // The hover affordance is a BORDER, not just a tint. A 2%-opacity emerald wash
  // was invisible against the paper, so hovering an entry gave no answer to
  // "which entry am I on?" — the rail was doing that job, and the rail only
  // appears in focus mode now. `border-transparent` in the base class already
  // reserves the 1px, so this cannot reflow the CV. It is deliberately a pale
  // emerald rather than the section frame's lime: it is the "this one, here"
  // affordance, not a second selection box.
  const hoverClass = "hover:bg-[#10b981]/[0.03] shadow-none hover:shadow-[0_2px_8px_rgba(16,185,129,0.06)] hover:border-emerald-300/80 group-hover/snippet:z-30 hover:z-40";

  /**
   * Clicking an ENTRY is the one-step way in.
   *
   * It used to take two gestures — click the section to put it in focus mode,
   * then go and find the entry — because a click on an entry only ever did the
   * first half. This makes the entry itself the handle: the click still bubbles
   * to the section wrapper (which sets `selectedBlockId`, i.e. focus mode), and
   * this fills the other half by putting the caret in the entry.
   *
   * A click that already landed on a field has done that second half by itself —
   * the browser placed the caret where you clicked — so this only acts when the
   * click hit the entry's padding or a non-editable child, and never moves a
   * caret the user aimed deliberately.
   */
  const handleEntryClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly) return;
    const target = e.target as HTMLElement;
    if (target.closest('[contenteditable="true"]')) return;
    const field = entryRef.current?.querySelector('[contenteditable="true"]') as HTMLElement | null;
    if (!field) return;
    field.focus();
    // `focus()` alone leaves the caret wherever the browser decides, which on a
    // fresh focus is the START — you would be typing into the front of the
    // sentence. Put it at the end, where you left off.
    const range = document.createRange();
    range.selectNodeContents(field);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  };

  const entryId = ctx?.cvData?.[collection]?.[index]?.id;
  if (snippetCtx && entryId) {
    const entryUnitId = `${snippetCtx.blockId}_entry_${entryId}`;
    const assignedPage = snippetCtx.pageAssignments[entryUnitId] ?? 0;
    if (assignedPage !== snippetCtx.pageIdx) {
      return null;
    }
  }

  const rail = railArmed && railHost
    ? createPortal(
      <div
        ref={railRef}
        data-entry-rail
        onMouseEnter={openRail}
        onMouseLeave={closeRailSoon}
        onFocus={openRail}
        onBlur={handleBlurWithin}
        className={`entry-controls absolute z-[119] flex flex-col items-center gap-0.5 p-1 no-print ${TOOLRAIL_SURFACE} transition-opacity duration-150 ${railVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        // Position is always applied — even while hidden — so the (invisible)
        // rail sits at the content origin instead of adding phantom scroll area
        // to the canvas. `visibility` rather than `display` because the rail has
        // to stay measurable: `measure` reads its own offsetHeight.
        style={{
          top: railPos?.top ?? 0,
          left: railPos?.left ?? 0,
          visibility: railPos ? 'visible' : 'hidden',
        }}
      >
        <button
          onClick={(e: any) => { e.stopPropagation(); moveEntry(collection, index, -1); }}
          className={`${TOOLRAIL_BTN} hover:text-emerald-600 dark:hover:text-emerald-400`}
          title="Move entry up"
          aria-label="Move entry up"
          type="button"
        >
          <ChevronUp size={14}/>
        </button>
        <button
          onClick={(e: any) => { e.stopPropagation(); moveEntry(collection, index, 1); }}
          className={`${TOOLRAIL_BTN} hover:text-emerald-600 dark:hover:text-emerald-400`}
          title="Move entry down"
          aria-label="Move entry down"
          type="button"
        >
          <ChevronDown size={14}/>
        </button>
        <button
          onClick={handleDelete}
          className={`${TOOLRAIL_BTN} ${
            confirmingDelete
              ? 'bg-red-500 text-white shadow-md'
              : 'text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10'
          }`}
          title={confirmingDelete ? 'Click again to permanently delete this entry' : 'Delete entry'}
          aria-label={confirmingDelete ? 'Confirm delete entry' : 'Delete entry'}
          aria-pressed={confirmingDelete}
          type="button"
        >
          <Trash2 size={14}/>
        </button>
      </div>,
      railHost
    )
    : null;

  return (
    <div
      ref={entryRef}
      className={`${baseClass} ${hoverClass}`}
      data-collection={collection}
      data-index={index}
      data-entry-id={entryId}
      onClick={handleEntryClick}
      onMouseEnter={openRail}
      onMouseLeave={closeRailSoon}
      onFocus={openRail}
      onBlur={handleBlurWithin}
    >
      {rail}
      {children}
    </div>
  );
};

// ==========================================
export default ListEntry;
