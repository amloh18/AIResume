'use client';

import React from 'react';

interface Suggestion {
  label: string;
  prompt: string;
}

interface MoriSuggestionChipsProps {
  suggestions: Suggestion[];
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

/**
 * Shared suggestion chips displayed below the welcome message.
 */
export default function MoriSuggestionChips({
  suggestions,
  onSelect,
  disabled = false,
}: MoriSuggestionChipsProps) {
  return (
    <div className="ml-9 mt-3 flex flex-wrap gap-2 max-w-[90%] pointer-events-auto">
      {suggestions.map((sug, i) => (
        <button
          key={i}
          onClick={() => onSelect(sug.prompt)}
          disabled={disabled}
          className="px-3 py-1.5 bg-emerald-50/50 hover:bg-emerald-50 dark:bg-emerald-500/5 dark:hover:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-xl text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm flex items-center gap-1.5 disabled:opacity-50"
        >
          {sug.label}
        </button>
      ))}
    </div>
  );
}
