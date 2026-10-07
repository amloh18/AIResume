'use client';

import React from 'react';
import { Palette, X, RotateCcw } from 'lucide-react';
import type { CoverLetterDesignProps } from '@/components/cover-letter-engine/CoverLetterLayoutEngine';

/**
 * Design controls for the cover letter, rendered into the Step-3 utility column
 * when the Design tile is open on the letter document.
 *
 * WHY THIS EXISTS: the CV's Design panel is owned by CVCanvasEngine and reaches
 * the utility column through `#builder-utility-panel-portal`. While the letter is
 * open that engine is not mounted, so `activeUtilityPanel === 'design'` used to
 * fall through to `LetterGuidePanel` — the *analysis* panel — and the user saw
 * "analysis" behind the Design tile. This panel is the letter's own Design body,
 * bound to the same `clDesign` object the canvas renders with, so the two can
 * never drift.
 *
 * SCOPE: typography + colour only. Header *styles* are the Template tile's job
 * (CoverLetterHeaderStyles) — the same Design/Template split the CV uses.
 */

import {
  TOP_SANS_SERIF_FONTS,
  TOP_SERIF_FONTS,
  DocumentFontOption,
} from '@/lib/templates/document-fonts';

export const COVER_LETTER_DESIGN_DEFAULTS: CoverLetterDesignProps = {
  fontSize: 15,
  lineHeight: 1.6,
  pageMargin: 6,
  accentColor: '#013f2e',
  fontFamily: 'Calibri',
};

interface CoverLetterDesignPanelProps {
  design: CoverLetterDesignProps;
  setDesign: React.Dispatch<React.SetStateAction<CoverLetterDesignProps>>;
  onClose?: () => void;
}

/**
 * Accent swatches. Deliberately a superset of the CV palette plus a couple of
 * letter-appropriate neutrals — the accent paints the header rule and the
 * signature block, so near-blacks read as "formal" rather than "broken".
 */
const ACCENTS = [
  '#013f2e',
  '#10b981',
  '#3b82f6',
  '#6366f1',
  '#f59e0b',
  '#ef4444',
  '#1f2937',
  '#000000',
];

/** One labelled range row. Kept local so the three sliders stay identical. */
const SliderRow: React.FC<{
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}> = ({ label, value, display, min, max, step, onChange }) => (
  <div>
    <label className="text-[10px] font-bold uppercase tracking-widest mb-2 flex justify-between text-[var(--text-secondary)]">
      <span>{label}</span>
      <span className="text-emerald-500 font-black">{display}</span>
    </label>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full accent-emerald-500"
    />
  </div>
);

const CoverLetterDesignPanel: React.FC<CoverLetterDesignPanelProps> = ({ design, setDesign, onClose }) => {
  const patch = (next: Partial<CoverLetterDesignProps>) => setDesign((prev) => ({ ...prev, ...next }));

  const isDefault =
    design.fontSize === COVER_LETTER_DESIGN_DEFAULTS.fontSize &&
    design.lineHeight === COVER_LETTER_DESIGN_DEFAULTS.lineHeight &&
    design.pageMargin === COVER_LETTER_DESIGN_DEFAULTS.pageMargin &&
    design.accentColor === COVER_LETTER_DESIGN_DEFAULTS.accentColor &&
    design.fontFamily === COVER_LETTER_DESIGN_DEFAULTS.fontFamily;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* No header area on desktop, matching the CV-side panels (ATSMeterPanel
          renders its title row `md:hidden`). The tab rail already labels this
          panel, so a bordered title bar here was a redundant second header.
          The CONTROLS stay: the title and the rule drop away, but reset/close
          remain as a compact right-aligned row so nothing becomes unreachable. */}
      <div className="px-4 py-3 md:px-3 md:py-1.5 md:border-0 border-b border-gray-200 dark:border-white/10 flex items-center justify-between shrink-0">
        <div className="md:hidden flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
          <Palette className="w-4 h-4 text-emerald-500" />
          <span>Letter Design</span>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <button
            type="button"
            onClick={() => setDesign({ ...COVER_LETTER_DESIGN_DEFAULTS })}
            disabled={isDefault}
            title="Reset to defaults"
            aria-label="Reset letter design to defaults"
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close letter design"
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-6 bg-gray-50 dark:bg-[#0a0a0a]">
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest mb-1.5 block text-[var(--text-secondary)]">
              Sans-Serif (Modern & Clean)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TOP_SANS_SERIF_FONTS.map((face) => {
                const isActive = (design.fontFamily || 'Calibri').toLowerCase() === face.id.toLowerCase() ||
                  (design.fontFamily === 'font-sans' && face.id === 'Calibri');
                return (
                  <button
                    key={face.id}
                    type="button"
                    onClick={() => patch({ fontFamily: face.id })}
                    aria-pressed={isActive}
                    title={face.description}
                    className={`p-2.5 text-left rounded-xl border transition-all flex flex-col justify-between ${
                      isActive
                        ? 'bg-emerald-500/15 border-emerald-500 ring-1 ring-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold'
                        : 'bg-white dark:bg-[#141414] border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-white/20'
                    }`}
                  >
                    <span className="text-sm font-semibold truncate" style={{ fontFamily: face.fontFamily }}>
                      {face.name}
                    </span>
                    <span className={`text-[9px] line-clamp-1 mt-0.5 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`}>
                      {face.name === 'Calibri' ? 'Corporate Standard' : face.name === 'Arial' ? 'Neutral & Readable' : face.name === 'Lato' ? 'Friendly & Modern' : 'Clean & Geometric'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest mb-1.5 block text-[var(--text-secondary)]">
              Serif (Classic & Formal)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TOP_SERIF_FONTS.map((face) => {
                const isActive = (design.fontFamily || '').toLowerCase() === face.id.toLowerCase() ||
                  (design.fontFamily === 'font-serif' && face.id === 'Garamond');
                return (
                  <button
                    key={face.id}
                    type="button"
                    onClick={() => patch({ fontFamily: face.id })}
                    aria-pressed={isActive}
                    title={face.description}
                    className={`p-2.5 text-left rounded-xl border transition-all flex flex-col justify-between ${
                      isActive
                        ? 'bg-emerald-500/15 border-emerald-500 ring-1 ring-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold'
                        : 'bg-white dark:bg-[#141414] border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-white/20'
                    }`}
                  >
                    <span className="text-sm font-semibold truncate" style={{ fontFamily: face.fontFamily }}>
                      {face.name}
                    </span>
                    <span className={`text-[9px] line-clamp-1 mt-0.5 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`}>
                      {face.name === 'Garamond' ? 'Timeless & Elegant' : face.name === 'Cambria' ? 'Crisp & Clear' : 'Authoritative'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5">
          <SliderRow
            label="Font Size"
            value={design.fontSize}
            display={`${design.fontSize}px`}
            min={11}
            max={20}
            step={0.5}
            onChange={(v) => patch({ fontSize: v })}
          />
          <SliderRow
            label="Line Spacing"
            value={design.lineHeight}
            display={`${design.lineHeight.toFixed(2)}x`}
            min={1.2}
            max={2.2}
            step={0.05}
            onChange={(v) => patch({ lineHeight: v })}
          />
          {/* pageMargin is consumed as `cqw` — a percentage of the page WIDTH —
              so it is unitless here, not px. See CoverLetterLayoutEngine. */}
          <SliderRow
            label="Page Margin"
            value={design.pageMargin}
            display={`${design.pageMargin}%`}
            min={2}
            max={14}
            step={0.5}
            onChange={(v) => patch({ pageMargin: v })}
          />
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block text-[var(--text-secondary)]">
            Accent Color
          </label>
          <div className="flex gap-2 flex-wrap">
            {ACCENTS.map((color) => {
              const isActive = design.accentColor?.toLowerCase() === color.toLowerCase();
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => patch({ accentColor: color })}
                  aria-label={`Accent ${color}`}
                  aria-pressed={isActive}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                    isActive
                      ? 'border-emerald-500 scale-125 shadow-lg'
                      : 'border-gray-300 dark:border-gray-600 hover:scale-110'
                  }`}
                  style={{ backgroundColor: color }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoverLetterDesignPanel;
