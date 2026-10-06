'use client';

import React from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Utility panel ids that can be opened as a side panel from the tile rail.
 *
 * `layout` is the user-facing "Template" tile (it opens the template library);
 * the id is kept as `layout` so the existing canvas events
 * (`open-templates` / `set-builder-sidebar`) keep working unchanged.
 */
export type UtilityPanelId = 'analysis' | 'design' | 'layout' | 'json';

interface UtilityPanelRailProps {
  /** Currently open panel, or null when the canvas is in its wide (tiles-only) state. */
  activePanel: UtilityPanelId | null;
  /** Optional class override for the rail container. */
  className?: string;
}

/**
 * Opens a panel. These window events are the existing contract between the
 * editor shell (Step3CV) and the canvas engine (CVCanvasEngine), which owns the
 * panel bodies and portals them into `#builder-utility-panel-portal`.
 */
const openPanel = (panel: UtilityPanelId) => {
  if (panel === 'analysis') {
    window.dispatchEvent(new CustomEvent('open-analysis-panel'));
    return;
  }
  if (panel === 'layout') {
    window.dispatchEvent(new CustomEvent('open-templates'));
    return;
  }
  window.dispatchEvent(
    new CustomEvent('set-builder-sidebar', { detail: panel === 'json' ? 'data' : 'design' })
  );
};

const closePanel = () => {
  window.dispatchEvent(new CustomEvent('close-utility-panel'));
};

/* ------------------------------------------------------------------ */
/* Mini previews — each tile renders a tiny animated mock of the panel */
/* it opens. Pure CSS animation (no JS timers / rAF loops), so the      */
/* previews keep running without re-rendering the editor.               */
/* ------------------------------------------------------------------ */

const AnalysisPreview: React.FC = () => (
  <span className="up-pv">
    <svg className="up-gauge" viewBox="0 0 36 36" aria-hidden="true">
      <circle className="up-gauge-track" cx="18" cy="18" r="14" />
      <circle className="up-gauge-value" cx="18" cy="18" r="14" />
    </svg>
    <span className="up-rows" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  </span>
);

const DesignPreview: React.FC = () => (
  <span className="up-pv">
    <span className="up-doc" aria-hidden="true">
      <span className="up-doc-hd" />
      <span className="up-doc-ln" />
      <span className="up-doc-ln s" />
      <span className="up-doc-chips">
        <i />
        <i />
        <i />
      </span>
    </span>
  </span>
);

const TemplatePreview: React.FC = () => (
  <span className="up-pv">
    <span className="up-tpl" aria-hidden="true">
      <span className="up-tpl-a">
        <b />
        <b />
        <b />
        <b />
      </span>
      <span className="up-tpl-b">
        <b />
        <b />
        <b />
      </span>
    </span>
  </span>
);

const JsonPreview: React.FC = () => (
  <span className="up-pv">
    <span className="up-json" aria-hidden="true">
      <i />
      <i />
      <i />
      <em className="up-caret" />
    </span>
  </span>
);

interface TileDef {
  id: UtilityPanelId;
  label: string;
  Preview: React.FC;
}

const TILES: TileDef[] = [
  { id: 'analysis', label: 'Analysis', Preview: AnalysisPreview },
  { id: 'design', label: 'Design', Preview: DesignPreview },
  { id: 'layout', label: 'Template', Preview: TemplatePreview },
  { id: 'json', label: 'JSON', Preview: JsonPreview },
];

/**
 * Step navigation, mobile only. It used to be a separate floating pill pinned
 * over the canvas, which overlapped this rail; folding the two actions in here
 * as tiles keeps one row of controls.
 */
const STEP_TILES: { id: 'prev' | 'next'; label: string; event: string; Icon: typeof ChevronLeft }[] = [
  { id: 'prev', label: 'Prev', event: 'editor-back-step', Icon: ChevronLeft },
  { id: 'next', label: 'Next', event: 'editor-next-step', Icon: ChevronRight },
];

/**
 * Scoped styles for the rail. Kept here (rather than globals.css) so the tile
 * animations travel with the component; class names are prefixed `up-`.
 */
const RAIL_STYLES = `
.up-tile {
  /* backwards fill (not both) so the entrance animation releases transform/opacity
     when it finishes — otherwise its fill-forwards state would block hover lifts. */
  animation: up-in .55s cubic-bezier(.16,1,.3,1) backwards;
  transition:
    transform .35s cubic-bezier(.16,1,.3,1),
    box-shadow .35s ease,
    border-color .3s ease,
    background-color .3s ease,
    color .3s ease;
}
@keyframes up-in {
  from { opacity: 0; transform: translateY(8px) scale(.86); }
  to   { opacity: 1; transform: none; }
}
.up-tile:hover { transform: translateY(-3px); box-shadow: 0 10px 20px -10px rgba(0,0,0,.45); }
.up-tile:active { transform: translateY(0) scale(.95); transition-duration: .09s; }
.up-tile[aria-selected="true"] {
  transform: translateX(-3px);
  box-shadow:
    0 0 0 1px rgba(16,185,129,.45),
    0 12px 24px -12px rgba(16,185,129,.65);
}
.up-tile[aria-selected="true"]:hover { transform: translateX(-3px) translateY(-3px); }

/* active tile gets a slow sheen so the open state reads as "live" */
.up-tile[aria-selected="true"]::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: linear-gradient(115deg, transparent 32%, rgba(255,255,255,.45) 48%, transparent 64%);
  background-size: 260% 100%;
  background-repeat: no-repeat;
  animation: up-sheen 2.6s linear infinite;
}
@keyframes up-sheen {
  from { background-position: 170% 0; }
  to   { background-position: -70% 0; }
}

.up-pv {
  /* Centred in the (1:1) tile — equal gaps above and below — rather than
     pinned to the top with a label band under it. The height keeps a small
     reserve so the caption at the bottom edge never overlaps the preview. */
  position: absolute;
  top: 50%;
  left: 50%;
  width: calc(100% - 18px);
  height: calc(100% - 26px);
  transform: translate(-50%, -50%);
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-tertiary);
  box-shadow: inset 0 0 0 1px rgba(0,0,0,.06);
  transition: transform .4s cubic-bezier(.16,1,.3,1), filter .4s ease;
}
.up-tile:hover .up-pv { transform: translate(-50%, -50%) scale(1.07); filter: saturate(1.25); }
.up-tile[aria-selected="true"] .up-pv { box-shadow: inset 0 0 0 1px rgba(16,185,129,.5); }

.up-label {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 4px;
  text-align: center;
  font-size: 7.5px;
  line-height: 1;
  font-weight: 900;
  letter-spacing: .07em;
  text-transform: uppercase;
  color: currentColor;
  opacity: .85;
  pointer-events: none;
}
.up-tile[aria-selected="true"] .up-label { opacity: 1; }

/* close badge on the open tile itself */
.up-close {
  position: absolute;
  top: 3px;
  right: 3px;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #10b981;
  color: #052e1f;
  box-shadow: 0 3px 8px rgba(0,0,0,.4);
  animation: up-pop .34s cubic-bezier(.16,1,.3,1) both;
}
@keyframes up-pop {
  from { opacity: 0; transform: scale(0) rotate(-120deg); }
  to   { opacity: 1; transform: scale(1) rotate(0); }
}

/* ---------- Analysis: score gauge + issue rows ---------- */
.up-gauge {
  position: absolute;
  left: 50%;
  top: 5px;
  width: 24px;
  height: 24px;
  transform: translateX(-50%);
}
.up-gauge circle {
  fill: none;
  stroke-width: 5;
  stroke-linecap: round;
  transform: rotate(-90deg);
  transform-origin: 50% 50%;
}
.up-gauge-track { stroke: color-mix(in srgb, var(--text-secondary) 30%, transparent); }
.up-gauge-value {
  stroke: #10b981;
  stroke-dasharray: 88;
  stroke-dashoffset: 88;
  animation: up-gauge 3.2s cubic-bezier(.65,0,.35,1) infinite;
}
@keyframes up-gauge {
  0%   { stroke-dashoffset: 88; }
  45%  { stroke-dashoffset: 22; }
  78%  { stroke-dashoffset: 22; }
  100% { stroke-dashoffset: 88; }
}
.up-rows {
  position: absolute;
  left: 5px;
  right: 5px;
  bottom: 4px;
  display: flex;
  flex-direction: column;
  gap: 2.5px;
}
.up-rows i {
  display: block;
  height: 2.5px;
  border-radius: 3px;
  background: color-mix(in srgb, var(--text-secondary) 65%, transparent);
  transform-origin: left center;
  animation: up-row 2.4s ease-in-out infinite;
}
.up-rows i:nth-child(1) { width: 82%; }
.up-rows i:nth-child(2) { width: 58%; animation-delay: .28s; }
.up-rows i:nth-child(3) { width: 70%; animation-delay: .56s; }
@keyframes up-row {
  0%, 100% { opacity: .3; transform: scaleX(.62); }
  50%      { opacity: 1;  transform: scaleX(1); }
}

/* ---------- Design: document with cycling accent ---------- */
.up-doc {
  position: absolute;
  inset: 3px 4px;
  border-radius: 4px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,.22);
  overflow: hidden;
  padding: 3px 4px 0;
}
.up-doc-hd {
  display: block;
  height: 6px;
  border-radius: 2px;
  margin-bottom: 2px;
  background: #10b981;
  animation: up-hue 4.5s linear infinite;
}
@keyframes up-hue {
  0%   { background: #10b981; }
  30%  { background: #6366f1; }
  60%  { background: #f59e0b; }
  100% { background: #10b981; }
}
.up-doc-ln {
  display: block;
  height: 2px;
  border-radius: 2px;
  margin-bottom: 2px;
  background: rgba(17,24,39,.22);
  animation: up-fade 3.4s ease-in-out infinite;
}
.up-doc-ln.s { width: 55%; }
@keyframes up-fade {
  0%, 100% { opacity: .45; }
  50%      { opacity: 1; }
}
.up-doc-chips {
  display: flex;
  gap: 2px;
  margin-top: 2px;
}
.up-doc-chips i {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #10b981;
  animation: up-chip 2.7s ease-in-out infinite;
}
.up-doc-chips i:nth-child(2) { background: #6366f1; animation-delay: .35s; }
.up-doc-chips i:nth-child(3) { background: #f59e0b; animation-delay: .7s; }
@keyframes up-chip {
  0%, 100% { opacity: .35; transform: scale(.8); }
  45%      { opacity: 1;   transform: scale(1.12); }
}

/* ---------- Template: two page layouts cross-fading ---------- */
.up-tpl { position: absolute; inset: 4px 5px; }
.up-tpl span {
  position: absolute;
  inset: 0;
  border-radius: 4px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,.22);
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2.5px;
  opacity: 0;
  animation: up-swap 4s cubic-bezier(.65,0,.35,1) infinite;
}
.up-tpl span:nth-child(2) { animation-delay: 2s; }
.up-tpl b {
  display: block;
  height: 2.5px;
  border-radius: 2px;
  background: rgba(17,24,39,.22);
}
.up-tpl-a b:nth-child(1) { width: 70%; height: 5px; background: rgba(16,185,129,.65); }
.up-tpl-a b:nth-child(2) { width: 100%; }
.up-tpl-a b:nth-child(3) { width: 88%; }
.up-tpl-a b:nth-child(4) { width: 60%; }
.up-tpl-b b:nth-child(1) { width: 45%; background: rgba(99,102,241,.65); }
.up-tpl-b b:nth-child(2) { width: 100%; }
.up-tpl-b b:nth-child(3) { width: 76%; }
@keyframes up-swap {
  0%   { opacity: 0; transform: translateY(5px) scale(.95); }
  14%, 44% { opacity: 1; transform: none; }
  58%, 100% { opacity: 0; transform: translateY(-5px) scale(.95); }
}

/* ---------- JSON: typing code lines + caret ---------- */
.up-json {
  position: absolute;
  inset: 5px 6px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3.5px;
}
.up-json i {
  display: block;
  height: 3px;
  border-radius: 3px;
  background: color-mix(in srgb, #10b981 80%, transparent);
  transform-origin: left center;
  animation: up-type 3.4s steps(10, end) infinite;
}
.up-json i:nth-child(1) { width: 78%; }
.up-json i:nth-child(2) { width: 52%; margin-left: 9px; animation-delay: .4s; background: color-mix(in srgb, #6366f1 80%, transparent); }
.up-json i:nth-child(3) { width: 64%; margin-left: 9px; animation-delay: .8s; }
@keyframes up-type {
  0%   { transform: scaleX(0); }
  34%  { transform: scaleX(1); }
  84%  { transform: scaleX(1); }
  100% { transform: scaleX(0); }
}
.up-caret {
  display: block;
  width: 6px;
  height: 6px;
  border-radius: 1.5px;
  background: color-mix(in srgb, var(--text-secondary) 80%, transparent);
  animation: up-blink 1.1s steps(2, end) infinite;
}
@keyframes up-blink {
  0%, 49%   { opacity: 1; }
  50%, 100% { opacity: .15; }
}

@media (prefers-reduced-motion: reduce) {
  .up-tile, .up-pv, .up-gauge-value, .up-rows i, .up-doc-hd, .up-doc-ln,
  .up-doc-chips i, .up-tpl span, .up-json i, .up-caret,
  .up-tile[aria-selected="true"]::after, .up-close {
    animation: none !important;
  }
}
`;

export const UtilityPanelRail: React.FC<UtilityPanelRailProps> = ({ activePanel, className = '' }) => {
  const handleClick = (panel: UtilityPanelId) => {
    if (activePanel === panel) {
      closePanel();
      return;
    }
    openPanel(panel);
  };

  return (
    // The rail itself is chrome-less: no surface, border, blur or shadow, so the
    // tiles float directly on the editor background. NOTE for any future surface
    // added here — `dark:bg-[<css-var>]/<opacity>` produces NO CSS in Tailwind v3
    // (an opacity modifier cannot resolve an arbitrary `var()` colour), so use a
    // flat token or a literal rgba value instead.
    <div
      className={`shrink-0 flex flex-row md:flex-col items-center justify-start gap-2 p-1.5 md:h-fit md:self-start overflow-x-auto md:overflow-visible scrollbar-hide ${className}`}
      role="tablist"
      aria-label="Editor panels"
    >
      <style>{RAIL_STYLES}</style>

      {TILES.map((tab, index) => {
        const { Preview } = tab;
        const isActive = activePanel === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => handleClick(tab.id)}
            title={isActive ? `Close ${tab.label}` : `Open ${tab.label}`}
            style={{ animationDelay: `${index * 80 + 120}ms` }}
            className={`up-tile group relative shrink-0 w-[4.5rem] h-[4.5rem] rounded-2xl overflow-visible border ${
              isActive
                ? 'bg-emerald-500/[0.16] border-emerald-500/60 text-emerald-600 dark:text-emerald-400'
                : 'bg-[#f3f2ee] dark:bg-[#1a1a1a] border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-emerald-400/60'
            }`}
          >
            {/* mini animated preview of the panel this tile opens */}
            <Preview />

            <span className="up-label">{tab.label}</span>

            {isActive && (
              <span className="up-close" aria-hidden="true">
                <X className="w-2.5 h-2.5 stroke-[3]" />
              </span>
            )}
          </button>
        );
      })}

      {STEP_TILES.map((step, index) => {
        const { Icon } = step;
        const isNext = step.id === 'next';
        return (
          <button
            key={step.id}
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent(step.event))}
            title={isNext ? 'Next step' : 'Previous step'}
            aria-label={isNext ? 'Next step' : 'Previous step'}
            style={{ animationDelay: `${(TILES.length + index) * 80 + 120}ms` }}
            // `order-first` so the step tiles lead the mobile row: the rail
            // scrolls horizontally, and leaving them last hid "Next" — the
            // primary forward action — past the right edge.
            className={`up-tile md:hidden order-first group relative shrink-0 w-[4.5rem] h-[4.5rem] rounded-2xl overflow-visible border flex items-center justify-center ${
              isNext
                ? 'bg-[#013f2e] border-[#013f2e] text-white dark:bg-emerald-600 dark:border-emerald-600'
                : 'bg-[#f3f2ee] dark:bg-[#1a1a1a] border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-emerald-400/60'
            }`}
          >
            <Icon className="w-6 h-6 stroke-[2.5]" aria-hidden="true" />
            <span className="up-label">{step.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default UtilityPanelRail;
