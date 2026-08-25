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
      <span className="hidden sm:inline text-[11px] font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
        Auto CV
      </span>
      <div
        className="flex items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1a230f] p-0.5"
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
            className={`px-2.5 py-1.5 rounded-[10px] text-xs font-medium transition-colors disabled:opacity-50 ${
              active
                ? 'bg-white dark:bg-[#243318] text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
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
