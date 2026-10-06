'use client';

import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface MoriErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

/**
 * Shared error message component with optional retry button.
 */
export default function MoriErrorMessage({ message, onRetry }: MoriErrorMessageProps) {
  return (
    <div className="flex flex-col items-start mt-2">
      <div className="flex gap-2 max-w-[90%] flex-row">
        <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center mt-1 bg-red-100 dark:bg-red-500/20 shadow-sm">
          <AlertCircle className="w-4 h-4 text-red-500" />
        </div>
        <div className="space-y-1">
          <div className="px-4 py-3 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-tl-none shadow-sm">
            <p className="text-[13px] text-red-700 dark:text-red-300 leading-relaxed">
              {message}
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-500/20 dark:hover:bg-red-500/30 text-red-700 dark:text-red-300 rounded-lg text-[11px] font-semibold transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
