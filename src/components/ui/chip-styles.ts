/**
 * THE single source of truth for chip appearance.
 *
 * Every chip in the app — interactive filters, toggles, static status badges —
 * must be built from these tokens. Do not hand-roll a `rounded-full border px-*`
 * chip inline: fourteen different chip looks had accumulated before this existed,
 * and a chip's "selected" state was expressed as a solid fill in some places and
 * an outline in others.
 *
 * ── The design ────────────────────────────────────────────────────────────────
 * An outlined capsule: fully-rounded, hairline 1px border, NO fill.
 *
 *   idle      hairline neutral border, secondary text
 *   hover     border strengthens, text brightens
 *   active    app-green border + app-green text (still no fill)
 *   disabled  dimmed border + tertiary text, inert
 *
 * ── Why `var(--color-primary)` and not a literal green ────────────────────────
 * "App green" is theme-dependent. `--color-primary` is `#013f2e` (forest) in
 * `:root` and `#84cc16` (lime) in `.dark` (globals.css:361 / :483), and
 * `darkMode: 'class'` is set, so ONE class resolves correctly in both themes.
 * Hardcoding `text-lime-500` would be unreadable on a light background
 * (~2:1 contrast); hardcoding forest green would vanish on the dark theme.
 * It also means a brand change propagates to every chip for free.
 *
 * ── Tailwind footgun (see UI-CONVENTIONS.md) ──────────────────────────────────
 * Tailwind silently drops unknown utilities — no lint error, no type error.
 * Never put a SPACE inside an arbitrary value (`bg-[var(--x, #fff)]` compiles to
 * nothing). Every class below was verified against a real compile of this
 * project's config; re-verify after editing (see the note at the bottom).
 */

export type ChipSize = "sm" | "md" | "lg"

/** Interactive chips: idle | active | disabled. */
export type ChipState = "idle" | "active" | "disabled"

/**
 * Semantic tones for STATUS chips (Applied, Offer, Rejected, scores…).
 * These deliberately keep their hue — a green "Rejected" chip reads as success.
 * Only the *recipe* is unified: tinted background + matching border + readable
 * text, which was already the dominant pattern in the admin panels.
 */
export type ChipTone =
  | "neutral"
  | "green"
  | "emerald"
  | "teal"
  | "sky"
  | "blue"
  | "indigo"
  | "violet"
  | "purple"
  | "rose"
  | "orange"
  | "amber"
  | "slate"

/** Capsule geometry + the shared interaction shell. */
export const CHIP_BASE = [
  "inline-flex items-center justify-center gap-1.5",
  "rounded-full border whitespace-nowrap shrink-0 select-none",
  "transition-colors duration-150 ease-out",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-0",
].join(" ")

/**
 * Interactive chip heights (`Pill`). Taller, because they are click targets —
 * these are the exact heights the filter bar, kanban and applications panel
 * already use, so unifying the look does not reflow any dense layout.
 */
export const CHIP_SIZES: Record<ChipSize, string> = {
  sm: "h-7 px-2.5 text-[11px] gap-1.5",
  md: "h-8 px-3 text-xs gap-1.5",
  lg: "h-9 px-4 text-xs sm:text-sm gap-2",
}

/**
 * Static chip heights (`Badge`). Compact, because they are labels rather than
 * targets. Deliberately a different scale from `CHIP_SIZES`: forcing one shared
 * height would either inflate every status badge by 8px or shrink every filter
 * chip, and both are visible regressions for no design gain. The *treatment*
 * (capsule, hairline border, tone recipe) is what is shared.
 */
export const BADGE_SIZES: Record<ChipSize, string> = {
  sm: "h-5 px-2 text-[10px] gap-1",
  md: "h-6 px-2.5 text-xs gap-1.5",
  lg: "h-7 px-3 text-xs gap-1.5",
}

export const CHIP_STATES: Record<ChipState, string> = {
  idle: [
    "border-[var(--border-primary)] bg-transparent text-[var(--text-secondary)]",
    "hover:border-[var(--border-secondary)] hover:text-[var(--text-primary)]",
  ].join(" "),

  // No fill, matching the reference: the green border + green text IS the
  // signal. `hover` adds only a whisper of green so the chip acknowledges the
  // pointer without turning into a filled button.
  active: [
    "border-[var(--color-primary)] bg-transparent text-[var(--color-primary)] font-semibold",
    "hover:bg-[var(--color-primary-soft)]",
  ].join(" "),

  disabled: [
    "border-[var(--border-primary)] bg-transparent text-[var(--text-tertiary)]",
    "opacity-60 cursor-not-allowed",
  ].join(" "),
}

export const CHIP_TONES: Record<ChipTone, string> = {
  neutral:
    "border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]",
  green: "border-lime-500/30 bg-lime-500/10 text-lime-700 dark:text-lime-400",
  emerald:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  teal: "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300",
  sky: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  blue: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  indigo:
    "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  violet:
    "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  purple:
    "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300",
  rose: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  orange:
    "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  amber: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  slate: "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300",
}

/**
 * Metric chips — match score, ATS, win %, and any other read-only number.
 *
 * ⚠️ These deliberately have **no container**: no background, no border, no
 * pill. A metric is a value, not an object, and boxing it made a row of numbers
 * read as a row of buttons. Only the colour survives, so the value keeps its
 * meaning (green = strong, amber = mid, rose = weak).
 *
 * Do NOT use `CHIP_TONES` for a metric — that adds the tinted background and
 * hairline border this is meant to avoid.
 */
export const METRIC_TONES: Record<ChipTone, string> = {
  neutral: "text-[var(--text-secondary)]",
  green: "text-lime-700 dark:text-lime-400",
  emerald: "text-emerald-600 dark:text-emerald-400",
  teal: "text-teal-600 dark:text-teal-400",
  sky: "text-sky-600 dark:text-sky-400",
  blue: "text-blue-600 dark:text-blue-400",
  indigo: "text-indigo-600 dark:text-indigo-400",
  violet: "text-violet-600 dark:text-violet-400",
  purple: "text-purple-600 dark:text-purple-400",
  rose: "text-rose-600 dark:text-rose-400",
  orange: "text-orange-600 dark:text-orange-400",
  amber: "text-amber-600 dark:text-amber-400",
  slate: "text-slate-600 dark:text-slate-400",
}

/** Bare metric text geometry — no padding, no radius, no border, no background. */
export const METRIC_BASE =
  "inline-flex items-center gap-1 text-[11px] font-bold tabular-nums whitespace-nowrap shrink-0"

/** Metric classes: bare coloured text. */
export function metricTone(tone: ChipTone = "neutral"): string {
  return `${METRIC_BASE} ${METRIC_TONES[tone]}`
}

/** Base classes only — no colour. Used by callers that supply their own tone. */
export function chipBase(size: ChipSize = "md"): string {
  return `${CHIP_BASE} ${CHIP_SIZES[size]}`
}

/** Static-chip base: shared treatment, compact scale. */
export function badgeBase(size: ChipSize = "md"): string {
  return `${CHIP_BASE} ${BADGE_SIZES[size]}`
}

/**
 * Interactive chip classes.
 *
 * `active` wins over `disabled` is NOT the behaviour: a disabled chip is inert
 * regardless of selection, so `disabled` short-circuits.
 */
export function chipState(
  state: ChipState = "idle",
  size: ChipSize = "md"
): string {
  return `${chipBase(size)} ${CHIP_STATES[state]}`
}

/** Static status chip classes — one recipe, caller picks the hue. */
export function chipTone(
  tone: ChipTone = "neutral",
  size: ChipSize = "md"
): string {
  return `${badgeBase(size)} ${CHIP_TONES[tone]}`
}

/**
 * Compact inline chip geometry (no fixed height, no colour, no font weight) —
 * for chips that must flow inside a text row or a dense card footer. Pair with
 * a `CHIP_TONES[...]` entry; add `font-medium`/`font-bold` at the call site.
 */
export const CHIP_INLINE =
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] whitespace-nowrap shrink-0 transition-colors duration-150 ease-out"
