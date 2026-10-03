'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

/**
 * Shared "Mori is thinking..." loading indicator used by all Mori chat panels.
 */
export default function MoriLoadingIndicator() {
  return (
    <div className="flex flex-col items-start mt-2">
      <div className="flex gap-2 max-w-[90%] flex-row">
        <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center mt-1 bg-slate-200 dark:bg-[var(--bg-primary)] shadow-sm">
          <Sparkles className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="space-y-1">
          <div className="px-4 py-3 rounded-2xl bg-white dark:bg-[var(--bg-primary)] border border-slate-200 dark:border-white/10 rounded-tl-none shadow-sm flex items-center h-[38px]">
            <div className="flex items-center space-x-1.5">
              <div
                className="w-1.5 h-1.5 bg-emerald-400/80 rounded-full animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <div
                className="w-1.5 h-1.5 bg-emerald-400/80 rounded-full animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <div
                className="w-1.5 h-1.5 bg-emerald-400/80 rounded-full animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
            </div>
          </div>
          <div className="text-[9px] text-slate-400 px-2 font-medium text-left animate-pulse">
            Mori is thinking...
          </div>
        </div>
      </div>
    </div>
  );
}
