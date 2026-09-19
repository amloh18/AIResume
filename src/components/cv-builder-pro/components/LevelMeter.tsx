'use client';

import React from 'react';
import { CanvasContext } from './CoreUI';
import { clampLevel, fluencyToLevel, levelToFluency } from '@/lib/utils/cv-snippet-data';

export const LevelMeter = ({
  path,
  value,
  variant = 'dots',
  max = 5,
  valueType = 'fluency',
  isDark = false,
}: {
  path: string;
  value: any;
  variant?: 'dots' | 'bar' | 'stars';
  max?: number;
  valueType?: 'fluency' | 'number';
  isDark?: boolean;
}) => {
  const ctx = React.useContext(CanvasContext);
  const readOnly = !ctx?.handleDataChange;
  const level = valueType === 'number' ? clampLevel(value) : fluencyToLevel(value);
  const setLevel = (next: number, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (readOnly) return;
    ctx.handleDataChange(path, valueType === 'number' ? next : levelToFluency(next));
  };

  if (variant === 'bar') {
    return (
      <button
        type="button"
        className={`w-1/2 h-2 rounded-full overflow-hidden text-left ${isDark ? 'bg-slate-800' : 'bg-gray-200'} ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
        title={`${levelToFluency(level)} (${level}/5)`}
        onClick={(event) => {
          const rect = (event.currentTarget as HTMLButtonElement).getBoundingClientRect();
          const ratio = Math.min(1, Math.max(0.05, (event.clientX - rect.left) / rect.width));
          setLevel(Math.max(1, Math.round(ratio * max)), event);
        }}
      >
        <div className="h-full cv-accent-bg" style={{ width: `${(level / max) * 100}%` }} />
      </button>
    );
  }

  return (
    <div className="flex gap-1.5 shrink-0" title={`${levelToFluency(level)} — click to set intensity`}>
      {Array.from({ length: max }).map((_, index) => {
        const filled = index < level;
        return (
          <button
            key={index}
            type="button"
            disabled={readOnly}
            onClick={(event) => setLevel(index + 1, event)}
            className={variant === 'stars'
              ? `text-[13px] leading-none ${filled ? 'cv-accent-text' : (isDark ? 'text-slate-700' : 'text-gray-200')} ${readOnly ? 'cursor-default' : 'cursor-pointer'}`
              : `w-2 h-2 rounded-full ${filled ? 'cv-accent-bg' : (isDark ? 'bg-slate-700' : 'bg-gray-200')} ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
            aria-label={`Set level ${index + 1}`}
          >
            {variant === 'stars' ? '★' : null}
          </button>
        );
      })}
    </div>
  );
};
