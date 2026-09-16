'use client';

/**
 * OrbStage — the mounting contract for the issiofy ThinkingOrb.
 *
 * ThinkingOrb renders a canvas at `width: 100%; height: 100%`, so it collapses
 * to zero height unless its parent has an explicit height and establishes a
 * positioning context. This wrapper supplies both, so call sites only have to
 * decide *which* visual state to show.
 *
 * The visual configuration is pinned to the exact issiofy defaults; only
 * `orbState` and `paused` are meant to vary, because those are what get wired
 * to real application events.
 *
 * Scope: this is the *voice input* visual. It belongs in the stages where the
 * user is speaking or their speech is being handled (listening, transcribing).
 * It is not a generic loading spinner — for plan generation, question loading
 * and answer submission use `Loader2`, because an orb there implies a voice
 * interaction that is not happening.
 *
 * This component does NOT touch the microphone. `orbState` is a visual state
 * only — it never calls getUserMedia and never requests a permission.
 */

import ThinkingOrb, { type ThinkingOrbProps } from './orb';

/** The exact issiofy defaults, applied at every call site. */
export const ORB_PRESET = {
  variant: 'orb',
  palette: 'heather',
  distortion: 65,
  swirl: 35,
  grainMix: 15,
  grainOverlay: 12,
  glow: 65,
  speed: 1,
  intensity: 65,
} as const;

/**
 * Backdrop for the particle sphere. `closest-side` makes the radius exactly
 * half the smaller dimension — the same quantity that drives the sphere's own
 * size — so this stays correct at every box size without per-call tuning.
 * The 78% opaque stop is measured, not guessed: the drawn cloud reaches 75.4%
 * of `closest-side`, so every particle lands on solid dark.
 */
const ORB_BACKDROP =
  'radial-gradient(circle closest-side at 50% 50%, #0b100c 0%, #0b100c 78%, rgba(11,16,12,0.6) 90%, rgba(11,16,12,0) 100%)';

export interface OrbStageProps {
  /** Visual state, driven by real application events. */
  orbState?: ThinkingOrbProps['orbState'];
  /** Freeze the animation (e.g. while the tab is hidden or a modal is open). */
  paused?: boolean;
  /**
   * Height of the mounting box. Must be an explicit height — the orb cannot
   * infer one. Tailwind height classes or inline values both work.
   */
  className?: string;
  /** Rendered beneath the canvas, outside the orb's paint area. */
  children?: React.ReactNode;
}

export default function OrbStage({
  orbState = 'idle',
  paused = false,
  className = 'h-[200px]',
  children,
}: OrbStageProps) {
  return (
    <div className="flex w-full flex-col items-center gap-3">
      {/*
        Explicit height + positioning context: required by ThinkingOrb.
        `w-full` on this wrapper is what lets the inner box resolve its width
        against the parent card instead of collapsing to zero.

        The dark surface is load-bearing, not decoration: the orb draws ~6 of
        every 7 particles in near-white (#f4f4f5), which measures 1.14:1
        contrast on the app's white dashboard cards — effectively invisible.
        Against this surface the same particles read clearly, in both themes.

        It dissolves rather than sitting in a hard-edged box. The gradient is
        sized to the particle cloud, not to the box: orb.tsx projects the
        sphere at `size = min(w, h) * 0.34`, so the cloud scales with the
        smaller dimension and the ratio below holds at any box size. Measured
        against the rendered canvas, the drawn pixels reach 75.4% of
        `closest-side` (half the smaller dimension). Holding opaque through 78%
        therefore keeps every particle on solid dark — measured 17.47:1 — and
        fades only the empty margin, so the corners melt into the card behind
        instead of cutting a rectangle out of it.

        Written as an inline style on purpose: a CSS `var()` fallback or any
        space inside a Tailwind arbitrary value is silently dropped by Tailwind
        3.4's parser, which is exactly how the mic button lost its background.
        An inline gradient cannot be silently discarded.
      */}
      <div
        className={`relative w-full ${className}`}
        style={{ background: ORB_BACKDROP }}
      >
        <ThinkingOrb
          variant={ORB_PRESET.variant}
          palette={ORB_PRESET.palette}
          orbState={orbState}
          distortion={ORB_PRESET.distortion}
          swirl={ORB_PRESET.swirl}
          grainMix={ORB_PRESET.grainMix}
          grainOverlay={ORB_PRESET.grainOverlay}
          glow={ORB_PRESET.glow}
          speed={ORB_PRESET.speed}
          intensity={ORB_PRESET.intensity}
          paused={paused}
        />
      </div>

      {/* Foreground text sits below the orb so it is never occluded. */}
      {children}
    </div>
  );
}
