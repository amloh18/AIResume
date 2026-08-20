'use client';

import type { MatchBreakdown } from '@/types/automation-schema';

interface MatchBreakdownBarsProps {
  breakdown?: MatchBreakdown;
  compact?: boolean;
}

const LABELS = [
  { key: 'skills', label: 'Skills' },
  { key: 'title', label: 'Title' },
  { key: 'location', label: 'Location' },
  { key: 'recency', label: 'Recency' },
] as const;

export function MatchBreakdownBars({ breakdown, compact = true }: MatchBreakdownBarsProps) {
  if (!breakdown) return null;

  return (
    <div className={compact ? 'grid grid-cols-2 gap-x-4 gap-y-2' : 'space-y-2.5'}>
      {LABELS.map(({ key, label }) => {
        const value = breakdown[key] ?? 0;
        return (
          <div key={key} className="flex items-center gap-2">
            {compact ? (
              <>
                <span className="w-9 shrink-0 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {label}
                </span>
                <span className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <span
                    className="block h-full rounded-full bg-lime-500"
                    style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
                  />
                </span>
                <span className="w-8 shrink-0 text-right text-[10px] font-bold text-gray-600 dark:text-gray-300">
                  {value}
                </span>
              </>
            ) : (
              <>
                <span className="w-16 shrink-0 text-small font-medium text-gray-600 dark:text-gray-300">
                  {label}
                </span>
                <span className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <span
                    className="block h-full rounded-full bg-lime-500 transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
                  />
                </span>
                <span className="w-8 shrink-0 text-right text-small font-bold text-gray-700 dark:text-gray-200">
                  {value}
                </span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}