'use client';

/**
 * First-run tour for the CV editor (onboarding step 3).
 *
 * WHY A TOUR AT ALL
 * ----------------
 * The step-3 canvas is the most capable screen in the product — three rails, five
 * panels, a page/zoom strip, inline editing and an AI layer — and a brand-new
 * user arrives there mid-signup with no idea any of it exists. This walks them
 * through it once, in the order they will actually use it, and then never
 * appears again.
 *
 * DESIGN CONSTRAINTS (deliberate, do not "improve" them away)
 * ----------------------------------------------------------
 *  - The overlay is `pointer-events-none` except for the card itself. The user
 *    must remain able to click the thing being pointed at; a tour that blocks
 *    the editor while explaining it is worse than no tour.
 *  - It never fabricates an anchor. If the element a step points at is not on
 *    screen (a collapsed panel, a narrow viewport), that step falls back to a
 *    centred card with the same copy rather than highlighting the wrong thing.
 *  - The dimming is a single element with a huge `box-shadow` spread, not four
 *    scrim rectangles: one box means no seams as the anchor moves.
 *  - Copy is written for someone who has never used a resume builder. No "ATS",
 *    no "rail", no "block" — those are our words, not theirs.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  MousePointerClick,
  LayoutGrid,
  ZoomIn,
  Wand2,
  ArrowRight,
  X,
  Briefcase,
  PlusCircle,
} from 'lucide-react';

export type TourPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface TourStep {
  id: string;
  /** CSS selector for the element to highlight, or null for a centred card. */
  target: string | null;
  placement: TourPlacement;
  /** Extra room around the target when cutting the hole in the dimmer. */
  pad: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  /**
   * Run immediately before this step is shown. Used by the last step to select a
   * section for the user so the toolbar it explains is guaranteed to be on
   * screen.
   */
  prepare?: () => void;
}

export const TOUR_STORAGE_KEY = 'buildairesume_editor_tour_v1';

/**
 * Server-side "already seen" flag (`user.onboarding.editor_tour_completed`).
 *
 * localStorage CANNOT be the gate in this app: `immediate431Fix` runs on every
 * page load and calls `localStorage.clear()` (restoring only the cookie-consent
 * keys), so a storage-only flag made the tour replay on every navigation. The
 * flag therefore lives on the user record, exactly like
 * `onboarding.cv_checklist_dismissed`; localStorage is kept as a cheap
 * short-circuit for the common case.
 */
const TOUR_FLAG_API = '/api/user/onboarding';

/**
 * Reads the durable flag. Fails OPEN (resolves false) for every failure mode —
 * an unauthorised request, a network error, a timeout or a malformed body all
 * mean "no record of having seen it", so the tour runs. Failing closed would
 * silently cancel a first-run explainer, which is the worse of the two.
 *
 * Bounded on purpose: the endpoint loads the user's master CV and is not fast,
 * and the tour must not sit behind it.
 */
export async function hasCompletedTour(timeoutMs = 2500): Promise<boolean> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const res = await fetch(TOUR_FLAG_API, {
      method: 'GET',
      cache: 'no-store',
      signal: controller?.signal,
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data?.data?.onboarding?.editor_tour_completed === true;
  } catch {
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Persists the durable flag. Fire-and-forget: the tour must not wait on it. */
export async function markTourCompleted(): Promise<void> {
  try {
    await fetch(TOUR_FLAG_API, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ editor_tour_completed: true }),
    });
  } catch {
    // Ignored on purpose: the worst case is that the tour is offered again.
  }
}

/**
 * The tour, in the order the user needs it:
 *   1. what this screen is
 *   2. the sections they will click
 *   3. the panels that act on the document
 *   4. the page/zoom controls they will hunt for
 *   5. the toolbar that appears once a section is selected (AI + formatting +
 *      moving sections and entries + AI suggestion pills)
 */
export const EDITOR_TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    target: null,
    placement: 'bottom',
    pad: 0,
    icon: Sparkles,
    title: 'Welcome to your CV editor',
    body: 'This is where your Profile becomes a real CV. Everything is editable right on the page, and every change saves on its own. Give us 30 seconds and you will know where everything lives.',
  },
  {
    id: 'sections',
    // The SHEET, not the workspace. The workspace is the whole scroll area, so
    // its rect is the viewport: the hole covered everything and the card was
    // pushed to the bottom edge, on top of the page/zoom controls it was about
    // to explain. The sheet leaves room beside it for the card.
    target: '[data-cv-zoom-layer]',
    placement: 'left',
    pad: 8,
    icon: MousePointerClick,
    title: 'Click a section to work on it',
    body: 'Click any heading in your CV — Work Experience, Education, Skills. That section lights up and its text becomes editable: click a line and type. No forms, no pop-ups.',
    prepare: () => {
      document.querySelectorAll('[data-tour-active]').forEach((el) => el.removeAttribute('data-tour-active'));
    },
  },
  {
    id: 'add-entry',
    target: '[data-add-entry-preview]',
    placement: 'bottom',
    pad: 8,
    icon: Briefcase,
    title: 'Add a new role in Experience',
    body: 'Need to add another job or role? Click the green line with the + button at the bottom of the section to instantly insert a new experience entry and fill in your details.',
    prepare: () => {
      document.querySelectorAll('[data-tour-active]').forEach((el) => el.removeAttribute('data-tour-active'));
      const expBlock = (document.querySelector('[data-json-section="experience"]') || document.querySelector('[data-block-id]')) as HTMLElement | null;
      if (expBlock) {
        expBlock.click();
        expBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },
  },
  {
    id: 'add-section',
    target: '[data-add-section-handle]',
    placement: 'bottom',
    pad: 8,
    icon: PlusCircle,
    title: 'Add a new section in canvas',
    body: 'Hover between any two sections to reveal the green line with the + button. Click it to open the section picker card and insert recommended sections like Projects, Certifications, or Languages.',
    prepare: () => {
      document.querySelectorAll('[data-tour-active]').forEach((el) => el.removeAttribute('data-tour-active'));
      const handle = document.querySelector('[data-add-section-handle]') as HTMLElement | null;
      if (handle) {
        handle.setAttribute('data-tour-active', 'true');
        handle.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },
  },
  {
    id: 'panels',
    target: '[data-editor-panel-rail]',
    placement: 'left',
    pad: 6,
    icon: LayoutGrid,
    title: 'These five panels do the heavy lifting',
    body: 'Analysis scores your CV the way a recruiter\'s software reads it and lists what to fix. Add Section drops in a new block. Design controls spacing, fonts and paper size. Template changes how it looks. JSON shows the raw data behind the page.',
    prepare: () => {
      document.querySelectorAll('[data-tour-active]').forEach((el) => el.removeAttribute('data-tour-active'));
    },
  },
  {
    id: 'page-controls',
    target: '[data-canvas-page-controls]',
    placement: 'top',
    pad: 8,
    icon: ZoomIn,
    title: 'Pages, zoom and undo',
    body: 'Down here: how many pages your CV fills, and the paper size (A4 for India and Europe, Letter for the US — click to switch). The slider zooms in and out, the percentage resets it, and FIT puts the whole page back on screen. Undo and redo sit beside them.',
    prepare: () => {
      document.querySelectorAll('[data-tour-active]').forEach((el) => el.removeAttribute('data-tour-active'));
    },
  },
  {
    id: 'selection',
    target: '[data-canvas-toolrail]',
    placement: 'bottom',
    pad: 8,
    icon: Wand2,
    title: 'The toolbar for the section you picked',
    body: 'Select a section and this bar appears above it. AI runs AI actions on that section, Improve rewrites the line your cursor is in, B/I/U formats it, the list and arrow buttons rearrange it, and the up/down buttons move the section higher or lower. The small rail on the edge of each entry does the same for that one entry. And when the AI has a suggestion for a line, a pill appears next to it — click the pill to read it and accept it.',
    prepare: () => {
      document.querySelectorAll('[data-tour-active]').forEach((el) => el.removeAttribute('data-tour-active'));
      const firstBlock = document.querySelector('[data-block-id]') as HTMLElement | null;
      firstBlock?.click();
    },
  },
];

export interface TourRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface TourSize {
  width: number;
  height: number;
}

export interface TourPoint {
  top: number;
  left: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

/**
 * Where to put the tour card, in viewport coordinates.
 *
 * Pure on purpose: the clamping/flipping rules are the part that actually breaks
 * on small screens or when a panel docks to the right, and they are much easier
 * to trust with a test than by clicking around. `target === null` (a step with
 * no anchor) centres the card.
 */
export function placeTourCard(
  target: TourRect | null,
  card: TourSize,
  placement: TourPlacement,
  viewport: TourSize,
  gap = 14,
  margin = 16,
): TourPoint {
  if (!target) {
    return {
      top: Math.max(margin, (viewport.height - card.height) / 2),
      left: Math.max(margin, (viewport.width - card.width) / 2),
    };
  }

  let side = placement;
  // Flip to the opposite side when the preferred one would not fit and the
  // other one would. Without this a bottom-placed card for a target near the
  // bottom edge is clamped on top of the thing it is describing.
  if (side === 'bottom' && target.top + target.height + gap + card.height > viewport.height - margin) {
    if (target.top - gap - card.height >= margin) side = 'top';
  } else if (side === 'top' && target.top - gap - card.height < margin) {
    if (target.top + target.height + gap + card.height <= viewport.height - margin) side = 'bottom';
  } else if (side === 'left' && target.left - gap - card.width < margin) {
    if (target.left + target.width + gap + card.width <= viewport.width - margin) side = 'right';
  } else if (side === 'right' && target.left + target.width + gap + card.width > viewport.width - margin) {
    if (target.left - gap - card.width >= margin) side = 'left';
  }

  let top: number;
  let left: number;
  if (side === 'bottom') {
    top = target.top + target.height + gap;
    left = target.left + target.width / 2 - card.width / 2;
  } else if (side === 'top') {
    top = target.top - card.height - gap;
    left = target.left + target.width / 2 - card.width / 2;
  } else if (side === 'left') {
    left = target.left - card.width - gap;
    top = target.top + target.height / 2 - card.height / 2;
  } else {
    left = target.left + target.width + gap;
    top = target.top + target.height / 2 - card.height / 2;
  }

  return {
    top: clamp(top, margin, viewport.height - card.height - margin),
    left: clamp(left, margin, viewport.width - card.width - margin),
  };
}

const CARD_WIDTH = 328;

interface EditorOnboardingTourProps {
  /** True only for the onboarding hand-off, on the CV canvas document. */
  active: boolean;
}

export const EditorOnboardingTour: React.FC<EditorOnboardingTourProps> = ({ active }) => {
  const [index, setIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [rect, setRect] = useState<TourRect | null>(null);
  const [cardSize, setCardSize] = useState<TourSize>({ width: CARD_WIDTH, height: 200 });
  const [viewport, setViewport] = useState<TourSize>(() => ({
    width: typeof window === 'undefined' ? 1280 : window.innerWidth,
    height: typeof window === 'undefined' ? 800 : window.innerHeight,
  }));
  const cardRef = useRef<HTMLDivElement | null>(null);

  const step = EDITOR_TOUR_STEPS[index];

  useEffect(() => () => {
    document.querySelectorAll('[data-tour-active]').forEach((el) => el.removeAttribute('data-tour-active'));
  }, []);

  useEffect(() => {
    if (!running) return undefined;
    const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, [running]);

  // Arming. Only once per user (this is a first-run explainer, not a recurring
  // modal), and only after the canvas exists — the first steps point at DOM that
  // the editor creates after data loads.
  useEffect(() => {
    if (!active || running) return undefined;
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(TOUR_STORAGE_KEY);
    } catch {
      // Private mode / storage blocked: fall through to the server flag.
      stored = null;
    }
    if (stored) return undefined;

    let cancelled = false;
    const started = Date.now();
    const waitForCanvas = () => {
      if (cancelled) return;
      const ready = document.querySelector('[data-cv-workspace]');
      // Give up waiting after 15s so a locked-down environment cannot leave a
      // timer running forever; the tour then simply never opens.
      if (ready || Date.now() - started > 15000) {
        if (ready) {
          hasCompletedTour()
            .then((done) => {
              if (cancelled || done) return;
              setRunning(true);
            })
            // `hasCompletedTour` is fail-open by contract; this catch exists so a
            // future change to it cannot strand the tour behind a rejection.
            .catch(() => {
              if (!cancelled) setRunning(true);
            });
        }
        return;
      }
      window.setTimeout(waitForCanvas, 250);
    };
    const arm = window.setTimeout(waitForCanvas, 900);
    return () => {
      cancelled = true;
      window.clearTimeout(arm);
    };
  }, [active, running]);

  const finish = useCallback(() => {
    document.querySelectorAll('[data-tour-active]').forEach((el) => el.removeAttribute('data-tour-active'));
    try {
      window.localStorage.setItem(TOUR_STORAGE_KEY, 'done');
    } catch {
      // Storage unavailable — the server flag below is the real gate.
    }
    // Not awaited: closing the tour must not depend on a network round trip.
    void markTourCompleted();
    setRunning(false);
  }, []);

  // Resolve the anchor for the current step, and keep it resolved. The canvas
  // eases zoom and re-lays-out after a section is selected, so a single
  // measurement on step change is always a little stale.
  useEffect(() => {
    if (!running || !step) return undefined;
    step.prepare?.();

    let frame = 0;
    const measure = () => {
      const node = step.target ? (document.querySelector(step.target) as HTMLElement | null) : null;
      if (!node) {
        setRect(null);
      } else {
        const r = node.getBoundingClientRect();
        setRect((prev) => {
          if (
            prev &&
            Math.abs(prev.top - r.top) < 0.5 &&
            Math.abs(prev.left - r.left) < 0.5 &&
            Math.abs(prev.width - r.width) < 0.5 &&
            Math.abs(prev.height - r.height) < 0.5
          ) {
            return prev;
          }
          return { top: r.top, left: r.left, width: r.width, height: r.height };
        });
      }
      const card = cardRef.current;
      if (card) {
        const size = { width: card.offsetWidth, height: card.offsetHeight };
        setCardSize((prev) => (prev.width === size.width && prev.height === size.height ? prev : size));
      }
      frame = window.requestAnimationFrame(measure);
    };
    frame = window.requestAnimationFrame(measure);
    return () => window.cancelAnimationFrame(frame);
  }, [running, step]);

  /**
   * Advance one step, or finish on the last one.
   *
   * `finish()` is deliberately NOT called from inside a state updater: updaters
   * must be pure, and React invokes them more than once (StrictMode, and on a
   * re-render while an update is pending). Writing localStorage and closing the
   * tour from in there made a single "Next" click able to jump several steps and
   * close the tour at once.
   */
  const next = useCallback(() => {
    if (index >= EDITOR_TOUR_STEPS.length - 1) {
      finish();
      return;
    }
    setIndex(index + 1);
  }, [index, finish]);

  const back = useCallback(() => setIndex((prev) => Math.max(0, prev - 1)), []);

  useEffect(() => {
    if (!running) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      if (e.key === 'ArrowLeft') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [running, finish, next, back]);

  const position = useMemo(
    () => placeTourCard(rect, cardSize, step?.placement ?? 'bottom', viewport),
    [rect, cardSize, step, viewport],
  );

  if (!running || !step) return null;

  const isLast = index === EDITOR_TOUR_STEPS.length - 1;
  const StepIcon = step.icon;

  return (
    <AnimatePresence>
      <motion.div
        key="editor-tour"
        className="fixed inset-0 z-[300] no-print"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        // The overlay must never swallow the interaction it is describing.
        style={{ pointerEvents: 'none' }}
        role="dialog"
        aria-modal="false"
        aria-label="Editor tour"
      >
        {/* Dimmer with a hole. One box + a huge spread shadow = no seams. */}
        <motion.div
          className="absolute rounded-2xl"
          style={{
            top: rect ? Math.max(0, rect.top - step.pad) : 0,
            left: rect ? Math.max(0, rect.left - step.pad) : 0,
            width: rect ? rect.width + step.pad * 2 : '100%',
            height: rect ? rect.height + step.pad * 2 : '100%',
            boxShadow: rect ? '0 0 0 9999px rgba(0,0,0,0.62)' : 'none',
            backgroundColor: rect ? 'transparent' : 'rgba(0,0,0,0.62)',
            outline: rect ? '2px solid #84cc16' : 'none',
            outlineOffset: '1px',
            pointerEvents: 'none',
          }}
          animate={{ opacity: 1 }}
        />

        <motion.div
          ref={cardRef}
          key={step.id}
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          className="absolute w-[328px] rounded-[22px] bg-[#111111] text-white shadow-[0_24px_60px_-15px_rgba(0,0,0,0.7)] border border-white/10 p-4"
          style={{ top: position.top, left: position.left, pointerEvents: 'auto' }}
        >
          <button
            type="button"
            onClick={finish}
            aria-label="Skip the tour"
            title="Skip the tour"
            className="absolute top-3 right-3 p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-3">
            <span className="shrink-0 w-9 h-9 rounded-full border border-white/25 flex items-center justify-center">
              <StepIcon className="w-4 h-4 text-white" />
            </span>
            <div className="min-w-0 pr-4">
              <h4 className="text-[15px] font-extrabold leading-snug">{step.title}</h4>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-gray-300">{step.body}</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold text-gray-400">
              {index + 1} of {EDITOR_TOUR_STEPS.length}
            </span>
            <div className="flex items-center gap-2">
              {index > 0 && (
                <button
                  type="button"
                  onClick={back}
                  className="px-3 py-1.5 rounded-full text-[12px] font-bold text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={next}
                className="px-4 py-1.5 rounded-full bg-white text-black text-[12px] font-extrabold flex items-center gap-1.5 hover:bg-gray-100 transition-colors active:scale-95"
              >
                {isLast ? 'Start editing' : 'Next'}
                {isLast ? <Sparkles className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EditorOnboardingTour;
