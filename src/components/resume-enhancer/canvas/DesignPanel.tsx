'use client';

/**
 * DesignPanel -- sidebar panel for adjusting CV design variables:
 * font, font-size, spacing, page margin, accent color.
 */

import React, { memo } from 'react';
import { X, Type, Palette, Maximize, AlignVerticalSpaceAround } from 'lucide-react';
import type { DesignVars } from './snippetTypes';

const FONT_OPTIONS = [
  'Inter, system-ui, sans-serif',
  'Georgia, serif',
  'Merriweather, serif',
  'Roboto, sans-serif',
  'Lato, sans-serif',
  'Montserrat, sans-serif',
  'Open Sans, sans-serif',
  'Playfair Display, serif',
  'Source Sans Pro, sans-serif',
  'Nunito, sans-serif',
];

const ACCENT_PRESETS = [
  '#2563eb', '#0d9488', '#7c3aed', '#dc2626', '#ea580c',
  '#16a34a', '#374151', '#0ea5e9', '#d97706', '#ec4899',
];

interface DesignPanelProps {
  designVars: DesignVars;
  onDesignChange: (vars: DesignVars) => void;
  onClose: () => void;
}

function DesignPanelInner({ designVars, onDesignChange, onClose }: DesignPanelProps) {
  const update = (partial: Partial<DesignVars>) =>
    onDesignChange({ ...designVars, ...partial });

  return (
    <div className="fixed right-0 top-0 bottom-0 w-72 bg-white dark:bg-[#141810] border-l border-gray-200 dark:border-gray-700 shadow-2xl z-[9998] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-sm text-[color:var(--text-primary)]">Design Settings</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Font Family */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            <Type size={14} />
            Font Family
          </label>
          <select
            value={designVars.fontFamily}
            onChange={(e) => update({ fontFamily: e.target.value })}
            className="w-full text-sm px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1e1e1e] text-[color:var(--text-primary)]"
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f} value={f} style={{ fontFamily: f }}>
                {f.split(',')[0]}
              </option>
            ))}
          </select>
        </div>

        {/* Font Size */}
        <div>
          <label className="flex items-center justify-between text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            <span>Body Font Size</span>
            <span className="text-[10px] text-gray-400">{designVars.fontSize}pt</span>
          </label>
          <input
            type="range"
            min={8}
            max={14}
            step={0.5}
            value={designVars.fontSize}
            onChange={(e) => update({ fontSize: parseFloat(e.target.value) })}
            className="w-full accent-[var(--cv-accent)]"
          />
        </div>

        {/* Line Spacing */}
        <div>
          <label className="flex items-center justify-between text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            <span className="flex items-center gap-1.5">
              <AlignVerticalSpaceAround size={14} />
              Line Spacing
            </span>
            <span className="text-[10px] text-gray-400">{designVars.lineSpacing.toFixed(1)}</span>
          </label>
          <input
            type="range"
            min={1}
            max={2}
            step={0.1}
            value={designVars.lineSpacing}
            onChange={(e) => update({ lineSpacing: parseFloat(e.target.value) })}
            className="w-full accent-[var(--cv-accent)]"
          />
        </div>

        {/* Page Margin */}
        <div>
          <label className="flex items-center justify-between text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Maximize size={14} />
              Page Margin
            </span>
            <span className="text-[10px] text-gray-400">{designVars.pageMargin}mm</span>
          </label>
          <input
            type="range"
            min={10}
            max={30}
            step={1}
            value={designVars.pageMargin}
            onChange={(e) => update({ pageMargin: parseInt(e.target.value, 10) })}
            className="w-full accent-[var(--cv-accent)]"
          />
        </div>

        {/* Accent Color */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
            <Palette size={14} />
            Accent Color
          </label>
          <div className="flex flex-wrap gap-2">
            {ACCENT_PRESETS.map((color) => (
              <button
                key={color}
                onClick={() => update({ accentColor: color })}
                className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                  designVars.accentColor === color
                    ? 'border-gray-800 dark:border-white scale-110'
                    : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="color"
              value={designVars.accentColor}
              onChange={(e) => update({ accentColor: e.target.value })}
              className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
            />
            <span className="text-xs text-gray-500">{designVars.accentColor}</span>
          </div>
        </div>

        {/* Header Font Size */}
        <div>
          <label className="flex items-center justify-between text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            <span>Header Size</span>
            <span className="text-[10px] text-gray-400">{designVars.headerFontSize}pt</span>
          </label>
          <input
            type="range"
            min={18}
            max={36}
            step={1}
            value={designVars.headerFontSize}
            onChange={(e) => update({ headerFontSize: parseInt(e.target.value, 10) })}
            className="w-full accent-[var(--cv-accent)]"
          />
        </div>

        {/* Section Title Size */}
        <div>
          <label className="flex items-center justify-between text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            <span>Section Title Size</span>
            <span className="text-[10px] text-gray-400">{designVars.sectionFontSize}pt</span>
          </label>
          <input
            type="range"
            min={10}
            max={18}
            step={0.5}
            value={designVars.sectionFontSize}
            onChange={(e) => update({ sectionFontSize: parseFloat(e.target.value) })}
            className="w-full accent-[var(--cv-accent)]"
          />
        </div>
      </div>
    </div>
  );
}

const DesignPanel = memo(DesignPanelInner);
export default DesignPanel;
