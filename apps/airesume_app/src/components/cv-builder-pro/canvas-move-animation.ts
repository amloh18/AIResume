/**
 * canvas-move-animation — the *representation* of a section move, nothing else.
 *
 * `moveSnippet` reorders a zone array. That is the whole model change and this
 * module never touches it: no zones, no pagination, no auto-fit, no layout.
 * It only decides how the reorder LOOKS.
 *
 * ─── What the move looks like ─────────────────────────────────────────────
 *
 * The section that moved travels to its new slot and everything else settles
 * around it: a move up slides the section up past its neighbour, a move down
 * slides it down. Nothing scrolls.
 *
 * ─── Why there is no scroll correction any more (and must not be) ─────────
 *
 * This module used to hold the moved section still on screen and slide the page
 * past it, by scrolling the workspace by exactly the distance the section's
 * layout top had moved and then FLIP-animating the page wrapper back to zero.
 * That illusion is only available when the scroll has room to move in the
 * direction the gesture needs — and for a vertical reorder the two gestures need
 * OPPOSITE directions:
 *
 *     move UP   → the anchor's layout top DECREASES → the correction is negative
 *     move DOWN → the anchor's layout top INCREASES → the correction is positive
 *
 * At the top of a document — where a user is when they first reach for the
 * arrow — a negative correction clamps to 0 and silently does not happen, while
 * a positive one is honoured for as long as any scroll room exists. Measured on
 * a default auto-fit document (maxScroll 413, scrollTop 0), first gesture of the
 * session:
 *
 *     move DOWN → correction +16 applied → anchor travel  0, page travel 16
 *     move UP   → correction   0 clamped → anchor travel 24, page travel  0
 *
 * So the two arrows played *different animations for the same gesture*, and
 * which one you got depended on where the document happened to be scrolled. No
 * amount of tuning fixes that, because the anchored model is simply unreachable
 * for an upward move at scrollTop 0 — there is no scroll position that would put
 * the section back on the pixel it started on. The rule is therefore the one
 * both gestures can honour: the section travels.
 *
 * The pass is now:
 *
 *   1. measure (before the reorder)          — snapshotCanvasMove
 *   2. reorder                               — moveSnippet, untouched
 *   3. FLIP every section from the position  — each section slides at its true
 *      it was in before the reorder             relative speed
 *
 * ─── The page still gets a FLIP, for one narrow reason ────────────────────
 *
 * Not as part of the gesture. A reorder can change pagination, and if the
 * document then gets shorter the browser clamps the workspace's scrollTop —
 * moving the page under a user who did not ask for it. The page wrapper is still
 * inverted so that clamp is absorbed, but because nothing else touches the
 * scroll, that invert is 0 for an ordinary move and only fires on a clamp.
 */

/** Must match the `cv-move-page` / `cv-move-section` keyframes in CVCanvasEngine. */
export const MOVE_ANIM_MS = 260;
export const MOVE_ANIM_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

export const PAGE_KEYFRAMES = 'cv-move-page';
export const SECTION_KEYFRAMES = 'cv-move-section';

/** Below this the motion is invisible and not worth a compositor layer. */
const MIN_VISIBLE_PX = 0.5;

/** Guards the cleanup timer of a superseded move. */
let moveAnimToken = 0;

/**
 * `CSS.escape` is available in every browser this app ships to, but the editor
 * also renders during SSR/`tsc` checks where the global may be absent.
 */
const cssEscape = (value: string): string =>
  typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(value)
    : value.replace(/["\\]/g, '\\$&');

export type CanvasMoveSnapshot = {
  /** Page-wrapper top, in workspace coordinates (workspace padding included). */
  pageTop: number;
  /** blockId → section top, in workspace coordinates. */
  tops: Map<string, number>;
};

/** Top of `el` relative to the workspace's visible top. Negative once scrolled past. */
const topIn = (el: HTMLElement, host: HTMLElement) =>
  el.getBoundingClientRect().top - host.getBoundingClientRect().top;

/**
 * The zoom scale the page is actually rendering at.
 *
 * Read from the DOM rather than passed in: `offsetWidth` is a layout metric and
 * transform-independent, so the rect/offset ratio is the applied scale even
 * mid-transition — which matters, because the keyframes have to reproduce
 * exactly what is on screen right now, not what state says it should be.
 */
const appliedScale = (el: HTMLElement): number => {
  const layoutWidth = el.offsetWidth;
  if (!layoutWidth) return 1;
  const rendered = el.getBoundingClientRect().width / layoutWidth;
  return Number.isFinite(rendered) && rendered > 0 ? rendered : 1;
};

/**
 * Capture where everything sits BEFORE the reorder.
 *
 * Must be called in the same tick as the `setZones` that performs the move, so
 * that React's batching commits both together and the layout effect that plays
 * the animation sees the new order with this snapshot in hand.
 */
export function snapshotCanvasMove(
  workspace: HTMLElement | null | undefined,
  page: HTMLElement | null | undefined,
  anchorId: string | null | undefined,
): CanvasMoveSnapshot | null {
  if (!workspace || !page || !anchorId) return null;

  const tops = new Map<string, number>();
  workspace.querySelectorAll<HTMLElement>('[data-block-id]').forEach((el) => {
    const id = el.getAttribute('data-block-id');
    if (id) tops.set(id, topIn(el, workspace));
  });

  // Nothing to anchor to — the move would be a guess. Let it snap instead.
  if (!tops.has(anchorId)) return null;

  return { pageTop: topIn(page, workspace), tops };
}

/**
 * Play the transition. Call from a layout effect, i.e. after React has committed
 * the reordered DOM and before the browser paints it — anything later shows one
 * frame of the finished layout first, which is the jump we are removing.
 */
export function playCanvasMove(
  snap: CanvasMoveSnapshot,
  workspace: HTMLElement | null | undefined,
  page: HTMLElement | null | undefined,
  anchorId: string,
): void {
  if (!workspace || !page) return;
  if (typeof window === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  // The moved section has to still be on the sheet, and the snapshot has to know
  // where it was. If pagination carried it onto a page that is not rendered there
  // is no anchor for the gesture, and a partial FLIP — everything moving except
  // the section the user actually moved — reads worse than a snap.
  const anchor = workspace.querySelector<HTMLElement>(
    `[data-block-id="${cssEscape(anchorId)}"]`,
  );
  if (!anchor || !snap.tops.has(anchorId)) return;

  // ── 1. Measure the page where it now sits ────────────────────────────────
  // Nothing is scrolled by this pass, so this is 0 for an ordinary move. It is
  // non-zero only when the browser clamped a scroll position the new document
  // height no longer allows — and in that one case the page really did move
  // under the user and needs the invert.
  const pageInvert = snap.pageTop - topIn(page, workspace);

  /**
   * The sections live INSIDE the zoomed page frame, so a `translateY` on one of
   * them is multiplied by the zoom before it reaches the screen: a 60px invert on
   * a section at 70% only moves it 42px. The invert is measured as a screen-space
   * distance, so it has to be divided by the scale to land where it started.
   *
   * The page frame itself is a child of the (unscaled) workspace, so its own
   * invert needs no correction. That asymmetry is the whole subtlety here — get it
   * wrong and the move looks correct at the END (where both transforms are zero)
   * while the section visibly slides 18px into place at the START.
   */
  const scale = appliedScale(page);

  type Pending = { el: HTMLElement; invert: number; keyframes: string };
  const pending: Pending[] = [];

  if (Math.abs(pageInvert) > MIN_VISIBLE_PX) {
    pending.push({ el: page, invert: pageInvert, keyframes: PAGE_KEYFRAMES });
  }

  workspace.querySelectorAll<HTMLElement>('[data-block-id]').forEach((el) => {
    const id = el.getAttribute('data-block-id');
    const was = id ? snap.tops.get(id) : undefined;
    // No before-position: a section that only just mounted (or crossed onto a
    // new page, which remounts it). There is nothing to animate it from.
    if (was === undefined) return;

    // The whole distance the section has to travel: it starts the animation on
    // the pixel it occupied before the reorder and eases to the one it occupies
    // now. The moved section gets the full slot height; a neighbour it swapped
    // with gets the same distance in the opposite direction, so the two cross
    // each other at their true relative speed.
    const screenInvert = was - topIn(el, workspace) - pageInvert;
    if (Math.abs(screenInvert) <= MIN_VISIBLE_PX) return;

    pending.push({ el, invert: screenInvert / scale, keyframes: SECTION_KEYFRAMES });
  });

  if (pending.length === 0) return;

  // ── 2. Re-arm, flush once, then start every element on one timeline ───────
  // `animation: none` + a forced flush is what lets a second move restart the
  // same keyframes on an element that still carries them from the first move.
  // The flush is a single layout pass for the whole batch, not one per element.
  pending.forEach(({ el }) => {
    el.style.animation = 'none';
  });
  void page.offsetHeight;

  const token = String(++moveAnimToken);
  pending.forEach(({ el, invert, keyframes }) => {
    el.dataset.moveAnim = token;
    el.style.setProperty('--mv-y', `${invert.toFixed(2)}px`);
    if (keyframes === PAGE_KEYFRAMES) {
      // The page wrapper carries the zoom transform, and a CSS animation
      // overrides an inline style — so the keyframes have to rebuild the scale
      // themselves or the sheet would snap to 100% for the length of the move.
      el.style.setProperty('--mv-s', String(appliedScale(el)));
    }
    el.style.animation = `${keyframes} ${MOVE_ANIM_MS}ms ${MOVE_ANIM_EASING}`;
  });

  // Clear from ONE timer, guarded by the token, so a second move landing
  // mid-flight cannot be wiped out by the first move's cleanup.
  window.setTimeout(() => {
    pending.forEach(({ el }) => {
      if (el.dataset.moveAnim !== token) return;
      el.style.animation = '';
      el.style.removeProperty('--mv-y');
      el.style.removeProperty('--mv-s');
      delete el.dataset.moveAnim;
    });
  }, MOVE_ANIM_MS + 40);
}
