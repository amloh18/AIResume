'use client';

import React from 'react';
import {
  CV_TAILORING_MODE_LABELS,
  type CvTailoringMode,
} from '@/lib/cv-tailoring/tailoringMode';

interface CvTailoringModeToggleProps {
  value: CvTailoringMode;
  onChange: (mode: CvTailoringMode) => void;
  disabled?: boolean;
}

export default function CvTailoringModeToggle({
  value,
  onChange,
  disabled = false,
}: CvTailoringModeToggleProps) {
  return (
    <div
      className="flex items-center gap-1.5 shrink-0"
      title="How auto-generated CVs and cover letters are tailored for every job (manual, extension, and job boards)."
    >
      <span className="hidden xl:inline text-[11px] font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">
        Auto CV:
      </span>
      <div
        className="flex items-center h-10 p-1 rounded-xl border border-gray-200/90 dark:border-white/10 bg-gray-50/80 dark:bg-white/[0.03] shadow-2xs"
        role="group"
        aria-label="CV tailoring mode"
      >
        {(['standard', 'standout'] as const).map((mode) => {
          const active = value === mode;
          const meta = CV_TAILORING_MODE_LABELS[mode];
          return (
            <button
              key={mode}
              type="button"
              disabled={disabled}
              title={meta.description}
              aria-pressed={active}
              onClick={() => onChange(mode)}
              className={`h-full px-3 rounded-[8px] text-xs font-semibold transition-all duration-150 ease-out disabled:opacity-50 flex items-center justify-center ${
                active
                  ? 'bg-white dark:bg-[#1a230f] text-gray-900 dark:text-white shadow-xs font-bold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {meta.short}
            </button>
          );
        })}
      </div>
    </div>
  );
}
